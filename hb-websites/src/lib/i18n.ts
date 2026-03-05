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
