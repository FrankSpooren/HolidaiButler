/**
 * Circuit Breaker Initialization
 * Pre-registers breakers for all critical external services.
 * Called at API startup so the Platform Health dashboard shows all breakers.
 *
 * Breaker configs: failureThreshold, resetTimeout, monitorInterval
 */
import circuitBreakerManager from './circuitBreaker.js';

export function initializeCircuitBreakers() {
  // Apify (already used in apify.js, register with explicit config)
  circuitBreakerManager.getBreaker('apify-scrape', {
    failureThreshold: 3,
    resetTimeout: 60000,     // 1 min
    monitorInterval: 30000,
  });

  circuitBreakerManager.getBreaker('apify-google-places', {
    failureThreshold: 3,
    resetTimeout: 60000,
  });

  // Mistral AI (LLM calls for content, translations, SEO)
  circuitBreakerManager.getBreaker('mistral-ai', {
    failureThreshold: 5,
    resetTimeout: 120000,    // 2 min (API can have transient issues)
    monitorInterval: 60000,
  });

  // ChromaDB (vector search for chatbot)
  circuitBreakerManager.getBreaker('chromadb', {
    failureThreshold: 3,
    resetTimeout: 30000,     // 30s (cloud service, fast recovery)
    monitorInterval: 15000,
  });

  // Meta Graph API (Facebook/Instagram publishing)
  circuitBreakerManager.getBreaker('meta-graph', {
    failureThreshold: 3,
    resetTimeout: 300000,    // 5 min (rate limits can take time)
    monitorInterval: 60000,
  });

  // Adyen Payments
  circuitBreakerManager.getBreaker('adyen-payments', {
    failureThreshold: 2,     // Low tolerance for payment failures
    resetTimeout: 60000,
    monitorInterval: 30000,
  });

  // Google Cloud TTS
  circuitBreakerManager.getBreaker('google-tts', {
    failureThreshold: 5,
    resetTimeout: 60000,
    monitorInterval: 30000,
  });

  // MySQL heavy queries (reports, analytics)
  circuitBreakerManager.getBreaker('mysql-heavy', {
    failureThreshold: 5,
    resetTimeout: 30000,
    monitorInterval: 15000,
  });

  const count = circuitBreakerManager.breakers?.size || 0;
  console.log('[CircuitBreakers] Initialized ' + count + ' breakers');
}
