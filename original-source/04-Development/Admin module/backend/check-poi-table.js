import db from './config/database.js';

async function checkPOITable() {
  try {
    console.log('Checking POI table structure...\n');

    // Get table structure
    const [columns] = await db.execute('DESCRIBE POI');

    console.log('Existing columns in POI table:');
    console.log('=====================================');
    columns.forEach(col => {
      console.log(`- ${col.Field} (${col.Type}) ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });

    console.log('\n\nColumns expected by adminPOI.js:');
    console.log('=====================================');
    const expectedColumns = [
      'id', 'google_placeid', 'name', 'description', 'category', 'subcategory',
      'poi_type', 'latitude', 'longitude', 'address', 'city', 'region',
      'country', 'postal_code', 'rating', 'review_count', 'price_level',
      'opening_hours', 'phone', 'website', 'email', 'amenities',
      'accessibility_features', 'images', 'thumbnail_url', 'verified',
      'featured', 'popularity_score', 'last_updated', 'created_at'
    ];

    const existingColumnNames = columns.map(col => col.Field);
    const missingColumns = [];

    expectedColumns.forEach(col => {
      const exists = existingColumnNames.includes(col);
      console.log(`${exists ? '✓' : '✗'} ${col}`);
      if (!exists) missingColumns.push(col);
    });

    if (missingColumns.length > 0) {
      console.log('\n\n❌ MISSING COLUMNS:');
      console.log('=====================================');
      missingColumns.forEach(col => console.log(`- ${col}`));
      console.log('\nThis is likely causing the "Failed to load POIs" error.');
    } else {
      console.log('\n\n✅ All required columns exist!');

      // Check for NULL/invalid JSON in JSON fields
      console.log('\n\nChecking JSON fields for NULL/invalid data...');
      console.log('=====================================');

      const [countResult] = await db.execute('SELECT COUNT(*) as total FROM POI');
      const total = countResult[0].total;
      console.log(`Total POIs: ${total}`);

      const [nullChecks] = await db.execute(`
        SELECT
          SUM(CASE WHEN opening_hours IS NULL THEN 1 ELSE 0 END) as null_opening_hours,
          SUM(CASE WHEN amenities IS NULL THEN 1 ELSE 0 END) as null_amenities,
          SUM(CASE WHEN accessibility_features IS NULL THEN 1 ELSE 0 END) as null_accessibility,
          SUM(CASE WHEN images IS NULL THEN 1 ELSE 0 END) as null_images
        FROM POI
      `);

      const nulls = nullChecks[0];
      console.log(`NULL opening_hours: ${nulls.null_opening_hours}`);
      console.log(`NULL amenities: ${nulls.null_amenities}`);
      console.log(`NULL accessibility_features: ${nulls.null_accessibility}`);
      console.log(`NULL images: ${nulls.null_images}`);

      if (nulls.null_opening_hours > 0 || nulls.null_amenities > 0 ||
          nulls.null_accessibility > 0 || nulls.null_images > 0) {
        console.log('\n⚠️  WARNING: NULL values found in JSON fields.');
        console.log('This will cause JSON.parse() errors in the API.');
      }
    }

    process.exit(0);

  } catch (error) {
    console.error('Error checking POI table:', error);
    process.exit(1);
  }
}

checkPOITable();
