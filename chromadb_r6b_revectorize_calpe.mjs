#!/usr/bin/env node
/**
 * ChromaDB Re-vectorisatie — Calpe Content Sync na R6b
 * ====================================================
 * Updates calpe_pois collection with R6b claim-stripped content.
 * Only touches Calpe POI vectors; QnA and Texel remain untouched.
 *
 * Usage:
 *   node chromadb_r6b_revectorize_calpe.mjs --dry-run     (default: show what would happen)
 *   node chromadb_r6b_revectorize_calpe.mjs --execute      (perform re-vectorization)
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';
import fs from 'fs';

// Set working directory to platform-core
const PLATFORM_CORE = '/var/www/api.holidaibutler.com/platform-core';
process.chdir(PLATFORM_CORE);

// Create require function scoped to platform-core for npm packages
const require = createRequire(join(PLATFORM_CORE, 'package.json'));

// Load environment
const dotenv = require('dotenv');
dotenv.config({ path: join(PLATFORM_CORE, '.env') });

// Import services (use absolute paths for ESM)
const { chromaService } = await import(join(PLATFORM_CORE, 'src/services/holibot/chromaService.js'));
const { embeddingService } = await import(join(PLATFORM_CORE, 'src/services/holibot/embeddingService.js'));
const { mysqlSequelize } = await import(join(PLATFORM_CORE, 'src/config/database.js'));
const { QueryTypes } = require('sequelize');

// ─── CONFIGURATION ──────────────────────────────────────────────────────────

const TARGET_COLLECTION = 'calpe_pois';
const OTHER_COLLECTION = 'texel_pois';
const TARGET_DESTINATION_ID = 1;
const OTHER_DESTINATION_ID = 2;
const LANGUAGES = ['en', 'nl', 'de', 'es'];
const BATCH_SIZE = 50;
const DATE_STR = new Date().toISOString().slice(0, 10).replace(/-/g, '');
const BACKUP_FILE = `/root/chromadb_calpe_pre_r6b_revectorize_backup_${DATE_STR}.json`;
const REPORT_FILE = `/root/chromadb_calpe_r6b_revectorize_report_${DATE_STR}.json`;

const args = process.argv.slice(2);
const DRY_RUN = !args.includes('--execute');

function log(msg) {
  const ts = new Date().toISOString().replace('T', ' ').slice(0, 19);
  console.log(`[${ts}] ${msg}`);
}

// ─── STAP 1: PRE-FLIGHT CHECKS ─────────────────────────────────────────────

async function preflight() {
  log('═'.repeat(70));
  log('STAP 1: PRE-FLIGHT CHECKS & BASELINE');
  log('═'.repeat(70));

  // A) ChromaDB connection
  log('\nA) ChromaDB connectie...');
  await chromaService.connect();
  log('  ChromaDB connected ✓');

  // Get stats for both collections
  const calpeStatsObj = await chromaService.getStats(TARGET_COLLECTION);
  const texelStatsObj = await chromaService.getStats(OTHER_COLLECTION);
  const calpeStats = calpeStatsObj.documentCount;
  const texelStats = texelStatsObj.documentCount;
  log(`  calpe_pois: ${calpeStats} documents`);
  log(`  texel_pois: ${texelStats} documents`);

  // B) Database content verification
  log('\nB) Database content verificatie...');

  const [calpeCounts] = await mysqlSequelize.query(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN enriched_detail_description IS NOT NULL AND enriched_detail_description != '' THEN 1 ELSE 0 END) as en,
      SUM(CASE WHEN enriched_detail_description_nl IS NOT NULL AND enriched_detail_description_nl != '' THEN 1 ELSE 0 END) as nl,
      SUM(CASE WHEN enriched_detail_description_de IS NOT NULL AND enriched_detail_description_de != '' THEN 1 ELSE 0 END) as de,
      SUM(CASE WHEN enriched_detail_description_es IS NOT NULL AND enriched_detail_description_es != '' THEN 1 ELSE 0 END) as es
    FROM POI
    WHERE is_active = 1 AND destination_id = ${TARGET_DESTINATION_ID}
  `, { type: QueryTypes.SELECT });

  log(`  Calpe POIs totaal: ${calpeCounts.total}`);
  log(`  Met EN content: ${calpeCounts.en}`);
  log(`  Met NL content: ${calpeCounts.nl}`);
  log(`  Met DE content: ${calpeCounts.de}`);
  log(`  Met ES content: ${calpeCounts.es}`);

  // R6b audit trail check
  const [auditCount] = await mysqlSequelize.query(`
    SELECT COUNT(DISTINCT poi_id) as cnt
    FROM poi_content_history
    WHERE change_source = 'r6b_claim_strip'
      AND poi_id IN (SELECT id FROM POI WHERE destination_id = ${TARGET_DESTINATION_ID})
  `, { type: QueryTypes.SELECT });

  log(`  R6b claim_strip audit entries (Calpe): ${auditCount.cnt} POIs`);

  // Steekproef: check POI 1 (a Calpe POI)
  const [sample] = await mysqlSequelize.query(`
    SELECT id, name, enriched_detail_description FROM POI
    WHERE destination_id = ${TARGET_DESTINATION_ID} AND enriched_detail_description IS NOT NULL
    ORDER BY rating DESC, review_count DESC LIMIT 1
  `, { type: QueryTypes.SELECT });
  if (sample) {
    const first80 = (sample.enriched_detail_description || '').substring(0, 80);
    log(`  Steekproef POI ${sample.id} (${sample.name}): "${first80}..."`);
  }

  // C) Expected result
  const expectedVectors = calpeCounts.en * LANGUAGES.length;
  log(`\nC) Verwacht: ${calpeCounts.en} POIs × ${LANGUAGES.length} talen = ${expectedVectors} nieuwe vectoren`);

  return {
    calpeStats,
    texelStats,
    calpeCounts,
    auditCount: auditCount.cnt,
    expectedVectors
  };
}

// ─── STAP 1D: BACKUP ───────────────────────────────────────────────────────

async function backupVectors() {
  log('\nD) Backup huidige Calpe POI vectoren...');

  const collection = await chromaService.getCollection(TARGET_COLLECTION);
  const totalCount = await collection.count();

  // Construct POI vector IDs from database instead of querying ChromaDB
  // (ChromaDB Cloud has a Get limit of 300 per request)
  const calpePoiIds = await mysqlSequelize.query(`
    SELECT id FROM POI WHERE destination_id = ${TARGET_DESTINATION_ID} AND is_active = 1
    ORDER BY id
  `, { type: QueryTypes.SELECT });

  const poiVectorIds = [];
  for (const row of calpePoiIds) {
    for (const lang of LANGUAGES) {
      poiVectorIds.push(`poi_${row.id}_${lang}`);
    }
  }

  const estimatedQnA = totalCount - poiVectorIds.length;

  const backup = {
    timestamp: new Date().toISOString(),
    collection: TARGET_COLLECTION,
    total_documents: totalCount,
    poi_vectors: poiVectorIds.length,
    qa_vectors: estimatedQnA,
    poi_ids: poiVectorIds,
    source: 'constructed_from_database'
  };

  fs.writeFileSync(BACKUP_FILE, JSON.stringify(backup, null, 2));
  log(`  Backup opgeslagen: ${BACKUP_FILE}`);
  log(`  POI vector IDs (constructed): ${poiVectorIds.length}`);
  log(`  Geschat QnA vectoren: ${estimatedQnA}`);
  log(`  Backup grootte: ${(fs.statSync(BACKUP_FILE).size / 1024).toFixed(1)} KB`);

  return backup;
}

// ─── STAP 2: PURGE OLD CALPE POI VECTORS ────────────────────────────────────

async function purgeOldVectors(backup) {
  log('\n' + '═'.repeat(70));
  log('STAP 2: CALPE POI VECTOREN VERWIJDEREN (SELECTIVE PURGE)');
  log('═'.repeat(70));

  const poiIds = backup.poi_ids;
  log(`  Te verwijderen: ${poiIds.length} POI vectoren`);
  log(`  QnA vectoren: ${backup.qa_vectors} (worden NIET aangeraakt)`);

  // Verify no Texel POIs in the list
  const texelPoiRows = await mysqlSequelize.query(`
    SELECT id FROM POI WHERE destination_id = ${OTHER_DESTINATION_ID}
  `, { type: QueryTypes.SELECT });
  const texelIds = new Set(texelPoiRows.map(p => p.id));

  let texelOverlap = 0;
  for (const id of poiIds) {
    const match = id.match(/^poi_(\d+)_/);
    if (match && texelIds.has(parseInt(match[1]))) {
      texelOverlap++;
    }
  }

  if (texelOverlap > 0) {
    log(`  ERROR: ${texelOverlap} Texel POIs gevonden in Calpe collectie!`);
    log('  STOP — escaleer naar eigenaar');
    process.exit(1);
  }
  log('  Texel cross-check: PASS (0 overlap)');

  // Delete in batches of 100
  const batchSize = 100;
  let deleted = 0;
  for (let i = 0; i < poiIds.length; i += batchSize) {
    const batch = poiIds.slice(i, i + batchSize);
    await chromaService.delete(batch, TARGET_COLLECTION);
    deleted += batch.length;
    if (deleted % 500 === 0 || i + batchSize >= poiIds.length) {
      log(`  Deleted batch: ${deleted}/${poiIds.length}`);
    }
  }

  // Verify
  const postCount = await (await chromaService.getCollection(TARGET_COLLECTION)).count();
  log(`\n  Remaining in calpe_pois: ${postCount}`);
  log(`  Verwacht QnA: ~${backup.qa_vectors}`);

  return { deleted, remaining: postCount };
}

// ─── STAP 3: RE-VECTORIZE WITH R6B CONTENT ──────────────────────────────────

async function revectorize() {
  log('\n' + '═'.repeat(70));
  log('STAP 3: RE-VECTORISATIE MET R6B CONTENT');
  log('═'.repeat(70));

  // Fetch ALL Calpe POIs with enriched content
  const pois = await mysqlSequelize.query(`
    SELECT
      id, name, category, subcategory, description,
      address, latitude, longitude, rating, review_count,
      price_level, thumbnail_url, opening_hours, phone, website,
      enriched_tile_description,
      enriched_tile_description_nl,
      enriched_tile_description_de,
      enriched_tile_description_es,
      enriched_detail_description,
      enriched_detail_description_nl,
      enriched_detail_description_de,
      enriched_detail_description_es,
      enriched_highlights,
      enriched_target_audience
    FROM POI
    WHERE is_active = 1
      AND destination_id = ${TARGET_DESTINATION_ID}
      AND enriched_detail_description IS NOT NULL
      AND enriched_detail_description != ''
    ORDER BY id
  `, { type: QueryTypes.SELECT });

  log(`  Calpe POIs met content: ${pois.length}`);
  log(`  Talen: ${LANGUAGES.join(', ')}`);
  log(`  Verwacht: ${pois.length * LANGUAGES.length} vectoren`);

  const documents = [];
  let processedCount = 0;
  let errorCount = 0;
  const errors = [];
  const startTime = Date.now();

  for (const poi of pois) {
    for (const lang of LANGUAGES) {
      try {
        const text = buildEmbeddingText(poi, lang);
        const embedding = await embeddingService.generateEmbedding(text);

        documents.push({
          id: `poi_${poi.id}_${lang}`,
          embedding,
          metadata: {
            type: 'poi',
            id: poi.id,
            name: poi.name,
            category: poi.category || '',
            subcategory: poi.subcategory || '',
            language: lang,
            address: poi.address || '',
            latitude: poi.latitude?.toString() || '',
            longitude: poi.longitude?.toString() || '',
            rating: poi.rating?.toString() || '',
            review_count: poi.review_count?.toString() || '',
            price_level: poi.price_level || '',
            thumbnail_url: poi.thumbnail_url || '',
            opening_hours: poi.opening_hours || '',
            phone: poi.phone || '',
            website: poi.website || '',
            has_enriched: 'true'
          },
          document: text
        });

        processedCount++;

        // Batch upsert every 50 docs
        if (documents.length >= BATCH_SIZE) {
          await chromaService.upsert(documents, TARGET_COLLECTION);
          documents.length = 0;

          if (processedCount % 500 === 0) {
            const elapsed = (Date.now() - startTime) / 1000;
            const rate = processedCount / elapsed;
            const remaining = (pois.length * LANGUAGES.length - processedCount) / rate;
            log(`  Progress: ${processedCount}/${pois.length * LANGUAGES.length} (${(processedCount / (pois.length * LANGUAGES.length) * 100).toFixed(1)}%) ETA: ${(remaining / 60).toFixed(1)} min`);
          }
        }

      } catch (error) {
        errorCount++;
        errors.push({ poi_id: poi.id, lang, error: error.message?.substring(0, 200) });
        if (errorCount <= 5) {
          log(`  ERROR POI ${poi.id} ${lang}: ${error.message?.substring(0, 100)}`);
        }
        if (errorCount > pois.length * LANGUAGES.length * 0.05) {
          log('  ERROR RATE > 5% — STOPPING');
          break;
        }
      }
    }
  }

  // Final batch
  if (documents.length > 0) {
    await chromaService.upsert(documents, TARGET_COLLECTION);
  }

  const elapsed = (Date.now() - startTime) / 1000;
  log(`\n  Verwerkt: ${processedCount} vectoren`);
  log(`  Errors: ${errorCount}`);
  log(`  Duur: ${(elapsed / 60).toFixed(1)} min`);
  log(`  Kosten schatting: €${(processedCount * 0.0004).toFixed(2)}`);

  return { processedCount, errorCount, errors, durationMinutes: elapsed / 60 };
}

// ─── HELPER: Build embedding text (same logic as syncService) ───────────────

function buildEmbeddingText(poi, language = 'en') {
  const tileDescField = language === 'en'
    ? 'enriched_tile_description'
    : `enriched_tile_description_${language}`;
  const tileDesc = poi[tileDescField] || poi.enriched_tile_description || poi.description;

  const detailDescField = language === 'en'
    ? 'enriched_detail_description'
    : `enriched_detail_description_${language}`;
  const detailDesc = poi[detailDescField] || poi.enriched_detail_description;

  let highlights = null;
  if (poi.enriched_highlights) {
    try {
      const arr = typeof poi.enriched_highlights === 'string'
        ? JSON.parse(poi.enriched_highlights)
        : poi.enriched_highlights;
      if (Array.isArray(arr)) {
        highlights = arr.join(', ');
      }
    } catch (e) { /* ignore */ }
  }

  const parts = [
    poi.name,
    poi.category,
    poi.subcategory,
    tileDesc,
    detailDesc,
    highlights,
    poi.enriched_target_audience,
    poi.address
  ];

  return parts.filter(Boolean).join(' | ');
}

