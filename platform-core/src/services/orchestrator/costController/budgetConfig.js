// Maandelijks budget zoals gedefinieerd in Fase 2 docs
export const MONTHLY_BUDGET = {
  total: 515,
  services: {
    claude: 300,      // Claude API
    mistral: 50,      // HoliBot LLM  
    apify: 100,       // Data scraping
    hetzner: 50,      // Server (fixed)
    mailerlite: 15    // Email (fixed)
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
