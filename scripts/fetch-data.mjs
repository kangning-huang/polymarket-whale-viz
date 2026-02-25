#!/usr/bin/env node
/**
 * fetch-data.mjs — Data pipeline for Polybot Arena
 *
 * Fetches trader activity from Polymarket public APIs for the last 24h,
 * downloads per-second price data from VPS (if available),
 * computes per-window stats, and writes JSON files for the frontend.
 *
 * Usage: node scripts/fetch-data.mjs
 * Output: public/data/manifest.json + public/data/windows/<ts>_<coin>.json
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, unlinkSync } from 'fs';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DATA_DIR = join(ROOT, 'public', 'data');
const WINDOWS_DIR = join(DATA_DIR, 'windows');
const PRICES_DIR = join(DATA_DIR, 'prices');

// Load trader config
const config = JSON.parse(readFileSync(join(__dirname, 'traders.json'), 'utf-8'));
const { traders, coins, refTs, windowSec, lookbackHours } = config;
const windowDurations = config.windowDurations || [windowSec];
const DURATION_LABELS = { 900: '15m', 300: '5m', 3600: '1h' };

const DELAY_MS = 100;
const REQUEST_TIMEOUT = 8000;
const MAX_RETRIES = 3;

// VPS config from environment
const VPS_SSH_KEY = process.env.VPS_SSH_KEY_PATH || '';
const VPS_HOST = process.env.VPS_HOST || '';
const VPS_PRICES_PATH = process.env.VPS_PRICES_PATH || '/opt/polymarket/data/raw/prices/';

// ── Helpers ──

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function fetchJson(url, retries = MAX_RETRIES) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);
      if (res.status === 429 || res.status >= 500) {
        const wait = Math.min(1000 * 2 ** attempt, 10000);
        console.warn(`  [${res.status}] ${url} — retry in ${wait}ms`);
        await sleep(wait);
        continue;
      }
      if (!res.ok) {
        console.warn(`  [${res.status}] ${url}`);
        return null;
      }
      return await res.json();
    } catch (e) {
      if (attempt < retries) {
        await sleep(1000 * attempt);
        continue;
      }
      console.warn(`  FAIL ${url}: ${e.message}`);
      return null;
    }
  }
  return null;
}

function windowForTs(ts, dur = windowSec) {
  // Hourly markets align to UTC hours, not to refTs
  if (dur === 3600) return Math.floor(ts / 3600) * 3600;
  return Math.floor((ts - refTs) / dur) * dur + refTs;
}

// For 5m/15m markets: timestamp-based slug
// For 1h markets: need to look up from series (handled separately)
function eventSlug(coin, windowTs, dur = 900) {
  if (dur === 3600) return null; // hourly markets use series-based slugs
  const label = DURATION_LABELS[dur] || `${dur}s`;
  return `${coin}-updown-${label}-${windowTs}`;
}

// Hourly market series mapping
const HOURLY_SERIES = {
  btc: 'btc-up-or-down-hourly',
  eth: 'eth-up-or-down-hourly',
  sol: 'sol-up-or-down-hourly',
  xrp: 'xrp-up-or-down-hourly',
};

// Cache for hourly market slug lookups (windowTs -> slug)
const hourlySlugCache = new Map();

// ── Step 0: Download price files from VPS ──

function downloadPriceFiles() {
  mkdirSync(PRICES_DIR, { recursive: true });

  if (!VPS_SSH_KEY || !VPS_HOST) {
    console.log('\nNo VPS_SSH_KEY_PATH or VPS_HOST set — skipping VPS price download');
    return;
  }

  console.log(`\nDownloading prices from VPS ${VPS_HOST}...`);
  try {
    execSync(
      `rsync -avz --ignore-existing -e "ssh -i ${VPS_SSH_KEY} -o StrictHostKeyChecking=no" ` +
      `ubuntu@${VPS_HOST}:${VPS_PRICES_PATH} ${PRICES_DIR}/`,
      { stdio: 'pipe', timeout: 60000 }
    );
    const files = readdirSync(PRICES_DIR).filter(f => f.startsWith('price_'));
    console.log(`  Downloaded/cached ${files.length} price files`);
  } catch (e) {
    console.warn(`  VPS sync failed: ${e.message}. Continuing with API fallback.`);
  }
}

// ── Step 0b: Load per-second prices from VPS data ──

function loadVpsPrices(windowTs, coin, duration = 900) {
  // Try duration-labeled file first (new format), then legacy format
  const durLabel = DURATION_LABELS[duration] || `${duration}s`;
  let filepath = join(PRICES_DIR, `price_${windowTs}_${coin}_${durLabel}.jsonl`);
  if (!existsSync(filepath)) {
    // Fallback to legacy format (15m only, no label)
    if (duration === 900) {
      filepath = join(PRICES_DIR, `price_${windowTs}_${coin}.jsonl`);
    }
    if (!existsSync(filepath)) return null;
  }

  try {
    const lines = readFileSync(filepath, 'utf-8').trim().split('\n');
    if (lines.length < 10) return null; // too sparse

    const points = [];
    for (const line of lines) {
      if (!line) continue;
      const row = JSON.parse(line);

      // Filter by window duration - only include prices within the window
      if (row.sec >= duration) continue;

      const uB = row.uB;
      const uA = row.uA;
      const dB = row.dB;
      const dA = row.dA;

      // Mid price from Up bid/ask
      let mid = null;
      if (uB != null && uA != null) mid = (uB + uA) / 2;
      else if (uB != null) mid = uB;
      else if (uA != null) mid = uA;

      if (mid == null) continue;

      points.push({
        t: windowTs + row.sec,
        sec: row.sec,
        p: Math.round(mid * 1000) / 1000,
        bid: uB != null ? Math.round(uB * 1000) / 1000 : undefined,
        ask: uA != null ? Math.round(uA * 1000) / 1000 : undefined,
        dnBid: dB != null ? Math.round(dB * 1000) / 1000 : undefined,
        dnAsk: dA != null ? Math.round(dA * 1000) / 1000 : undefined,
        cex: row.cex != null ? row.cex : undefined,
      });
    }

    return points.length >= 10 ? points : null;
  } catch {
    return null;
  }
}

// ── Step 1: Compute target windows ──

function getTargetWindows() {
  const now = Math.floor(Date.now() / 1000);
  const cutoff = now - lookbackHours * 3600;
  const windows = [];

  for (const dur of windowDurations) {
    let wts = windowForTs(now, dur) - dur;
    while (wts >= cutoff) {
      windows.push({ ts: wts, duration: dur });
      wts -= dur;
    }
  }

  // Sort newest first, dedup by ts+duration
  windows.sort((a, b) => b.ts - a.ts);
  return windows;
}

// ── Step 2: Fetch trader activity ──

async function fetchTraderActivity(traderAddr, startTs, endTs) {
  const allTrades = [];
  let offset = 0;
  const limit = 500;

  while (true) {
    const url = `https://data-api.polymarket.com/activity?user=${traderAddr}&limit=${limit}&offset=${offset}`;
    await sleep(DELAY_MS);
    const data = await fetchJson(url);
    if (!data || !Array.isArray(data) || data.length === 0) break;

    let reachedStart = false;
    for (const trade of data) {
      if (trade.type !== 'TRADE') continue;
      if (trade.timestamp > endTs) continue;
      if (trade.timestamp < startTs) {
        reachedStart = true;
        break;
      }
      allTrades.push(trade);
    }

    if (reachedStart) break;
    if (data.length < limit) break;
    offset += limit;

    if (offset > 50000) {
      console.warn(`  Stopping pagination at offset ${offset} for ${traderAddr}`);
      break;
    }
  }

  return allTrades;
}

// ── Step 3: Fetch market info from Gamma ──

async function fetchMarketInfo(slug) {
  const url = `https://gamma-api.polymarket.com/events?slug=${slug}`;
  await sleep(DELAY_MS);
  const data = await fetchJson(url);
  if (!data || !Array.isArray(data) || data.length === 0) return null;

  const event = data[0];
  if (!event.markets || event.markets.length === 0) return null;

  const market = event.markets[0];
  return {
    conditionId: market.conditionId,
    clobTokenIds: market.clobTokenIds ? JSON.parse(market.clobTokenIds) : [],
    outcomePrices: market.outcomePrices ? JSON.parse(market.outcomePrices) : [],
    outcomes: market.outcomes ? JSON.parse(market.outcomes) : ['Up', 'Down'],
    closed: market.closed,
    slug: market.slug,
  };
}

// Fetch hourly market info by querying the series endpoint and matching by window timestamp
async function fetchHourlyMarketInfo(coin, windowTs) {
  const seriesSlug = HOURLY_SERIES[coin];
  if (!seriesSlug) return null;

  // Step 1: Query series to find event slugs (series endpoint doesn't include markets array)
  const seriesUrl = `https://gamma-api.polymarket.com/series?slug=${seriesSlug}`;
  await sleep(DELAY_MS);
  const seriesData = await fetchJson(seriesUrl);
  if (!seriesData || !Array.isArray(seriesData) || seriesData.length === 0) return null;
  if (!seriesData[0].events || seriesData[0].events.length === 0) return null;

  // Find the event matching our window timestamp (include closed events)
  for (const event of seriesData[0].events) {
    // For hourly markets, endDate is when window closes
    // Window start = endDate - 3600 (1 hour before)
    const endDateStr = event.endDate;
    if (!endDateStr) continue;

    const endTs = Math.floor(new Date(endDateStr).getTime() / 1000);
    const startTs = endTs - 3600; // 1 hour before end

    // Allow some tolerance (within same hour)
    if (Math.abs(startTs - windowTs) < 60) {
      // Step 2: Query events endpoint to get full market info
      const eventUrl = `https://gamma-api.polymarket.com/events?slug=${event.slug}`;
      await sleep(DELAY_MS);
      const eventData = await fetchJson(eventUrl);
      if (!eventData || !Array.isArray(eventData) || eventData.length === 0) continue;

      const market = eventData[0].markets?.[0];
      if (!market) continue;

      hourlySlugCache.set(`${windowTs}_${coin}`, market.slug);
      return {
        conditionId: market.conditionId,
        clobTokenIds: market.clobTokenIds ? JSON.parse(market.clobTokenIds) : [],
        outcomePrices: market.outcomePrices ? JSON.parse(market.outcomePrices) : [],
        outcomes: market.outcomes ? JSON.parse(market.outcomes) : ['Up', 'Down'],
        closed: market.closed,
        slug: market.slug,
      };
    }
  }
  return null;
}

// ── Step 4: Fetch price history ──

async function fetchPriceHistory(tokenId, startTs, endTs) {
  // Use fidelity=1 — short-lived markets (5m/15m) return 0 points at fidelity=60
  const url = `https://clob.polymarket.com/prices-history?market=${tokenId}&startTs=${startTs}&endTs=${endTs}&fidelity=1`;
  await sleep(DELAY_MS);
  const data = await fetchJson(url);
  if (!data || !data.history) return [];
  return data.history;
}

// ── Step 5: Process trades into window data ──

function processWindowTrades(trades, windowTs, coin, dur = 900, marketSlug = null) {
  // For hourly markets, use the cached slug; for others, compute it
  const slug = dur === 3600 ? marketSlug : eventSlug(coin, windowTs, dur);
  if (!slug) return null;

  const windowTrades = trades.filter(t =>
    t.eventSlug === slug &&
    t.timestamp >= windowTs &&
    t.timestamp < windowTs + dur
  );

  if (windowTrades.length === 0) return null;

  windowTrades.sort((a, b) => a.timestamp - b.timestamp);

  const processedTrades = windowTrades.map(t => ({
    ts: t.timestamp,
    sec: t.timestamp - windowTs,
    side: t.side,
    outcome: t.outcome || (t.outcomeIndex === 0 ? 'Up' : 'Down'),
    tokens: t.size,
    usdc: t.usdcSize,
    price: t.price,
  }));

  // FIFO inventory tracking
  const inventory = { Up: [], Down: [] };
  const position = { upTokens: 0, downTokens: 0, upUsdc: 0, downUsdc: 0 };
  const inventorySnapshots = [];
  let spreadPnl = 0;

  for (const trade of processedTrades) {
    const outcome = trade.outcome;
    const isUp = outcome === 'Up';

    if (trade.side === 'BUY') {
      inventory[outcome].push({ price: trade.price, tokens: trade.tokens });
      if (isUp) {
        position.upTokens += trade.tokens;
        position.upUsdc += trade.usdc;
      } else {
        position.downTokens += trade.tokens;
        position.downUsdc += trade.usdc;
      }
    } else {
      let remaining = trade.tokens;
      while (remaining > 0 && inventory[outcome].length > 0) {
        const oldest = inventory[outcome][0];
        const matched = Math.min(remaining, oldest.tokens);
        spreadPnl += matched * (trade.price - oldest.price);
        oldest.tokens -= matched;
        remaining -= matched;
        if (oldest.tokens <= 0) inventory[outcome].shift();
      }
      if (isUp) {
        position.upTokens = Math.max(0, position.upTokens - trade.tokens);
        position.upUsdc = Math.max(0, position.upUsdc - trade.usdc);
      } else {
        position.downTokens = Math.max(0, position.downTokens - trade.tokens);
        position.downUsdc = Math.max(0, position.downUsdc - trade.usdc);
      }
    }

    inventorySnapshots.push({
      sec: trade.sec,
      upTokens: Math.round(position.upTokens * 100) / 100,
      downTokens: Math.round(position.downTokens * 100) / 100,
      upUsdc: Math.round(position.upUsdc * 100) / 100,
      downUsdc: Math.round(position.downUsdc * 100) / 100,
    });
  }

  const buys = processedTrades.filter(t => t.side === 'BUY');
  const sells = processedTrades.filter(t => t.side === 'SELL');
  const buyUsdc = buys.reduce((s, t) => s + t.usdc, 0);
  const sellUsdc = sells.reduce((s, t) => s + t.usdc, 0);

  return {
    trades: processedTrades,
    inventory: inventorySnapshots,
    stats: {
      buyCount: buys.length,
      sellCount: sells.length,
      buyUsdc: Math.round(buyUsdc * 100) / 100,
      sellUsdc: Math.round(sellUsdc * 100) / 100,
      avgBuy: buys.length > 0 ? Math.round(buys.reduce((s, t) => s + t.price, 0) / buys.length * 1000) / 1000 : 0,
      avgSell: sells.length > 0 ? Math.round(sells.reduce((s, t) => s + t.price, 0) / sells.length * 1000) / 1000 : 0,
      spreadPnl: Math.round(spreadPnl * 100) / 100,
      settlementPnl: 0,
      netPnl: 0,
    },
    _remainingUp: inventory.Up.reduce((s, e) => s + e.tokens, 0),
    _remainingDown: inventory.Down.reduce((s, e) => s + e.tokens, 0),
    _remainingUpCost: inventory.Up.reduce((s, e) => s + e.tokens * e.price, 0),
    _remainingDownCost: inventory.Down.reduce((s, e) => s + e.tokens * e.price, 0),
  };
}

function computeSettlement(traderData, settlement) {
  if (!traderData) return;
  const upSettle = settlement.upPrice;
  const downSettle = settlement.downPrice;

  const upPnl = traderData._remainingUp * (upSettle - (traderData._remainingUp > 0 ? traderData._remainingUpCost / traderData._remainingUp : 0));
  const downPnl = traderData._remainingDown * (downSettle - (traderData._remainingDown > 0 ? traderData._remainingDownCost / traderData._remainingDown : 0));

  traderData.stats.settlementPnl = Math.round((upPnl + downPnl) * 100) / 100;
  traderData.stats.netPnl = Math.round((traderData.stats.spreadPnl + traderData.stats.settlementPnl) * 100) / 100;

  delete traderData._remainingUp;
  delete traderData._remainingDown;
  delete traderData._remainingUpCost;
  delete traderData._remainingDownCost;
}

// ── Main pipeline ──

async function main() {
  console.log('Polybot Arena — Data Pipeline');
  console.log(`Traders: ${traders.map(t => t.name).join(', ')}`);
  console.log(`Coins: ${coins.join(', ')}`);
  console.log(`Lookback: ${lookbackHours}h`);

  // Ensure output dirs
  mkdirSync(WINDOWS_DIR, { recursive: true });
  mkdirSync(PRICES_DIR, { recursive: true });

  // Step 0: Download VPS price files
  downloadPriceFiles();

  // Step 1: Compute target windows (multiple durations)
  const targetWindows = getTargetWindows();
  console.log(`\nTarget windows: ${targetWindows.length} (durations: ${windowDurations.map(d => DURATION_LABELS[d] || d).join(', ')})`);
  console.log(`  Range: ${new Date(targetWindows[targetWindows.length - 1].ts * 1000).toISOString()} to ${new Date(targetWindows[0].ts * 1000).toISOString()}`);

  // Step 2: Fetch all trader activity for the lookback period
  const traderTrades = {};
  for (const trader of traders) {
    const startTs = targetWindows[targetWindows.length - 1].ts;
    const endTs = targetWindows[0].ts + targetWindows[0].duration;
    console.log(`\nFetching ${trader.name} activity (${startTs} to ${endTs})...`);
    traderTrades[trader.name] = await fetchTraderActivity(trader.address, startTs, endTs);
    console.log(`  Got ${traderTrades[trader.name].length} trades`);
  }

  // Step 3: Process each window x coin
  const manifest = [];
  let windowsWritten = 0;
  let windowsSkipped = 0;
  let windowsCached = 0;
  let vpsPriceWindows = 0;

  for (const { ts: wts, duration: dur } of targetWindows) {
    const durLabel = DURATION_LABELS[dur] || `${dur}s`;
    for (const coin of coins) {
      const filename = `${wts}_${coin}_${durLabel}.json`;
      const filepath = join(WINDOWS_DIR, filename);

      // Also check legacy filename (15m only, no label)
      const legacyFilepath = dur === 900 ? join(WINDOWS_DIR, `${wts}_${coin}.json`) : null;

      // Check cache
      const cacheFile = existsSync(filepath) ? filepath : (legacyFilepath && existsSync(legacyFilepath) ? legacyFilepath : null);
      if (cacheFile) {
        try {
          const cached = JSON.parse(readFileSync(cacheFile, 'utf-8'));
          const priceCount = cached.prices?.length ?? 0;
          const maxSec = cached.prices?.length > 0 ? Math.max(...cached.prices.map(p => p.sec)) : 0;
          const timeCoverage = maxSec / dur;
          const minTimeCoverage = 0.8;

          // Delete cache files with incomplete time coverage (they'll be re-fetched)
          if (timeCoverage < minTimeCoverage) {
            console.log(`  Removing incomplete cache ${cacheFile.split('/').pop()} (${maxSec}s/${dur}s = ${Math.round(timeCoverage * 100)}% coverage)`);
            try { unlinkSync(cacheFile); } catch { /* ignore */ }
            // Continue to re-fetch this window
          } else {
            const entry = { windowTs: wts, coin, duration: dur, priceCount, traders: [] };
            for (const [name, data] of Object.entries(cached.traders || {})) {
              entry.traders.push({
                name,
                buyCount: data.stats?.buyCount ?? 0,
                sellCount: data.stats?.sellCount ?? 0,
                netPnl: data.stats?.netPnl ?? 0,
              });
            }
            if (entry.traders.length > 0) {
              manifest.push(entry);
            }
            windowsCached++;
            continue;
          }
        } catch {
          // Corrupted cache, re-fetch
        }
      }

      // Check if any trader has trades in this window (only traders who trade this duration)
      // For hourly markets, we need to check trades by time range since we don't know the slug yet
      let hasAnyTrades = false;
      for (const trader of traders) {
        // Skip traders who don't trade this duration
        const traderDurations = trader.durations || windowDurations;
        if (!traderDurations.includes(dur)) continue;

        const windowTrades = (traderTrades[trader.name] || []).filter(t => {
          // For hourly markets, match by timestamp range (slug will be verified later)
          if (dur === 3600) {
            return t.timestamp >= wts && t.timestamp < wts + dur;
          }
          // For 5m/15m markets, match by slug
          const slug = eventSlug(coin, wts, dur);
          return t.eventSlug === slug && t.timestamp >= wts && t.timestamp < wts + dur;
        });
        if (windowTrades.length > 0) hasAnyTrades = true;
      }

      if (!hasAnyTrades) {
        windowsSkipped++;
        continue;
      }

      // Fetch market info (hourly markets use series-based lookup)
      let marketInfo;
      if (dur === 3600) {
        marketInfo = await fetchHourlyMarketInfo(coin, wts);
      } else {
        const slug = eventSlug(coin, wts, dur);
        marketInfo = await fetchMarketInfo(slug);
      }
      if (!marketInfo) {
        console.log(`  Skip ${coin} ${durLabel} ${wts} — no market info`);
        windowsSkipped++;
        continue;
      }
      const marketSlug = marketInfo.slug;

      // Determine settlement
      const upPrice = parseFloat(marketInfo.outcomePrices[0] || '0.5');
      const downPrice = parseFloat(marketInfo.outcomePrices[1] || '0.5');
      const settlement = {
        winner: upPrice > 0.5 ? 'Up' : 'Down',
        upPrice,
        downPrice,
      };

      if (!marketInfo.closed && upPrice > 0.1 && upPrice < 0.9) {
        windowsSkipped++;
        continue;
      }

      // Try VPS per-second prices first (best quality)
      let prices = loadVpsPrices(wts, coin, dur);
      if (prices) {
        vpsPriceWindows++;
      } else {
        // Fallback: fetch from CLOB API (1s fidelity)
        const upTokenId = marketInfo.clobTokenIds[0];
        if (upTokenId) {
          const history = await fetchPriceHistory(upTokenId, wts, wts + dur);
          if (history && history.length >= 3) {
            prices = history.map(pt => ({
              t: pt.t,
              sec: pt.t - wts,
              p: Math.round(pt.p * 1000) / 1000,
            }));
            console.log(`  ${coin.toUpperCase()} ${durLabel} ${new Date(wts * 1000).toISOString().slice(11, 16)} — using API prices (${prices.length} pts)`);
          }
        }
      }
      if (!prices) {
        console.log(`  Skip ${coin.toUpperCase()} ${durLabel} ${new Date(wts * 1000).toISOString().slice(11, 16)} — no price data`);
        windowsSkipped++;
        continue;
      }

      // Process trades for each trader (only traders who trade this duration)
      const tradersData = {};
      for (const trader of traders) {
        // Skip traders who don't trade this duration
        const traderDurations = trader.durations || windowDurations;
        if (!traderDurations.includes(dur)) continue;

        const result = processWindowTrades(traderTrades[trader.name] || [], wts, coin, dur, marketSlug);
        if (result) {
          computeSettlement(result, settlement);
          tradersData[trader.name] = {
            trades: result.trades,
            inventory: result.inventory,
            stats: result.stats,
          };
        }
      }

      if (Object.keys(tradersData).length === 0) {
        windowsSkipped++;
        continue;
      }

      // Filter out windows with incomplete price data
      // Check both point count AND time coverage (max sec value should cover most of window)
      const maxSec = Math.max(...prices.map(p => p.sec));
      const timeCoverage = maxSec / dur;
      const minTimeCoverage = 0.8; // Require prices to cover at least 80% of window duration

      if (timeCoverage < minTimeCoverage) {
        console.log(`  Skip ${coin.toUpperCase()} ${durLabel} ${new Date(wts * 1000).toISOString().slice(11, 16)} — incomplete time coverage (${maxSec}s/${dur}s = ${Math.round(timeCoverage * 100)}%, need ${minTimeCoverage * 100}%)`);
        windowsSkipped++;
        continue;
      }

      // Write window detail
      const windowDetail = {
        windowTs: wts,
        coin,
        duration: dur,
        conditionId: marketInfo.conditionId,
        settlement,
        prices,
        traders: tradersData,
      };

      writeFileSync(filepath, JSON.stringify(windowDetail));
      windowsWritten++;

      const entry = {
        windowTs: wts,
        coin,
        duration: dur,
        priceCount: prices.length,
        traders: Object.entries(tradersData).map(([name, data]) => ({
          name,
          buyCount: data.stats.buyCount,
          sellCount: data.stats.sellCount,
          netPnl: data.stats.netPnl,
        })),
      };
      manifest.push(entry);

      const traderSummary = Object.entries(tradersData)
        .map(([n, d]) => `${n}: ${d.stats.buyCount}B/${d.stats.sellCount}S $${d.stats.netPnl}`)
        .join(', ');
      console.log(`  ${coin.toUpperCase()} ${durLabel} ${new Date(wts * 1000).toISOString().slice(11, 16)} — ${traderSummary}`);
    }
  }

  // Sort manifest by time (newest first)
  manifest.sort((a, b) => b.windowTs - a.windowTs);

  // Write manifest (include full trader config for frontend)
  const manifestData = {
    generated: new Date().toISOString(),
    windows: manifest,
    traders: traders.map(t => ({
      address: t.address,
      name: t.name,
      color: t.color,
      description: t.description || '',
      profileUrl: t.profileUrl || '',
      screenshot: t.screenshot || '',
      durations: t.durations || windowDurations,
    })),
  };
  writeFileSync(join(DATA_DIR, 'manifest.json'), JSON.stringify(manifestData, null, 2));

  console.log(`\nDone! ${windowsWritten} written, ${windowsCached} cached, ${windowsSkipped} skipped`);
  console.log(`VPS prices used: ${vpsPriceWindows} windows`);
  console.log(`Manifest: ${manifest.length} windows`);
}

main().catch(e => {
  console.error('Pipeline failed:', e);
  process.exit(1);
});
