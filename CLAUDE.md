# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

**Polybot Arena** — A React visualization dashboard where trading bots compete in Polymarket's crypto prediction markets. Shows real-time trade activity, position management, and P&L for top bots across multiple market durations. Live at https://polybot-arena.com.

## Commands

```bash
npm run dev          # Start Vite dev server (http://localhost:5173)
npm run build        # TypeScript check + Vite build to dist/
npm run preview      # Preview production build locally
npm run fetch-data   # Run data pipeline (fetches trades, computes stats, writes JSON)
npm run capture-screenshots  # Generate trader P&L screenshots via Puppeteer
```

No test suite exists. `npm run build` runs `tsc` for type checking.

## Architecture

```
Frontend (React 18 + TypeScript + Vite)
├── src/main.tsx           # Entry point, BrowserRouter wraps App
├── src/App.tsx            # Routes: / (Landing), /bot/:name (BotPage)
├── src/components/        # UI components
├── src/api.ts             # Data fetching (manifest.json + window detail JSON)
├── src/types.ts           # TypeScript types for trades, prices, windows, etc.
├── src/theme.ts           # Dark/light mode detection (OS preference)
├── src/styles/index.css   # Tailwind + CSS variables for theming
└── public/data/           # Generated JSON (gitignored, built by pipeline)

Data Pipeline (scripts/)
├── fetch-data.mjs         # Main pipeline: fetches trades from Polymarket APIs,
│                          #   computes FIFO inventory, P&L, writes JSON
├── traders.json           # Trader config (addresses, colors, durations)
└── capture-screenshots.mjs # Puppeteer screenshot capture of trader profiles

Deployment (GitHub Actions → GitHub Pages)
├── .github/workflows/deploy.yml  # Build + deploy on push to main
├── public/404.html               # SPA redirect for GitHub Pages
├── index.html                    # SPA redirect decoder + entry point
└── public/CNAME                  # polybot-arena.com
```

## Data Flow

1. **Pipeline** (`fetch-data.mjs`): Calls Polymarket Data API, Gamma API, and CLOB API. Groups trades into market windows (5m/15m/1h). Outputs `public/data/manifest.json` (index of all windows) and `public/data/windows/{ts}_{coin}_{duration}.json` (detailed per-window data with trades, prices, inventory, settlement).

2. **Frontend**: `fetchManifest()` loads the window index. `BotPage` lets user select a window, then `fetchWindowDetail()` loads the detailed JSON. `PriceChart` (Visx/D3) renders price lines with trade overlays, bid/ask bands, and optional rolling averages.

## Key Patterns

**Routing**: Uses `BrowserRouter` (not HashRouter). GitHub Pages SPA routing works via `public/404.html` redirecting to `index.html` with path encoded in query string. Legacy hash routes (`/#/bot/...`) are not redirected.

**Disqus Comments**: Each bot page has a separate Disqus thread. Identifiers use format `polybot-v2-{botName}` — the `v2` prefix exists because older `bot-{name}` identifiers got merged into one thread during a previous HashRouter era. The `Comments` component does a full teardown (removing all Disqus scripts/iframes/globals) on unmount to ensure clean thread loading in SPA navigation.

**Theme**: Dark/light mode follows OS `prefers-color-scheme`. CSS variables in `:root` define all colors. Tailwind references these variables. Banner image swaps between dark/light variants.

**Charts**: Built with Visx (D3 primitives for React). `PriceChart.tsx` is the most complex component — handles price lines, trade markers, bid/ask bands, rolling averages, tooltips, and settlement indicators.

## Trader Configuration

Traders are configured in `scripts/traders.json`. Each has a `durations` array specifying which market intervals they trade (300=5m, 900=15m, 3600=1h). The data pipeline filters windows by each trader's configured durations.

## Adding a New Trader

1. Add entry to `scripts/traders.json` with address, name, color, description, profileUrl, screenshot filename, and durations array
2. Run `npm run fetch-data` to verify
3. Commit and push — GitHub Actions will deploy

## CRITICAL: Per-Second Price Data Requirement

**Windows MUST have per-second VPS price data to be displayed. NO API FALLBACK.**

- The VPS price recorder (`ws_price_recorder.cjs` on US East VPS 76.13.103.1) records per-second bid/ask/CEX prices
- `fetch-data.mjs` requires at least 50% of seconds to have price data (e.g., 450+ points for 15m window)
- Windows with only API data (~15 points for 15m) are REJECTED and not shown
- If charts look "smooth" with few data points, the VPS recorder has stopped — restart it!
- Never show smooth/interpolated price lines — only actual per-second market data

**VPS Price Recorder:**
- Location: `root@76.13.103.1:/opt/polymarket/bots/monitoring/ws_price_recorder.cjs`
- Run with: `RUNTIME_SEC=0 node ws_price_recorder.cjs` (runs indefinitely)
- Output: `/opt/polymarket/data/raw/prices/price_{ts}_{coin}_{duration}.jsonl`
- Auto-cleanup: Deletes files older than 24 hours

## Polymarket APIs Used

- **Data API** (`data-api.polymarket.com/activity`) — trader activity/trades
- **Gamma API** (`gamma-api.polymarket.com`) — market metadata, condition IDs, settlement
- **CLOB API** (`clob.polymarket.com/prices-history`) — price history (NOT used for display, only as last resort)
- **VPS rsync** (REQUIRED) — per-second price data from VPS recorder
