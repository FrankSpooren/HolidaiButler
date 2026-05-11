#!/usr/bin/env node
/**
 * Generate destination-neutral block thumbnails via Puppeteer — VII-E4.1.2 v2
 *
 * Uses /block-showcase?type=X route with hardcoded neutral sample data.
 * No API dependencies, no destination-specific content.
 *
 * Usage: node scripts/generate-thumbnails.mjs
 */

import puppeteer from 'puppeteer-core';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const CHROMIUM_PATH = '/usr/bin/chromium-browser';
const OUTPUT_DIR = '/var/www/api.holidaibutler.com/admin-module/public/block-thumbnails';
const BASE_URL = 'https://dev.texelmaps.nl';

// All 48 visible block types
const BLOCK_TYPES = [
  'hero', 'desktop_hero', 'rich_text', 'cta', 'banner', 'alert_status',
  'breadcrumbs', 'anchor_nav', 'consent_embed',
  'search', 'filter_bar', 'poi_grid', 'poi_grid_filtered', 'category_grid',
  'map', 'map_list', 'map_preview', 'mobile_map', 'popular_pois',
  'event_calendar', 'event_calendar_filtered', 'today_events', 'programme',
  'calendar_view', 'add_to_calendar',
  'gallery', 'video', 'faq', 'testimonials', 'partners', 'downloads',
  'social_feed', 'curated_cards', 'blog_grid', 'tip_of_the_day',
  'ticket_shop', 'reservation_widget', 'offer',
  'contact_form', 'newsletter', 'chatbot_widget',
  'weather_widget', 'opening_hours', 'location_details',
  'related_items', 'featured_item', 'itinerary', 'save_to_trip',
];

async function run() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  console.log('Launching Chromium...');
  const browser = await puppeteer.launch({
    executablePath: CHROMIUM_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });

  const page = await browser.newPage();
  // Desktop viewport at 2x for crisp thumbnails
  await page.setViewport({ width: 1200, height: 800, deviceScaleFactor: 2 });

  let success = 0;
  let fallback = 0;

  for (const type of BLOCK_TYPES) {
    try {
      const url = `${BASE_URL}/block-showcase?type=${type}`;
      console.log(`  ${type}: ${url}`);

      await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 }).catch(() => {});
      // Wait for client-side rendering + any animations
      await new Promise(r => setTimeout(r, 5000));

      // Try to find the block element
      const blockEl = await page.$(`[data-block-type="${type}"]`).catch(() => null);

      let screenshot;

      if (blockEl) {
        const box = await blockEl.boundingBox();
        if (box && box.width > 100 && box.height > 50) {
          // Clip to max 800px height to avoid very tall blocks
          const clipHeight = Math.min(box.height, 800);
          screenshot = await page.screenshot({
            type: 'png',
            clip: { x: box.x, y: box.y, width: box.width, height: clipHeight },
          });
          console.log(`    ✓ Block element (${Math.round(box.width)}x${Math.round(clipHeight)})`);
          success++;
        }
      }

      if (!screenshot) {
        // Fallback: screenshot the viewport
        screenshot = await page.screenshot({
          type: 'png',
          clip: { x: 0, y: 0, width: 1200, height: 800 },
        });
        console.log(`    ~ Viewport fallback`);
        fallback++;
      }

      // Resize to 300x200 with sharp — cover crop from top
      const outputPath = path.join(OUTPUT_DIR, `${type}.png`);
      await sharp(screenshot)
        .resize(600, 400, { fit: 'cover', position: 'top' })  // 2x for retina
        .png({ quality: 90, compressionLevel: 8 })
        .toFile(outputPath);

      const stats = fs.statSync(outputPath);
      console.log(`    → ${(stats.size / 1024).toFixed(1)}KB`);

    } catch (err) {
      console.error(`    ✗ ${type}: ${err.message}`);
    }
  }

  await browser.close();

  // Summary
  const files = fs.readdirSync(OUTPUT_DIR).filter(f => f.endsWith('.png'));
  const totalSize = files.reduce((sum, f) => sum + fs.statSync(path.join(OUTPUT_DIR, f)).size, 0);
  console.log(`\n=== Summary ===`);
  console.log(`Element screenshots: ${success}`);
  console.log(`Viewport fallbacks: ${fallback}`);
  console.log(`Total PNG files: ${files.length}`);
  console.log(`Total size: ${(totalSize / 1024).toFixed(0)}KB`);
}

run().catch(err => { console.error('Fatal:', err); process.exit(1); });
