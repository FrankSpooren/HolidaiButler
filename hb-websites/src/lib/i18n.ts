export type Locale = 'nl' | 'en' | 'es' | 'de' | 'fr';

const SUPPORTED_LOCALES: Locale[] = ['nl', 'en', 'es', 'de', 'fr'];

export function isValidLocale(locale: string): locale is Locale {
  return SUPPORTED_LOCALES.includes(locale as Locale);
}

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
 * Check if a value is an i18n object (keys are a subset of supported locales).
 * TranslatableField in admin stores values as { en: "...", nl: "...", ... }.
 */
function isI18nObject(value: unknown): value is Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const keys = Object.keys(value);
  if (keys.length === 0) return false;
  return keys.every(k => SUPPORTED_LOCALES.includes(k as Locale));
}

/**
 * Recursively resolve i18n objects in block props to locale-specific strings.
 * Handles nested objects and arrays. Leaves non-i18n values untouched.
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
