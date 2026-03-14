#!/usr/bin/env node

/**
 * Live Data Aggregator for Polybot Arena
 *
 * Connects to existing ws_price_recorder.cjs WebSocket infrastructure
 * and Polymarket Data API to aggregate real-time price and trade data.
 * Broadcasts via in-memory state that Express SSE endpoint consumes.
 *
 * Run with: RUNTIME_SEC=0 node ws_live_aggregator.cjs
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Configuration
const DATA_DIR = process.env.VPS_PRICES_PATH || '/opt/polymarket/data/raw/prices';
const TRADE_POLL_INTERVAL = Number(process.env.TRADE_POLL_INTERVAL || 5000);
const PRICE_PUBLISH_INTERVAL = 1000; // Publish aggregated prices every 1s
const CLEANUP_INTERVAL = 60000; // Clean old data every 60s

// Supported markets
const MARKETS = ['btc', 'eth', 'sol', 'xrp'];
const DURATIONS = [300, 900, 3600]; // 5m, 15m, 1h

// In-memory state (shared with Express via module.exports)
const liveState = {
  prices: {}, // { coin: { duration: [{ sec, p, bid, ask, cex, ts }] } }
  trades: {}, // { coin: { duration: { botName: [{ trade objects }] } } }
  lastUpdate: {}, // { coin_duration: timestamp }
  connections: 0, // Active SSE connections
};

// Track current window timestamps to detect window boundaries
const currentWindowTs = {}; // { coin_duration: windowTimestamp }
const priceFileState = new Map(); // { coin_duration -> { filePath, position, partialLine, windowTs } }
const tradeState = new Map(); // { botAddress_coin_duration -> latestTs }
let pricesUpdateInFlight = false;
let tradesUpdateInFlight = false;
let lastPriceScanTs = 0;

// Trader configuration (load from traders.json)
let traders = [];
try {
  const candidatePaths = [
    path.join(__dirname, '../scripts/traders.json'),
    path.join(__dirname, './scripts/traders.json'),
  ];
  const tradersPath = candidatePaths.find(fs.existsSync);
  if (!tradersPath) {
    throw new Error(`traders.json not found in: ${candidatePaths.join(', ')}`);
  }
  const config = JSON.parse(fs.readFileSync(tradersPath, 'utf8'));
  traders = config.traders || [];
  console.log(`[Aggregator] Loaded ${traders.length} traders`);
} catch (err) {
  console.error('[Aggregator] Failed to load traders.json:', err.message);
  process.exit(1);
}

// Track last seen trade hashes to avoid duplicates
const seenTrades = new Map(); // { address_txHash: timestamp }
const recentStats = {
  priceAppends: 0,
  tradePolls: 0,
  newTrades: 0,
  skippedPriceOverlaps: 0,
  skippedTradeOverlaps: 0,
};

/**
 * Convert duration in seconds to string format used in filenames
 */
function durationToString(duration) {
  if (duration === 300) return '5m';
  if (duration === 900) return '15m';
  if (duration === 3600) return '1h';
  return duration.toString(); // fallback
}

/**
 * Read latest price file for a market window
 */
function getLatestPriceFilename(coin, duration) {
  try {
    const durationStr = durationToString(duration);
    const files = fs.readdirSync(DATA_DIR)
      .filter(f => f.startsWith('price_') && f.includes(`_${coin}_${durationStr}`))
      .sort()
      .reverse();

    if (files.length === 0) {
      return null;
    }
    return files[0];
  } catch (err) {
    console.error(`[Aggregator] Error listing price files for ${coin}_${duration}:`, err.message);
    return null;
  }
}

function parseWindowTsFromFilename(filename) {
  const match = filename && filename.match(/price_(\d+)_/);
  return match ? parseInt(match[1], 10) : Math.floor(Date.now() / 1000);
}

function transformPriceRow(raw, windowTs) {
  return {
    t: windowTs + raw.sec,
    sec: raw.sec,
    p: raw.uB || 0.5,
    bid: raw.uB || null,
    ask: raw.uA || null,
    dnBid: raw.dB || null,
    dnAsk: raw.dA || null,
    cex: raw.cex || null,
  };
}

