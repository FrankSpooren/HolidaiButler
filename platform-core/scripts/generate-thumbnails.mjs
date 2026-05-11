#!/usr/bin/env node
/**
 * Generate block thumbnails via Puppeteer screenshots — VII-E4.1.2
 *
 * Takes screenshots of real blocks rendered on dev.texelmaps.nl
 * and saves them as optimized PNGs (300x200).
 *
 * Usage: node generate-thumbnails.mjs
 */

import puppeteer from 'puppeteer-core';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const CHROMIUM_PATH = '/usr/bin/chromium-browser';
const OUTPUT_DIR = '/var/www/api.holidaibutler.com/admin-module/public/block-thumbnails';
const BASE_URL = 'https://dev.texelmaps.nl';

// Block configs: each block gets a dedicated test page slug or uses existing pages
const BLOCKS = [
  // === Page Structure ===
  { type: 'hero', url: '/', selector: '.desktop_hero, [class*="hero"], header', crop: { top: 0, height: 350 } },
  { type: 'desktop_hero', url: '/', selector: '.desktop_hero, [class*="hero"], header', crop: { top: 0, height: 350 } },
  { type: 'rich_text', url: '/about', selector: '.prose, article, [class*="rich-text"]', fallback: true },
  { type: 'cta', url: '/', selector: '[class*="cta"], [class*="call-to-action"]', fallback: true },

  // === Discovery ===
  { type: 'search', url: '/test-search', selector: '[role="search"], .search-block', fallback: true },
  { type: 'poi_grid', url: '/explore', selector: '[class*="poi-grid"], [class*="grid"]', crop: { top: 200, height: 500 } },
  { type: 'poi_grid_filtered', url: '/explore', selector: '[class*="poi-grid"], [class*="grid"]', crop: { top: 200, height: 500 } },
  { type: 'category_grid', url: '/', selector: '[class*="category"]', fallback: true },
  { type: 'map', url: '/', selector: '[class*="map"], .leaflet-container', fallback: true },
  { type: 'map_list', url: '/test-search', selector: '.map-list-block', fallback: true },
  { type: 'filter_bar', url: '/test-search', selector: '.filter-bar-block', fallback: true },
  { type: 'popular_pois', url: '/explore', selector: '[class*="poi-grid"]', crop: { top: 200, height: 500 } },
  { type: 'map_preview', url: '/', selector: '[class*="map"], .leaflet-container', fallback: true },
  { type: 'mobile_map', url: '/', selector: '[class*="map"], .leaflet-container', fallback: true },

  // === Events ===
  { type: 'event_calendar', url: '/events', selector: '[class*="event"], [class*="calendar"]', fallback: true },
  { type: 'event_calendar_filtered', url: '/events', selector: '[class*="event"], [class*="calendar"]', fallback: true },
  { type: 'today_events', url: '/', selector: '[class*="event"], [class*="today"]', fallback: true },
  { type: 'programme', url: '/', selector: '[class*="programme"], [class*="program"]', fallback: true },
  { type: 'calendar_view', url: '/events', selector: '.fc, .fc-wrapper, [class*="calendar-view"]', fallback: true },
  { type: 'add_to_calendar', url: '/event/1', selector: '.add-to-calendar-block, [class*="calendar"]', fallback: true },

  // === Content ===
  { type: 'gallery', url: '/poi/2048', selector: '[class*="gallery"], [class*="image"]', fallback: true },
  { type: 'video', url: '/', selector: '[class*="video"]', fullpage: true },
  { type: 'faq', url: '/about', selector: '[class*="faq"], [class*="accordion"]', fallback: true },
  { type: 'testimonials', url: '/', selector: '[class*="testimonial"], [class*="review"]', fallback: true },
  { type: 'banner', url: '/', selector: '[class*="banner"], [role="banner"]', fallback: true },
  { type: 'alert_status', url: '/', selector: '[class*="alert"], [role="alert"]', fallback: true },
  { type: 'partners', url: '/', selector: '[class*="partner"]', fallback: true },
  { type: 'downloads', url: '/', selector: '[class*="download"]', fallback: true },
  { type: 'social_feed', url: '/', selector: '[class*="social"]', fallback: true },
  { type: 'curated_cards', url: '/', selector: '[class*="card-group"], [class*="curated"]', fallback: true },
  { type: 'blog_grid', url: '/blog', selector: '[class*="blog"], [class*="grid"]', fallback: true },
  { type: 'tip_of_the_day', url: '/', selector: '[class*="tip"], [class*="tip-of"]', fallback: true },

  // === Commerce ===
  { type: 'ticket_shop', url: '/', selector: '[class*="ticket"]', fullpage: true },
  { type: 'reservation_widget', url: '/', selector: '[class*="reservation"]', fullpage: true },
  { type: 'offer', url: '/test-search', selector: '.offer-block', fallback: true },

  // === Forms ===
  { type: 'contact_form', url: '/contact', selector: 'form, [class*="contact"]', fallback: true },
  { type: 'newsletter', url: '/', selector: '[class*="newsletter"]', fallback: true },
  { type: 'chatbot_widget', url: '/', selector: '[class*="chatbot"], [class*="chat-bubble"]', fallback: true },

  // === Utility ===
  { type: 'weather_widget', url: '/', selector: '[class*="weather"]', fallback: true },
  { type: 'opening_hours', url: '/poi/2048', selector: '[class*="opening"], [class*="hours"]', fallback: true },
  { type: 'location_details', url: '/poi/2048', selector: '[class*="location"], [class*="contact"]', fallback: true },
  { type: 'breadcrumbs', url: '/explore', selector: 'nav[aria-label*="Breadcrumb"], [class*="breadcrumb"]', fallback: true },
  { type: 'anchor_nav', url: '/', selector: '.anchor-nav-block', fallback: true },
  { type: 'consent_embed', url: '/', selector: '.consent-embed-block', fallback: true },

  // === Planning ===
  { type: 'related_items', url: '/test-search', selector: '.related-items-block', fallback: true },
  { type: 'featured_item', url: '/test-search', selector: '.featured-item-block', fallback: true },
  { type: 'itinerary', url: '/', selector: '.itinerary-block', fallback: true },
  { type: 'save_to_trip', url: '/', selector: '.save-to-trip-block', fallback: true },
];

