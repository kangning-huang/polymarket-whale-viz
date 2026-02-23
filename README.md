# Polymarket Whale Watch

Watch how top bots trade 15-minute crypto prediction markets on [Polymarket](https://polymarket.com).

## How it works

Every 15 minutes, Polymarket runs "Up or Down" prediction markets for BTC, ETH, SOL, and XRP. This site visualizes how the most profitable traders operate in these markets — showing their exact buy/sell timing, position management, and P&L.

**Data is refreshed every 2 hours** via GitHub Actions, pulling from Polymarket's public APIs.

## Development

```bash
npm install

# Fetch data (populates public/data/)
npm run fetch-data

# Start dev server
npm run dev
```

## Architecture

- **Frontend**: React + Vite + TypeScript + Chart.js
- **Data pipeline**: `scripts/fetch-data.mjs` — fetches from Polymarket Gamma, CLOB, and Data APIs
- **Hosting**: GitHub Pages with automated deploys via GitHub Actions
- **Data**: Ephemeral (not committed) — each build fetches the last 24h fresh

## Adding traders

Edit `scripts/traders.json` to add wallet addresses of traders to track.
