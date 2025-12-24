/**
 * HoliBot Services Index
 * Exports all HoliBot-related services
 */

export { chromaService } from './chromaService.js';
export { embeddingService } from './embeddingService.js';
export { ragService } from './ragService.js';
export { syncService } from './syncService.js';

// TTS: Use OpenAI for natural, warm voice (replaces Google Cloud TTS)
// OpenAI TTS provides better intonation, warmth, and emotional expression
// Export as 'ttsService' for backward compatibility with existing code
export { openaiTtsService as ttsService } from './openaiTtsService.js';

// Keep Google TTS available as fallback (can be re-enabled if needed)
// export { ttsService as googleTtsService } from './ttsService.js';
