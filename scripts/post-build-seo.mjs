#!/usr/bin/env node
/**
 * Post-build SEO script:
 * 1. Generates sitemap.xml from traders.json
 * 2. Creates per-route HTML files with:
 *    - Correct meta tags (title, description, canonical, OG, Twitter)
 *    - Rich static HTML content inside <div id="root"> for crawler indexing
 *    - Per-page JSON-LD structured data
 *    So GitHub Pages serves crawlable content instead of an empty SPA shell.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = join(__dirname, '..', 'dist');
const BASE_URL = 'https://polybot-arena.com';

// Read traders config
const traders = JSON.parse(readFileSync(join(__dirname, 'traders.json'), 'utf8'));

const DURATION_LABELS = { 300: '5-minute', 900: '15-minute', 3600: '1-hour' };

// ─── 1. Generate sitemap.xml ───────────────────────────────────────────────
const today = new Date().toISOString().split('T')[0];

const urls = [
  { loc: '/', changefreq: 'hourly', priority: '1.0' },
  { loc: '/leaderboard/', changefreq: 'hourly', priority: '0.9' },
  { loc: '/blog/how-polymarket-bots-trade/', changefreq: 'monthly', priority: '0.8' },
  ...traders.traders.map(t => ({
    loc: `/bot/${t.name}/`,
    changefreq: 'hourly',
    priority: '0.8',
  })),
];

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>
    <loc>${BASE_URL}${u.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>
`;

writeFileSync(join(DIST, 'sitemap.xml'), sitemap);
console.log(`✓ Generated sitemap.xml with ${urls.length} URLs`);

// ─── 2. Static content generators ──────────────────────────────────────────
// These produce meaningful HTML that crawlers can index immediately,
// without waiting for JavaScript execution. React's createRoot will
// replace this content once the JS bundle loads.

const SSR_STYLE = [
  'font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif',
  'max-width:72rem',
  'margin:0 auto',
  'padding:1.5rem',
  'color:#e6edf3',
].join(';');

const LINK_STYLE = 'color:#58a6ff;text-decoration:underline';

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function traderLinks(exclude) {
  return traders.traders
    .filter(t => t.name !== exclude)
    .map(t => `<li><a href="/bot/${t.name}" style="${LINK_STYLE}">${esc(t.name)}</a> — ${esc(t.description)}</li>`)
    .join('');
}

function generateLandingContent() {
  const botList = traders.traders
    .map(t => `<li><a href="/bot/${t.name}" style="${LINK_STYLE}"><strong>${esc(t.name)}</strong></a> — ${esc(t.description)}</li>`)
    .join('');

  return `<div style="${SSR_STYLE}">
  <header>
    <h1>Polybot Arena — Watch Trading Bots Compete on Polymarket</h1>
    <p>Study the most profitable trading bots on <a href="https://polymarket.com" style="${LINK_STYLE}">Polymarket</a> in real-time. See their entries, exits, and profit/loss on every market window. The only bot performance dashboard with trade-level visualizations.</p>
  </header>
  <nav style="margin:1.5rem 0">
    <a href="/leaderboard" style="${LINK_STYLE};margin-right:1.5rem">Bot Leaderboard</a>
    <a href="/blog/how-polymarket-bots-trade" style="${LINK_STYLE}">How Bots Trade — Data Analysis</a>
  </nav>
  <main>
    <h2>Active Trading Bots</h2>
    <p>Compare bot strategies, P&amp;L, entries and exits across crypto prediction market windows for BTC, ETH, SOL, and XRP.</p>
    <ul>${botList}</ul>
    <p style="margin-top:2rem;color:#8b949e;font-size:0.875rem">Data sourced from Polymarket CLOB. Updates every 2 hours. Not financial advice.</p>
  </main>
</div>`;
}

function generateBotContent(trader) {
  const durationDesc = (trader.durations || [900])
    .map(d => DURATION_LABELS[d] || `${d}s`)
    .join(', ');

  return `<div style="${SSR_STYLE}">
  <nav><a href="/" style="${LINK_STYLE}">← Back to all bots</a></nav>
  <header style="margin-top:1rem">
    <h1>${esc(trader.name)} — Polymarket Trading Bot Performance</h1>
    <p>${esc(trader.longDescription || trader.description)}</p>
  </header>
  <main>
    <h2>Live Trading Data</h2>
    <p>View real-time ${durationDesc} trade entries, exits, P&amp;L, and strategy patterns for ${esc(trader.name)} across BTC, ETH, SOL, and XRP crypto prediction markets on Polymarket.</p>
    <ul>
      <li>Per-second price charts with bid/ask bands</li>
      <li>Individual trade markers showing entries and exits</li>
      <li>Inventory position tracking over time</li>
      <li>Profit and loss calculation per market window</li>
    </ul>
    <p><a href="${esc(trader.profileUrl)}" style="${LINK_STYLE}" rel="noopener">View ${esc(trader.name)} on Polymarket →</a></p>
    <h2>Other Trading Bots</h2>
    <ul>${traderLinks(trader.name)}</ul>
  </main>
  <footer style="margin-top:2rem">
    <a href="/leaderboard" style="${LINK_STYLE}">Bot Leaderboard</a> ·
    <a href="/blog/how-polymarket-bots-trade" style="${LINK_STYLE}">How Bots Trade</a>
  </footer>
</div>`;
}

function generateLeaderboardContent() {
  const botList = traders.traders
    .map(t => `<li><a href="/bot/${t.name}" style="${LINK_STYLE}">${esc(t.name)}</a> — ${esc(t.description)}</li>`)
    .join('');

  return `<div style="${SSR_STYLE}">
  <nav><a href="/" style="${LINK_STYLE}">← Back to Polybot Arena</a></nav>
  <header style="margin-top:1rem">
    <h1>Polymarket Bot Leaderboard — Rankings &amp; Performance</h1>
    <p>Compare the top Polymarket trading bots ranked by P&amp;L, win rate, and trade volume. The only bot-specific leaderboard for crypto prediction market automated traders.</p>
  </header>
  <main>
    <h2>Bot Rankings</h2>
    <p>Sort and compare trading bots by profit/loss, win rate, number of trades, and market performance across BTC, ETH, SOL, and XRP prediction markets.</p>
    <ul>${botList}</ul>
  </main>
  <footer style="margin-top:2rem">
    <a href="/" style="${LINK_STYLE}">Home</a> ·
    <a href="/blog/how-polymarket-bots-trade" style="${LINK_STYLE}">How Bots Trade</a>
  </footer>
</div>`;
}

function generateBlogContent() {
  return `<div style="${SSR_STYLE}">
  <nav><a href="/" style="${LINK_STYLE}">← Back to Polybot Arena</a></nav>
  <article style="margin-top:1rem">
    <header>
      <h1>How Polymarket Bots Actually Trade: Real Data Analysis</h1>
      <p>Deep dive into how automated trading bots operate on Polymarket crypto prediction markets. Real trade data, strategy analysis, and performance breakdowns from Polybot Arena.</p>
    </header>
    <section>
      <h2>What Are Polymarket Trading Bots?</h2>
      <p>Polymarket's crypto prediction markets — covering BTC, ETH, SOL, and XRP — host dozens of automated trading bots that compete on 5-minute, 15-minute, and 1-hour binary outcome windows. These bots use algorithmic strategies ranging from high-frequency scalping to patient mean-reversion approaches.</p>
      <h2>How We Track Them</h2>
      <p>Polybot Arena tracks the most profitable bots in real-time, recording every trade entry and exit with per-second price data. This allows us to visualize exact strategy patterns, hold times, and profit/loss on every market window.</p>
      <h2>Featured Trading Bots</h2>
      <ul>${traders.traders.map(t =>
        `<li><a href="/bot/${t.name}" style="${LINK_STYLE}">${esc(t.name)}</a> — ${esc(t.description)}</li>`
      ).join('')}</ul>
    </section>
  </article>
  <footer style="margin-top:2rem">
    <a href="/" style="${LINK_STYLE}">Home</a> ·
    <a href="/leaderboard" style="${LINK_STYLE}">Bot Leaderboard</a>
  </footer>
</div>`;
}

// ─── 3. JSON-LD structured data generators ─────────────────────────────────

function generateLandingJsonLd() {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Polybot Arena',
    url: BASE_URL,
    description: 'Real-time dashboard tracking and comparing the most profitable trading bots on Polymarket crypto prediction markets.',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Web',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    author: { '@type': 'Organization', name: 'Polybot Arena', url: BASE_URL },
  });
}

function generateBotJsonLd(trader) {
  const durationDesc = (trader.durations || [900])
    .map(d => DURATION_LABELS[d] || `${d}s`)
    .join(', ');
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    name: `${trader.name} — Polymarket Trading Bot`,
    url: `${BASE_URL}/bot/${trader.name}/`,
    description: trader.longDescription || trader.description,
    mainEntity: {
      '@type': 'Thing',
      name: trader.name,
      description: `${durationDesc} crypto prediction market trading bot on Polymarket`,
      url: trader.profileUrl,
    },
    isPartOf: { '@type': 'WebApplication', name: 'Polybot Arena', url: BASE_URL },
  });
}

function generateLeaderboardJsonLd() {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Polymarket Bot Leaderboard',
    url: `${BASE_URL}/leaderboard/`,
    description: 'Compare the top Polymarket trading bots ranked by P&L, win rate, and trade volume.',
    isPartOf: { '@type': 'WebApplication', name: 'Polybot Arena', url: BASE_URL },
  });
}

function generateBlogJsonLd() {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'How Polymarket Bots Actually Trade: Real Data Analysis',
    url: `${BASE_URL}/blog/how-polymarket-bots-trade/`,
    description: 'Deep dive into how automated trading bots operate on Polymarket crypto prediction markets.',
    author: { '@type': 'Organization', name: 'Polybot Arena', url: BASE_URL },
    publisher: { '@type': 'Organization', name: 'Polybot Arena', url: BASE_URL },
    datePublished: '2026-02-01',
    dateModified: today,
    isPartOf: { '@type': 'WebApplication', name: 'Polybot Arena', url: BASE_URL },
  });
}

function generateFaqJsonLd() {
  return `<script type="application/ld+json">
    ${JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'What is Polybot Arena?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: "Polybot Arena is a free real-time dashboard that tracks and compares the most profitable automated trading bots on Polymarket's crypto prediction markets. It visualizes bot strategies, entries, exits, and P&L across 5-minute, 15-minute, and 1-hour market windows for BTC, ETH, SOL, and XRP.",
          },
        },
        {
          '@type': 'Question',
          name: 'How do Polymarket trading bots work?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Polymarket trading bots are automated programs that place trades on crypto prediction market binary outcomes. They use algorithmic strategies like mean-reversion, scalping, and momentum trading to profit from short-term price movements within timed market windows.',
          },
        },
        {
          '@type': 'Question',
          name: 'Which Polymarket bots are most profitable?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'The Polybot Arena leaderboard ranks bots by P&L, win rate, and trade volume. Top performers include distinct-baguette (the #1 15-minute trader) and abrak25 (a high-frequency 5-minute scalper generating $13K+ daily P&L). Visit polybot-arena.com/leaderboard for current rankings.',
          },
        },
        {
          '@type': 'Question',
          name: 'What crypto markets do these bots trade?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: "The tracked bots trade on Polymarket's crypto prediction markets covering Bitcoin (BTC), Ethereum (ETH), Solana (SOL), and Ripple (XRP). These are binary outcome markets where traders predict whether the price will be above or below a threshold at the end of a timed window.",
          },
        },
      ],
    })}
    </script>`;
}

// ─── 4. Generate per-route HTML files ──────────────────────────────────────
const indexHtml = readFileSync(join(DIST, 'index.html'), 'utf8');

/**
 * Create a route-specific HTML file by:
 * 1. Replacing meta tags in the template
 * 2. Injecting static HTML content into <div id="root">
 * 3. Adding per-page JSON-LD structured data
 */
