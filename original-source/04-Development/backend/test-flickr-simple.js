/**
 * Test Flickr API with simple API key authentication
 * Flickr photo search does NOT require OAuth for public photos
 */

require('dotenv').config();
const axios = require('axios');

const FLICKR_API_KEY = process.env.FLICKR_API_KEY;

async function testFlickrSimple() {
  console.log('🧪 Testing Flickr API with simple authentication...\n');
  console.log(`API Key: ${FLICKR_API_KEY}\n`);

  try {
    // Test 1: flickr.test.echo (simplest test)
    console.log('Test 1: flickr.test.echo');
    const testResponse = await axios.get('https://api.flickr.com/services/rest/', {
      params: {
        method: 'flickr.test.echo',
        api_key: FLICKR_API_KEY,
        format: 'json',
        nojsoncallback: 1
      }
    });
    console.log('✅ Echo test passed');
    console.log('Response:', JSON.stringify(testResponse.data, null, 2));
    console.log('\n');

    // Test 2: flickr.photos.search for Peñón de Ifach (famous landmark)
    console.log('Test 2: flickr.photos.search near Peñón de Ifach');
    const searchResponse = await axios.get('https://api.flickr.com/services/rest/', {
      params: {
        method: 'flickr.photos.search',
        api_key: FLICKR_API_KEY,
        lat: 38.6372,
        lon: 0.0779,
        radius: 0.5,
        radius_units: 'km',
        text: 'Penon de Ifach Calpe',
        license: '4,5,6,7,8,9,10',
        sort: 'relevance',
        extras: 'url_l,url_c,url_z,tags,geo',
        per_page: 5,
        format: 'json',
        nojsoncallback: 1
      }
    });

    console.log('✅ Search test passed');
    console.log(`Found ${searchResponse.data.photos.photo.length} photos`);
    console.log('Response:', JSON.stringify(searchResponse.data, null, 2));

  } catch (error) {
    console.error('❌ Flickr API Error:');
    console.error('Status:', error.response?.status);
    console.error('Status Text:', error.response?.statusText);
    console.error('Data:', JSON.stringify(error.response?.data, null, 2));
    console.error('Message:', error.message);
  }
}

testFlickrSimple();