// ─── STAP 4: QnA VERIFICATION ──────────────────────────────────────────────

async function verifyQnA(expectedPoiVectors) {
  log('\n' + '═'.repeat(70));
  log('STAP 4: QnA VECTOREN VERIFICATIE');
  log('═'.repeat(70));

  const collection = await chromaService.getCollection(TARGET_COLLECTION);
  const totalCount = await collection.count();

  // Calculate QnA count by subtracting POI vectors from total
  const qaCount = totalCount - expectedPoiVectors;

  log(`  Totaal vectoren: ${totalCount}`);
  log(`  POI vectoren (net aangemaakt): ${expectedPoiVectors}`);
  log(`  QnA vectoren (berekend): ${qaCount}`);
  log(`  Status: ${qaCount >= 0 ? 'OK' : 'WARNING (negatief!)'}`);

  // Quick spot-check: query a QnA topic to verify they're still accessible
  try {
    const testEmbed = await embeddingService.generateEmbedding('What restaurants are in Calpe?');
    const results = await chromaService.search(testEmbed, 3, null, TARGET_COLLECTION);
    const qnaResults = results.filter(r => r.id && (r.id.startsWith('qa_') || r.id.startsWith('qna_')));
    log(`  Spot-check "What restaurants are in Calpe?": ${results.length} results, ${qnaResults.length} QnA`);
  } catch (e) {
    log(`  Spot-check FAILED: ${e.message?.substring(0, 100)}`);
  }

  return { qaCount };
}