function createRouteHtml(path, { title, description, staticContent, jsonLd }) {
  const fullTitle = title
    ? `${title} | Polybot Arena`
    : 'Polybot Arena — Watch Trading Bots Compete on Polymarket';
  // Ensure trailing slash for canonical URL (matches GitHub Pages directory serving)
  const canonicalPath = path === '/' ? '/' : path.replace(/\/?$/, '/');
  const canonicalUrl = `${BASE_URL}${canonicalPath}`;

  let html = indexHtml;

  // Replace title
  html = html.replace(
    /<title>[^<]*<\/title>/,
    `<title>${fullTitle}</title>`
  );

  // Replace meta description
  html = html.replace(
    /<meta name="description" content="[^"]*"/,
    `<meta name="description" content="${description}"`
  );

  // Replace canonical
  html = html.replace(
    /<link rel="canonical" href="[^"]*"/,
    `<link rel="canonical" href="${canonicalUrl}"`
  );

  // Replace OG tags
  html = html.replace(
    /<meta property="og:title" content="[^"]*"/,
    `<meta property="og:title" content="${fullTitle}"`
  );
  html = html.replace(
    /<meta property="og:description" content="[^"]*"/,
    `<meta property="og:description" content="${description}"`
  );
  html = html.replace(
    /<meta property="og:url" content="[^"]*"/,
    `<meta property="og:url" content="${canonicalUrl}"`
  );

  // Replace Twitter tags
  html = html.replace(
    /<meta name="twitter:title" content="[^"]*"/,
    `<meta name="twitter:title" content="${fullTitle}"`
  );
  html = html.replace(
    /<meta name="twitter:description" content="[^"]*"/,
    `<meta name="twitter:description" content="${description}"`
  );

  // Inject static content into <div id="root"> for crawler indexing
  if (staticContent) {
    html = html.replace(
      '<div id="root"></div>',
      `<div id="root">${staticContent}</div>`
    );
  }

  // Replace ALL existing JSON-LD blocks with the page-specific one
  if (jsonLd) {
    // Remove all JSON-LD script blocks
    html = html.replace(
      /<script type="application\/ld\+json">[\s\S]*?<\/script>\s*/g,
      ''
    );
    // Insert page-specific JSON-LD before closing </head>
    html = html.replace(
      '</head>',
      `  <script type="application/ld+json">\n    ${jsonLd}\n    </script>\n  </head>`
    );
  }

  // Write the file
  const dir = join(DIST, ...path.split('/').filter(Boolean));
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.html'), html);
  console.log(`  ✓ ${path}`);
}

