/**
 * MCP Server: Apify
 * Tools: run actor, get dataset items
 * Port: 7002
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import { createMcpServer } from './baseMcpServer.js';

const APIFY_TOKEN = process.env.APIFY_API_TOKEN;
const APIFY_BASE = 'https://api.apify.com/v2';

async function apifyFetch(path, options = {}) {
  const res = await fetch(`${APIFY_BASE}${path}?token=${APIFY_TOKEN}`, options);
  if (!res.ok) throw new Error(`Apify API error: ${res.status} ${await res.text()}`);
  return res.json();
}

const tools = [
  {
    name: 'apify_run_actor',
    description: 'Run an Apify actor with given input',
    inputSchema: {
      type: 'object',
      properties: {
        actorId: { type: 'string' },
        input: { type: 'object' }
      },
      required: ['actorId']
    },
    handler: async ({ actorId, input = {} }) => {
      const result = await apifyFetch(`/acts/${actorId}/runs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input)
      });
      return { runId: result.data.id, status: result.data.status, datasetId: result.data.defaultDatasetId };
    }
  },
  {
    name: 'apify_get_dataset',
    description: 'Get items from an Apify dataset',
    inputSchema: {
      type: 'object',
      properties: {
        datasetId: { type: 'string' },
        limit: { type: 'integer', default: 100 }
      },
      required: ['datasetId']
    },
    handler: async ({ datasetId, limit = 100 }) => {
      const result = await apifyFetch(`/datasets/${datasetId}/items?limit=${limit}`);
      return { items: result, count: result.length };
    }
  }
];

const server = createMcpServer({ name: 'hb-apify', port: 7002, tools });
server.start();
