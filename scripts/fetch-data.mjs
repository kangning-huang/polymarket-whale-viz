#!/usr/bin/env node
/**
 * fetch-data.mjs — Data pipeline for Polymarket Whale Watch
 *
 * Fetches trader activity from Polymarket public APIs for the last 24h,
 * computes per-window stats, and writes JSON files for the frontend.
 *
 * Usage: node scripts/fetch-data.mjs
 * Output: public/data/manifest.json + public/data/windows/<ts>_<coin>.json
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DATA_DIR = join(ROOT, 'public', 'data');
const WINDOWS_DIR = join(DATA_DIR, 'windows');

// Load trader config
const config = JSON.parse(readFileSync(join(__dirname, 'traders.json'), 'utf-8'));
const { traders, coins, refTs, windowSec, lookbackHours } = config;

const DELAY_MS = 100;
const REQUEST_TIMEOUT = 8000;
const MAX_RETRIES = 3;

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

/**
 * Compute the window timestamp that a given epoch-second falls into.
 */
function windowForTs(ts) {
  return Math.floor((ts - refTs) / windowSec) * windowSec + refTs;
}

/**
 * Build event slug for a coin + window timestamp.
 * Pattern from API: "btc-updown-15m-1771817400"
 */
function eventSlug(coin, windowTs) {
  return `${coin}-updown-15m-${windowTs}`;
}

// ── Step 1: Compute target windows ──

function getTargetWindows() {
  const now = Math.floor(Date.now() / 1000);
  const cutoff = now - lookbackHours * 3600;
  const windows = [];

  // Start from the most recent completed window and go back
  let wts = windowForTs(now) - windowSec; // most recent COMPLETED window
  while (wts >= cutoff) {
    windows.push(wts);
    wts -= windowSec;
  }

  return windows;
}

// ── Step 2: Fetch trader activity ──

/**
 * Fetch ALL trades for a trader within a time range.
 * Uses offset pagination since startDate/endDate params may not work.
 */
async function fetchTraderActivity(traderAddr, startTs, endTs) {
  const allTrades = [];
  let offset = 0;
  const limit = 500;

  while (true) {
    const url = `https://data-api.polymarket.com/activity?user=${traderAddr}&limit=${limit}&offset=${offset}`;
    await sleep(DELAY_MS);
    const data = await fetchJson(url);
    if (!data || !Array.isArray(data) || data.length === 0) break;

    // Trades come newest-first
    let reachedStart = false;
    for (const trade of data) {
      if (trade.type !== 'TRADE') continue;
      if (trade.timestamp > endTs) continue; // too new, skip
      if (trade.timestamp < startTs) {
        reachedStart = true;
        break;
      }
      allTrades.push(trade);
    }

    if (reachedStart) break;
    if (data.length < limit) break;
    offset += limit;

    // Safety: don't paginate forever
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
  };
}

// ── Step 4: Fetch price history ──

async function fetchPriceHistory(tokenId, startTs, endTs) {
  const url = `https://clob.polymarket.com/prices-history?market=${tokenId}&startTs=${startTs}&endTs=${endTs}&fidelity=60`;
  await sleep(DELAY_MS);
  const data = await fetchJson(url);
  if (!data || !data.history) return [];
  return data.history; // [{t, p}, ...]
}

// ── Step 5: Process trades into window data ──

function processWindowTrades(trades, windowTs, coin) {
  // Filter trades for this specific coin+window
  const slug = eventSlug(coin, windowTs);
  const windowTrades = trades.filter(t =>
    t.eventSlug === slug &&
    t.timestamp >= windowTs &&
    t.timestamp < windowTs + windowSec
  );

  if (windowTrades.length === 0) return null;

  // Sort by timestamp ascending
  windowTrades.sort((a, b) => a.timestamp - b.timestamp);

  // Build trade objects
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
  const inventory = { Up: [], Down: [] }; // queues of { price, tokens }
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
      // SELL — FIFO matching
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

  // Compute stats
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
      settlementPnl: 0, // computed after we know settlement
      netPnl: 0,
    },
    // Remaining inventory for settlement calc
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

  // Settlement P&L = tokens_held * (settle_price - avg_cost)
  const upPnl = traderData._remainingUp * (upSettle - (traderData._remainingUp > 0 ? traderData._remainingUpCost / traderData._remainingUp : 0));
  const downPnl = traderData._remainingDown * (downSettle - (traderData._remainingDown > 0 ? traderData._remainingDownCost / traderData._remainingDown : 0));

  traderData.stats.settlementPnl = Math.round((upPnl + downPnl) * 100) / 100;
  traderData.stats.netPnl = Math.round((traderData.stats.spreadPnl + traderData.stats.settlementPnl) * 100) / 100;

  // Clean up internal fields
  delete traderData._remainingUp;
  delete traderData._remainingDown;
  delete traderData._remainingUpCost;
  delete traderData._remainingDownCost;
}

// ── Main pipeline ──

