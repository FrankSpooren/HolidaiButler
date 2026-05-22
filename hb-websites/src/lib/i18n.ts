/**
 * i18n runtime helpers voor hb-websites.
 *
 * Centrale source-of-truth voor i18n in de Next.js renderer-laag. Wordt
 * geconsumeerd door:
 *   - app/[[...slug]]/page.tsx — recursieve i18n-resolution in block props
 *   - app/event/[id]/page.tsx + componenten — event-specifieke localized fields
 *   - SEO + metadata generators
 *
 * Admin-side TranslatableField (sinds BLOK B/D 22-05-2026) slaat content op
 * als JSON-object met SUPPORTED_LOCALES als keys; resolveLocalizedProps()
 * verwerkt deze automatisch in de page-renderer vóór block-componenten.
 */

export type Locale = 'nl' | 'en' | 'es' | 'de' | 'fr';

const SUPPORTED_LOCALES: Locale[] = ['nl', 'en', 'es', 'de', 'fr'];

export function isValidLocale(locale: string): locale is Locale {
  return SUPPORTED_LOCALES.includes(locale as Locale);
}

/**
 * Flat-field localization pattern: leest obj[field_locale] met fallback naar
 * obj[field]. Gebruikt voor entities (events/POI) die per-locale kolommen hebben.
 */
export function getLocalizedField<T extends Record<string, unknown>>(
  obj: T,
  field: string,
  locale: Locale
): string {
  if (locale === 'en') {
    return (obj[field] as string) ?? '';
  }
  return (obj[`${field}_${locale}`] as string) ?? (obj[field] as string) ?? '';
}

/**
 * I18n-object check: keys zijn een subset van SUPPORTED_LOCALES.
 * TranslatableField in admin slaat values op als { en: "...", nl: "...", ... }.
 */
export function isI18nObject(value: unknown): value is Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const keys = Object.keys(value);
  if (keys.length === 0) return false;
  return keys.every(k => SUPPORTED_LOCALES.includes(k as Locale));
}

/**
 * Recursive resolver voor i18n-objects in block-props. Handelt nested objects
 * en arrays. Laat non-i18n waardes ongewijzigd.
 *
 * Wordt aangeroepen in app/[[...slug]]/page.tsx voorafgaand aan BlockRenderer,
 * zodat block-componenten (Hero/RichText/Cta/etc.) gewoon string-props zien.
 */
export function resolveLocalizedProps(
  props: Record<string, unknown>,
  locale: string
): Record<string, unknown> {
  const loc = (SUPPORTED_LOCALES.includes(locale as Locale) ? locale : 'en') as Locale;
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(props)) {
    result[key] = resolveValue(value, loc);
  }

  return result;
}

function resolveValue(value: unknown, locale: Locale): unknown {
  if (isI18nObject(value)) {
    return value[locale] ?? value.en ?? value.nl ?? Object.values(value)[0] ?? '';
  }

  if (Array.isArray(value)) {
    return value.map(item => resolveValue(item, locale));
  }

  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;
    const resolved: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      resolved[k] = resolveValue(v, locale);
    }
    return resolved;
  }

  return value;
}

// =============================================================================
// Additions BLOK D (22-05-2026): single-value resolver + diagnostics
// =============================================================================

export type I18nValue =
  | string
  | { [locale: string]: string | undefined | null }
  | null
  | undefined;

const FALLBACK_ORDER: Locale[] = ['en', 'nl', 'de', 'es', 'fr'];

/**
 * Single-value localizer met fallback-chain. Complementair aan
 * resolveLocalizedProps() (recursive) — gebruik voor één specifieke i18n-waarde
 * waar recursive resolution niet nodig is (bv. legacy block.tsx callers die
 * direct een i18n veld willen lezen zonder volledige props-tree door te lopen).
 *
 * Fallback-volgorde: requested locale > en > nl > de > es > fr > first non-empty.
 */
export function getLocalized(value: I18nValue, locale: string = 'en', fallback: string = ''): string {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'string') return value;
  if (typeof value !== 'object') return fallback;

  const valueObj = value as Record<string, string | undefined | null>;
  const requested = valueObj[locale];
  if (requested && String(requested).trim().length > 0) return String(requested);

  for (const lang of FALLBACK_ORDER) {
    if (lang === locale) continue;
    const v = valueObj[lang];
    if (v && String(v).trim().length > 0) return String(v);
  }

  for (const key of Object.keys(valueObj)) {
    const v = valueObj[key];
    if (v && String(v).trim().length > 0) return String(v);
  }

  return fallback;
}

/**
 * Tel aantal niet-lege locales in een i18n-object. Returnt 0 voor null/undefined,
 * 1 voor string. Gebruikt voor admin-side validation badges (leegblok-detectie).
 */
export function countFilledLocales(value: I18nValue): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'string') return value.trim().length > 0 ? 1 : 0;
  if (!isI18nObject(value)) return 0;
  return Object.values(value).filter((v) => v && String(v).trim().length > 0).length;
}

/**
 * Returnt array van locales die ontbreken in i18n-value (gegeven supported set).
 * Gebruikt voor leegblok-badge in admin Layout-tab.
 */
export function getMissingLocales(value: I18nValue, supportedLanguages: string[]): string[] {
  if (!isI18nObject(value)) {
    // String of leeg = ALLE locales ontbreken behalve eventueel string-as-en
    if (typeof value === 'string' && value.trim().length > 0) {
      return supportedLanguages.filter(l => l !== 'en');
    }
    return [...supportedLanguages];
  }
  const valueObj = value as Record<string, string | undefined | null>;
  return supportedLanguages.filter(lang => {
    const v = valueObj[lang];
    return !v || String(v).trim().length === 0;
  });
}
