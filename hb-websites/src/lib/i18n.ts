/**
 * i18n runtime helpers voor hb-websites block-renderers.
 *
 * Sinds BLOK B/D (22-05-2026) slaan admin-blocks i18n content op als JSON-object:
 *   { en: 'Hello', nl: 'Hallo', de: 'Hallo', es: 'Hola', fr: 'Bonjour' }
 * Bestaande blocks (vóór 22-05-2026) hebben nog string content.
 *
 * `getLocalized()` is backward-compat: accepteert beide vormen, returnt
 * juiste taal-string met sensible fallback-chain.
 *
 * Fallback-volgorde voor i18n-object:
 *   1. Requested locale (bv. 'nl')
 *   2. 'en' (universele baseline)
 *   3. 'nl' (Dutch — primaire content voor NL-destinations)
 *   4. Eerste niet-lege value
 *   5. Provided fallback (default: '')
 */

export type I18nValue =
  | string
  | { [locale: string]: string | undefined | null }
  | null
  | undefined;

const FALLBACK_ORDER = ['en', 'nl', 'de', 'es', 'fr'];

export function getLocalized(value: I18nValue, locale: string = 'en', fallback: string = ''): string {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'string') return value;
  if (typeof value !== 'object') return fallback;

  // Requested locale first
  const requested = value[locale];
  if (requested && String(requested).trim().length > 0) return String(requested);

  // Sensible fallback chain
  for (const lang of FALLBACK_ORDER) {
    if (lang === locale) continue;
    const v = value[lang];
    if (v && String(v).trim().length > 0) return String(v);
  }

  // Last resort: any non-empty value
  for (const key of Object.keys(value)) {
    const v = value[key];
    if (v && String(v).trim().length > 0) return String(v);
  }

  return fallback;
}

/**
 * Detect of een veld i18n-aware is (object) of legacy string.
 * Bruikbaar voor admin-side validation (badge "vertaling ontbreekt").
 */
export function isI18nObject(value: I18nValue): value is { [locale: string]: string | undefined | null } {
  return value !== null && value !== undefined && typeof value === 'object';
}

/**
 * Tel hoeveel talen NIET-leeg zijn in een i18n-object.
 * Returnt 0 voor string of leeg object.
 */
export function countFilledLocales(value: I18nValue): number {
  if (!isI18nObject(value)) return value && typeof value === 'string' ? 1 : 0;
  return Object.values(value).filter((v) => v && String(v).trim().length > 0).length;
}
