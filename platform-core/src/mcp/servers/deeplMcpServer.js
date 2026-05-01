/**
 * MCP Server: DeepL
 * Tools: translate text, detect language
 * Port: 7003
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import { createMcpServer } from './baseMcpServer.js';

const DEEPL_KEY = process.env.DEEPL_API_KEY;
const DEEPL_BASE = DEEPL_KEY?.endsWith(':fx')
  ? 'https://api-free.deepl.com/v2'
  : 'https://api.deepl.com/v2';

async function deeplFetch(endpoint, body) {
  const res = await fetch(`${DEEPL_BASE}${endpoint}`, {
    method: 'POST',
    headers: { 'Authorization': `DeepL-Auth-Key ${DEEPL_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`DeepL API error: ${res.status} ${await res.text()}`);
  return res.json();
}

const tools = [
  {
    name: 'deepl_translate',
    description: 'Translate text via DeepL',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string' },
        targetLang: { type: 'string', description: 'Target language code (EN, NL, DE, ES, FR)' },
        sourceLang: { type: 'string', description: 'Source language code (optional)' }
      },
      required: ['text', 'targetLang']
    },
    handler: async ({ text, targetLang, sourceLang }) => {
      const body = { text: [text], target_lang: targetLang.toUpperCase() };
      if (sourceLang) body.source_lang = sourceLang.toUpperCase();
      const result = await deeplFetch('/translate', body);
      return {
        translation: result.translations[0].text,
        detectedSourceLang: result.translations[0].detected_source_language
      };
    }
  }
];

const server = createMcpServer({ name: 'hb-deepl', port: 7003, tools });
server.start();
