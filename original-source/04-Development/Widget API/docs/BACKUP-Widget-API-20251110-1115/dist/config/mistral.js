"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mistralConfig = void 0;
exports.mistralConfig = {
    apiKey: process.env.MISTRAL_API_KEY,
    baseUrl: process.env.MISTRAL_BASE_URL || 'https://api.mistral.ai/v1',
    model: 'mistral-embed',
    timeout: 30000,
    retries: 3
};
//# sourceMappingURL=mistral.js.map