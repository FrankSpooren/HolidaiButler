import { useState } from 'react';
import { Button, CircularProgress, Tooltip, Snackbar, Alert } from '@mui/material';
import TranslateIcon from '@mui/icons-material/Translate';
import { useDestination } from './DestinationContext.jsx';
import { translateTexts } from '../../api/translationService.js';

/**
 * BulkTranslateButton — vertaalt ALLE i18n-objects in block.props in 1 klik
 * via DeepL existing pipeline (auto-detect source-locale per veld, target =
 * destination supported_languages \ source).
 *
 * Walks block.props recursief, identificeert i18n-objects (keys subset van
 * SUPPORTED_LOCALES), batched naar translateTexts en past resultaat terug toe
 * via deep-clone + path-update.
 *
 * @version BLOK F1 (22-05-2026)
 */

const SUPPORTED_LOCALES = ['en', 'nl', 'de', 'es', 'fr'];

function isI18nObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const keys = Object.keys(value);
  if (keys.length === 0) return false;
  return keys.every(k => SUPPORTED_LOCALES.includes(k));
}

/**
 * Walk props-tree, retourneer lijst van { path, value, sourceLang }
 * waar value een i18n-object is met minstens 1 niet-lege bron-locale (en of nl).
 */
function collectI18nFields(obj, path = []) {
  const results = [];
  if (obj === null || obj === undefined) return results;
  if (Array.isArray(obj)) {
    obj.forEach((item, idx) => results.push(...collectI18nFields(item, [...path, idx])));
    return results;
  }
  if (typeof obj !== 'object') return results;
  if (isI18nObject(obj)) {
    const sourceLang = obj.en && String(obj.en).trim() ? 'en'
      : obj.nl && String(obj.nl).trim() ? 'nl'
      : null;
    if (sourceLang) results.push({ path, value: obj, sourceLang });
    return results;
  }
  Object.entries(obj).forEach(([k, v]) => results.push(...collectI18nFields(v, [...path, k])));
  return results;
}

function setValueAtPath(obj, path, newValue) {
  if (path.length === 0) return newValue;
  const head = path[0];
  if (Array.isArray(obj)) {
    const copy = [...obj];
    copy[head] = setValueAtPath(copy[head], path.slice(1), newValue);
    return copy;
  }
  return { ...obj, [head]: setValueAtPath(obj?.[head], path.slice(1), newValue) };
}

export default function BulkTranslateButton({ block, onUpdate }) {
  const [running, setRunning] = useState(false);
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' });
  const destCtx = useDestination();
  const supportedLanguages = (Array.isArray(destCtx?.supportedLanguages) && destCtx.supportedLanguages.length > 0)
    ? destCtx.supportedLanguages.filter(l => SUPPORTED_LOCALES.includes(l))
    : ['en', 'nl', 'de', 'es'];

  const handleClick = async () => {
    if (running) return;
    const fields = collectI18nFields(block.props || {});
    if (fields.length === 0) {
      setSnack({ open: true, message: 'Geen i18n-velden gevonden in dit block.', severity: 'info' });
      return;
    }

    setRunning(true);
    let translatedCount = 0;
    let failedCount = 0;
    let nextProps = block.props || {};

    try {
      // Group fields per sourceLang voor efficiente DeepL batches
      const bySourceLang = {};
      fields.forEach((field, idx) => {
        const sourceLang = field.sourceLang;
        if (!bySourceLang[sourceLang]) bySourceLang[sourceLang] = [];
        bySourceLang[sourceLang].push({ key: `f${idx}`, value: field.value[sourceLang], field });
      });

      // Per source-lang: target-langs = supportedLanguages \ sourceLang
      for (const [sourceLang, fieldList] of Object.entries(bySourceLang)) {
        const targetLangs = supportedLanguages.filter(l => l !== sourceLang);
        if (targetLangs.length === 0) continue;

        const texts = fieldList.map(f => ({ key: f.key, value: f.value }));
        try {
          const translations = await translateTexts(texts, sourceLang, targetLangs);
          fieldList.forEach(f => {
            const updated = { ...f.field.value };
            for (const lang of targetLangs) {
              if (translations[f.key]?.[lang]) {
                updated[lang] = translations[f.key][lang];
              }
            }
            nextProps = setValueAtPath(nextProps, f.field.path, updated);
            translatedCount++;
          });
        } catch (err) {
          failedCount += fieldList.length;
        }
      }

      if (translatedCount > 0) onUpdate(nextProps);
      setSnack({
        open: true,
        message: `Vertaald: ${translatedCount} velden${failedCount > 0 ? ` (${failedCount} mislukt)` : ''}.`,
        severity: failedCount > 0 ? 'warning' : 'success',
      });
    } catch (err) {
      setSnack({ open: true, message: `Vertaal-fout: ${err?.message || 'onbekend'}`, severity: 'error' });
    } finally {
      setRunning(false);
    }
  };

  return (
    <>
      <Tooltip title={`Vertaal alle i18n-velden naar ${supportedLanguages.length} talen (DeepL — cultureel-aangepaste formality)`}>
        <span>
          <Button
            size="small"
            variant="outlined"
            startIcon={running ? <CircularProgress size={14} /> : <TranslateIcon fontSize="small" />}
            onClick={handleClick}
            disabled={running}
          >
            {running ? 'Vertalen...' : `Vertaal alle velden (${supportedLanguages.length} talen)`}
          </Button>
        </span>
      </Tooltip>
      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snack.severity} onClose={() => setSnack(s => ({ ...s, open: false }))}>
          {snack.message}
        </Alert>
      </Snackbar>
    </>
  );
}