function appendPriceRows(coin, duration, rows, windowTs) {
  if (!rows.length) return 0;

  if (!liveState.prices[coin]) liveState.prices[coin] = {};
  if (!liveState.prices[coin][duration]) liveState.prices[coin][duration] = [];
  if (!liveState.trades[coin]) liveState.trades[coin] = {};
  if (!liveState.trades[coin][duration]) liveState.trades[coin][duration] = {};

  const windowKey = `${coin}_${duration}`;
  const previousWindowTs = currentWindowTs[windowKey];

  if (windowTs && previousWindowTs && windowTs !== previousWindowTs) {
    liveState.prices[coin][duration] = [];
    for (const botName in liveState.trades[coin][duration]) {
      liveState.trades[coin][duration][botName] = liveState.trades[coin][duration][botName].filter(
        trade => trade.ts >= windowTs
      );
    }
  }

  currentWindowTs[windowKey] = windowTs;

  const activeWindowTs = windowTs || previousWindowTs;
  const existing = liveState.prices[coin][duration].filter(p =>
    activeWindowTs == null || (p.t >= activeWindowTs && p.t < activeWindowTs + duration)
  );
  const dedupedRows = [];
  const seenSecs = new Set(existing.map(p => p.sec));

  for (const row of rows) {
    if (!Number.isInteger(row.sec) || row.sec < 0 || row.sec >= duration) continue;
    if (seenSecs.has(row.sec)) continue;
    seenSecs.add(row.sec);
    dedupedRows.push(transformPriceRow(row, windowTs));
  }

  if (!dedupedRows.length) {
    liveState.prices[coin][duration] = existing;
    liveState.lastUpdate[windowKey] = Date.now();
    return 0;
  }

  liveState.prices[coin][duration] = existing
    .concat(dedupedRows)
    .sort((a, b) => a.t - b.t);
  liveState.lastUpdate[windowKey] = Date.now();

  return dedupedRows.length;
}

function readIncrementalPriceRows(coin, duration) {
  const durationStr = durationToString(duration);
  const latestFile = getLatestPriceFilename(coin, duration);
  if (!latestFile) return 0;

  const filePath = path.join(DATA_DIR, latestFile);
  const windowTs = parseWindowTsFromFilename(latestFile);
  const stateKey = `${coin}_${duration}`;
  let state = priceFileState.get(stateKey);

  if (!state || state.filePath !== filePath) {
    state = { filePath, position: 0, partialLine: '', windowTs };
    priceFileState.set(stateKey, state);
  }

  try {
    const stat = fs.statSync(filePath);
    if (stat.size < state.position) {
      state.position = 0;
      state.partialLine = '';
    }

    if (stat.size === state.position) {
      return 0;
    }

    const fd = fs.openSync(filePath, 'r');
    try {
      const length = stat.size - state.position;
      const buffer = Buffer.alloc(length);
      fs.readSync(fd, buffer, 0, length, state.position);
      state.position = stat.size;

      const chunk = state.partialLine + buffer.toString('utf8');
      const lines = chunk.split('\n');
      state.partialLine = lines.pop() || '';

      const rows = [];
      for (const line of lines) {
        if (!line) continue;
        try {
          rows.push(JSON.parse(line));
        } catch (err) {
          console.error(`[Aggregator] Failed to parse price row for ${coin}_${durationStr}:`, err.message);
        }
      }

      state.windowTs = windowTs;
      return appendPriceRows(coin, duration, rows, windowTs);
    } finally {
      fs.closeSync(fd);
    }
  } catch (err) {
    console.error(`[Aggregator] Error reading incremental price file for ${coin}_${duration}:`, err.message);
    return 0;
  }
}

/**
 * Fetch recent trades for a trader from Polymarket Data API
 * Fetches ALL recent trades and filters by eventSlug (matching main pipeline logic)
 */
