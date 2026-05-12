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

for (const type of ['add_to_calendar', 'itinerary']) {
  console.log(`  ${type}...`);
  await page.goto(`https://dev.texelmaps.nl/block-showcase?type=${type}`, { waitUntil: 'networkidle2', timeout: 20000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 6000));

  // For add_to_calendar: click the dropdown button to show providers
  if (type === 'add_to_calendar') {
    try {
      const btns = await page.$$('button');
      for (const btn of btns) {
        const text = await page.evaluate(el => el.textContent, btn);
        if (text && text.includes('agenda')) {
          await btn.click();
          await new Promise(r => setTimeout(r, 1000));
          break;
        }
      }
    } catch {}
  }

  const el = await page.$(`[data-block-type="${type}"]`);
  let screenshot;
  if (el) {
    const box = await el.boundingBox();
    if (box && box.height > 50) {
      screenshot = await page.screenshot({
        type: 'png',
        clip: { x: box.x, y: box.y, width: box.width, height: Math.min(box.height, 600) },
      });
      console.log(`    element: ${Math.round(box.width)}x${Math.round(box.height)}`);
    }
  }
  if (!screenshot) {
    screenshot = await page.screenshot({ type: 'png' });
    console.log('    viewport fallback');
  }

  const outPath = `${OUT}/${type}.png`;
  await sharp(screenshot).resize(600, 400, { fit: 'cover', position: 'top' }).png({ quality: 90 }).toFile(outPath);
  console.log(`    ${(fs.statSync(outPath).size / 1024).toFixed(1)}KB`);
}

await browser.close();
console.log('Done');
