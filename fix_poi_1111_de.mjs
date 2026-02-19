#!/usr/bin/env node
/**
 * Fix missing POI 1111 DE vector in calpe_pois
 */
import { join } from 'path';
import { createRequire } from 'module';

const PLATFORM_CORE = '/var/www/api.holidaibutler.com/platform-core';
process.chdir(PLATFORM_CORE);
const require = createRequire(join(PLATFORM_CORE, 'package.json'));
const dotenv = require('dotenv');
dotenv.config({ path: join(PLATFORM_CORE, '.env') });
const { QueryTypes } = require('sequelize');

const { chromaService } = await import(join(PLATFORM_CORE, 'src/services/holibot/chromaService.js'));
const { embeddingService } = await import(join(PLATFORM_CORE, 'src/services/holibot/embeddingService.js'));
const { mysqlSequelize } = await import(join(PLATFORM_CORE, 'src/config/database.js'));

await chromaService.connect();

const [poi] = await mysqlSequelize.query(`
  SELECT id, name, category, subcategory, description, address, latitude, longitude,
         rating, review_count, price_level, thumbnail_url, opening_hours, phone, website,
         enriched_tile_description_de, enriched_detail_description_de,
         enriched_tile_description, enriched_detail_description,
         enriched_highlights, enriched_target_audience
  FROM POI WHERE id = 1111
`, { type: QueryTypes.SELECT });

console.log(`POI 1111: ${poi.name}`);

const tileDesc = poi.enriched_tile_description_de || poi.enriched_tile_description || poi.description;
const detailDesc = poi.enriched_detail_description_de || poi.enriched_detail_description;
let highlights = null;
try { const arr = JSON.parse(poi.enriched_highlights); if (Array.isArray(arr)) highlights = arr.join(', '); } catch(e) {}
const text = [poi.name, poi.category, poi.subcategory, tileDesc, detailDesc, highlights, poi.enriched_target_audience, poi.address].filter(Boolean).join(' | ');

const embedding = await embeddingService.generateEmbedding(text);
await chromaService.upsert([{
  id: 'poi_1111_de',
  embedding,
  metadata: { type: 'poi', id: 1111, name: poi.name, category: poi.category || '', subcategory: poi.subcategory || '', language: 'de', address: poi.address || '', has_enriched: 'true' },
  document: text
}], 'calpe_pois');

const count = await (await chromaService.getCollection('calpe_pois')).count();
console.log(`POI 1111 DE vector added. calpe_pois count: ${count}`);
await mysqlSequelize.close();
process.exit(0);
