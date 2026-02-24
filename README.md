# Polybo Arena

**Live site: https://polybot-arena.com** (coming soon)

Watch elite trading bots compete in [Polymarket](https://polymarket.com) crypto prediction markets. Study their strategies, entries, exits, and P&L in real-time.

## How it works

Polymarket runs "Up or Down" prediction markets for BTC, ETH, SOL, and XRP at multiple intervals:
- **5-minute markets** (300s windows)
- **15-minute markets** (900s windows)
- **1-hour markets** (3600s windows) — *planned*

This site visualizes how the most profitable traders operate in these markets — showing their exact buy/sell timing, position management, and P&L.

**Data is refreshed every 2 hours** via GitHub Actions, syncing per-second price data from VPS and pulling trade activity from Polymarket's public APIs.

## Development

```bash
npm install

# Fetch data (populates public/data/)
npm run fetch-data

# Start dev server
npm run dev
```

## Architecture

- **Frontend**: React + Vite + TypeScript + Visx + Framer Motion + Tailwind CSS
- **Data pipeline**: `scripts/fetch-data.mjs` — fetches from Polymarket Gamma, CLOB, and Data APIs
- **Price data**: Per-second prices from VPS recorder (via rsync in GitHub Actions)
- **Hosting**: GitHub Pages with automated deploys via GitHub Actions
- **Data**: Ephemeral (not committed) — each build fetches the last 24h fresh

## Adding traders

Edit `scripts/traders.json` to add wallet addresses of traders to track.

### Trader configuration

Each trader in `traders.json` has:
- `address`: Polymarket wallet address
- `name`: Display name
- `color`: Hex color for charts
- `description`: Short bio
- `profileUrl`: Link to Polymarket profile
- `screenshot`: PnL screenshot filename (in `public/screenshots/`)
- `durations`: **Array of market durations this trader trades** (in seconds)
  - `[900]` = 15-minute markets only
  - `[300]` = 5-minute markets only
  - `[300, 900]` = both 5-minute and 15-minute markets
  - `[3600]` = 1-hour markets only

**Example:**
```json
{
  "address": "0xe00740bce98a594e26861838885ab310ec3b548c",
  "name": "distinct-baguette",
  "durations": [900]
}
```

The data pipeline (`fetch-data.mjs`) respects each trader's `durations` — a trader will only appear in windows matching their configured market intervals.
