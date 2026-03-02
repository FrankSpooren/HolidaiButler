const LOCALE_MAP = { nl: 'nl-NL', en: 'en-GB', de: 'de-DE', es: 'es-ES' };

export function formatCents(amountCents, locale = 'nl') {
  const euros = (amountCents || 0) / 100;
  return new Intl.NumberFormat(LOCALE_MAP[locale] || 'nl-NL', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(euros);
}

export function formatPercentage(value, decimals = 1) {
  if (value === null || value === undefined || value === '0.0') return '—';
  return `${Number(value).toFixed(decimals)}%`;
}
