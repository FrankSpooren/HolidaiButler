/**
 * POI Data Analysis Script
 * =========================
 * Sprint 9.0: Database Meertaligheid Audit + Content Quality Analysis
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

async function analyzePOIData() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  console.log('✅ Connected to database:', process.env.DB_NAME);
  console.log('='.repeat(80));

  try {
    // 1. Get table structure
    console.log('\n📋 POI TABLE STRUCTURE:');
    console.log('-'.repeat(80));
    const [columns] = await connection.execute('DESCRIBE POI');
    columns.forEach(col => {
      console.log(`  ${col.Field.padEnd(25)} ${col.Type.padEnd(20)} ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });

    // 2. Total POI count
    const [[{ total }]] = await connection.execute('SELECT COUNT(*) as total FROM POI WHERE is_active = TRUE');
    console.log('\n📊 TOTAL ACTIVE POIs:', total);
    console.log('-'.repeat(80));

    // 3. Description quality analysis
    console.log('\n📝 DESCRIPTION QUALITY ANALYSIS:');
    console.log('-'.repeat(80));

    // POIs with NULL description
    const [[{ null_desc }]] = await connection.execute(
      'SELECT COUNT(*) as null_desc FROM POI WHERE is_active = TRUE AND (description IS NULL OR description = "")'
    );
    console.log(`  ❌ No description (NULL/empty):     ${null_desc.toString().padStart(5)} POIs  (${((null_desc/total)*100).toFixed(1)}%)`);

    // POIs with very short description (< 50 chars)
    const [[{ short_desc }]] = await connection.execute(
      'SELECT COUNT(*) as short_desc FROM POI WHERE is_active = TRUE AND description IS NOT NULL AND LENGTH(description) > 0 AND LENGTH(description) < 50'
    );
    console.log(`  ⚠️  Very short (< 50 chars):        ${short_desc.toString().padStart(5)} POIs  (${((short_desc/total)*100).toFixed(1)}%)`);

    // POIs with short description (50-100 chars)
    const [[{ medium_short_desc }]] = await connection.execute(
      'SELECT COUNT(*) as medium_short_desc FROM POI WHERE is_active = TRUE AND description IS NOT NULL AND LENGTH(description) >= 50 AND LENGTH(description) < 100'
    );
    console.log(`  ⚠️  Short (50-100 chars):           ${medium_short_desc.toString().padStart(5)} POIs  (${((medium_short_desc/total)*100).toFixed(1)}%)`);

    // POIs with decent description (100-200 chars)
    const [[{ medium_desc }]] = await connection.execute(
      'SELECT COUNT(*) as medium_desc FROM POI WHERE is_active = TRUE AND description IS NOT NULL AND LENGTH(description) >= 100 AND LENGTH(description) < 200'
    );
    console.log(`  ✓  Decent (100-200 chars):         ${medium_desc.toString().padStart(5)} POIs  (${((medium_desc/total)*100).toFixed(1)}%)`);

    // POIs with good description (200+ chars)
    const [[{ good_desc }]] = await connection.execute(
      'SELECT COUNT(*) as good_desc FROM POI WHERE is_active = TRUE AND description IS NOT NULL AND LENGTH(description) >= 200'
    );
    console.log(`  ✅ Good (200+ chars):              ${good_desc.toString().padStart(5)} POIs  (${((good_desc/total)*100).toFixed(1)}%)`);

    // Total problematic POIs (NULL, empty, or < 100 chars)
    const problematic = null_desc + short_desc + medium_short_desc;
    console.log(`\n  🚨 TOTAL PROBLEMATIC POIs:         ${problematic.toString().padStart(5)} POIs  (${((problematic/total)*100).toFixed(1)}%)`);

    // 4. Sample problematic POIs
    console.log('\n📄 SAMPLE PROBLEMATIC POIs (No/Poor Description):');
    console.log('-'.repeat(80));
    const [problematicSamples] = await connection.execute(`
      SELECT id, name, category, description, LENGTH(description) as desc_length
      FROM POI
      WHERE is_active = TRUE
        AND (description IS NULL OR description = '' OR LENGTH(description) < 100)
      ORDER BY popularity_score DESC
      LIMIT 10
    `);

    problematicSamples.forEach((poi, idx) => {
      console.log(`\n  ${idx + 1}. [ID: ${poi.id}] ${poi.name}`);
      console.log(`     Category: ${poi.category}`);
      console.log(`     Description: ${poi.description ? `"${poi.description.substring(0, 80)}${poi.description.length > 80 ? '...' : ''}"` : 'NULL/EMPTY'}`);
      console.log(`     Length: ${poi.desc_length || 0} chars`);
    });

    // 5. Multilingual fields analysis
    console.log('\n\n🌍 MULTILINGUAL FIELDS ANALYSIS:');
    console.log('-'.repeat(80));

    // Check if multilingual columns exist
    const nameColumns = columns.filter(col => col.Field.match(/^name_(nl|en|es|de|fr)$/));
    const descColumns = columns.filter(col => col.Field.match(/^description_(nl|en|es|de|fr)$/));

    if (nameColumns.length > 0) {
      console.log(`  ✅ Name is MULTILINGUAL (${nameColumns.length} language columns found)`);
      nameColumns.forEach(col => console.log(`     - ${col.Field}`));
    } else {
      console.log('  ❌ Name is NOT MULTILINGUAL (single column: name)');
    }

    if (descColumns.length > 0) {
      console.log(`  ✅ Description is MULTILINGUAL (${descColumns.length} language columns found)`);
      descColumns.forEach(col => console.log(`     - ${col.Field}`));
    } else {
      console.log('  ❌ Description is NOT MULTILINGUAL (single column: description)');
    }

    // 6. Other important fields check
    console.log('\n📌 OTHER FIELDS TO CHECK FOR MULTILINGUAL SUPPORT:');
    console.log('-'.repeat(80));
    const fieldsToCheck = ['category', 'subcategory', 'address'];
    fieldsToCheck.forEach(field => {
      const hasMultilingual = columns.some(col => col.Field.match(new RegExp(`^${field}_(nl|en|es|de|fr)$`)));
      if (hasMultilingual) {
        console.log(`  ✅ ${field} - MULTILINGUAL`);
      } else {
        console.log(`  ❌ ${field} - NOT MULTILINGUAL`);
      }
    });

    // 7. QnA table language support
    console.log('\n\n💬 QnA TABLE LANGUAGE SUPPORT:');
    console.log('-'.repeat(80));
    try {
      const [[{ qna_count }]] = await connection.execute('SELECT COUNT(*) as qna_count FROM QnA');
      const [[{ qna_nl }]] = await connection.execute('SELECT COUNT(*) as qna_nl FROM QnA WHERE language = "nl"');
      const [[{ qna_en }]] = await connection.execute('SELECT COUNT(*) as qna_en FROM QnA WHERE language = "en"');

      console.log(`  Total Q&A entries: ${qna_count}`);
      console.log(`  Dutch (nl): ${qna_nl} (${((qna_nl/qna_count)*100).toFixed(1)}%)`);
      console.log(`  English (en): ${qna_en} (${((qna_en/qna_count)*100).toFixed(1)}%)`);
      console.log('  ✅ QnA table HAS language support');
    } catch (err) {
      console.log('  ⚠️  QnA table check failed:', err.message);
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ Analysis complete!\n');

  } catch (error) {
    console.error('❌ Error during analysis:', error);
  } finally {
    await connection.end();
  }
}

analyzePOIData().catch(console.error);
