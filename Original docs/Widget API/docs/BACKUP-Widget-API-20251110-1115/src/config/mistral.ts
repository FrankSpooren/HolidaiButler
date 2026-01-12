// Mistral API configuration
export const mistralConfig = {
  apiKey: process.env.MISTRAL_API_KEY,
  baseUrl: process.env.MISTRAL_BASE_URL || 'https://api.mistral.ai/v1',
  model: 'mistral-embed',
  timeout: 30000, // 30 seconds
  retries: 3
};
