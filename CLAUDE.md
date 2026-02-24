# CLAUDE.md

This file provides guidance to Claude Code when working with the Polybot Arena codebase.

## What This Is

**Polybot Arena** — A React visualization dashboard where trading bots compete in Polymarket's crypto prediction markets. Shows real-time trade activity, position management, and P&L for top bots across multiple market durations.

## Architecture

```
Frontend (React + Vite)
├── src/components/     # UI components (PriceChart, BotPage, StatsCards, etc.)
├── src/styles/         # Tailwind CSS
├── public/data/        # Generated JSON files (manifest.json + windows/*.json)
└── scripts/            # Data pipeline scripts

Data Pipeline (GitHub Actions, runs every 2 hours)
├── rsync from VPS      # Per-second price data
├── fetch-data.mjs      # Fetches trades from Polymarket APIs
└── writes to dist/     # Built site deployed to GitHub Pages
```

## Tech Stack

- **React 18** + TypeScript + Vite
- **Visx** (D3 primitives for React) — charts and visualizations
- **Framer Motion** — animations
- **Tailwind CSS** — styling
- **GitHub Actions** — CI/CD + periodic data refresh

## Trader Configuration

Traders are configured in `scripts/traders.json`. Each trader has a `durations` array specifying which market intervals they trade:

| Duration (sec) | Label | Description |
|----------------|-------|-------------|
| 300 | 5m | 5-minute "Up or Down" markets |
| 900 | 15m | 15-minute "Up or Down" markets |
| 3600 | 1h | 1-hour markets (planned) |

**Current bots:**
- `distinct-baguette` — 15-minute markets (`durations: [900]`)
- `abrak25` — 5-minute markets (`durations: [300]`)
- `vague-sourdough` — 5-minute markets (`durations: [300]`)
- `0x8dxd` — 1-hour markets (`durations: [3600]`)

The data pipeline (`fetch-data.mjs`) filters windows by each trader's configured durations. A trader will only appear in windows matching their intervals.

## Key Files

- `scripts/traders.json` — Trader addresses, colors, descriptions, and duration preferences
- `scripts/fetch-data.mjs` — Data pipeline (fetches trades, computes stats, writes JSON)
- `.github/workflows/deploy.yml` — GitHub Actions workflow (VPS sync + deploy)
- `src/components/BotPage.tsx` — Main bot detail view with charts
- `src/components/PriceChart.tsx` — Visx-based price visualization with trade overlays

## Running Locally

```bash
npm install
npm run fetch-data  # Requires VPS env vars for price data
npm run dev
```

## Adding a New Trader

1. Find their Polymarket wallet address
2. Add entry to `scripts/traders.json`:
   ```json
   {
     "address": "0x...",
     "name": "trader-name",
     "color": "#hex",
     "description": "Short description",
     "profileUrl": "https://polymarket.com/@trader-name",
     "screenshot": "trader_pnl.png",
     "durations": [900]  // Which market intervals they trade
   }
   ```
3. Run `npm run fetch-data` to verify
4. Commit and push — GitHub Actions will deploy

## Adding a New Market Duration

1. Update `windowDurations` array in `scripts/traders.json`
2. Add label mapping in `DURATION_LABELS` in `fetch-data.mjs`
3. Update VPS recorder to capture prices for the new duration
4. Assign traders to the new duration via their `durations` array
