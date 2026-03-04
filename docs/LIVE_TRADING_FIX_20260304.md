# Live Trading Chart Fix - March 4, 2026

## Issue Report

**Problem**: Trades appearing at x-position 0:00 (left edge) on live trading charts at https://76.13.103.1/bot/distinct-baguette?ts=1772545500&coin=btc

**Root Causes Identified**:

1. **Old trades in backend state** - Trade deduplication cache kept trades for 5 minutes, but trades from 40+ minutes ago were being sent to frontend
2. **Missing trade filtering** - SSE endpoint sent ALL trades in memory without filtering to the current price window
3. **Price file format mismatch** - Aggregator expected different filename pattern than price recorder output
4. **Data structure mismatch** - Aggregator expected `{t, sec, p, bid, ask}` but recorder wrote `{sec, uB, uA, dB, dA, cex}`

## Fixes Implemented

### 1. Trade Filtering in SSE Endpoint (`/opt/polymarket/bots/live-api/api/live-endpoint.mjs`)

**File**: `/opt/polymarket/bots/live-api/api/live-endpoint.mjs`

**Change**: Modified `sendInitialState()` function to filter trades by current price window

```javascript
// Before: Sent all trades
const trades = liveState.trades[coin]?.[botName] || [];
if (trades.length > 0) {
  res.write(`data: ${JSON.stringify({
    type: 'initial_trades',
    data: trades.slice(0, 20),
  })}\n\n`);
}

// After: Filter trades to match price window
const trades = liveState.trades[coin]?.[botName] || [];
const prices = liveState.prices[coin]?.[900] || [];

let filteredTrades = trades;

if (prices.length > 0) {
  const minTime = prices[0].t;
  const maxTime = prices[prices.length - 1].t;

  filteredTrades = trades.filter(trade =>
    trade.ts >= minTime && trade.ts <= maxTime
  );

  console.log(`[SSE] Filtered trades for ${botName}: ${trades.length} -> ${filteredTrades.length} (window: ${minTime}-${maxTime})`);
}

if (filteredTrades.length > 0) {
  res.write(`data: ${JSON.stringify({
    type: 'initial_trades',
    data: filteredTrades.slice(0, 20),
  })}\n\n`);
}
```

**Result**: Reduced trades from 12 old trades to 1 current trade within price window

### 2. Price File Pattern Matching (`/opt/polymarket/bots/live-api/ws_live_aggregator.cjs`)

**File**: `/opt/polymarket/bots/live-api/ws_live_aggregator.cjs`

**Change**: Added duration-to-string converter to match recorder filename format

```javascript
// Added new function
function durationToString(duration) {
  if (duration === 300) return '5m';
  if (duration === 900) return '15m';
  if (duration === 3600) return '1h';
  return duration.toString();
}

// Modified readLatestPriceFile()
function readLatestPriceFile(coin, duration) {
  const durationStr = durationToString(duration);  // NEW
  const files = fs.readdirSync(DATA_DIR)
    .filter(f => f.startsWith('price_') && f.includes(`_${coin}_${durationStr}`))  // CHANGED
    // ...
}
```

**Before**: Looked for `price_*_btc_900.jsonl` (not found)
**After**: Looks for `price_*_btc_15m.jsonl` (found)

### 3. Data Structure Transformation (`/opt/polymarket/bots/live-api/ws_live_aggregator.cjs`)

**File**: `/opt/polymarket/bots/live-api/ws_live_aggregator.cjs`

**Change**: Transform recorder's format to aggregator's expected format

```javascript
// Extract window timestamp from filename
const match = files[0].match(/price_(\d+)_/);
const windowTs = match ? parseInt(match[1], 10) : Math.floor(Date.now() / 1000);

return lines.map(line => {
  const raw = JSON.parse(line);
  // Transform {sec, uB, uA, dB, dA, cex} -> {t, sec, p, bid, ask, dnBid, dnAsk, cex}
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
```

**Before**: Prices were empty (format mismatch)
**After**: Prices load correctly with 400+ points per 15m window

## Verification

### Before Fix
```bash
curl -N http://localhost:3001/api/live/btc/distinct-baguette | head -n 5
# Result: initial_trades with 12 old trades (40+ minutes old)
# Result: NO initial_prices (empty array)
```

### After Fix
```bash
curl -N http://localhost:3001/api/live/btc/distinct-baguette | head -n 5
# Result: initial_trades with 1 current trade (within window)
# Result: initial_prices with 434 price points

curl -s http://localhost:3001/api/debug/state | jq .
# {
#   "connections": 3,
#   "prices": {
#     "btc": {
#       "300": 135,
#       "900": 434,
#       "3600": 897
#     }
#   },
#   "trades": {
#     "btc": {
#       "distinct-baguette": 1
#     }
#   }
# }
```

## Files Modified

1. **VPS: `/opt/polymarket/bots/live-api/api/live-endpoint.mjs`**
   - Added trade filtering in `sendInitialState()`
   - Backup created: `live-endpoint.mjs.backup_*`

2. **VPS: `/opt/polymarket/bots/live-api/ws_live_aggregator.cjs`**
   - Added `durationToString()` function
   - Modified `readLatestPriceFile()` to use duration strings
   - Added data transformation in price parsing

3. **Local: `vps/ws_live_aggregator.cjs`** (new file, not yet in git)
   - Same changes as VPS version
   - Ready for version control

## Testing Performed

1. **SSE Endpoint Test**: Verified only current trades sent
2. **Price Loading Test**: Confirmed 400+ price points loaded
3. **Trade Filtering Test**: Verified log shows "Filtered trades: 12 -> 1"
4. **Frontend Chart Test**: Trades should now appear at correct x-position (not at 0:00)

## Deployment Status

- ✅ Backend fixes deployed to VPS
- ✅ live-api restarted (PM2 ID 1, restart #25)
- ✅ Trade filtering active
- ✅ Price data loading correctly
- ⏳ Frontend chart verification pending (user to test at https://76.13.103.1)

## Next Steps

1. User should verify trades no longer appear at x=0 on live charts
2. If confirmed working, commit `vps/ws_live_aggregator.cjs` to git
3. Add `vps/` directory to version control for future tracking
4. Consider adding automated tests for trade filtering logic

## Technical Details

**Price Window Format**:
- Window starts at Unix timestamp (e.g., 1772623800)
- Contains per-second data (sec: 0-899 for 15m)
- Absolute time = windowTs + sec
- Example: Window 1772623800, sec=153 → timestamp 1772623953

**Trade Matching**:
- Trades have Unix timestamp in `ts` field
- Frontend finds closest price point: `|price.t - trade.ts| < 5 seconds`
- If no match found, trade is not rendered (returns `null`)
- Old trades (>15min) are now filtered out before sending to frontend

## Logs

Sample filtering log:
```
2026-03-04 11:36:26 +00:00: [SSE] Filtered trades for distinct-baguette: 1 -> 1 (window: 1772623800-1772624184)
```

This shows 1 trade in cache, 1 trade after filtering (within window range).
