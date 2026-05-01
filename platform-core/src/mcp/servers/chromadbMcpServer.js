/**
 * MCP Server: ChromaDB
 * Tools: query collection, add documents
 * Port: 7005
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import { ChromaClient } from 'chromadb';
import { createMcpServer } from './baseMcpServer.js';

const chromaClient = new ChromaClient({
  path: process.env.CHROMADB_HOST || 'https://api.trychroma.com:8000',
  auth: process.env.CHROMADB_API_KEY ? {
    provider: 'token',
    credentials: process.env.CHROMADB_API_KEY,
    tokenHeaderType: 'X_CHROMA_TOKEN'
  } : undefined,
  tenant: process.env.CHROMADB_TENANT || 'default_tenant',
  database: process.env.CHROMADB_DATABASE || 'default_database'
});

const tools = [
  {
    name: 'chromadb_query',
    description: 'Query a ChromaDB collection with text or embeddings',
    inputSchema: {
      type: 'object',
      properties: {
        collection: { type: 'string' },
        queryTexts: { type: 'array', items: { type: 'string' } },
        nResults: { type: 'integer', default: 5 },
        where: { type: 'object', description: 'Optional metadata filter' }
      },
      required: ['collection', 'queryTexts']
    },
    handler: async ({ collection, queryTexts, nResults = 5, where }) => {
      const col = await chromaClient.getCollection({ name: collection });
      const opts = { queryTexts, nResults };
      if (where) opts.where = where;
      const results = await col.query(opts);
      return { ids: results.ids, documents: results.documents, distances: results.distances };
    }
  },
  {
    name: 'chromadb_count',
    description: 'Count documents in a ChromaDB collection',
    inputSchema: {
      type: 'object',
      properties: {
        collection: { type: 'string' }
      },
      required: ['collection']
    },
    handler: async ({ collection }) => {
      const col = await chromaClient.getCollection({ name: collection });
      const count = await col.count();
      return { collection, count };
    }
  }
];

const server = createMcpServer({ name: 'hb-chromadb', port: 7005, tools });
server.start();
