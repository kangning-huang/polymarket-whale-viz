#!/usr/bin/env node
"use strict";

// ===================================================================
//  Per-Second Price Recorder
//
//  Records per-second bid/ask/CEX snapshots for all active 15-min
//  crypto markets. One JSONL file per window per coin.
//
//  Output format (one line per second):
//    {"sec":0,"uB":0.51,"uA":0.52,"dB":0.49,"dA":0.50,"cex":98765.4}
//
//  Output path: <outDir>/price_<windowTs>_<coin>.jsonl
//
//  Usage:
//    RUNTIME_SEC=86400 node bots/monitoring/ws_price_recorder.cjs
// ===================================================================

const fs = require("fs");
const path = require("path");
const WS = globalThis.WebSocket || require("ws");
const WS_OPEN = WS.OPEN != null ? WS.OPEN : 1;
const DEFAULT_VPS_OUT_DIR = "/opt/polymarket/data/raw/prices";

function resolveDefaultOutDir() {
  if (process.env.OUT_DIR) return process.env.OUT_DIR;
  return process.cwd().startsWith("/opt/polymarket/")
    ? DEFAULT_VPS_OUT_DIR
    : path.join("data", "raw", "prices");
}

const CFG = {
  wsBase: process.env.POLY_WS_BASE || "wss://ws-subscriptions-clob.polymarket.com",
  gammaBase: process.env.GAMMA_BASE || "https://gamma-api.polymarket.com",
  binanceWs: process.env.BINANCE_WS || "wss://fstream.binance.com",
  refTs: Number(process.env.REF_TS || 1770435000),
  // Support multiple window durations (15m, 5m, 1h)
  windowDurations: (process.env.WINDOW_DURATIONS || "900,300,3600")
    .split(",").map(Number).filter(n => n > 0),
  windowSec: Number(process.env.WINDOW_SEC || 900), // kept for backward compat
  coins: (process.env.COINS || "btc,eth,sol,xrp")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean),
  runtimeSec: Number(process.env.RUNTIME_SEC || 0), // 0 = run forever
  refreshSec: Number(process.env.REFRESH_SEC || 10), // reduced from 30 to catch windows earlier
  statusSec: Number(process.env.STATUS_SEC || 30),
  expiryBufferSec: Number(process.env.EXPIRY_BUFFER_SEC || 120),
  cleanupIntervalSec: Number(process.env.CLEANUP_INTERVAL_SEC || 3600), // hourly
  retentionSec: Number(process.env.RETENTION_SEC || 86400), // 24h
  outDir: resolveDefaultOutDir(),
};

const DURATION_LABELS = { 900: "15m", 300: "5m", 3600: "1h" };

const BINANCE_SYMS = {
  btc: "btcusdt",
  eth: "ethusdt",
  sol: "solusdt",
  xrp: "xrpusdt",
};
const BINANCE_COIN_BY_SYMBOL = Object.fromEntries(
  Object.entries(BINANCE_SYMS).map(([coin, sym]) => [sym, coin.toUpperCase()])
);
const HOURLY_LOOKAHEAD_SEC = Number(process.env.HOURLY_LOOKAHEAD_SEC || 7200);

let polyWs = null;
let binWs = null;
let manualClose = false;
let shuttingDown = false;
let startMs = Date.now();
let refreshInFlight = false;

// assetId -> { coin, outcome, windowStart, windowEnd, conditionId, slug }
const assetMap = new Map();
// windowKey -> market metadata
const marketMap = new Map();
// bookKey -> { bid, ask, ts, updates }
const bookState = new Map();
// coin -> { price, exchangeTs, recvTs, updates }
const cexState = new Map();
// streamKey -> WriteStream
const outputStreams = new Map();
// stats
let totalSamples = 0;
let skippedNoData = 0;
let skippedNoBook = 0;

// ── Utilities ──

function wsIsOpen(ws) {
  return ws && ws.readyState === WS_OPEN;
}

