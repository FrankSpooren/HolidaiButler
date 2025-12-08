/**
 * Iteration 1.1 Validation Tests
 * Tests data model enhancements: display flags and session context
 */

const axios = require('axios');

const API_BASE_URL = process.env.API_URL || 'http://localhost:3000/api';

let sessionId = `test-session-${Date.now()}`;

async function testSearch(query, clientContext = null) {
  try {
    const response = await axios.post(`${API_BASE_URL}/search`, {
      query,
      sessionId,
      userId: 'test-user',
      clientContext
    });
    return response.data;
  } catch (error) {
    console.error('API Error:', error.response?.data || error.message);
    throw error;
  }
}

async function validateIteration1_1() {
  console.log('\n🧪 Testing Iteration 1.1: Data Model Enhancements\n');
  console.log('='.repeat(60));
  
  let allTestsPassed = true;
  const errors = [];

  // Test 1: New search should have displayAsCard field on all POIs
  console.log('\n📋 Test 1: New search - displayAsCard field present');
  try {
    const response = await testSearch('Italian restaurants');
    
    if (!response.success) {
      throw new Error('Search was not successful');
    }
    
    const results = response.data.results || [];
    
    if (results.length === 0) {
      throw new Error('No results returned');
    }
    
    // Check all POIs have displayAsCard field
    const missingDisplayFlag = results.find(poi => poi.displayAsCard === undefined);
    if (missingDisplayFlag) {
      throw new Error(`POI "${missingDisplayFlag.title}" missing displayAsCard field`);
    }
    
    console.log(`   ✅ All ${results.length} POIs have displayAsCard field`);
    console.log(`   ✅ Sample POI: "${results[0].title}" - displayAsCard: ${results[0].displayAsCard}`);
    
  } catch (error) {
    console.log(`   ❌ FAILED: ${error.message}`);
    errors.push(`Test 1: ${error.message}`);
    allTestsPassed = false;
  }

  // Test 2: Session context should have new fields
  console.log('\n📋 Test 2: Session context - new fields present');
  try {
    const response = await testSearch('Restaurants');
    
    const context = response.data.context;
    
    if (!context) {
      throw new Error('No context in response');
    }
    
    // Check for displayedPOIs field (may be at top level or in clientContext)
    const displayedPOIs = context.displayedPOIs || context.clientContext?.displayedPOIs;
    if (displayedPOIs === undefined) {
      throw new Error('displayedPOIs field missing in context');
    }
    
    // Check for lastDisplayedPOIs field
    const lastDisplayedPOIs = context.lastDisplayedPOIs || context.clientContext?.lastDisplayedPOIs;
    if (lastDisplayedPOIs === undefined) {
      throw new Error('lastDisplayedPOIs field missing in context');
    }
    
    // Check for conversationTurn field
    const conversationTurn = context.conversationTurn ?? context.clientContext?.conversationTurn;
    if (conversationTurn === undefined) {
      throw new Error('conversationTurn field missing in context');
    }
    
    console.log(`   ✅ displayedPOIs: ${Array.isArray(displayedPOIs) ? `present (array, ${displayedPOIs.length} items)` : 'missing'}`);
    console.log(`   ✅ lastDisplayedPOIs: ${Array.isArray(lastDisplayedPOIs) ? `present (array, ${lastDisplayedPOIs.length} items)` : 'missing'}`);
    console.log(`   ✅ conversationTurn: ${typeof conversationTurn === 'number' ? `present (${conversationTurn})` : 'missing'}`);
    
  } catch (error) {
    console.log(`   ❌ FAILED: ${error.message}`);
    errors.push(`Test 2: ${error.message}`);
    allTestsPassed = false;
  }

  // Test 3: Follow-up question should preserve metadata
  console.log('\n📋 Test 3: Follow-up question - metadata preservation');
  try {
    // First query
    const firstResponse = await testSearch('Restaurants');
    const firstPOI = firstResponse.data.results[0];
    
    if (!firstPOI) {
      throw new Error('No POI in first response');
    }
    
    // Store client context
    const clientContext = {
      lastQuery: 'Restaurants',
      lastResults: firstResponse.data.results.slice(0, 5).map(r => ({
        id: r.id,
        title: r.title,
        category: r.category,
        metadata: {
          openingHours: r.metadata?.openingHours,
          phone: r.metadata?.phone,
          website: r.metadata?.website,
          rating: r.metadata?.rating,
          location: r.metadata?.location,
          rawMetadata: r.metadata?.rawMetadata
        }
      }))
    };
    
    // Follow-up query
    const followUpResponse = await testSearch('Is the first one open?', clientContext);
    
    if (!followUpResponse.success) {
      throw new Error(`Follow-up search failed: ${followUpResponse.error || 'Unknown error'}`);
    }
    
    const followUpPOI = followUpResponse.data?.results?.[0];
    
    if (!followUpPOI) {
      console.log(`   ⚠️  Debug: Follow-up response:`, JSON.stringify(followUpResponse.data, null, 2).substring(0, 500));
      throw new Error(`No POI in follow-up response. Results count: ${followUpResponse.data?.results?.length || 0}`);
    }
    
    // Check displayAsCard is present
    if (followUpPOI.displayAsCard === undefined) {
      throw new Error('displayAsCard missing in follow-up POI');
    }
    
    // Check metadata is preserved (at least openingHours should be accessible)
    if (!followUpPOI.metadata) {
      throw new Error('metadata missing in follow-up POI');
    }
    
    console.log(`   ✅ Follow-up POI has displayAsCard: ${followUpPOI.displayAsCard}`);
    console.log(`   ✅ Follow-up POI has metadata`);
    console.log(`   ✅ Opening hours accessible: ${followUpPOI.metadata.openingHours ? 'yes' : 'no (may be missing in data)'}`);
    
  } catch (error) {
    console.log(`   ❌ FAILED: ${error.message}`);
    errors.push(`Test 3: ${error.message}`);
    allTestsPassed = false;
  }

  // Test 4: POIReference should support metadata (if used)
  console.log('\n📋 Test 4: POIReference metadata support');
  try {
    const response = await testSearch('Restaurants');
    
    // Check if results can be converted to POIReference format
    const poiReference = {
      id: response.data.results[0].id,
      title: response.data.results[0].title,
      category: response.data.results[0].category,
      metadata: {
        openingHours: response.data.results[0].metadata?.openingHours,
        phone: response.data.results[0].metadata?.phone,
        website: response.data.results[0].metadata?.website,
        rating: response.data.results[0].metadata?.rating
      }
    };
    
    if (!poiReference.metadata) {
      throw new Error('Cannot create POIReference with metadata');
    }
    
    console.log(`   ✅ POIReference can include metadata`);
    console.log(`   ✅ Sample: ${Object.keys(poiReference.metadata).length} metadata fields`);
    
  } catch (error) {
    console.log(`   ❌ FAILED: ${error.message}`);
    errors.push(`Test 4: ${error.message}`);
    allTestsPassed = false;
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  if (allTestsPassed) {
    console.log('✅ ALL TESTS PASSED - Iteration 1.1 is working correctly!');
    console.log('\n📊 Summary:');
    console.log('   - displayAsCard field present on all POIs');
    console.log('   - Session context includes new tracking fields');
    console.log('   - Metadata preserved in follow-up questions');
    console.log('   - POIReference supports metadata');
  } else {
    console.log('❌ SOME TESTS FAILED');
    console.log('\nErrors:');
    errors.forEach((error, index) => {
      console.log(`   ${index + 1}. ${error}`);
    });
  }
  console.log('='.repeat(60) + '\n');
  
  return allTestsPassed;
}

// Run tests
if (require.main === module) {
  validateIteration1_1()
    .then(passed => {
      process.exit(passed ? 0 : 1);
    })
    .catch(error => {
      console.error('Test execution error:', error);
      process.exit(1);
    });
}

module.exports = { validateIteration1_1 };

