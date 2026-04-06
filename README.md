# Polybot Arena

**Live site: https://polybot-arena.com**

Watch elite trading bots compete in [Polymarket](https://polymarket.com) crypto prediction markets. Study their strategies, entries, exits, and P&L in real-time.

## How it works

Polymarket runs "Up or Down" prediction markets for BTC, ETH, SOL, and XRP at multiple intervals:
- **5-minute markets** (300s windows)
- **15-minute markets** (900s windows)
- **1-hour markets** (3600s windows)

This site visualizes how the most profitable traders operate in these markets — showing their exact buy/sell timing, position management, and P&L across per-second price charts.

**Data is refreshed every 2 hours** via GitHub Actions, syncing per-second price data from a VPS and pulling trade activity from Polymarket's public APIs.

### Tracked bots

| Bot | Markets | Color |
|-----|---------|-------|
| distinct-baguette | 15m | `#58a6ff` |
| abrak25 | 5m | `#f59e0b` |
| 0x8dxd | 1h | `#a855f7` |
| vague-sourdough | 5m | `#10b981` |
| vidarx | 5m | `#ef4444` |

## Development

```bash
npm install

# Fetch data (populates public/data/)
npm run fetch-data

# Start dev server
npm run dev
```

### Commands

```bash
npm run dev          # Start Vite dev server (http://localhost:5173)
npm run build        # TypeScript check + Vite build + SEO post-processing
npm run preview      # Preview production build locally
npm run fetch-data   # Run data pipeline (fetches trades, computes stats, writes JSON)
npm run capture-screenshots  # Generate trader P&L screenshots via Puppeteer
```

No test suite exists. `npm run build` runs `tsc` for type checking.

## Architecture

- **Frontend**: React 18 + TypeScript + Vite + Visx (D3) + Framer Motion + Tailwind CSS
- **Data pipeline**: `scripts/fetch-data.mjs` — fetches from Polymarket Gamma, CLOB, and Data APIs
- **Price data**: Per-second prices from VPS WebSocket recorder (via rsync in GitHub Actions)
- **SEO**: `scripts/post-build-seo.mjs` — generates sitemap.xml and per-route HTML with meta tags
- **Hosting**: GitHub Pages with automated deploys via GitHub Actions
- **Data**: Ephemeral (not committed) — each build fetches the last 24h fresh

### Project structure

```
src/
├── main.tsx                # Entry point (HelmetProvider, ErrorBoundary, BrowserRouter)
├── App.tsx                 # Routes + landing page with parallax banner & scroll animations
├── api.ts                  # Data fetching (manifest.json + window detail JSON)
├── types.ts                # TypeScript interfaces (Trade, PricePoint, WindowDetail, etc.)
├── theme.ts                # Dark/light mode hooks (OS prefers-color-scheme)
├── rolling.ts              # Rolling average calculations for price data
├── styles/index.css        # Tailwind directives + CSS variables + custom animations
└── components/
    ├── Header.tsx           # Navigation bar
    ├── BotPage.tsx          # Individual bot profile (window/coin selection, charts, comments)
    ├── BotCard.tsx          # Bot card for landing page grid
    ├── BotLeaderboard.tsx   # Ranked leaderboard (sortable by P&L, win rate, trades)
    ├── BlogPost.tsx         # Educational content ("How Polymarket Bots Actually Trade")
    ├── PriceChart.tsx       # Main D3/Visx chart (price lines, trade markers, bid/ask bands,
    │                        #   rolling averages, settlement indicators, tooltips)
    ├── InventoryChart.tsx   # Stacked area chart for Long/Short token inventory
    ├── StatsCards.tsx       # Summary cards (P&L, win rate, buy/sell counts, averages)
    ├── WindowGrid.tsx       # Market window selection grid
    ├── WindowDetail.tsx     # Window detail container (chart + stats + trades)
    ├── TimelineRibbon.tsx   # Horizontal timeline for quick window navigation
    ├── CoinFilter.tsx       # BTC/ETH/SOL/XRP filter
    ├── TraderFilter.tsx     # Bot filter/selector
    ├── Comments.tsx         # Disqus integration (full teardown on unmount for SPA nav)
    ├── SEOHead.tsx          # Dynamic meta tags via React Helmet
    ├── SuggestBot.tsx       # Form to suggest new traders
    └── ErrorBoundary.tsx    # Graceful error display

scripts/
├── traders.json             # Trader config (addresses, colors, durations, coins)
├── fetch-data.mjs           # Main pipeline: VPS rsync, API calls, FIFO inventory, P&L
├── post-build-seo.mjs       # Generates sitemap.xml + per-route HTML for GitHub Pages SEO
└── capture-screenshots.mjs  # Puppeteer screenshot capture of trader profiles

.github/workflows/
├── deploy.yml               # Build + deploy on push to main
└── update-data.yml          # Scheduled data refresh every 2 hours
```

### Routes

| Path | Component | Description |
|------|-----------|-------------|
| `/` | Landing | Home page with parallax banner, scroll-reveal animations, bot grid |
| `/bot/:name` | BotPage | Bot profile with window/coin selection, charts, stats, Disqus comments |
| `/leaderboard` | BotLeaderboard | Ranked leaderboard (lazy-loaded) |
| `/blog/how-polymarket-bots-trade` | BlogPost | Educational blog post (lazy-loaded) |

Legacy routes (`/bot/:name/:ts/:coin`, `/window/:ts/:coin`) redirect to current paths.

## Data flow

1. **VPS price recorder** (`ws_price_recorder.cjs` on US East VPS) captures per-second bid/ask/CEX prices via WebSocket and writes JSONL files.

2. **Pipeline** (`fetch-data.mjs`): Syncs price files from VPS via rsync. Calls Polymarket Data API, Gamma API, and CLOB API. Groups trades into market windows (5m/15m/1h). Computes FIFO inventory and P&L. Outputs `public/data/manifest.json` (index of all windows) and `public/data/windows/{ts}_{coin}_{duration}.json` (detailed per-window data).

3. **Frontend**: `fetchManifest()` loads the window index. `BotPage` lets user select a window, then `fetchWindowDetail()` loads the detailed JSON. `PriceChart` renders price lines with trade overlays, bid/ask bands, and rolling averages.

4. **SEO post-build**: `post-build-seo.mjs` generates `sitemap.xml` and creates per-route HTML files with proper meta tags so crawlers see correct metadata on GitHub Pages.

## Per-second price data (REQUIRED)

**Windows are ONLY displayed if they have per-second VPS price data. No smooth/interpolated charts allowed.**

The VPS at `76.13.103.1` runs a WebSocket price recorder that captures per-second bid/ask prices for all crypto markets. This data is synced via rsync during GitHub Actions deployment.

- **Minimum requirement**: 50% of seconds must have price data (e.g., 450+ points for a 15-minute window)
- **If charts look smooth**: The VPS recorder has stopped — SSH in and restart it
- **Recorder location**: `/opt/polymarket/bots/monitoring/ws_price_recorder.cjs`
- **Start command**: `RUNTIME_SEC=0 node ws_price_recorder.cjs` (runs indefinitely with 24h auto-cleanup)

## Adding a trader

1. Add entry to `scripts/traders.json` with address, name, color, description, profileUrl, screenshot filename, and durations array
2. Run `npm run fetch-data` to verify
3. Commit and push — GitHub Actions will deploy

### Trader configuration

Each trader in `traders.json` has:
- `address`: Polymarket wallet address
- `name`: Display name
- `color`: Hex color for charts
- `description` / `longDescription`: Short and extended bio
- `profileUrl`: Link to Polymarket profile
- `screenshot`: PnL screenshot filename (in `public/images/`)
- `durations`: Array of market durations in seconds (`[300]`, `[900]`, `[3600]`, or combinations)

**Example:**
```json
{
  "address": "0xe00740bce98a594e26861838885ab310ec3b548c",
  "name": "distinct-baguette",
  "color": "#58a6ff",
  "description": "The #1 15-minute crypto trader",
  "durations": [900]
}
```

The data pipeline respects each trader's `durations` — a trader will only appear in windows matching their configured market intervals.

## Polymarket APIs used

- **Data API** (`data-api.polymarket.com/activity`) — trader activity/trades
- **Gamma API** (`gamma-api.polymarket.com`) — market metadata, condition IDs, settlement
- **CLOB API** (`clob.polymarket.com/prices-history`) — price history (fallback only, not used for display)
- **VPS rsync** (REQUIRED) — per-second price data from WebSocket recorder

## Tech stack

| Layer | Technology |
|-------|------------|
| Framework | React 18 |
| Build | Vite 5 |
| Language | TypeScript 5 (strict) |
| Charts | Visx (D3 primitives for React) |
| Animations | Framer Motion |
| Styling | Tailwind CSS 3 + CSS variables (dark/light theme) |
| Routing | React Router v6 (BrowserRouter) |
| SEO | React Helmet Async + post-build HTML generation |
| Analytics | Google Analytics 4 |
| Comments | Disqus |
| Screenshots | Puppeteer |
| Hosting | GitHub Pages |
| CI/CD | GitHub Actions (deploy on push + 2-hour data refresh) |
