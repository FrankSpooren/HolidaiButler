#!/usr/bin/env node
/**
 * Screenshot live blocks from real pages on dev.texelmaps.nl
 * For blocks that don't render with static sample data.
 * These complement the showcase-based screenshots.
 */

import puppeteer from 'puppeteer-core';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const CHROMIUM_PATH = '/usr/bin/chromium-browser';
const OUTPUT_DIR = '/var/www/api.holidaibutler.com/admin-module/public/block-thumbnails';
const BASE_URL = 'https://dev.texelmaps.nl';

// Each block: page URL + scroll position or CSS selector to capture the right area
const LIVE_BLOCKS = [
  // Homepage blocks (dev.texelmaps.nl/)
  { type: 'today_events', url: '/', scrollY: 400, clipH: 400, desc: 'Events section on homepage' },
  { type: 'category_grid', url: '/', selector: '[class*="category"]', desc: 'Category grid' },
  { type: 'banner', url: '/', scrollY: 0, clipH: 300, desc: 'Top of homepage' },
  { type: 'partners', url: '/', scrollY: 2000, clipH: 400, desc: 'Partners section' },
  { type: 'testimonials', url: '/', scrollY: 1800, clipH: 400, desc: 'Testimonials' },
  { type: 'downloads', url: '/', scrollY: 2200, clipH: 400, desc: 'Downloads' },
  { type: 'curated_cards', url: '/', scrollY: 600, clipH: 400, desc: 'Curated cards' },
  { type: 'weather_widget', url: '/', scrollY: 1400, clipH: 300, desc: 'Weather' },
  { type: 'chatbot_widget', url: '/', selector: '[class*="chatbot"], [class*="chat-bubble"]', desc: 'Chatbot bubble' },
  { type: 'mobile_map', url: '/', selector: '.leaflet-container', desc: 'Map component' },
  { type: 'video', url: '/', scrollY: 1600, clipH: 400, desc: 'Video section' },
  { type: 'save_to_trip', url: '/test-search', scrollY: 100, clipH: 300, desc: 'Save to trip button' },
  { type: 'anchor_nav', url: '/about', scrollY: 0, clipH: 200, desc: 'Page nav' },
  { type: 'breadcrumbs', url: '/explore', scrollY: 60, clipH: 200, desc: 'Breadcrumbs nav' },

  // Explore page
  { type: 'gallery', url: '/poi/2048', scrollY: 0, clipH: 400, desc: 'POI image gallery' },

  // Events page
  { type: 'event_calendar', url: '/events', scrollY: 100, clipH: 500, desc: 'Event listing' },
  { type: 'event_calendar_filtered', url: '/events', scrollY: 100, clipH: 500, desc: 'Event listing filtered' },

  // Blog
  { type: 'blog_grid', url: '/blog', scrollY: 100, clipH: 400, desc: 'Blog articles grid' },

  // POI detail
  { type: 'opening_hours', url: '/poi/2048', scrollY: 800, clipH: 400, desc: 'Opening hours on POI' },
  { type: 'location_details', url: '/poi/2048', scrollY: 600, clipH: 400, desc: 'Location details on POI' },

  // Commerce
  { type: 'ticket_shop', url: '/', scrollY: 1000, clipH: 400, desc: 'Ticket shop' },

  // Calendar
  { type: 'add_to_calendar', url: '/event/1', scrollY: 200, clipH: 300, desc: 'Add to calendar' },
];

async function run() {
  console.log('Launching Chromium for live page screenshots...');
  const browser = await puppeteer.launch({
    executablePath: CHROMIUM_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 900, deviceScaleFactor: 2 });

  let success = 0;
  let skipped = 0;

  for (const block of LIVE_BLOCKS) {
    try {
      const url = `${BASE_URL}${block.url}`;
      console.log(`  ${block.type}: ${url} (${block.desc})`);

      await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 }).catch(() => {});
      await new Promise(r => setTimeout(r, 4000));

      let screenshot;

      // Try selector first
      if (block.selector) {
        const el = await page.$(block.selector).catch(() => null);
        if (el) {
          const box = await el.boundingBox();
          if (box && box.width > 100 && box.height > 50) {
            const clipH = Math.min(box.height, 600);
            screenshot = await page.screenshot({
              type: 'png',
              clip: { x: box.x, y: box.y, width: box.width, height: clipH },
            });
            console.log(`    ✓ Selector match (${Math.round(box.width)}x${Math.round(clipH)})`);
          }
        }
      }

      // Fallback: scroll + clip
      if (!screenshot && block.scrollY !== undefined) {
        await page.evaluate((y) => window.scrollTo(0, y), block.scrollY);
        await new Promise(r => setTimeout(r, 1000));
        screenshot = await page.screenshot({
          type: 'png',
          clip: { x: 0, y: 0, width: 1200, height: block.clipH || 400 },
        });
        console.log(`    ✓ Scroll+clip (scrollY=${block.scrollY}, h=${block.clipH})`);
      }

      if (!screenshot) {
        screenshot = await page.screenshot({ type: 'png' });
        console.log(`    ~ Full viewport fallback`);
      }

      // Check if the screenshot has actual content (not just white)
      const info = await sharp(screenshot).stats();
      const isBlank = info.channels.every(c => c.mean > 250); // nearly all white

      if (isBlank) {
        console.log(`    ⚠ Screenshot appears blank — keeping existing thumbnail`);
        skipped++;
        continue;
      }

      const outputPath = path.join(OUTPUT_DIR, `${block.type}.png`);
      await sharp(screenshot)
        .resize(600, 400, { fit: 'cover', position: 'top' })
        .png({ quality: 90, compressionLevel: 8 })
        .toFile(outputPath);

      const stats = fs.statSync(outputPath);
      console.log(`    → ${(stats.size / 1024).toFixed(1)}KB`);
      success++;

    } catch (err) {
      console.error(`    ✗ ${block.type}: ${err.message}`);
    }
  }

  await browser.close();
  console.log(`\nDone: ${success} screenshots updated, ${skipped} kept existing`);
}

run().catch(err => { console.error('Fatal:', err); process.exit(1); });
