/**
 * Agent Dashboard Utilities — Fase 8E
 * Icons, colors, descriptions, and helpers for the agent dashboard.
 */

export const AGENT_ICONS = {
  'De Maestro': '\u{1F3AD}',
  'De Bode': '\u{1F4E2}',
  'De Dokter': '\u{1F3E5}',
  'De Koerier': '\u{1F4E6}',
  'Het Geheugen': '\u{1F9E0}',
  'De Gastheer': '\u{1F91D}',
  'De Poortwachter': '\u{1F512}',
  'De Stylist': '\u{1F3A8}',
  'De Corrector': '\u{1F4DD}',
  'De Bewaker': '\u{1F6E1}\uFE0F',
  'De Inspecteur': '\u{1F50D}',
  'De Architect': '\u{1F3D7}\uFE0F',
  'De Leermeester': '\u{1F4DA}',
  'De Thermostaat': '\u{1F321}\uFE0F',
  'De Weermeester': '\u{1F52E}',
  'Content Quality Checker': '\u{1F4CA}',
  'Smoke Test Runner': '\u{1F9EA}',
  'Backup Health Checker': '\u{1F4BE}'
};

export const CATEGORY_COLORS = {
  core: '#1565c0',
  operations: '#2e7d32',
  development: '#6d4c41',
  strategy: '#6a1b9a',
  monitoring: '#e65100'
};

export const STATUS_COLORS = {
  healthy: '#4caf50',
  warning: '#ff9800',
  error: '#f44336',
  unknown: '#9e9e9e'
};

export const AGENT_DESCRIPTIONS_NL = {
  'De Maestro': 'Centrale coordinatie van alle agents + taakplanning',
  'De Bode': 'Dagelijkse statusupdate via email + systeemwaarschuwingen',
  'De Dokter': 'Platform health monitoring (DB, API, SSL, portals)',
  'De Koerier': 'POI data synchronisatie en lifecycle management',
  'Het Geheugen': 'ChromaDB vectorisatie en chatbot kennisbeheer',
  'De Gastheer': 'Chatbot sessie management en prestatie monitoring',
  'De Poortwachter': 'GDPR compliance en privacybewaking',
  'De Stylist': 'UX/UI review en brand consistency check',
  'De Corrector': 'Automatische code fixes en dependency updates',
  'De Bewaker': 'Beveiligingsscans, SSL monitoring, code review',
  'De Inspecteur': 'Kwaliteitscontrole POI data + content verificatie',
  'De Architect': 'Architectuuranalyse en refactoring aanbevelingen',
  'De Leermeester': 'Pattern learning en adaptieve optimalisatie',
  'De Thermostaat': 'Systeem alerts en resource monitoring',
  'De Weermeester': 'Predictive analytics en trendanalyse',
  'Content Quality Checker': 'Wekelijkse content kwaliteitscheck',
  'Smoke Test Runner': 'Dagelijkse endpoint tests alle portals',
  'Backup Health Checker': 'Dagelijkse controle database backups'
};

export const AGENT_TASKS = {
  'De Maestro': [
    'Coordinatie van alle 18 agents',
    'Taakplanning en scheduling',
    'Foutafhandeling en escalatie',
    'Dagelijkse briefing orchestratie'
  ],
  'De Bode': [
    'Dagelijkse briefing email generatie',
    'Alert notificaties bij kritieke issues',
    'MailerLite veld updates (20+ velden)',
    'Per-destination statistieken'
  ],
  'De Dokter': [
    'MySQL, MongoDB, Redis health checks',
    'SSL certificaat monitoring (5 domeinen)',
    'Portal beschikbaarheid (7 portals)',
    'API response time monitoring',
    'Disk space en memory usage'
  ],
  'De Koerier': [
    'POI data synchronisatie (tier 1-4)',
    'Review data sync en deduplicatie',
    'Content lifecycle management',
    'Destination-specifieke data validatie'
  ],
  'Het Geheugen': [
    'ChromaDB vectorisatie beheer',
    'QnA en POI vector synchronisatie',
    'Collection state snapshots',
    'Embedding model monitoring'
  ],
  'De Gastheer': [
    'Chatbot sessie tracking',
    'Response kwaliteit monitoring',
    'Gebruikersfeedback analyse',
    'Prestatie statistieken'
  ],
  'De Poortwachter': [
    'GDPR data retention checks',
    'Verwijderingsverzoeken afhandeling',
    'Privacy audit logging',
    'Consent management'
  ],
  'De Stylist': [
    'Frontend UI consistency check',
    'Brand kleur verificatie (Calpe + Texel)',
    'Responsive design monitoring',
    'Accessibility checks'
  ],
  'De Corrector': [
    'Dependency update scanning',
    'Code quality analyse',
    'Automatische fixes voor bekende patronen'
  ],
  'De Bewaker': [
    'Beveiligingsscan (OWASP)',
    'SSL certificaat monitoring',
    'Code review op security patronen',
    'Vulnerability scanning'
  ],
  'De Inspecteur': [
    'POI data completeness checks',
    'Content kwaliteitsaudits',
    'Afbeeldingen validatie',
    'Multi-taal content verificatie'
  ],
  'De Architect': [
    'Architectuur analyse',
    'Refactoring aanbevelingen',
    'Performance optimalisatie tips',
    'Code complexiteit monitoring'
  ],
  'De Leermeester': [
    'Pattern herkenning in agent data',
    'Adaptieve optimalisatie regels',
    'MongoDB persistente patronen',
    'Learning feedback loops'
  ],
  'De Thermostaat': [
    'Systeem resource monitoring',
    'Alert drempel evaluatie',
    'Redis persistent state',
    'Escalatie bij overschrijding'
  ],
  'De Weermeester': [
    'Predictive analytics',
    'Trend analyse (7/30/90 dagen)',
    'Seizoensgebonden voorspellingen',
    'Anomalie detectie'
  ],
  'Content Quality Checker': [
    'Content completeness audit',
    'Consistentie checks per taal',
    'Woordaantal validatie',
    'Wekelijks rapport'
  ],
  'Smoke Test Runner': [
    'API endpoint testing (Calpe + Texel)',
    'Frontend beschikbaarheid (6 portals)',
    'Infrastructure checks (Redis, MongoDB, BullMQ)',
    'Threema configuratie check'
  ],
  'Backup Health Checker': [
    'MySQL backup recency check',
    'MongoDB backup recency check',
    'Disk space monitoring',
    'Alert bij CRITICAL status'
  ]
};

export function getAgentIcon(name) {
  return AGENT_ICONS[name] || '\u{1F916}';
}

export function getAgentDescription(name) {
  return AGENT_DESCRIPTIONS_NL[name] || '';
}

export function getAgentTasks(name) {
  return AGENT_TASKS[name] || [];
}

export function formatTimestamp(ts) {
  if (!ts) return '\u2014';
  const d = new Date(ts);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  if (isToday) return `${hh}:${mm}`;
  const dd = String(d.getDate()).padStart(2, '0');
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}-${mo} ${hh}:${mm}`;
}
