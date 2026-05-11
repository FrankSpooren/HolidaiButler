import puppeteer from 'puppeteer-core';
import sharp from 'sharp';
import fs from 'fs';

const OUT = '/var/www/api.holidaibutler.com/admin-module/public/block-thumbnails';

const browser = await puppeteer.launch({
  executablePath: '/usr/bin/chromium-browser',
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
});

const page = await browser.newPage();
await page.setViewport({ width: 1200, height: 800, deviceScaleFactor: 2 });

// add_to_calendar: use the about page which has structured content
// Screenshot a portion that visually represents a calendar action
console.log('  add_to_calendar: capturing from events page...');
await page.goto('https://dev.texelmaps.nl/events', { waitUntil: 'networkidle2', timeout: 20000 }).catch(() => {});
await new Promise(r => setTimeout(r, 4000));
let shot = await page.screenshot({ type: 'png', clip: { x: 0, y: 50, width: 1200, height: 500 } });
await sharp(shot).resize(600, 400, { fit: 'cover', position: 'top' }).png({ quality: 90 }).toFile(`${OUT}/add_to_calendar.png`);
console.log(`    ${(fs.statSync(`${OUT}/add_to_calendar.png`).size / 1024).toFixed(1)}KB`);

// itinerary: capture the programme block from homepage (shows timeline-like content)
console.log('  itinerary: capturing programme/timeline from homepage...');
await page.goto('https://dev.texelmaps.nl/', { waitUntil: 'networkidle2', timeout: 20000 }).catch(() => {});
await new Promise(r => setTimeout(r, 4000));

// Find the programme block which has timeline-like appearance
const progEl = await page.$('[class*="programme"], [class*="program"]').catch(() => null);
if (progEl) {
  const box = await progEl.boundingBox();
  if (box && box.height > 100) {
    shot = await progEl.screenshot({ type: 'png' });
    console.log(`    programme element: ${Math.round(box.width)}x${Math.round(box.height)}`);
  }
} else {
  // Fallback: scroll to mid-page content
  shot = await page.screenshot({ type: 'png', clip: { x: 0, y: 300, width: 1200, height: 500 } });
  console.log('    scroll fallback');
}
await sharp(shot).resize(600, 400, { fit: 'cover', position: 'top' }).png({ quality: 90 }).toFile(`${OUT}/itinerary.png`);
console.log(`    ${(fs.statSync(`${OUT}/itinerary.png`).size / 1024).toFixed(1)}KB`);

await browser.close();

// Final check
let good = 0, bad = 0;
for (const f of fs.readdirSync(OUT).filter(f => f.endsWith('.png'))) {
  const size = fs.statSync(`${OUT}/${f}`).size;
  if (size < 1000) { bad++; console.log(`  ✗ ${f}: ${size} bytes`); }
  else good++;
}
console.log(`\nFinal: ${good} good, ${bad} bad out of ${good + bad}`);
