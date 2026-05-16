/**
 * formatApiError — convert an Axios error from platform-core into a
 * localised user message for snackbars / alerts.
 *
 * Backend (post Fix 6, 2026-05-16) responds with
 *   { success: false, error: { code: 'MEDIA_REQUIRED', message: '...', details: {...} } }
 * for domain-specific errors. This helper looks up the matching i18n key
 * under `errors.<code-in-snake-lower>` and falls back to the raw message
 * if the key is missing.
 *
 * Usage:
 *   import { formatApiError } from '../utils/formatApiError';
 *   import { useTranslation } from 'react-i18next';
 *   ...
 *   const { t } = useTranslation();
 *   try { await contentService.scheduleItem(id, data); }
 *   catch (err) { setSnackMsg(formatApiError(err, t)); }
 */

export function formatApiError(err, t, fallback) {
  const apiError = err?.response?.data?.error;
  const code = typeof apiError?.code === 'string' ? apiError.code : null;
  const details = apiError?.details || {};
  const rawMessage = apiError?.message || err?.message || fallback || 'Onbekende fout';

  if (!code || typeof t !== 'function') return rawMessage;

  const key = `errors.${code.toLowerCase()}`;
  // i18next returns the key itself when missing (default behaviour); compare
  // to detect missing translations and fall back to backend's raw message.
  const translated = t(key, { ...details, defaultValue: '__MISSING__' });
  return translated === '__MISSING__' ? rawMessage : translated;
}

export default formatApiError;
