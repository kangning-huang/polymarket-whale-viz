#!/usr/bin/env node
/**
 * capture-screenshots.mjs — Automated bot profile screenshot capture
 *
 * Uses Puppeteer to capture ONLY the profile card + 1D P&L section
 * (the two side-by-side cards at the top of the Polymarket profile page).
 * Crops tightly to just that area — no nav bar, no positions table.
 *
 * Usage: node scripts/capture-screenshots.mjs
 * Output: public/images/<bot>_pnl.png
 */

import { readFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import puppeteer from 'puppeteer';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const IMAGES_DIR = join(ROOT, 'public', 'images');

const config = JSON.parse(readFileSync(join(__dirname, 'traders.json'), 'utf-8'));

async function captureBot(browser, bot) {
  const url = bot.profileUrl;
  if (!url) {
    console.log(`  Skipping ${bot.name} — no profileUrl`);
    return;
  }

  const outputPath = join(IMAGES_DIR, bot.screenshot || `${bot.name}_pnl.png`);
  console.log(`  Capturing ${bot.name} from ${url}...`);

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 2 });

  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    // Wait for profile content to render
    await page.waitForFunction(
      () => {
        const body = document.body?.innerText || '';
        return body.includes('Profit') || body.includes('Positions');
      },
      { timeout: 15000 }
    ).catch(() => {
      console.log(`    Warning: P&L text not found for ${bot.name}, capturing anyway`);
    });

    // Wait for charts/animations to finish
    await new Promise(r => setTimeout(r, 3000));

    // Click "1D" button to ensure 1-day P&L is shown
    try {
      const buttons = await page.$$('button');
      for (const btn of buttons) {
        const text = await btn.evaluate(el => el.textContent?.trim());
        if (text === '1D') {
          await btn.click();
          await new Promise(r => setTimeout(r, 2000));
          break;
        }
      }
    } catch {
      // 1D might already be selected
    }

    // Find the profile card section — it's the container holding both
    // the profile info card and P&L card side by side.
    // Strategy: find the element containing "Positions Value" text,
    // then go up to its parent container that holds both cards.
    const cardBounds = await page.evaluate(() => {
      // Look for the text nodes that are unique to the profile section
      const markers = ['Positions Value', 'Biggest Win', 'Predictions'];
      let profileCard = null;

      const walk = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        null
      );
      while (walk.nextNode()) {
        const text = walk.currentNode.textContent?.trim() || '';
        if (markers.some(m => text === m)) {
          profileCard = walk.currentNode.parentElement;
          break;
        }
      }

      if (!profileCard) return null;

      // Walk up to find the flex container that holds both cards
      // (profile card + P&L card side by side)
      let container = profileCard;
      for (let i = 0; i < 10; i++) {
        const parent = container.parentElement;
        if (!parent) break;
        const style = window.getComputedStyle(parent);
        const rect = parent.getBoundingClientRect();
        // The container is wide (near viewport width) and uses flex/grid
        if (rect.width > 700 && (style.display === 'flex' || style.display === 'grid')) {
          container = parent;
          break;
        }
        container = parent;
      }

      const rect = container.getBoundingClientRect();
      return {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
      };
    });

    if (cardBounds && cardBounds.width > 100 && cardBounds.height > 50) {
      // Add small padding around the detected cards
      const pad = 8;
      await page.screenshot({
        path: outputPath,
        clip: {
          x: Math.max(0, cardBounds.x - pad),
          y: Math.max(0, cardBounds.y - pad),
          width: cardBounds.width + pad * 2,
          height: cardBounds.height + pad * 2,
        },
        type: 'png',
      });
      console.log(`    Saved (element crop): ${outputPath} — ${Math.round(cardBounds.width)}x${Math.round(cardBounds.height)}`);
    } else {
      // Fallback: crop a fixed region from the top of the page
      // Skip the nav bar (~60px), capture the card section (~250px)
      console.log(`    Warning: could not detect card bounds, using fixed crop`);
      await page.screenshot({
        path: outputPath,
        clip: { x: 60, y: 70, width: 1160, height: 250 },
        type: 'png',
      });
      console.log(`    Saved (fixed crop): ${outputPath}`);
    }
  } catch (e) {
    console.warn(`    Failed to capture ${bot.name}: ${e.message}`);
  } finally {
    await page.close();
  }
}

async function main() {
  console.log('Capturing bot profile screenshots...');
  mkdirSync(IMAGES_DIR, { recursive: true });

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
    ],
  });

  for (const bot of config.traders) {
    await captureBot(browser, bot);
  }

  await browser.close();
  console.log('Done!');
}

main().catch(e => {
  console.error('Screenshot capture failed:', e);
  process.exit(1);
});
