require('dotenv').config();
const { ChromaClient, PersistentClient } = require('chromadb');
const path = require('path');

/**
 * Script to load data from file-based ChromaDB into the ChromaDB server
 * This copies the collection from the local directory to the running server
 */

async function loadDataToServer() {
  console.log('📦 Loading Data from File-Based ChromaDB to Server\n');
  
  const fileBasedPath = path.resolve(__dirname, '../2 - chatbot api/chroma');
  const serverUrl = process.env.CHROMADB_URL || 'http://127.0.0.1:8000';
  const collectionName = process.env.CHROMADB_COLLECTION_NAME || 'calpe_pois';
  
  console.log(`📁 File-based ChromaDB path: ${fileBasedPath}`);
  console.log(`📡 Server URL: ${serverUrl}`);
  console.log(`📋 Collection name: ${collectionName}\n`);
  
  try {
    // Connect to file-based ChromaDB
    // For file-based, we need to use PersistentClient or ChromaClient with proper path
    console.log('🔌 Connecting to file-based ChromaDB...');
    let fileClient;
    try {
      // Try PersistentClient first (for newer ChromaDB versions)
      fileClient = new PersistentClient({ path: fileBasedPath });
      console.log('   Using PersistentClient for file-based access');
    } catch (persistentError) {
      // Fall back to ChromaClient
      try {
        fileClient = new ChromaClient({ path: fileBasedPath });
        console.log('   Using ChromaClient for file-based access');
      } catch (clientError) {
        console.error('❌ Failed to connect to file-based ChromaDB');
        console.error(`   Error: ${clientError.message}`);
        console.error('\n💡 Alternative: Use ChromaDB CLI to copy data:');
        console.error(`   chroma copy --all --from-path "${fileBasedPath}" --to-url ${serverUrl}`);
        process.exit(1);
      }
    }
    
    // Check if collection exists in file-based
    let fileCollection;
    try {
      fileCollection = await fileClient.getCollection({ name: collectionName });
      const count = await fileCollection.count();
      console.log(`✅ Found collection in file-based DB with ${count} documents\n`);
    } catch (error) {
      console.error(`❌ Collection '${collectionName}' not found in file-based ChromaDB`);
      console.error(`   Error: ${error.message}`);
      process.exit(1);
    }
    
    // Connect to server
    console.log('🔌 Connecting to ChromaDB server...');
    const serverClient = new ChromaClient({ path: serverUrl });
    
    // Check if collection already exists on server
    try {
      const existing = await serverClient.getCollection({ name: collectionName });
      const existingCount = await existing.count();
      console.log(`⚠️  Collection '${collectionName}' already exists on server with ${existingCount} documents`);
      console.log(`\nDo you want to overwrite it? (This script doesn't support overwriting yet)`);
      console.log(`\nTo proceed, you'll need to:`);
      console.log(`1. Delete the existing collection on the server`);
      console.log(`2. Or use a different collection name`);
      process.exit(1);
    } catch (error) {
      // Collection doesn't exist, which is what we want
      console.log(`✅ Collection '${collectionName}' doesn't exist on server (good, we can create it)\n`);
    }
    
    // Fetch all data from file-based collection
    console.log('📥 Fetching data from file-based collection...');
    const fileCount = await fileCollection.count();
    console.log(`   Total documents: ${fileCount}`);
    
    // Fetch in batches
    const batchSize = 100;
    let offset = 0;
    let allIds = [];
    let allDocuments = [];
    let allMetadatas = [];
    let allEmbeddings = [];
    
    while (offset < fileCount) {
      const results = await fileCollection.get({
        limit: batchSize,
        offset: offset,
        include: ['documents', 'metadatas', 'embeddings']
      });
      
      if (results.ids && results.ids.length > 0) {
        allIds = allIds.concat(results.ids);
        allDocuments = allDocuments.concat(results.documents || []);
        allMetadatas = allMetadatas.concat(results.metadatas || []);
        allEmbeddings = allEmbeddings.concat(results.embeddings || []);
      }
      
      offset += batchSize;
      process.stdout.write(`   Progress: ${Math.min(offset, fileCount)}/${fileCount} documents\r`);
    }
    
    console.log(`\n✅ Fetched ${allIds.length} documents from file-based DB\n`);
    
    // Create collection on server and upload data
    console.log(`📤 Creating collection '${collectionName}' on server...`);
    
    // Create collection on server (we'll need to handle embedding function if required)
    let serverCollection;
    try {
      serverCollection = await serverClient.createCollection({ name: collectionName });
      console.log(`✅ Created collection on server\n`);
    } catch (error) {
      // If collection creation fails, try getting it (might already exist)
      if (error.message && error.message.includes('already exists')) {
        serverCollection = await serverClient.getCollection({ name: collectionName });
        console.log(`✅ Using existing collection on server\n`);
      } else {
        throw error;
      }
    }
    
    // Upload data in batches
    console.log(`📤 Uploading ${allIds.length} documents to server in batches of ${batchSize}...`);
    offset = 0;
    
    while (offset < allIds.length) {
      const batchIds = allIds.slice(offset, offset + batchSize);
      const batchDocuments = allDocuments.slice(offset, offset + batchSize);
      const batchMetadatas = allMetadatas.slice(offset, offset + batchSize);
      const batchEmbeddings = allEmbeddings.slice(offset, offset + batchSize);
      
      await serverCollection.add({
        ids: batchIds,
        documents: batchDocuments.length > 0 ? batchDocuments : undefined,
        metadatas: batchMetadatas.length > 0 ? batchMetadatas : undefined,
        embeddings: batchEmbeddings.length > 0 ? batchEmbeddings : undefined
      });
      
      offset += batchSize;
      process.stdout.write(`   Progress: ${Math.min(offset, allIds.length)}/${allIds.length} documents\r`);
    }
    
    // Verify upload
    const serverCount = await serverCollection.count();
    console.log(`\n✅ Upload complete!`);
    console.log(`   Server collection now has ${serverCount} documents`);
    
    if (serverCount !== allIds.length) {
      console.log(`   ⚠️  WARNING: Count mismatch (expected: ${allIds.length}, got: ${serverCount})`);
    } else {
      console.log(`   ✅ Document count matches!\n`);
    }
    
    console.log('🎉 Data successfully loaded to ChromaDB server!');
    console.log('   Your API should now work with the server connection.\n');
    
  } catch (error) {
    console.error('\n❌ Error loading data:');
    console.error(`   ${error.message}`);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

loadDataToServer();

