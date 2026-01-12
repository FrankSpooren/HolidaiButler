require('dotenv').config();
const { CloudClient } = require('chromadb');

/**
 * Diagnostic script to check what collections exist in ChromaDB Cloud
 * This will help identify the collection name issue
 */

async function diagnoseCollections() {
  console.log('🔍 Diagnosing ChromaDB Cloud Collections\n');
  
  // Check environment variables
  const requiredVars = {
    'USE_CHROMADB_CLOUD': process.env.USE_CHROMADB_CLOUD,
    'CHROMADB_API_KEY': process.env.CHROMADB_API_KEY ? '✓ Set' : '✗ Missing',
    'CHROMADB_TENANT': process.env.CHROMADB_TENANT ? '✓ Set' : '✗ Missing',
    'CHROMADB_DATABASE': process.env.CHROMADB_DATABASE,
    'CHROMADB_COLLECTION_NAME': process.env.CHROMADB_COLLECTION_NAME || '(not set, using default: calpe_pois)'
  };
  
  console.log('📋 Environment Configuration:');
  for (const [key, value] of Object.entries(requiredVars)) {
    const displayValue = key === 'CHROMADB_API_KEY' && value === '✓ Set'
      ? '✓ Set (hidden)'
      : value;
    console.log(`   ${key}: ${displayValue}`);
  }
  
  if (process.env.USE_CHROMADB_CLOUD !== 'true') {
    console.log('\n⚠️  USE_CHROMADB_CLOUD is not set to "true"');
    console.log('   This script is for cloud diagnostics only.');
    process.exit(1);
  }
  
  console.log('\n🔌 Connecting to ChromaDB Cloud...');
  
  try {
    const client = new CloudClient({
      apiKey: process.env.CHROMADB_API_KEY,
      tenant: process.env.CHROMADB_TENANT,
      database: process.env.CHROMADB_DATABASE
    });
    
    console.log('✅ Connected successfully\n');
    
    // List all collections
    console.log('📊 Listing all collections...');
    const collections = await client.listCollections();
    
    console.log(`\nFound ${collections.length} collection(s):\n`);
    
    if (collections.length === 0) {
      console.log('❌ NO COLLECTIONS FOUND!');
      console.log('\nThis is the problem! The cloud database is empty.');
      console.log('\nPossible solutions:');
      console.log('1. Re-run the migration script to copy collections from local to cloud');
      console.log('2. Check if collections exist with different names');
      console.log('3. Verify the database name is correct');
      process.exit(1);
    }
    
    // Display each collection with details
    for (let i = 0; i < collections.length; i++) {
      const col = collections[i];
      const colName = typeof col === 'string' ? col : (col.name || col.id || 'unknown');
      const colId = typeof col === 'object' && col.id ? col.id : 'N/A';
      
      console.log(`Collection ${i + 1}:`);
      console.log(`   Name: ${colName}`);
      console.log(`   ID: ${colId}`);
      
      // Try to get collection details
      try {
        const collection = await client.getCollection({ name: colName });
        const count = await collection.count();
        console.log(`   Document count: ${count}`);
        
        // Get a sample document to see structure
        if (count > 0) {
          const sample = await collection.get({ limit: 1 });
          if (sample.ids && sample.ids.length > 0) {
            console.log(`   Sample ID: ${sample.ids[0]}`);
            if (sample.metadatas && sample.metadatas[0]) {
              const metadataKeys = Object.keys(sample.metadatas[0]);
              console.log(`   Metadata keys: ${metadataKeys.slice(0, 5).join(', ')}${metadataKeys.length > 5 ? '...' : ''}`);
            }
          }
        }
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
      console.log(`✅ Expected collection "${expectedCollection}" EXISTS`);
      console.log('\n✅ Configuration should work!');
    } else {
      console.log(`❌ Expected collection "${expectedCollection}" NOT FOUND`);
      console.log('\n⚠️  This is why searches are failing!');
      console.log('\nPossible solutions:');
      console.log(`1. Set CHROMADB_COLLECTION_NAME to one of the existing collections above`);
      console.log(`2. Or rename a collection in cloud to "${expectedCollection}"`);
      console.log(`3. Or update the code to use the actual collection name`);
    }
    
  } catch (error) {
    console.error('\n❌ Error connecting to ChromaDB Cloud:');
    console.error(`   ${error.message}`);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

diagnoseCollections().catch(error => {
  console.error('\n❌ Diagnostic failed:', error);
  process.exit(1);
});

