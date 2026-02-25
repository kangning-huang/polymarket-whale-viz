#!/usr/bin/env node
/**
 * Post-build SEO script:
 * 1. Generates sitemap.xml from traders.json
 * 2. Creates per-route HTML files so GitHub Pages serves proper meta tags
 *    instead of going through the 404.html redirect chain
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = join(__dirname, '..', 'dist');
const BASE_URL = 'https://polybot-arena.com';

// Read traders config
const traders = JSON.parse(readFileSync(join(__dirname, 'traders.json'), 'utf8'));

// ─── 1. Generate sitemap.xml ───────────────────────────────────────────────
const today = new Date().toISOString().split('T')[0];

const DURATION_LABELS = { 300: '5-minute', 900: '15-minute', 3600: '1-hour' };

const urls = [
  { loc: '/', changefreq: 'hourly', priority: '1.0' },
  { loc: '/leaderboard', changefreq: 'hourly', priority: '0.9' },
  { loc: '/blog/how-polymarket-bots-trade', changefreq: 'monthly', priority: '0.8' },
  ...traders.traders.map(t => ({
    loc: `/bot/${t.name}`,
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

// ─── 2. Generate per-route HTML files ──────────────────────────────────────
// Read the built index.html as our template
const indexHtml = readFileSync(join(DIST, 'index.html'), 'utf8');

/**
 * Create a route-specific HTML file by replacing meta tags in the template.
 */
function createRouteHtml(path, { title, description }) {
  const fullTitle = title
    ? `${title} | Polybot Arena`
    : 'Polybot Arena — Watch Trading Bots Compete on Polymarket';
  const canonicalUrl = `${BASE_URL}${path}`;

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

  // Write the file
  const dir = join(DIST, ...path.split('/').filter(Boolean));
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.html'), html);
  console.log(`  ✓ ${path}`);
}

console.log('\nGenerating per-route HTML files:');

// Bot pages
for (const trader of traders.traders) {
  const durationDesc = (trader.durations || [900])
    .map(d => DURATION_LABELS[d] || `${d}s`)
    .join(', ');

  createRouteHtml(`/bot/${trader.name}`, {
    title: `${trader.name} — Polymarket Trading Bot Performance`,
    description: `Live trade data and P&L for ${trader.name}, a ${durationDesc} crypto prediction market bot on Polymarket. See entries, exits, strategy patterns, and profit/loss on every market window.`,
  });
}

// Leaderboard
createRouteHtml('/leaderboard', {
  title: 'Polymarket Bot Leaderboard — Rankings & Performance',
  description: 'Compare the top Polymarket trading bots ranked by P&L, win rate, and trade volume. The only bot-specific leaderboard for crypto prediction market automated traders.',
});

// Blog post
createRouteHtml('/blog/how-polymarket-bots-trade', {
  title: 'How Polymarket Bots Actually Trade: Real Data Analysis',
  description: 'Deep dive into how automated trading bots operate on Polymarket crypto prediction markets. Real trade data, strategy analysis, and performance breakdowns from Polybot Arena.',
});

console.log('\n✓ Post-build SEO complete!');