function toUtf8(data) {
  if (typeof data === "string") return data;
  if (Buffer.isBuffer(data)) return data.toString("utf8");
  if (data instanceof ArrayBuffer) return Buffer.from(data).toString("utf8");
  if (ArrayBuffer.isView(data)) return Buffer.from(data.buffer).toString("utf8");
  return String(data);
}

function attachWsHandlers(ws, handlers) {
  if (typeof ws.on === "function") {
    ws.on("open", handlers.open);
    ws.on("message", handlers.message);
    ws.on("close", handlers.close);
    ws.on("error", handlers.error);
    return;
  }
  ws.addEventListener("open", () => handlers.open());
  ws.addEventListener("message", (ev) => handlers.message(ev.data));
  ws.addEventListener("close", () => handlers.close());
  ws.addEventListener("error", (ev) => {
    handlers.error(new Error(ev?.message || "websocket error"));
  });
}

function nowMs() { return Date.now(); }
function nowSec() { return Math.floor(nowMs() / 1000); }
function iso(tsMs) { return new Date(tsMs).toISOString(); }

function log(...args) {
  console.log(`[${iso(nowMs())}]`, ...args);
}

function toNumber(v) {
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
}

function round(v, d = 6) {
  if (!Number.isFinite(v)) return null;
  const m = Math.pow(10, d);
  return Math.round(v * m) / m;
}

function bestOf(levels, side) {
  if (!Array.isArray(levels) || levels.length === 0) return null;
  let best = null;
  for (const level of levels) {
    const price = Number(level.price);
    const size = Number(level.size);
    if (!Number.isFinite(price) || !Number.isFinite(size) || size <= 0) continue;
    if (
      !best ||
      (side === "bid" ? price > best.price : price < best.price)
    ) {
      best = { price, size };
    }
  }
  return best;
}

async function gammaGet(ep) {
  const resp = await fetch(`${CFG.gammaBase}${ep}`);
  if (!resp.ok) throw new Error(`Gamma ${resp.status}`);
  return resp.json();
}

function jp(v) {
  return typeof v === "string" ? JSON.parse(v) : v;
}

function keyWindow(ws, coinUpper, dur) { return `${ws}|${coinUpper}|${dur}`; }
function keyBook(ws, coinUpper, outcome, dur) { return `${ws}|${coinUpper}|${outcome}|${dur}`; }

function discoverWindowCandidates() {
  const candidates = [];
  const now = nowSec();
  for (const dur of CFG.windowDurations) {
    const n = Math.floor((now - CFG.refTs) / dur);
    for (const off of [0, 1]) {
      const start = CFG.refTs + (n + off) * dur;
      candidates.push({ start, end: start + dur, duration: dur });
    }
  }
  return candidates;
}

// ── Output Streams ──

function ensureOutDir() {
  if (!fs.existsSync(CFG.outDir)) fs.mkdirSync(CFG.outDir, { recursive: true });
}

function streamKey(windowTs, coin, dur) { return `${windowTs}_${coin}_${dur}`; }

function openStream(windowTs, coin, dur) {
  const sk = streamKey(windowTs, coin, dur);
  if (outputStreams.has(sk)) return outputStreams.get(sk);
  ensureOutDir();
  const durLabel = DURATION_LABELS[dur] || `${dur}s`;
  const filepath = path.join(CFG.outDir, `price_${windowTs}_${coin}_${durLabel}.jsonl`);
  const ws = fs.createWriteStream(filepath, { flags: "a" });
  outputStreams.set(sk, ws);
  log(`opened stream ${filepath}`);
  return ws;
}

function closeStream(windowTs, coin, dur) {
  const sk = streamKey(windowTs, coin, dur);
  const s = outputStreams.get(sk);
  if (s) {
    s.end();
    outputStreams.delete(sk);
  }
}

function closeExpiredStreams() {
  const t = nowSec();
  for (const [sk, s] of outputStreams.entries()) {
    const parts = sk.split("_");
    const wts = Number(parts[0]);
    const dur = Number(parts[2]) || CFG.windowSec;
    if (wts + dur + 60 < t) {
      s.end();
      outputStreams.delete(sk);
      log(`closed expired stream ${sk}`);
    }
  }
}