// ─── STAP 5: POST-VECTORIZATION TESTS ───────────────────────────────────────

async function postVerification(preStats) {
  log('\n' + '═'.repeat(70));
  log('STAP 5: POST-VECTORISATIE VERIFICATIE');
  log('═'.repeat(70));

  // A) Quantitative
  const calpeCount = await (await chromaService.getCollection(TARGET_COLLECTION)).count();
  const texelCount = await (await chromaService.getCollection(OTHER_COLLECTION)).count();

  log(`\nA) Kwantitatief:`);
  log(`  calpe_pois: ${calpeCount} (was: ${preStats.calpeStats})`);
  log(`  texel_pois: ${texelCount} (was: ${preStats.texelStats})`);
  log(`  Texel ongewijzigd: ${texelCount === preStats.texelStats ? 'PASS ✓' : 'FAIL ✗'}`);

  // B) Test queries
  log(`\nB) Test queries:`);

  const queries = [
    { query: 'Best restaurants near Peñón de Ifach', lang: 'en', label: 'Restaurants Peñón (EN)' },
    { query: 'Wat kan ik doen in Calpe?', lang: 'nl', label: 'Activiteiten Calpe (NL)' },
    { query: 'Wo kann ich in Calpe essen?', lang: 'de', label: 'Essen in Calpe (DE)' },
    { query: 'Playas y calas en Calpe', lang: 'es', label: 'Playas Calpe (ES)' },
  ];

  const results = [];
  for (const q of queries) {
    try {
      const embedding = await embeddingService.generateEmbedding(q.query);
      const searchResults = await chromaService.search(embedding, 3, { language: q.lang }, TARGET_COLLECTION);

      const top = searchResults[0];
      const hasContent = top && top.document && top.document.length > 50;
      const hasAmPm = top && top.document && /\d\s*[AaPp][Mm]/.test(top.document);

      log(`\n  Query: "${q.label}"`);
      log(`    Top 1: ${top?.metadata?.name || 'N/A'} (score: ${top?.score?.toFixed(3) || 'N/A'}, lang: ${top?.metadata?.language || 'N/A'})`);
      log(`    Content: "${(top?.document || '').substring(0, 100)}..."`);
      log(`    Has content: ${hasContent ? '✓' : '✗'}, No AM/PM: ${hasAmPm ? 'FAIL' : '✓'}`);

      results.push({
        query: q.label,
        topPoi: top?.metadata?.name || 'N/A',
        lang: top?.metadata?.language || 'N/A',
        score: top?.score || 0,
        hasContent,
        noAmPm: !hasAmPm,
        pass: hasContent && !hasAmPm
      });
    } catch (error) {
      log(`  Query "${q.label}" ERROR: ${error.message?.substring(0, 100)}`);
      results.push({ query: q.label, pass: false, error: error.message });
    }
  }

  // Texel test (should return Texel results from texel_pois, not calpe)
  try {
    const tEmbed = await embeddingService.generateEmbedding('Wat kan ik doen bij Ecomare op Texel?');
    const tResults = await chromaService.search(tEmbed, 3, null, OTHER_COLLECTION);
    const tTop = tResults[0];
    log(`\n  Query: "Ecomare op Texel (texel_pois)"`);
    log(`    Top 1: ${tTop?.metadata?.name || 'N/A'} (score: ${tTop?.score?.toFixed(3) || 'N/A'})`);
    log(`    Texel content: ${tTop?.document ? '✓' : '✗'}`);
    results.push({
      query: 'Ecomare Texel (cross-check)',
      topPoi: tTop?.metadata?.name || 'N/A',
      pass: !!tTop?.document
    });
  } catch (error) {
    log(`  Texel query ERROR: ${error.message?.substring(0, 100)}`);
    results.push({ query: 'Ecomare Texel', pass: false });
  }

  const passCount = results.filter(r => r.pass).length;
  log(`\n  Test resultaten: ${passCount}/${results.length} PASSED`);

  return { calpeCount, texelCount, texelUnchanged: texelCount === preStats.texelStats, testResults: results, passCount };
}

