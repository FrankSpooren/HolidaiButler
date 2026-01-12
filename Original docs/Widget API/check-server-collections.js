require('dotenv').config();
const { ChromaClient } = require('chromadb');

/**
 * Script to check what collections exist on the local ChromaDB server
 * and help diagnose why the collection isn't found
 */

async function checkServerCollections() {
  console.log('🔍 Checking ChromaDB Server Collections\n');
  
  const chromaUrl = process.env.CHROMADB_URL || 'http://127.0.0.1:8000';
  console.log(`📡 Connecting to ChromaDB server at: ${chromaUrl}\n`);
  
  try {
    const client = new ChromaClient({ path: chromaUrl });
    
    console.log('✅ Connected to server\n');
    
    // List all collections
    console.log('📊 Listing collections on server...');
    const collections = await client.listCollections();
    
    console.log(`\nFound ${collections.length} collection(s) on the server:\n`);
    
    if (collections.length === 0) {
      console.log('❌ NO COLLECTIONS FOUND on the server!');
      console.log('\nThis is why your API is failing.');
      console.log('\nThe server is running but empty.');
      console.log('\nSolutions:');
      console.log('1. Load your data into the server (see load-data-to-server.js)');
      console.log('2. Or use file-based ChromaDB by pointing to the directory');
      console.log('   Set CHROMADB_URL to: C:\\Emiel\\hosting greengeeks\\Websites\\OSM - calpe\\2 - chatbot api\\chroma');
      process.exit(1);
    }
    
    // Display each collection
    for (let i = 0; i < collections.length; i++) {
      const col = collections[i];
      const colName = typeof col === 'string' ? col : (col.name || col.id || 'unknown');
      
      console.log(`Collection ${i + 1}: ${colName}`);
      
      try {
        const collection = await client.getCollection({ name: colName });
        const count = await collection.count();
        console.log(`   Document count: ${count}`);
      } catch (error) {
        console.log(`   ⚠️  Could not get details: ${error.message}`);
      }
      console.log('');
    }
    
    // Check if expected collection exists
    const expectedCollection = process.env.CHROMADB_COLLECTION_NAME || 'calpe_pois';
    const collectionExists = collections.some((col) => {
      const colName = typeof col === 'string' ? col : (col.name || col.id);
      return colName === expectedCollection;
    });
    
    console.log('\n📝 Collection Name Check:');
    if (collectionExists) {
      console.log(`✅ Expected collection "${expectedCollection}" EXISTS on server`);
      console.log('\n✅ Your configuration should work!');
    } else {
      console.log(`❌ Expected collection "${expectedCollection}" NOT FOUND on server`);
      const availableNames = collections.map((col) => {
        return typeof col === 'string' ? col : (col.name || col.id);
      });
      console.log(`\nAvailable collections: ${availableNames.join(', ')}`);
      console.log(`\nYou can either:`);
      console.log(`1. Set CHROMADB_COLLECTION_NAME to one of the available collections`);
      console.log(`2. Load your data into the server with the name "${expectedCollection}"`);
    }
    
  } catch (error) {
    console.error('\n❌ Error connecting to ChromaDB server:');
    console.error(`   ${error.message}`);
    console.error('\nMake sure the ChromaDB server is running on port 8000');
    process.exit(1);
  }
}

checkServerCollections();