// ── Market Discovery ──

// Hourly markets use different slug format (series-based)
const HOURLY_SERIES = {
  btc: "btc-up-or-down-hourly",
  eth: "eth-up-or-down-hourly",
  sol: "solana-up-or-down-hourly",
  xrp: "xrp-up-or-down-hourly",
};

async function discoverHourlyMarkets() {
  const now = nowSec();
  const out = [];
  const maxWindowEnd = now + HOURLY_LOOKAHEAD_SEC + CFG.expiryBufferSec;

  for (const coin of CFG.coins) {
    const seriesSlug = HOURLY_SERIES[coin];
    if (!seriesSlug) continue;

    try {
      // Step 1: Query series endpoint to find active event slugs
      const series = await gammaGet(`/series?slug=${seriesSlug}`);
      if (!series?.length || !series[0].events?.length) continue;

      // Find active, non-closed events (series endpoint doesn't include markets array)
      const activeEvents = series[0].events.filter(ev => {
        if (!ev.active || ev.closed || !ev.endDate) return false;
        const windowEnd = Math.floor(new Date(ev.endDate).getTime() / 1000);
        return windowEnd >= now && windowEnd <= maxWindowEnd;
      });

      for (const ev of activeEvents) {
        const windowEnd = Math.floor(new Date(ev.endDate).getTime() / 1000);
        const windowStart = windowEnd - 3600; // 1 hour before end

        // Skip if window already ended or about to end
        if (windowEnd < now || windowEnd - now < CFG.expiryBufferSec) continue;

        // Step 2: Query events endpoint to get full market info (clobTokenIds, etc.)
        const eventData = await gammaGet(`/events?slug=${ev.slug}`);
        if (!eventData?.length) continue;

        const mkt = eventData[0].markets?.[0];
        if (!mkt || mkt.closed) continue;

        const tokenIds = jp(mkt.clobTokenIds);
        const outcomes = jp(mkt.outcomes);

        let upIdx = outcomes.findIndex((o) => /\bup\b/i.test(o));
        let dnIdx = outcomes.findIndex((o) => /\bdown\b/i.test(o));
        if (upIdx < 0) upIdx = 0;
        if (dnIdx < 0) dnIdx = 1;

        out.push({
          coin: coin.toUpperCase(),
          slug: mkt.slug,
          windowStart,
          windowEnd,
          duration: 3600,
          conditionId: mkt.conditionId,
          upToken: tokenIds[upIdx],
          downToken: tokenIds[dnIdx],
        });
      }
    } catch (e) {
      log(`hourly discovery error for ${coin}: ${e.message}`);
    }
  }
  return out;
}

async function discoverMarkets() {
  const windows = discoverWindowCandidates();
  const now = nowSec();
  const out = [];

  // Discover 5m and 15m markets (timestamp-based slugs)
  for (const coin of CFG.coins) {
    for (const w of windows) {
      // Skip hourly windows here - they're discovered separately
      if (w.duration === 3600) continue;

      if (w.end < now || w.end - now < CFG.expiryBufferSec) continue;
      const label = DURATION_LABELS[w.duration] || `${w.duration}s`;
      const slug = `${coin}-updown-${label}-${w.start}`;
      try {
        const events = await gammaGet(`/events?slug=${slug}`);
        if (!events?.length) continue;
        const ev = events[0];
        const mkt = ev.markets?.[0];
        if (!mkt || mkt.closed || ev.closed) continue;
        const tokenIds = jp(mkt.clobTokenIds);
        const outcomes = jp(mkt.outcomes);

        let upIdx = outcomes.findIndex((o) => /\bup\b/i.test(o));
        let dnIdx = outcomes.findIndex((o) => /\bdown\b/i.test(o));
        if (upIdx < 0) upIdx = 0;
        if (dnIdx < 0) dnIdx = 1;

        out.push({
          coin: coin.toUpperCase(),
          slug,
          windowStart: w.start,
          windowEnd: w.end,
          duration: w.duration,
          conditionId: mkt.conditionId,
          upToken: tokenIds[upIdx],
          downToken: tokenIds[dnIdx],
        });
      } catch {
        // skip failed lookup
      }
    }
  }

  // Discover hourly markets (series-based slugs)
  if (CFG.windowDurations.includes(3600)) {
    const hourlyMarkets = await discoverHourlyMarkets();
    out.push(...hourlyMarkets);
  }

  return out;
}