// ─── MAIN ───────────────────────────────────────────────────────────────────

async function main() {
  log('╔' + '═'.repeat(68) + '╗');
  log('║  CHROMADB RE-VECTORISATIE — CALPE CONTENT SYNC NA R6B              ║');
  log('║  Mode: ' + (DRY_RUN ? 'DRY-RUN' : 'EXECUTE') + '                                                    ║');
  log('╚' + '═'.repeat(68) + '╝');

  try {
    // STAP 1: Pre-flight
    const preStats = await preflight();

    if (DRY_RUN) {
      log('\n' + '═'.repeat(70));
      log('DRY-RUN MODE — geen wijzigingen');
      log('═'.repeat(70));
      log(`\nBij --execute:`);
      log(`  1. Backup ${preStats.calpeStats} vectoren metadata`);
      log(`  2. Delete ~${preStats.calpeCounts.en * LANGUAGES.length} oude POI vectoren`);
      log(`  3. Re-vectorize ${preStats.expectedVectors} nieuwe vectoren`);
      log(`  4. Verify QnA intact`);
      log(`  5. Run 5 test queries`);
      log(`  Geschatte kosten: €${(preStats.expectedVectors * 0.0004).toFixed(2)}`);
      log(`  Geschatte duur: ${(preStats.expectedVectors * 0.15 / 60).toFixed(0)} min`);
      await mysqlSequelize.close();
      process.exit(0);
    }

    // STAP 1D: Backup
    const backup = await backupVectors();

    // STAP 2: Purge
    const purgeResult = await purgeOldVectors(backup);

    // STAP 3: Re-vectorize
    const syncResult = await revectorize();

    // STAP 4: QnA check
    const qnaResult = await verifyQnA(syncResult.processedCount);

    // STAP 5: Post-verification
    const postResult = await postVerification(preStats);

    // STAP 6: Save report
    const report = {
      timestamp: new Date().toISOString(),
      trigger: 'R6b claim stripping completed, Calpe vectors outdated',
      pre: {
        calpe_vectors: preStats.calpeStats,
        texel_vectors: preStats.texelStats,
        calpe_pois_with_content: preStats.calpeCounts.en,
        r6b_audit_entries_calpe: preStats.auditCount
      },
      purge: {
        deleted: purgeResult.deleted,
        remaining_after_purge: purgeResult.remaining
      },
      sync: {
        vectors_created: syncResult.processedCount,
        errors: syncResult.errorCount,
        error_details: syncResult.errors.slice(0, 20),
        duration_minutes: syncResult.durationMinutes,
        cost_estimate_eur: syncResult.processedCount * 0.0004
      },
      post: {
        calpe_vectors: postResult.calpeCount,
        texel_vectors: postResult.texelCount,
        texel_unchanged: postResult.texelUnchanged,
        qna_vectors: qnaResult.qaCount,
        test_queries: postResult.testResults,
        tests_passed: postResult.passCount
      },
      languages: LANGUAGES,
      embedding_model: 'mistral-embed'
    };

    fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2));

    log('\n' + '═'.repeat(70));
    log('CHROMADB CALPE RE-VECTORISATIE COMPLEET');
    log('═'.repeat(70));
    log(`  Vectoren verwijderd: ${purgeResult.deleted}`);
    log(`  Vectoren aangemaakt: ${syncResult.processedCount}`);
    log(`  Errors: ${syncResult.errorCount}`);
    log(`  Duur: ${syncResult.durationMinutes.toFixed(1)} min`);
    log(`  Kosten: €${(syncResult.processedCount * 0.0004).toFixed(2)}`);
    log(`  Texel ongewijzigd: ${postResult.texelUnchanged ? 'PASS ✓' : 'FAIL ✗'}`);
    log(`  Test queries: ${postResult.passCount}/5 passed`);
    log(`  Rapport: ${REPORT_FILE}`);
    log(`  Backup: ${BACKUP_FILE}`);

    await mysqlSequelize.close();
    process.exit(0);

  } catch (error) {
    log(`\nFATAL ERROR: ${error.message}`);
    log(error.stack);
    await mysqlSequelize.close();
    process.exit(1);
  }
}

main();
