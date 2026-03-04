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
const DATA_DIR = '/opt/polymarket/data/raw/prices';
const TRADE_POLL_INTERVAL = 700; // 0.7s for sub-second trade detection
const PRICE_PUBLISH_INTERVAL = 1000; // Publish aggregated prices every 1s
const CLEANUP_INTERVAL = 60000; // Clean old data every 60s
const ROLLING_WINDOW_SEC = 900; // 15 minutes

// Supported markets
const MARKETS = ['btc', 'eth', 'sol'];
const DURATIONS = [300, 900, 3600]; // 5m, 15m, 1h

// In-memory state (shared with Express via module.exports)
const liveState = {
  prices: {}, // { coin: { duration: [{ sec, p, bid, ask, cex, ts }] } }
  trades: {}, // { coin: { botName: [{ trade objects }] } }
  lastUpdate: {}, // { coin_duration: timestamp }
  connections: 0, // Active SSE connections
};

// Trader configuration (load from traders.json)
let traders = [];
try {
  const tradersPath = path.join(__dirname, '../scripts/traders.json');
  const config = JSON.parse(fs.readFileSync(tradersPath, 'utf8'));
  traders = config.traders || [];
  console.log(`[Aggregator] Loaded ${traders.length} traders`);
} catch (err) {
  console.error('[Aggregator] Failed to load traders.json:', err.message);
  process.exit(1);
}

// Track last seen trade hashes to avoid duplicates
const seenTrades = new Map(); // { address_txHash: timestamp }

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
function readLatestPriceFile(coin, duration) {
  try {
    const durationStr = durationToString(duration);
    const files = fs.readdirSync(DATA_DIR)
      .filter(f => f.startsWith('price_') && f.includes(`_${coin}_${durationStr}`))
      .sort()
      .reverse();

    if (files.length === 0) {
      console.log(`[Aggregator] No price files found for ${coin}_${durationStr}`);
      return null;
    }

    const filePath = path.join(DATA_DIR, files[0]);
    const content = fs.readFileSync(filePath, 'utf8');

    // Parse JSONL format and transform to expected structure
    const lines = content.trim().split('\n').filter(Boolean);

    // Extract window timestamp from filename: price_<ts>_<coin>_<duration>.jsonl
    const match = files[0].match(/price_(\d+)_/);
    const windowTs = match ? parseInt(match[1], 10) : Math.floor(Date.now() / 1000);

    return lines.map(line => {
      const raw = JSON.parse(line);
      // Transform recorder format {sec, uB, uA, dB, dA, cex} to aggregator format
      // {t, sec, p, bid, ask, dnBid, dnAsk, cex}
      // For live display, we show the "Up" side by default
      return {
        t: windowTs + raw.sec,  // Absolute Unix timestamp
        sec: raw.sec,           // Seconds within window
        p: raw.uB || 0.5,      // Use Up bid as default price
        bid: raw.uB || null,   // Up bid
        ask: raw.uA || null,   // Up ask
        dnBid: raw.dB || null, // Down bid
        dnAsk: raw.dA || null, // Down ask
        cex: raw.cex || null,  // CEX price
      };
    });
  } catch (err) {
    console.error(`[Aggregator] Error reading price file for ${coin}_${duration}:`, err.message);
    return null;
  }
}

/**
 * Fetch recent trades for a trader from Polymarket Data API
 */