function registerMarkets(markets) {
  let changed = false;
  for (const m of markets) {
    const dur = m.duration || CFG.windowSec;
    const wk = keyWindow(m.windowStart, m.coin, dur);
    if (!marketMap.has(wk)) {
      marketMap.set(wk, m);
      changed = true;
    }
    const upToken = String(m.upToken);
    const dnToken = String(m.downToken);
    if (!assetMap.has(upToken)) {
      assetMap.set(upToken, { ...m, outcome: "Up" });
      changed = true;
    }
    if (!assetMap.has(dnToken)) {
      assetMap.set(dnToken, { ...m, outcome: "Down" });
      changed = true;
    }
  }
  return changed;
}

function pruneExpired() {
  const t = nowSec();
  for (const [id, info] of assetMap.entries()) {
    if (info.windowEnd + 180 < t) assetMap.delete(id);
  }
  for (const [wk, m] of marketMap.entries()) {
    if (m.windowEnd + 180 < t) marketMap.delete(wk);
  }
  for (const [bk] of bookState.entries()) {
    const parts = bk.split("|");
    const ws = Number(parts[0]);
    const dur = Number(parts[3]) || CFG.windowSec;
    if (ws + dur + 180 < t) bookState.delete(bk);
  }
  closeExpiredStreams();
}

// ── WebSocket Connections ──

// Track subscribed assets to avoid full reconnect on new markets
let subscribedAssets = new Set();

function connectPoly() {
  if (manualClose) return;
  const ids = [...assetMap.keys()];
  if (!ids.length) {
    log("POLY: no assets to subscribe yet");
    return;
  }

  const ws = new WS(`${CFG.wsBase}/ws/market`);
  polyWs = ws;
  subscribedAssets = new Set(ids);

  attachWsHandlers(ws, {
    open: () => {
      ws.send(JSON.stringify({ type: "market", assets_ids: ids }));
      log(`POLY connected, subscribed assets=${ids.length}`);
    },
    message: (raw) => {
      if (polyWs !== ws) return;
      const s = toUtf8(raw);
      if (s === "PING" || s === "PONG") return;

      let msgs;
      try { msgs = JSON.parse(s); } catch { return; }
      const arr = Array.isArray(msgs) ? msgs : [msgs];
      const t = nowMs();

      for (const msg of arr) {
        const assetId = String(msg.asset_id || "");
        if (!assetId) continue;
        const info = assetMap.get(assetId);
        if (!info) continue;

        const dur = info.duration || CFG.windowSec;
        const bk = keyBook(info.windowStart, info.coin, info.outcome, dur);
        const prev = bookState.get(bk) || { bid: null, ask: null, ts: null, updates: 0 };

        let bid = prev.bid;
        let ask = prev.ask;
        const et = msg.event_type;

        if (et === "book") {
          const bestBid = bestOf(msg.bids || msg.buys, "bid");
          const bestAsk = bestOf(msg.asks || msg.sells, "ask");
          if (bestBid) bid = bestBid.price;
          if (bestAsk) ask = bestAsk.price;
        } else if (et === "price_change" || et === "best_bid_ask") {
          if (msg.best_bid != null) bid = toNumber(msg.best_bid);
          if (msg.best_ask != null) ask = toNumber(msg.best_ask);
        } else {
          continue;
        }

        bookState.set(bk, {
          bid: Number.isFinite(bid) ? bid : prev.bid,
          ask: Number.isFinite(ask) ? ask : prev.ask,
          ts: t,
          updates: prev.updates + 1,
        });
      }
    },
    close: () => {
      if (!manualClose && polyWs === ws) {
        log("POLY closed, reconnect in 2s");
        setTimeout(connectPoly, 2000);
      }
    },
    error: (e) => {
      log(`POLY error: ${e.message}`);
    },
  });
}

