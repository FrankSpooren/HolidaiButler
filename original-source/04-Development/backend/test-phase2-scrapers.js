/**
 * Phase 2 Scrapers - Integration Test
 * ====================================
 * Tests all Phase 2 modules:
 * - Social Media Discovery (Website, Facebook, Instagram)
 * - TripAdvisor scraper
 * - GetYourGuide scraper
 * - TheFork scraper
 * - MindTrip scraper
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

// Import all modules
const { discoverAllURLs } = require('./modules/social-media-discovery');
const { getTripAdvisorContent } = require('./modules/tripadvisor-scraper');
const { getGetYourGuideContent } = require('./modules/getyourguide-scraper');
const { getTheForkContent } = require('./modules/thefork-scraper');
const { getMindTripContent } = require('./modules/mindtripai-scraper');

// Database pool
function createDbPool() {
  return mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });
}

/**
 * Test all scrapers on a sample POI
 */
async function testScrapers() {
  console.log('🧪 Phase 2 Scrapers - Integration Test\n');
  console.log('='.repeat(80));

  const pool = createDbPool();

  try {
    // Fetch 3 test POIs: 1 without website, 1 restaurant, 1 attraction
    const [pois] = await pool.query(`
      SELECT id, name, category, subcategory, city, address, website
      FROM POI
      WHERE is_active = TRUE
        AND (website IS NULL OR website = '')
      LIMIT 3
    `);

    if (pois.length === 0) {
      console.log('⚠️  No POIs without websites found for testing');
      await pool.end();
      return;
    }

    console.log(`\n✅ Found ${pois.length} test POIs\n`);

    const results = {
      totalPOIs: pois.length,
      socialMediaDiscovery: { success: 0, failed: 0 },
      tripadvisor: { success: 0, failed: 0 },
      getyourguide: { success: 0, failed: 0 },
      thefork: { success: 0, failed: 0 },
      mindtrip: { success: 0, failed: 0 }
    };

    for (const poi of pois) {
      console.log('='.repeat(80));
      console.log(`\n🧪 Testing POI: ${poi.name}`);
      console.log(`   Category: ${poi.category}`);
      console.log(`   City: ${poi.city || 'Unknown'}`);
      console.log(`   Current website: ${poi.website || 'None'}\n`);

      // Test 1: Social Media Discovery
      console.log('📱 Test 1: Social Media Discovery');
      console.log('-'.repeat(80));
      const socialUrls = await discoverAllURLs(poi);
      if (socialUrls.foundAny) {
        results.socialMediaDiscovery.success++;
        console.log(`\n✅ Social Media Discovery: SUCCESS`);
        if (socialUrls.website) console.log(`   Website: ${socialUrls.website}`);
        if (socialUrls.facebook) console.log(`   Facebook: ${socialUrls.facebook}`);
        if (socialUrls.instagram) console.log(`   Instagram: ${socialUrls.instagram}`);
      } else {
        results.socialMediaDiscovery.failed++;
        console.log(`\n❌ Social Media Discovery: No URLs found`);
      }

      // Test 2: TripAdvisor
      console.log('\n\n🌍 Test 2: TripAdvisor Scraper');
      console.log('-'.repeat(80));
      const tripadvisorContent = await getTripAdvisorContent(poi);
      if (tripadvisorContent && tripadvisorContent.description) {
        results.tripadvisor.success++;
        console.log(`\n✅ TripAdvisor: SUCCESS`);
        console.log(`   Description: ${tripadvisorContent.description.substring(0, 100)}...`);
        console.log(`   Rating: ${tripadvisorContent.rating || 'N/A'}`);
        console.log(`   Reviews: ${tripadvisorContent.reviewCount || 'N/A'}`);
      } else {
        results.tripadvisor.failed++;
        console.log(`\n❌ TripAdvisor: No content found`);
      }

      // Test 3: GetYourGuide
      console.log('\n\n🎫 Test 3: GetYourGuide Scraper');
      console.log('-'.repeat(80));
      const getyourguideContent = await getGetYourGuideContent(poi);
      if (getyourguideContent && getyourguideContent.description) {
        results.getyourguide.success++;
        console.log(`\n✅ GetYourGuide: SUCCESS`);
        console.log(`   Description: ${getyourguideContent.description.substring(0, 100)}...`);
        console.log(`   Rating: ${getyourguideContent.rating || 'N/A'}`);
      } else {
        results.getyourguide.failed++;
        console.log(`\n❌ GetYourGuide: No content found`);
      }

      // Test 4: TheFork (only for Food & Drinks)
      if (poi.category === 'Food & Drinks') {
        console.log('\n\n🍴 Test 4: TheFork Scraper');
        console.log('-'.repeat(80));
        const theforkContent = await getTheForkContent(poi);
        if (theforkContent && theforkContent.description) {
          results.thefork.success++;
          console.log(`\n✅ TheFork: SUCCESS`);
          console.log(`   Description: ${theforkContent.description.substring(0, 100)}...`);
          console.log(`   Cuisine: ${theforkContent.cuisineType || 'N/A'}`);
          console.log(`   Price: ${theforkContent.priceRange || 'N/A'}`);
        } else {
          results.thefork.failed++;
          console.log(`\n❌ TheFork: No content found`);
        }
      } else {
        console.log('\n\n⏭️  Test 4: TheFork - Skipped (not a restaurant)');
      }

      // Test 5: MindTrip
      console.log('\n\n🤖 Test 5: MindTrip Scraper');
      console.log('-'.repeat(80));
      const mindtripContent = await getMindTripContent(poi);
      if (mindtripContent && mindtripContent.description) {
        results.mindtrip.success++;
        console.log(`\n✅ MindTrip: SUCCESS`);
        console.log(`   Description: ${mindtripContent.description.substring(0, 100)}...`);
        if (mindtripContent.tips && mindtripContent.tips.length > 0) {
          console.log(`   Tips: ${mindtripContent.tips.length} found`);
        }
      } else {
        results.mindtrip.failed++;
        console.log(`\n❌ MindTrip: No content found`);
      }

      console.log('\n');
    }

    // Final report
    console.log('\n' + '='.repeat(80));
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('='.repeat(80));
    console.log(`\nTotal POIs tested: ${results.totalPOIs}\n`);

    console.log('Module Success Rates:');
    console.log(`  1. Social Media Discovery: ${results.socialMediaDiscovery.success}/${results.totalPOIs} (${(results.socialMediaDiscovery.success/results.totalPOIs*100).toFixed(1)}%)`);
    console.log(`  2. TripAdvisor: ${results.tripadvisor.success}/${results.totalPOIs} (${(results.tripadvisor.success/results.totalPOIs*100).toFixed(1)}%)`);
    console.log(`  3. GetYourGuide: ${results.getyourguide.success}/${results.totalPOIs} (${(results.getyourguide.success/results.totalPOIs*100).toFixed(1)}%)`);
    console.log(`  4. TheFork: ${results.thefork.success}/${results.totalPOIs} restaurants tested`);
    console.log(`  5. MindTrip: ${results.mindtrip.success}/${results.totalPOIs} (${(results.mindtrip.success/results.totalPOIs*100).toFixed(1)}%)`);

    const totalSuccess = results.socialMediaDiscovery.success + results.tripadvisor.success +
                        results.getyourguide.success + results.thefork.success + results.mindtrip.success;
    const totalTests = results.totalPOIs * 5; // 5 tests per POI

    console.log(`\n✅ Overall Success Rate: ${totalSuccess}/${totalTests} (${(totalSuccess/totalTests*100).toFixed(1)}%)`);

    console.log('\n⚠️  Note: Web scraping success rates vary based on:');
    console.log('   - Website structure changes');
    console.log('   - Anti-scraping measures');
    console.log('   - Network conditions');
    console.log('   - POI availability on each platform\n');

    await pool.end();
    console.log('✅ Test complete!\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    await pool.end();
    throw error;
  }
}

// Run test
if (require.main === module) {
  testScrapers()
    .then(() => {
      console.log('🎉 All tests completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { testScrapers };
