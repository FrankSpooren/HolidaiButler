/**
 * MCP Server: Sistrix
 * Tools: visibility index, keyword data
 * Port: 7006
 * Note: Requires SISTRIX_API_KEY in .env (niet geconfigureerd = tools disabled)
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import { createMcpServer } from './baseMcpServer.js';

const SISTRIX_KEY = process.env.SISTRIX_API_KEY;
const SISTRIX_BASE = 'https://api.sistrix.com';

async function sistrixFetch(endpoint, params = {}) {
  if (!SISTRIX_KEY) throw new Error('SISTRIX_API_KEY not configured');
  const qs = new URLSearchParams({ api_key: SISTRIX_KEY, format: 'json', ...params });
  const res = await fetch(`${SISTRIX_BASE}/${endpoint}?${qs}`);
  if (!res.ok) throw new Error(`Sistrix API error: ${res.status}`);
  return res.json();
}

const tools = [
  {
    name: 'sistrix_visibility',
    description: 'Get Sistrix visibility index for a domain',
    inputSchema: {
      type: 'object',
      properties: {
        domain: { type: 'string', description: 'Domain to check (e.g. holidaibutler.com)' },
        country: { type: 'string', default: 'nl', description: 'Country code' }
      },
      required: ['domain']
    },
    handler: async ({ domain, country = 'nl' }) => {
      const result = await sistrixFetch('domain.sichtbarkeitsindex', { domain, country });
      return { domain, country, visibility: result.answer?.[0]?.sichtbarkeitsindex ?? null };
    }
  },
  {
    name: 'sistrix_keywords',
    description: 'Get ranking keywords for a domain',
    inputSchema: {
      type: 'object',
      properties: {
        domain: { type: 'string' },
        country: { type: 'string', default: 'nl' },
        limit: { type: 'integer', default: 20 }
      },
      required: ['domain']
    },
    handler: async ({ domain, country = 'nl', limit = 20 }) => {
      const result = await sistrixFetch('domain.kwcount.seo', { domain, country, num: limit });
      return { domain, keywords: result.answer || [] };
    }
  }
];

const server = createMcpServer({ name: 'hb-sistrix', port: 7006, tools });
server.start();