function fetchTraderActivity(address, coin, duration, sinceTs, windowTs) {
  return new Promise((resolve, reject) => {
    if (!windowTs) {
      resolve([]);
      return;
    }

    // Fetch all recent trades (no asset_id filter - we filter by eventSlug instead)
    const url = `https://data-api.polymarket.com/activity?user=${address}&limit=100`;

    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (!Array.isArray(parsed)) {
            resolve([]);
            return;
          }

          // Filter by eventSlug prefix (matches main pipeline logic)
          const slugPrefix = getEventSlugPrefix(coin, duration);
          const exactSlug = duration === 3600 ? null : `${coin}-updown-${durationToString(duration)}-${windowTs}`;
          const filtered = parsed.filter(t => {
            const rawTimestamp = t.timestamp || 0;
            const timestampSeconds = rawTimestamp > 2000000000 ? Math.floor(rawTimestamp / 1000) : rawTimestamp;
            return (
              t.type === 'TRADE' &&
              t.eventSlug &&
              (duration === 3600 ? t.eventSlug.startsWith(slugPrefix) : t.eventSlug === exactSlug) &&
              timestampSeconds >= windowTs &&
              timestampSeconds < windowTs + duration &&
              (!sinceTs || timestampSeconds > sinceTs)
            );
          });

          resolve(filtered);
        } catch (err) {
          console.error(`[Aggregator] Failed to parse API response:`, err.message);
          resolve([]);
        }
      });
    }).on('error', (err) => {
      console.error(`[Aggregator] API request failed for ${address}:`, err.message);
      resolve([]);
    });
  });
}

/**
 * Get event slug prefix for filtering trades
 * Matches main pipeline logic in fetch-data.mjs
 */
function getEventSlugPrefix(coin, duration) {
  // For 5m and 15m markets: slug format is {coin}-updown-{duration}-
  // For 1h markets: slug format varies by coin (btc-up-or-down-hourly, etc.)
  const durLabel = durationToString(duration);

  if (duration === 3600) {
    // Hourly markets use different slug patterns
    // We'll match by prefix only to catch all hourly windows
    const hourlyPrefixes = {
      'btc': 'btc-up-or-down-hourly',
      'eth': 'eth-up-or-down-hourly',
      'sol': 'sol-up-or-down-hourly',
      'xrp': 'xrp-up-or-down-hourly',
    };
    return hourlyPrefixes[coin] || `${coin}-up-or-down-hourly`;
  }

  // For 5m/15m markets: prefix is {coin}-updown-{duration}-
  return `${coin}-updown-${durLabel}-`;
}

/**
 * Process and deduplicate incoming trades
 * Uses transaction hash as unique identifier (not trade ID which can vary)
 */
function processTrades(rawTrades, botAddress, botName, coin, duration, windowTs) {
  const now = Date.now();
  const newTrades = [];
  let latestTs = tradeState.get(`${botAddress}_${coin}_${duration}`) || 0;

  for (const trade of rawTrades) {
    // Use transaction hash as the unique key (more reliable than trade.id)
    const txHash = trade.transactionHash || trade.transaction_hash;
    if (!txHash) continue; // Skip trades without hash

    const tradeKey = `${botAddress}_${txHash}`;

    // Skip if we've seen this exact transaction before
    if (seenTrades.has(tradeKey)) {
      continue; // Already processed - dedup is permanent (no time window)
    }

    // Mark as seen
    seenTrades.set(tradeKey, now);

    // Parse numeric values
    const usdc = parseFloat(trade.usdcSize || trade.notional_amount || trade.size || 0);
    const price = parseFloat(trade.price || 0);

    // Calculate tokens: tokens = usdc / price (if price is valid)
    const tokens = price > 0 ? usdc / price : 0;

    // Format trade for frontend
    // CRITICAL: API timestamp might be in milliseconds or seconds - normalize to seconds
    const rawTimestamp = trade.timestamp || Math.floor(Date.now() / 1000);
    const timestampSeconds = rawTimestamp > 2000000000 ? Math.floor(rawTimestamp / 1000) : rawTimestamp;

    newTrades.push({
      ts: timestampSeconds,
      sec: Math.max(0, timestampSeconds - windowTs),
      side: trade.side?.toUpperCase() || 'BUY',
      outcome: trade.outcome || 'Up',
      tokens: tokens,
      usdc: usdc,
      price: price,
      txHash: txHash,
      botName,
    });

    if (timestampSeconds > latestTs) latestTs = timestampSeconds;
  }

  tradeState.set(`${botAddress}_${coin}_${duration}`, latestTs);
  return newTrades;
}

/**
 * Update price data from VPS recorder files
 */
