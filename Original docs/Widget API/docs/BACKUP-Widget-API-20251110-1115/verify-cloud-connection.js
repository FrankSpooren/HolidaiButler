require('dotenv').config();
const { CloudClient, ChromaClient } = require('chromadb');

/**
 * Verification script to check if ChromaDB Cloud connection is properly configured
 * Run this to verify your cloud setup before starting the API
 */

async function verifyConnection() {
  console.log('🔍 Verifying ChromaDB Connection Configuration\n');
  
  const useCloud = process.env.USE_CHROMADB_CLOUD === 'true';
  
  if (useCloud) {
    console.log('☁️  Cloud mode enabled (USE_CHROMADB_CLOUD=true)\n');
    
    // Check required environment variables
    const requiredVars = {
      'CHROMADB_API_KEY': process.env.CHROMADB_API_KEY,
      'CHROMADB_TENANT': process.env.CHROMADB_TENANT,
      'CHROMADB_DATABASE': process.env.CHROMADB_DATABASE
    };
    
    console.log('📋 Checking environment variables:');
    let allPresent = true;
    for (const [key, value] of Object.entries(requiredVars)) {
      if (value) {
        const maskedValue = key === 'CHROMADB_API_KEY' 
          ? `${value.substring(0, 10)}...${value.substring(value.length - 4)}`
          : value;
        console.log(`   ✅ ${key}: ${maskedValue}`);
      } else {
        console.log(`   ❌ ${key}: MISSING`);
        allPresent = false;
      }
    }
    
    if (!allPresent) {
      console.log('\n❌ Missing required environment variables for cloud connection!');
      process.exit(1);
    }
    
    console.log('\n🔌 Testing cloud connection...');
    try {
      const client = new CloudClient({
        apiKey: process.env.CHROMADB_API_KEY,
        tenant: process.env.CHROMADB_TENANT,
        database: process.env.CHROMADB_DATABASE
      });
      
      const collections = await client.listCollections();
      console.log(`✅ Successfully connected to ChromaDB Cloud!`);
      console.log(`📊 Found ${collections.length} collection(s):`);
      collections.forEach((col, index) => {
        const colName = typeof col === 'string' ? col : (col.name || col.id);
        console.log(`   ${index + 1}. ${colName}`);
      });
      
      console.log('\n✅ Cloud connection verified! Ready to use.');
      
    } catch (error) {
      console.error('\n❌ Failed to connect to ChromaDB Cloud:');
      console.error(`   Error: ${error.message}`);
      process.exit(1);
    }
    
  } else {
    console.log('💻 Local mode enabled (USE_CHROMADB_CLOUD not set or false)\n');
    
    const chromaUrl = process.env.CHROMADB_URL;
    if (!chromaUrl) {
      console.log('❌ CHROMADB_URL environment variable is missing!');
      process.exit(1);
    }
    
    console.log(`📁 Local ChromaDB URL: ${chromaUrl}`);
    console.log('\n🔌 Testing local connection...');
    
    try {
      const client = new ChromaClient({ path: chromaUrl });
      const collections = await client.listCollections();
      console.log(`✅ Successfully connected to local ChromaDB!`);
      console.log(`📊 Found ${collections.length} collection(s)`);
    } catch (error) {
      console.error('\n❌ Failed to connect to local ChromaDB:');
      console.error(`   Error: ${error.message}`);
      process.exit(1);
    }
  }
  
  // Verify Mistral is configured
  console.log('\n🔍 Checking Mistral configuration...');
  if (process.env.MISTRAL_API_KEY) {
    const maskedKey = `${process.env.MISTRAL_API_KEY.substring(0, 10)}...${process.env.MISTRAL_API_KEY.substring(process.env.MISTRAL_API_KEY.length - 4)}`;
    console.log(`✅ MISTRAL_API_KEY: ${maskedKey}`);
    console.log('\n✅ All systems ready! Mistral embeddings will work with ChromaDB Cloud.');
  } else {
    console.log('❌ MISTRAL_API_KEY is missing!');
    console.log('   Mistral is needed for generating embeddings, but ChromaDB connection is separate.');
  }
}

verifyConnection().catch(error => {
  console.error('\n❌ Verification failed:', error);
  process.exit(1);
});

