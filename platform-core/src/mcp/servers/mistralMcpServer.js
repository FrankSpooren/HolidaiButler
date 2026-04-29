/**
 * MCP Server: Mistral AI
 * Tools: chat completion, embedding generation
 * Port: 7001
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import { Mistral } from '@mistralai/mistralai';
import { createMcpServer } from './baseMcpServer.js';

const mistral = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });

const tools = [
  {
    name: 'mistral_chat',
    description: 'Generate text via Mistral chat completions',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: { type: 'string' },
        model: { type: 'string', default: 'mistral-medium-latest' },
        temperature: { type: 'number', default: 0 },
        maxTokens: { type: 'integer', default: 1000 }
      },
      required: ['prompt']
    },
    handler: async ({ prompt, model = 'mistral-medium-latest', temperature = 0, maxTokens = 1000 }) => {
      const response = await mistral.chat.complete({
        model, temperature, maxTokens,
        messages: [{ role: 'user', content: prompt }]
      });
      return {
        content: response.choices[0].message.content,
        usage: response.usage,
        model: response.model
      };
    }
  },
  {
    name: 'mistral_embed',
    description: 'Generate embeddings via Mistral embed API',
    inputSchema: {
      type: 'object',
      properties: {
        input: { type: 'string' },
        model: { type: 'string', default: 'mistral-embed' }
      },
      required: ['input']
    },
    handler: async ({ input, model = 'mistral-embed' }) => {
      const response = await mistral.embeddings.create({ model, inputs: [input] });
      return { embedding: response.data[0].embedding, dimensions: response.data[0].embedding.length };
    }
  }
];

const server = createMcpServer({ name: 'hb-mistral', port: 7001, tools });
server.start();