async function updatePrices() {
  if (pricesUpdateInFlight) {
    recentStats.skippedPriceOverlaps += 1;
    return;
  }

  pricesUpdateInFlight = true;
  try {
    for (const coin of MARKETS) {
      for (const duration of DURATIONS) {
        recentStats.priceAppends += readIncrementalPriceRows(coin, duration);
      }
    }
    lastPriceScanTs = Date.now();
  } finally {
    pricesUpdateInFlight = false;
  }
}

/**
 * Poll for new trades from all configured bots
 */
async function updateTrades() {
  if (tradesUpdateInFlight) {
    recentStats.skippedTradeOverlaps += 1;
    return;
  }

  tradesUpdateInFlight = true;
  try {
    for (const coin of MARKETS) {
      for (const duration of DURATIONS) {
        const windowTs = currentWindowTs[`${coin}_${duration}`];
        if (!windowTs) continue;

        const relevantBots = traders.filter(t =>
          t.durations && t.durations.includes(duration)
        );

        for (const bot of relevantBots) {
          try {
            const stateKey = `${bot.address}_${coin}_${duration}`;
            const sinceTs = tradeState.get(stateKey) || 0;
            recentStats.tradePolls += 1;
            const rawTrades = await fetchTraderActivity(bot.address, coin, duration, sinceTs, windowTs);
            const newTrades = processTrades(rawTrades, bot.address, bot.name, coin, duration, windowTs);

            if (newTrades.length > 0) {
              if (!liveState.trades[coin]) liveState.trades[coin] = {};
              if (!liveState.trades[coin][duration]) liveState.trades[coin][duration] = {};
              if (!liveState.trades[coin][duration][bot.name]) liveState.trades[coin][duration][bot.name] = [];

              liveState.trades[coin][duration][bot.name].push(...newTrades);
              liveState.trades[coin][duration][bot.name] = liveState.trades[coin][duration][bot.name]
                .sort((a, b) => b.ts - a.ts)
                .slice(0, 100);

              recentStats.newTrades += newTrades.length;
            }
          } catch (err) {
            console.error(`[Aggregator] Error fetching trades for ${bot.name}:`, err.message);
          }
        }
      }
    }
  } finally {
    tradesUpdateInFlight = false;
  }
}

/**
 * Cleanup old data from memory
 */
function cleanup() {
  const now = Date.now();

  // Clean old seen trades (older than 1 hour - keep cache small but persistent)
  for (const [key, ts] of seenTrades.entries()) {
    if (now - ts > 3600000) { // 1 hour
      seenTrades.delete(key);
    }
  }

  console.log(
    `[Aggregator] Cleanup: dedup=${seenTrades.size} priceAppends=${recentStats.priceAppends} ` +
    `tradePolls=${recentStats.tradePolls} newTrades=${recentStats.newTrades} ` +
    `skippedPriceOverlaps=${recentStats.skippedPriceOverlaps} skippedTradeOverlaps=${recentStats.skippedTradeOverlaps} ` +
    `lastPriceScanMsAgo=${lastPriceScanTs ? now - lastPriceScanTs : 'n/a'}`
  );
  recentStats.priceAppends = 0;
  recentStats.tradePolls = 0;
  recentStats.newTrades = 0;
  recentStats.skippedPriceOverlaps = 0;
  recentStats.skippedTradeOverlaps = 0;
}

/**
 * Main loop
 */
async function main() {
  console.log('[Aggregator] Starting live data aggregator...');
  console.log(`[Aggregator] Markets: ${MARKETS.join(', ')}`);
  console.log(`[Aggregator] Durations: ${DURATIONS.join(', ')}s`);
  console.log(`[Aggregator] Trade poll interval: ${TRADE_POLL_INTERVAL}ms`);

  // Initial data load
  await updatePrices();
  await updateTrades();

  // Set up intervals
  setInterval(updatePrices, PRICE_PUBLISH_INTERVAL);
  setInterval(updateTrades, TRADE_POLL_INTERVAL);
  setInterval(cleanup, CLEANUP_INTERVAL);

  console.log('[Aggregator] Running. Press Ctrl+C to stop.');
}

// Export state for Express to consume
module.exports = liveState;

// Auto-start when loaded (PM2 compatibility)
main().catch(err => {
  console.error('[Aggregator] Fatal error:', err);
  process.exit(1);
});
