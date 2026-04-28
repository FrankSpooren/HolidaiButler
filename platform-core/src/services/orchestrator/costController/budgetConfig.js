// Maandelijks budget (bijgewerkt april 2026 — werkelijke kosten basis)
export const MONTHLY_BUDGET = {
  total: 470,
  services: {
    claude: 110,          // Claude Max plan
    anthropic: 30,        // Anthropic extra tokens
    mistral: 20,          // Mistral AI (S/M/L)
    deepl: 30,            // DeepL vertalingen
    apify: 85,            // Apify starterplan
    perplexity: 25,       // Perplexity AI
    simpleanalytics: 20,  // Simple Analytics (vast)
    unsplash: 15,         // Unsplash images
    hetzner: 15,          // Hetzner server (vast)
    mailerlite: 15,       // MailerLite email (vast)
    ovh: 25,              // OVH domeinnamen (vast)
    meta: 80,             // Meta campagnes FB/Insta
  }
};

// Alert thresholds (percentage van budget)
export const ALERT_THRESHOLDS = {
  info: 50,      // 50% - informatief
  warning: 75,   // 75% - waarschuwing
  high: 90,      // 90% - hoog
  critical: 100  // 100% - kritiek (hard stop voor non-essential)
};

// Services die gestopt kunnen worden bij budget overschrijding
export const STOPPABLE_SERVICES = ['claude', 'mistral', 'apify'];
export const FIXED_SERVICES = ['hetzner', 'mailerlite'];
