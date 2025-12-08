#!/usr/bin/env python3
"""
Script to copy data from file-based ChromaDB to ChromaDB server
"""
import chromadb
from chromadb.config import Settings

def copy_collection_to_server():
    # File-based ChromaDB path
    file_path = r"C:\Emiel\hosting greengeeks\Websites\OSM - calpe\2 - chatbot api\chroma"
    server_url = "http://127.0.0.1:8000"
    collection_name = "calpe_pois"
    
    print(f"File-based ChromaDB: {file_path}")
    print(f"Server URL: {server_url}")
    print(f"Collection: {collection_name}\n")
    
    # Connect to file-based ChromaDB
    print("Connecting to file-based ChromaDB...")
    file_client = chromadb.PersistentClient(path=file_path)
    
    try:
        file_collection = file_client.get_collection(name=collection_name)
        count = file_collection.count()
        print(f"Found collection with {count} documents\n")
    except Exception as e:
        print(f"❌ Collection not found: {e}")
        return
    
    # Connect to server
    print("Connecting to ChromaDB server...")
    server_client = chromadb.HttpClient(host="127.0.0.1", port=8000)
    
    # Check if collection exists on server and delete if needed
    try:
        existing = server_client.get_collection(name=collection_name)
        existing_count = existing.count()
        print(f"WARNING: Collection already exists on server with {existing_count} documents")
        print("Deleting existing collection...")
        server_client.delete_collection(name=collection_name)
        print("Deleted existing collection\n")
    except Exception as e:
        # Collection doesn't exist, which is fine
        if "not found" in str(e).lower() or "ChromaNotFoundError" in str(type(e).__name__):
            print("Collection doesn't exist on server (good)\n")
        else:
            # Some other error, but we'll try to create anyway
            print(f"Note: {e}\n")
    
    # Create collection on server
    print("Creating collection on server...")
    try:
        server_collection = server_client.create_collection(name=collection_name)
        print("Collection created\n")
    except Exception as e:
        if "already exists" in str(e).lower():
            # Get the existing collection
            print("Collection already exists, using it...")
            server_collection = server_client.get_collection(name=collection_name)
            # Clear it first
            all_ids = server_collection.get()['ids']
            if all_ids:
                server_collection.delete(ids=all_ids)
            print("Cleared existing collection\n")
        else:
            raise
    
    # Fetch all data from file-based
    print(f"Fetching {count} documents from file-based DB...")
    results = file_collection.get(include=['documents', 'metadatas', 'embeddings'])
    
    # Upload in batches
    batch_size = 100
    total = len(results['ids'])
    print(f"Uploading {total} documents to server in batches of {batch_size}...")
    
    for i in range(0, total, batch_size):
        batch_ids = results['ids'][i:i+batch_size]
        batch_docs = results.get('documents', [None] * len(batch_ids))[i:i+batch_size] if results.get('documents') is not None else None
        batch_metas = results.get('metadatas', [None] * len(batch_ids))[i:i+batch_size] if results.get('metadatas') is not None else None
        batch_embeds = results.get('embeddings', [None] * len(batch_ids))[i:i+batch_size] if results.get('embeddings') is not None else None
        
        server_collection.add(
            ids=batch_ids,
            documents=batch_docs,
            metadatas=batch_metas,
            embeddings=batch_embeds
        )
        
        print(f"   Progress: {min(i + batch_size, total)}/{total}", end='\r')
    
    # Verify
    server_count = server_collection.count()
    print(f"\nUpload complete!")
    print(f"   Server collection now has {server_count} documents")
    
    if server_count == total:
        print("   SUCCESS: Document count matches!")
    else:
        print(f"   WARNING: Count mismatch (expected: {total}, got: {server_count})")

if __name__ == "__main__":
    copy_collection_to_server()