console.log('\nGenerating per-route HTML files with static content:');

// Bot pages
for (const trader of traders.traders) {
  const durationDesc = (trader.durations || [900])
    .map(d => DURATION_LABELS[d] || `${d}s`)
    .join(', ');

  createRouteHtml(`/bot/${trader.name}`, {
    title: `${trader.name} — Polymarket Trading Bot Performance`,
    description: `Live trade data and P&L for ${trader.name}, a ${durationDesc} crypto prediction market bot on Polymarket. See entries, exits, strategy patterns, and profit/loss on every market window.`,
    staticContent: generateBotContent(trader),
    jsonLd: generateBotJsonLd(trader),
  });
}

// Leaderboard
createRouteHtml('/leaderboard', {
  title: 'Polymarket Bot Leaderboard — Rankings & Performance',
  description: 'Compare the top Polymarket trading bots ranked by P&L, win rate, and trade volume. The only bot-specific leaderboard for crypto prediction market automated traders.',
  staticContent: generateLeaderboardContent(),
  jsonLd: generateLeaderboardJsonLd(),
});

// Blog post
createRouteHtml('/blog/how-polymarket-bots-trade', {
  title: 'How Polymarket Bots Actually Trade: Real Data Analysis',
  description: 'Deep dive into how automated trading bots operate on Polymarket crypto prediction markets. Real trade data, strategy analysis, and performance breakdowns from Polybot Arena.',
  staticContent: generateBlogContent(),
  jsonLd: generateBlogJsonLd(),
});

// ─── 5. Update root index.html with landing page content ───────────────────
console.log('\nUpdating root index.html with landing page content:');

let rootHtml = readFileSync(join(DIST, 'index.html'), 'utf8');

// Inject landing page static content
rootHtml = rootHtml.replace(
  '<div id="root"></div>',
  `<div id="root">${generateLandingContent()}</div>`
);

// Replace all JSON-LD blocks with landing-specific WebApplication + FAQPage
rootHtml = rootHtml.replace(
  /<script type="application\/ld\+json">[\s\S]*?<\/script>\s*/g,
  ''
);
rootHtml = rootHtml.replace(
  '</head>',
  `  <script type="application/ld+json">\n    ${generateLandingJsonLd()}\n    </script>\n    ${generateFaqJsonLd()}\n  </head>`
);

writeFileSync(join(DIST, 'index.html'), rootHtml);
console.log('  ✓ / (root)');

console.log('\n✓ Post-build SEO complete!');