function reconnectPoly() {
  subscribedAssets.clear();
  try { polyWs?.close(); } catch {}
  setTimeout(connectPoly, 250);
}

// Subscribe to new assets by forcing full reconnect
// Note: Polymarket WS ignores incremental subscription messages - only processes on initial connect
function subscribeNewAssets() {
  const allIds = [...assetMap.keys()];
  const newIds = allIds.filter(id => !subscribedAssets.has(id));

  if (newIds.length === 0) return;

  // Force full reconnect - incremental subscription doesn't work on Polymarket WS
  log(`Reconnecting POLY WS to subscribe ${newIds.length} new assets`);
  reconnectPoly();
}

function connectBinance() {
  if (manualClose) return;
  const streams = CFG.coins.map((c) => `${BINANCE_SYMS[c]}@aggTrade`).join("/");
  const ws = new WS(`${CFG.binanceWs}/stream?streams=${streams}`);
  binWs = ws;

  attachWsHandlers(ws, {
    open: () => {
      log("BINANCE connected");
    },
    message: (raw) => {
      if (binWs !== ws) return;
      try {
        const wrapper = JSON.parse(toUtf8(raw));
        const msg = wrapper.data || wrapper;
        const sym = String(msg.s || "").toLowerCase();
        const coin = BINANCE_COIN_BY_SYMBOL[sym];
        if (!coin) return;
        const price = toNumber(msg.p);
        if (!Number.isFinite(price) || price <= 0) return;

        const exchangeTs = Number(msg.T) || nowMs();
        const prev = cexState.get(coin) || { updates: 0 };
        cexState.set(coin, {
          price,
          exchangeTs,
          recvTs: nowMs(),
          updates: prev.updates + 1,
        });
      } catch {
        // ignore malformed
      }
    },
    close: () => {
      if (!manualClose && binWs === ws) {
        log("BINANCE closed, reconnect in 2s");
        setTimeout(connectBinance, 2000);
      }
    },
    error: (e) => {
      log(`BINANCE error: ${e.message}`);
    },
  });
}

// ── Per-Second Sampling ──

function sampleTick() {
  const t = nowSec();

  for (const [wk, mkt] of marketMap.entries()) {
    const ws = mkt.windowStart;
    const dur = mkt.duration || CFG.windowSec;
    const sec = t - ws;
    if (sec < 0 || sec >= dur) continue;

    const coin = mkt.coin;
    const coinLower = coin.toLowerCase();

    const upBook = bookState.get(keyBook(ws, coin, "Up", dur)) || {};
    const dnBook = bookState.get(keyBook(ws, coin, "Down", dur)) || {};
    const cex = cexState.get(coin);

    const uB = Number.isFinite(upBook.bid) ? round(upBook.bid) : null;
    const uA = Number.isFinite(upBook.ask) ? round(upBook.ask) : null;
    const dB = Number.isFinite(dnBook.bid) ? round(dnBook.bid) : null;
    const dA = Number.isFinite(dnBook.ask) ? round(dnBook.ask) : null;
    const cexPrice = cex?.price != null ? round(cex.price, 2) : null;

    // Track missing data reasons
    const hasBook = uB != null || uA != null || dB != null || dA != null;
    const hasCex = cexPrice != null;

    // Skip only if we have absolutely no data (no CEX price AND no book data)
    if (!hasBook && !hasCex) {
      skippedNoData++;
      continue;
    }

    // Track when we have CEX but no book (potential Polymarket subscription issue)
    if (!hasBook && hasCex) {
      skippedNoBook++;
    }

    const row = { sec, uB, uA, dB, dA, cex: cexPrice };
    const stream = openStream(ws, coinLower, dur);
    stream.write(JSON.stringify(row) + "\n");
    totalSamples++;
  }
}

// ── Cleanup ──