async function main() {
  console.log('Polymarket Whale Watch — Data Pipeline');
  console.log(`Traders: ${traders.map(t => t.name).join(', ')}`);
  console.log(`Coins: ${coins.join(', ')}`);
  console.log(`Lookback: ${lookbackHours}h`);

  // Ensure output dirs
  mkdirSync(WINDOWS_DIR, { recursive: true });

  // Step 1: Compute target windows
  const targetWindows = getTargetWindows();
  console.log(`\nTarget windows: ${targetWindows.length} (${new Date(targetWindows[0] * 1000).toISOString()} to ${new Date(targetWindows[targetWindows.length - 1] * 1000).toISOString()})`);

  // Step 2: Fetch all trader activity for the lookback period
  const traderTrades = {};
  for (const trader of traders) {
    const startTs = targetWindows[targetWindows.length - 1]; // oldest window
    const endTs = targetWindows[0] + windowSec; // end of newest window
    console.log(`\nFetching ${trader.name} activity (${startTs} to ${endTs})...`);
    traderTrades[trader.name] = await fetchTraderActivity(trader.address, startTs, endTs);
    console.log(`  Got ${traderTrades[trader.name].length} trades`);
  }

  // Step 3: Process each window × coin
  const manifest = [];
  let windowsWritten = 0;
  let windowsSkipped = 0;
  let windowsCached = 0;

  for (const wts of targetWindows) {
    for (const coin of coins) {
      const filename = `${wts}_${coin}.json`;
      const filepath = join(WINDOWS_DIR, filename);

      // Check cache
      if (existsSync(filepath)) {
        // Load cached manifest entry
        try {
          const cached = JSON.parse(readFileSync(filepath, 'utf-8'));
          const entry = {
            windowTs: wts,
            coin,
            traders: [],
          };
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
        } catch {
          // Corrupted cache, re-fetch
        }
      }

      // Check if any trader has trades in this window
      const traderResults = {};
      let hasAnyTrades = false;

      for (const trader of traders) {
        const slug = eventSlug(coin, wts);
        const windowTrades = (traderTrades[trader.name] || []).filter(t =>
          t.eventSlug === slug &&
          t.timestamp >= wts &&
          t.timestamp < wts + windowSec
        );
        if (windowTrades.length > 0) hasAnyTrades = true;
      }

      if (!hasAnyTrades) {
        windowsSkipped++;
        continue;
      }

      // Fetch market info
      const slug = eventSlug(coin, wts);
      const marketInfo = await fetchMarketInfo(slug);
      if (!marketInfo) {
        console.log(`  Skip ${coin} ${wts} — no market info`);
        windowsSkipped++;
        continue;
      }

      // Determine settlement
      const upPrice = parseFloat(marketInfo.outcomePrices[0] || '0.5');
      const downPrice = parseFloat(marketInfo.outcomePrices[1] || '0.5');
      const settlement = {
        winner: upPrice > 0.5 ? 'Up' : 'Down',
        upPrice,
        downPrice,
      };

      // Only include resolved windows (clear winner)
      if (!marketInfo.closed && upPrice > 0.1 && upPrice < 0.9) {
        windowsSkipped++;
        continue;
      }

      // Fetch price history
      const upTokenId = marketInfo.clobTokenIds[0];
      let prices = [];
      if (upTokenId) {
        const history = await fetchPriceHistory(upTokenId, wts, wts + windowSec);
        prices = history.map(p => ({
          t: p.t,
          sec: p.t - wts,
          p: parseFloat(p.p),
        }));
      }

      // Process trades for each trader
      const tradersData = {};
      for (const trader of traders) {
        const result = processWindowTrades(traderTrades[trader.name] || [], wts, coin);
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

      // Write window detail
      const windowDetail = {
        windowTs: wts,
        coin,
        conditionId: marketInfo.conditionId,
        settlement,
        prices,
        traders: tradersData,
      };

      writeFileSync(filepath, JSON.stringify(windowDetail));
      windowsWritten++;

      // Add to manifest
      const entry = {
        windowTs: wts,
        coin,
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
      console.log(`  ${coin.toUpperCase()} ${new Date(wts * 1000).toISOString().slice(11, 16)} — ${traderSummary}`);
    }
  }

  // Sort manifest by time (newest first)
  manifest.sort((a, b) => b.windowTs - a.windowTs);

  // Write manifest
  const manifestData = {
    generated: new Date().toISOString(),
    windows: manifest,
    traders: traders.map(t => ({ address: t.address, name: t.name, color: t.color })),
  };
  writeFileSync(join(DATA_DIR, 'manifest.json'), JSON.stringify(manifestData, null, 2));

  console.log(`\nDone! ${windowsWritten} written, ${windowsCached} cached, ${windowsSkipped} skipped`);
  console.log(`Manifest: ${manifest.length} windows`);
}

main().catch(e => {
  console.error('Pipeline failed:', e);
  process.exit(1);
});