async function run() {
  // Ensure output dir exists
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  console.log('Launching Chromium...');
  const browser = await puppeteer.launch({
    executablePath: CHROMIUM_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });

  let success = 0;
  let fallback = 0;

  for (const block of BLOCKS) {
    try {
      const url = `${BASE_URL}${block.url}`;
      console.log(`  ${block.type}: navigating to ${url}...`);

      await page.goto(url, { waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});
      // Extra wait for client-side rendering
      await new Promise(r => setTimeout(r, 2000));

      let screenshot;

      if (block.selector) {
        // Try to find the specific element
        const el = await page.$(block.selector).catch(() => null);

        if (el) {
          const box = await el.boundingBox();
          if (box && box.width > 50 && box.height > 30) {
            screenshot = await el.screenshot({ type: 'png' });
            console.log(`    ✓ Element screenshot (${Math.round(box.width)}x${Math.round(box.height)})`);
          }
        }
      }

      if (!screenshot) {
        // Fallback: take full page crop
        if (block.crop) {
          screenshot = await page.screenshot({
            type: 'png',
            clip: {
              x: 0,
              y: block.crop.top,
              width: 1440,
              height: Math.min(block.crop.height, 900),
            },
          });
          console.log(`    ~ Cropped screenshot`);
        } else {
          // Default: capture viewport
          screenshot = await page.screenshot({ type: 'png' });
          console.log(`    ~ Full viewport screenshot`);
        }
        fallback++;
      } else {
        success++;
      }

      // Resize to 300x200 with sharp
      const outputPath = path.join(OUTPUT_DIR, `${block.type}.png`);
      await sharp(screenshot)
        .resize(300, 200, { fit: 'cover', position: 'top' })
        .png({ quality: 85, compressionLevel: 9 })
        .toFile(outputPath);

      const stats = fs.statSync(outputPath);
      console.log(`    → ${outputPath} (${(stats.size / 1024).toFixed(1)}KB)`);

    } catch (err) {
      console.error(`    ✗ ${block.type}: ${err.message}`);
    }
  }

  await browser.close();
  console.log(`\nDone: ${success} element screenshots, ${fallback} fallback screenshots`);
  console.log(`Total files: ${fs.readdirSync(OUTPUT_DIR).filter(f => f.endsWith('.png')).length}`);
}

run().catch(err => { console.error('Fatal:', err); process.exit(1); });