function fetchTraderActivity(address, coin, duration) {
  return new Promise((resolve, reject) => {
    const tokenId = getTokenId(coin, duration);
    if (!tokenId) {
      resolve([]);
      return;
    }

    const url = `https://data-api.polymarket.com/activity?user=${address}&asset_id=${tokenId}&limit=20`;

    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(Array.isArray(parsed) ? parsed : []);
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
 * Get token ID for coin + duration combination
 * These map to specific Polymarket conditional tokens
 */
function getTokenId(coin, duration) {
  // This mapping would come from your existing market configuration
  // Placeholder - replace with actual token IDs from your system
  const tokenMap = {
    'btc_300': '71321045679252212594626385532706912750332728571942532289631379312455583992833',
    'btc_900': '71321045679252212594626385532706912750332728571942532289631379312455583992833',
    'btc_3600': '71321045679252212594626385532706912750332728571942532289631379312455583992833',
    // Add other coins/durations as needed
  };
  return tokenMap[`${coin}_${duration}`];
}

/**
 * Process and deduplicate incoming trades
 */
function processTrades(rawTrades, botAddress, botName, coin) {
  const now = Date.now();
  const newTrades = [];

  for (const trade of rawTrades) {
    const tradeKey = `${botAddress}_${trade.id || trade.transaction_hash}`;

    // Skip if we've seen this trade recently (within 5 minutes)
    if (seenTrades.has(tradeKey)) {
      const seenAt = seenTrades.get(tradeKey);
      if (now - seenAt < 300000) continue; // 5 min dedup window
    }

    // Mark as seen
    seenTrades.set(tradeKey, now);

    // Format trade for frontend
    newTrades.push({
      ts: trade.timestamp || Math.floor(Date.now() / 1000),
      side: trade.side?.toUpperCase() || 'BUY',
      outcome: trade.outcome || 'Up',
      usdc: parseFloat(trade.notional_amount || trade.size || 0),
      price: parseFloat(trade.price || 0),
      txHash: trade.transaction_hash,
      botName,
    });
  }

  return newTrades;
}

/**
 * Update price data from VPS recorder files
 */
async function updatePrices() {
  for (const coin of MARKETS) {
    for (const duration of DURATIONS) {
      const priceData = readLatestPriceFile(coin, duration);
      if (!priceData || priceData.length === 0) continue;

      // Initialize nested structure
      if (!liveState.prices[coin]) liveState.prices[coin] = {};
      if (!liveState.prices[coin][duration]) liveState.prices[coin][duration] = [];

      // Keep only last 15 minutes of data
      const cutoffTime = Math.floor(Date.now() / 1000) - ROLLING_WINDOW_SEC;
      const filtered = priceData.filter(p => p.t >= cutoffTime);

      liveState.prices[coin][duration] = filtered;
      liveState.lastUpdate[`${coin}_${duration}`] = Date.now();
    }
  }
}

/**
 * Poll for new trades from all configured bots
 */
async function updateTrades() {
  for (const coin of MARKETS) {
    for (const duration of DURATIONS) {
      // Get bots that trade this duration
      const relevantBots = traders.filter(t =>
        t.durations && t.durations.includes(duration)
      );

      for (const bot of relevantBots) {
        try {
          const rawTrades = await fetchTraderActivity(bot.address, coin, duration);
          const newTrades = processTrades(rawTrades, bot.address, bot.name, coin);

          if (newTrades.length > 0) {
            // Initialize nested structure
            if (!liveState.trades[coin]) liveState.trades[coin] = {};
            if (!liveState.trades[coin][bot.name]) liveState.trades[coin][bot.name] = [];

            // Add new trades and keep last 100
            liveState.trades[coin][bot.name].push(...newTrades);
            liveState.trades[coin][bot.name] = liveState.trades[coin][bot.name]
              .sort((a, b) => b.ts - a.ts)
              .slice(0, 100);

            console.log(`[Aggregator] ${bot.name}: ${newTrades.length} new trades for ${coin}_${duration}`);
          }
        } catch (err) {
          console.error(`[Aggregator] Error fetching trades for ${bot.name}:`, err.message);
        }
      }
    }
  }
}

/**
 * Cleanup old data from memory
 */
function cleanup() {
  const now = Date.now();

  // Clean old seen trades (older than 5 minutes)
  for (const [key, ts] of seenTrades.entries()) {
    if (now - ts > 300000) {
      seenTrades.delete(key);
    }
  }

  console.log(`[Aggregator] Cleanup: ${seenTrades.size} trades in dedup cache`);
}

/**
 * Main loop
 */
async function main() {
  console.log('[Aggregator] Starting live data aggregator...');
  console.log(`[Aggregator] Markets: ${MARKETS.join(', ')}`);
  console.log(`[Aggregator] Durations: ${DURATIONS.join(', ')}s`);

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
