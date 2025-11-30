/**
 * Debug script to test follow-up questions
 */

const axios = require('axios');

const API_BASE_URL = process.env.API_URL || 'http://localhost:3000/api';

async function testSearch(query, clientContext = null) {
  try {
    const response = await axios.post(`${API_BASE_URL}/search`, {
      query,
      sessionId: 'debug-session',
      userId: 'test-user',
      clientContext
    });
    return response.data;
  } catch (error) {
    console.error('API Error:', error.response?.data || error.message);
    throw error;
  }
}

async function debugFollowUp() {
  console.log('\n🔍 Debugging Follow-up Questions\n');
  
  // First query
  console.log('1. First query: "Restaurants"');
  const firstResponse = await testSearch('Restaurants');
  console.log(`   Results: ${firstResponse.data.results.length}`);
  console.log(`   First POI: ${firstResponse.data.results[0]?.title}`);
  
  // Create client context
  const clientContext = {
    lastQuery: 'Restaurants',
    lastResults: firstResponse.data.results.slice(0, 5).map(r => ({
      id: r.id,
      title: r.title,
      category: r.category,
      metadata: {
        openingHours: r.metadata?.openingHours,
        rawMetadata: r.metadata?.rawMetadata
      }
    }))
  };
  
  console.log(`\n2. Client context created with ${clientContext.lastResults.length} POIs`);
  console.log(`   First POI in context: ${clientContext.lastResults[0]?.title}`);
  
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
  } else {
    console.log(`   ⚠️  No results returned!`);
    console.log(`   Query interpretation:`, JSON.stringify(followUpResponse.data.queryInterpretation, null, 2));
  }
}

debugFollowUp().catch(console.error);

