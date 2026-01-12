/**
 * Debug Test 1 specifically
 */

const axios = require('axios');

const API_BASE_URL = process.env.API_URL || 'http://localhost:3000/api';

async function testSearch(query, clientContext = null) {
  try {
    const response = await axios.post(`${API_BASE_URL}/search`, {
      query,
      sessionId: 'debug-test1',
      userId: 'test-user',
      clientContext
    });
    return response.data;
  } catch (error) {
    console.error('API Error:', error.response?.data || error.message);
    throw error;
  }
}

async function debugTest1() {
  console.log('\n🔍 Debugging Test 1\n');
  
  // First query
  console.log('1. First query: "Restaurants"');
  const firstResponse = await testSearch('Restaurants');
  console.log(`   Results: ${firstResponse.data.results.length}`);
  console.log(`   First POI: ${firstResponse.data.results[0]?.title}`);
  console.log(`   Has opening hours: ${!!firstResponse.data.results[0]?.metadata?.openingHours}`);
  
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
  
  console.log(`\n2. Client context created with ${clientContext.lastResults.length} POIs`);
  console.log(`   First POI: ${clientContext.lastResults[0]?.title}`);
  console.log(`   Has metadata: ${!!clientContext.lastResults[0]?.metadata}`);
  console.log(`   Has openingHours: ${!!clientContext.lastResults[0]?.metadata?.openingHours}`);
  
  // Follow-up query
  console.log('\n3. Follow-up query: "Is the first one open?"');
  const followUpResponse = await testSearch('Is the first one open?', clientContext);
  
  console.log(`   Success: ${followUpResponse.success}`);
  console.log(`   Results count: ${followUpResponse.data.results.length}`);
  console.log(`   Search type: ${followUpResponse.data.searchType}`);
  console.log(`   Text response: "${followUpResponse.data.textResponse}"`);
  
  if (followUpResponse.data.results.length > 0) {
    console.log(`   First result: ${followUpResponse.data.results[0].title}`);
    console.log(`   Display as card: ${followUpResponse.data.results[0].displayAsCard}`);
    console.log(`   Has opening hours: ${!!followUpResponse.data.results[0].metadata?.openingHours}`);
  } else {
    console.log(`   ⚠️  No results returned!`);
  }
}

debugTest1().catch(console.error);