function cleanupOldFiles() {
  const cutoffSec = nowSec() - CFG.retentionSec;
  let deleted = 0;
  try {
    const files = fs.readdirSync(CFG.outDir);
    for (const f of files) {
      const m = f.match(/^price_(\d+)_/);
      if (!m) continue;
      const wts = Number(m[1]);
      if (wts < cutoffSec) {
        fs.unlinkSync(path.join(CFG.outDir, f));
        deleted++;
      }
    }
    if (deleted > 0) log(`cleanup: deleted ${deleted} files older than ${CFG.retentionSec}s`);
  } catch (e) {
    log(`cleanup error: ${e.message}`);
  }
}

// ── Background Loops ──

async function refreshLoop() {
  if (refreshInFlight) return;
  refreshInFlight = true;
  try {
    const mkts = await discoverMarkets();
    const changed = registerMarkets(mkts);
    pruneExpired();
    // Use incremental subscription instead of full reconnect to avoid gaps
    if (changed) subscribeNewAssets();
  } catch (e) {
    log(`refresh error: ${e.message}`);
  } finally {
    refreshInFlight = false;
  }
}

function statusLoop() {
  const activeWindows = [...marketMap.values()].filter(
    (m) => nowSec() <= m.windowEnd + 2
  );
  const bookCounts = {};
  for (const [bk, state] of bookState.entries()) {
    const parts = bk.split("|");
    const coin = parts[1];
    bookCounts[coin] = (bookCounts[coin] || 0) + (state.updates || 0);
  }
  const cexCounts = {};
  for (const [coin, state] of cexState.entries()) {
    cexCounts[coin] = state.updates || 0;
  }
  log(
    `status assets=${assetMap.size} windows=${marketMap.size} streams=${outputStreams.size} ` +
      `samples=${totalSamples} skippedNoData=${skippedNoData} skippedNoBook=${skippedNoBook} ` +
      `active=${activeWindows.length} ` +
      `wsPoly=${wsIsOpen(polyWs) ? "open" : "closed"} ` +
      `wsBin=${wsIsOpen(binWs) ? "open" : "closed"}`
  );
  log(`  bookUpdates: ${JSON.stringify(bookCounts)} cexUpdates: ${JSON.stringify(cexCounts)}`);
}

// ── Shutdown ──

async function shutdown(reason) {
  if (shuttingDown) return;
  shuttingDown = true;
  manualClose = true;

  try { polyWs?.close(); } catch {}
  try { binWs?.close(); } catch {}

  for (const [sk, s] of outputStreams.entries()) {
    try { s.end(); } catch {}
  }
  outputStreams.clear();

  log(`shutdown reason=${reason} samples=${totalSamples} runtime=${round((nowMs() - startMs) / 1000, 1)}s`);
  process.exit(0);
}

// ── Main ──

async function main() {
  ensureOutDir();
  startMs = nowMs();
  log(`Per-Second Price Recorder starting`);
  log(`outDir=${CFG.outDir} coins=${CFG.coins.join(",")} runtimeSec=${CFG.runtimeSec}`);

  await refreshLoop();
  connectBinance();
  connectPoly();

  const sampleTimer = setInterval(sampleTick, 1000);
  const refreshTimer = setInterval(refreshLoop, CFG.refreshSec * 1000);
  const statusTimer = setInterval(statusLoop, CFG.statusSec * 1000);
  const cleanupTimer = setInterval(cleanupOldFiles, CFG.cleanupIntervalSec * 1000);

  // Run cleanup once at start
  cleanupOldFiles();

  // runtimeSec=0 means run forever
  if (CFG.runtimeSec > 0) {
    setTimeout(() => shutdown("runtime_complete"), CFG.runtimeSec * 1000);
  }

  process.on("SIGINT", () => shutdown("sigint"));
  process.on("SIGTERM", () => shutdown("sigterm"));
  process.on("uncaughtException", (err) => {
    log(`uncaughtException: ${err?.stack || err}`);
    shutdown("uncaught_exception");
  });

  void sampleTimer;
  void refreshTimer;
  void statusTimer;
  void cleanupTimer;
}

main().catch((err) => {
  log(`fatal: ${err?.stack || err}`);
  process.exit(1);
});
