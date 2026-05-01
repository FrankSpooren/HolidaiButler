/**
 * MCP Server: Pixtral (Mistral Vision)
 * Tools: image analysis, image captioning
 * Port: 7004
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import { Mistral } from '@mistralai/mistralai';
import { createMcpServer } from './baseMcpServer.js';

const mistral = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });
const VISION_MODEL = process.env.MISTRAL_VISION_MODEL || 'pixtral-12b-2409';

const tools = [
  {
    name: 'pixtral_analyze',
    description: 'Analyze an image using Pixtral vision model',
    inputSchema: {
      type: 'object',
      properties: {
        imageUrl: { type: 'string', description: 'URL of the image to analyze' },
        prompt: { type: 'string', default: 'Describe this image in detail, including visual elements, mood, and context.' }
      },
      required: ['imageUrl']
    },
    handler: async ({ imageUrl, prompt = 'Describe this image in detail, including visual elements, mood, and context.' }) => {
      const response = await mistral.chat.complete({
        model: VISION_MODEL,
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', imageUrl: { url: imageUrl } }
          ]
        }],
        maxTokens: 500
      });
      return {
        analysis: response.choices[0].message.content,
        usage: response.usage,
        model: response.model
      };
    }
  }
];

const server = createMcpServer({ name: 'hb-pixtral', port: 7004, tools });
server.start();
