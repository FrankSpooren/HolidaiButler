/**
 * Agent Dashboard Utilities — Fase 8C-1
 * Icons, colors, and helpers for the agent dashboard.
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
  core: '#1976d2',
  operations: '#2e7d32',
  development: '#ed6c02',
  strategy: '#9c27b0',
  monitoring: '#607d8b'
};

export const STATUS_COLORS = {
  healthy: '#4caf50',
  warning: '#ff9800',
  error: '#f44336',
  unknown: '#9e9e9e'
};

export function getAgentIcon(name) {
  return AGENT_ICONS[name] || '\u{1F916}';
}

export function formatTimestamp(ts) {
  if (!ts) return '—';
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
