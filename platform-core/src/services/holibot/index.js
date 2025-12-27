/**
 * HoliBot Services Index
 * Exports all HoliBot-related services
 */

export { chromaService } from './chromaService.js';
export { embeddingService } from './embeddingService.js';
export { ragService } from './ragService.js';
export { syncService } from './syncService.js';
export { spellService } from './spellService.js';

// TTS: Use Google Cloud TTS with Chirp3-HD voices for enterprise-level voice quality
// Chirp3-HD is Google's latest and highest quality TTS with native pronunciation
// Voice "Aoede" provides warm, friendly female voice across all 6 languages
// OpenAI TTS was rejected due to English accent when speaking Dutch
export { ttsService } from './ttsService.js';

// OpenAI TTS available as alternative (has English accent in non-English languages)
// export { openaiTtsService as ttsService } from './openaiTtsService.js';
