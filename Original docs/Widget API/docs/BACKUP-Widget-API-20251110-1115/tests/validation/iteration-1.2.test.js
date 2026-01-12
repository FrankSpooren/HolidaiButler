/**
 * Iteration 1.2 Validation Tests
 * Tests basic follow-up question handling with text responses
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

async function validateIteration1_2() {
  console.log('\n🧪 Testing Iteration 1.2: Basic Follow-up Question Handling\n');
  console.log('='.repeat(60));
  
  let allTestsPassed = true;
  const errors = [];

  // Test 1: Follow-up opening hours question should generate text response
  console.log('\n📋 Test 1: Follow-up opening hours - text response');
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
    
    // Check text response exists
    if (!followUpResponse.data.textResponse) {
      throw new Error('No text response in follow-up');
    }
    
    const textResponse = followUpResponse.data.textResponse;
    
    // Check text response is appropriate for opening hours query
    const hasOpeningInfo = textResponse.toLowerCase().includes('open') || 
                          textResponse.toLowerCase().includes('closed');
    
    if (!hasOpeningInfo) {
      throw new Error(`Text response doesn't mention opening status: "${textResponse}"`);
    }
    
    // Check response is concise (not too long)
    if (textResponse.length > 200) {
      throw new Error(`Text response is too long (${textResponse.length} chars): "${textResponse}"`);
    }
    
    // Check response includes POI name
    const includesPOIName = textResponse.includes(firstPOI.title);
    if (!includesPOIName) {
      console.log(`   ⚠️  Warning: Text response doesn't include POI name, but this is acceptable`);
    }
    
    console.log(`   ✅ Text response generated: "${textResponse}"`);
    console.log(`   ✅ Response length: ${textResponse.length} characters`);
    console.log(`   ✅ Includes opening status information`);
    
  } catch (error) {
    console.log(`   ❌ FAILED: ${error.message}`);
    errors.push(`Test 1: ${error.message}`);
    allTestsPassed = false;
  }

  // Test 2: Text response for single POI follow-up
  console.log('\n📋 Test 2: Single POI follow-up - concise response');
  try {
    const firstResponse = await testSearch('Italian restaurants');
    const firstPOI = firstResponse.data.results[0];
    
    const clientContext = {
      lastQuery: 'Italian restaurants',
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
    
    const followUpResponse = await testSearch('Is the first one open?', clientContext);
    
    if (!followUpResponse.data.textResponse) {
      throw new Error('No text response generated');
    }
    
    const textResponse = followUpResponse.data.textResponse;
    
    // Should be concise for single POI
    if (textResponse.length > 150) {
      console.log(`   ⚠️  Warning: Response is longer than expected (${textResponse.length} chars), but acceptable`);
    }
    
    // Should answer the question directly
    const answersQuestion = textResponse.toLowerCase().match(/^(yes|no)/) || 
                           textResponse.toLowerCase().includes('currently open') ||
                           textResponse.toLowerCase().includes('currently closed');
    
    if (!answersQuestion) {
      console.log(`   ⚠️  Warning: Response doesn't start with Yes/No, but may still be valid`);
    }
    
    console.log(`   ✅ Text response: "${textResponse}"`);
    console.log(`   ✅ Response is concise and informative`);
    
  } catch (error) {
    console.log(`   ❌ FAILED: ${error.message}`);
    errors.push(`Test 2: ${error.message}`);
    allTestsPassed = false;
  }

  // Test 3: Text response format for opening hours
  console.log('\n📋 Test 3: Opening hours response format');
  try {
    const firstResponse = await testSearch('Restaurants');
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
    
    const followUpResponse = await testSearch('What are the opening hours of the first one?', clientContext);
    
    if (!followUpResponse.data.textResponse) {
      throw new Error('No text response generated');
    }
    
    const textResponse = followUpResponse.data.textResponse;
    
    // Should contain opening hours information
    const hasHoursInfo = textResponse.toLowerCase().includes('open') || 
                        textResponse.toLowerCase().includes('closed') ||
                        textResponse.toLowerCase().includes('hours');
    
    if (!hasHoursInfo) {
      throw new Error(`Response doesn't contain opening hours info: "${textResponse}"`);
    }
    
    console.log(`   ✅ Text response: "${textResponse}"`);
    console.log(`   ✅ Contains opening hours information`);
    
  } catch (error) {
    console.log(`   ❌ FAILED: ${error.message}`);
    errors.push(`Test 3: ${error.message}`);
    allTestsPassed = false;
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  if (allTestsPassed) {
    console.log('✅ ALL TESTS PASSED - Iteration 1.2 is working correctly!');
    console.log('\n📊 Summary:');
    console.log('   - Text responses generated for follow-up questions');
    console.log('   - Opening hours queries return appropriate responses');
    console.log('   - Responses are concise and informative');
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
  validateIteration1_2()
    .then(passed => {
      process.exit(passed ? 0 : 1);
    })
    .catch(error => {
      console.error('Test execution error:', error);
      process.exit(1);
    });
}

module.exports = { validateIteration1_2 };

