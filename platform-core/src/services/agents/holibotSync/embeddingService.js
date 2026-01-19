/**
 * Embedding Service for HoliBot Sync Agent
 * Generates embeddings using MistralAI for vector search
 */

import axios from 'axios';
import { logCost } from '../../orchestrator/costController/index.js';
import { logError } from '../../orchestrator/auditTrail/index.js';

class EmbeddingService {
  constructor() {
    this.mistralApiKey = process.env.MISTRAL_API_KEY;
    this.model = 'mistral-embed';
    this.batchSize = 10; // Max texts per API call
  }

  async generateEmbedding(text) {
    try {
      const response = await axios.post(
        'https://api.mistral.ai/v1/embeddings',
        {
          model: this.model,
          input: [text]
        },
        {
          headers: {
            'Authorization': `Bearer ${this.mistralApiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      // Log cost (Mistral embed: ~€0.0001 per 1K tokens)
      const estimatedTokens = Math.ceil(text.length / 4);
      const cost = (estimatedTokens / 1000) * 0.0001;
      await logCost('mistral', 'embedding', cost, { tokens: estimatedTokens });

      return response.data.data[0].embedding;
    } catch (error) {
      await logError('holibot-sync', error, { action: 'generate_embedding' });
      throw error;
    }
  }

  async generateBatchEmbeddings(texts) {
    const embeddings = [];

    for (let i = 0; i < texts.length; i += this.batchSize) {
      const batch = texts.slice(i, i + this.batchSize);

      try {
        const response = await axios.post(
          'https://api.mistral.ai/v1/embeddings',
          {
            model: this.model,
            input: batch
          },
          {
            headers: {
              'Authorization': `Bearer ${this.mistralApiKey}`,
              'Content-Type': 'application/json'
            },
            timeout: 60000
          }
        );

        const batchEmbeddings = response.data.data.map(d => d.embedding);
        embeddings.push(...batchEmbeddings);

        // Log cost for batch
        const totalChars = batch.reduce((sum, t) => sum + t.length, 0);
        const estimatedTokens = Math.ceil(totalChars / 4);
        const cost = (estimatedTokens / 1000) * 0.0001;
        await logCost('mistral', 'embedding_batch', cost, {
          batchSize: batch.length,
          tokens: estimatedTokens
        });

        // Rate limiting
        if (i + this.batchSize < texts.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error) {
        await logError('holibot-sync', error, { action: 'batch_embedding', batchIndex: i });
        throw error;
      }
    }

    return embeddings;
  }

  formatPOIForEmbedding(poi) {
    const parts = [
      poi.name,
      poi.category,
      poi.subcategory,
      poi.description,
      poi.address,
      poi.opening_hours ? `Open: ${poi.opening_hours}` : null,
      poi.average_rating ? `Rating: ${poi.average_rating}/5` : null,
      poi.price_level ? `Price: ${'€'.repeat(poi.price_level)}` : null
    ].filter(Boolean);

    return parts.join('. ');
  }

  formatQAForEmbedding(qa) {
    return `Question: ${qa.question}\nAnswer: ${qa.answer}`;
  }
}

export default new EmbeddingService();
