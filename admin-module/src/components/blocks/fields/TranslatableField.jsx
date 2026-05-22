import { useState, useMemo } from 'react';
import { Box, Tabs, Tab, TextField, IconButton, CircularProgress, Tooltip } from '@mui/material';
import TranslateIcon from '@mui/icons-material/Translate';
import { translateTexts } from '../../../api/translationService.js';
import { useDestination } from '../DestinationContext.jsx';

// Alle 5 ondersteunde talen — feitelijke render wordt gefilterd op `supportedLanguages` prop.
const ALL_LANGS = [
  { code: 'en', label: 'EN' },
  { code: 'nl', label: 'NL' },
  { code: 'de', label: 'DE' },
  { code: 'es', label: 'ES' },
  { code: 'fr', label: 'FR' }
];

const DEFAULT_LANGS = ['en', 'nl', 'de', 'es'];

/**
 * Translatable field — supports both string values (simple) and i18n objects ({ en, nl, de, es, fr }).
 *
 * Sinds BLOK B (22-05-2026):
 *   - 5 talen ondersteund (NL/EN/DE/ES/FR)
 *   - `supportedLanguages` prop filtert tabs op destination's supported_languages
 *   - DeepL bulk-translate alleen naar talen IN supportedLanguages \ sourceLang
 *
 * @param {Object} props
 * @param {string} props.label - Field label
 * @param {string|Object} props.value - String (stored as EN) of i18n object
 * @param {function} props.onChange - Called with updated i18n object
 * @param {boolean} props.multiline - Use multiline textarea
 * @param {number} props.rows - Rows voor multiline
 * @param {string[]} [props.supportedLanguages] - Toegestane talen (filtert ALL_LANGS). Default: nl/en/de/es.
 */
export default function TranslatableField({
  label, value, onChange, multiline, rows, helperText, required, disabled, sx,
  supportedLanguages
}) {
  const [tab, setTab] = useState(0);
  const [translating, setTranslating] = useState(false);

  // Filter LANGS op supported_languages.
  // Bronvolgorde: explicit prop > destination context (van PagesPage Provider) > default 4-talen
  const destCtx = useDestination();
  const langs = useMemo(() => {
    const allowed = Array.isArray(supportedLanguages) && supportedLanguages.length > 0
      ? supportedLanguages
      : (Array.isArray(destCtx?.supportedLanguages) && destCtx.supportedLanguages.length > 0
          ? destCtx.supportedLanguages
          : DEFAULT_LANGS);
    return ALL_LANGS.filter(l => allowed.includes(l.code));
  }, [supportedLanguages, destCtx?.supportedLanguages]);

  // Normalize value to i18n object — bevat keys voor ALLE LANGS (zodat onChange consistente keys propageert)
  const i18n = typeof value === 'string'
    ? { en: value, nl: '', de: '', es: '', fr: '' }
    : (value && typeof value === 'object'
        ? { en: '', nl: '', de: '', es: '', fr: '', ...value }
        : { en: '', nl: '', de: '', es: '', fr: '' });

  const handleLangChange = (lang, val) => onChange({ ...i18n, [lang]: val });

  const handleTranslate = async () => {
    // Source lang: prefer EN, fallback NL
    const sourceLang = i18n.en ? 'en' : i18n.nl ? 'nl' : null;
    const sourceText = sourceLang ? i18n[sourceLang] : null;
    if (!sourceLang || !sourceText) return;

    setTranslating(true);
    // Target langs: alleen talen IN supported_languages (exclusief source)
    const targetLangs = langs.map(l => l.code).filter(l => l !== sourceLang);
    if (targetLangs.length === 0) {
      setTranslating(false);
      return;
    }
    try {
      const translations = await translateTexts([{ key: 'field', value: sourceText }], sourceLang, targetLangs);
      const updated = { ...i18n };
      targetLangs.forEach(l => {
        if (translations.field?.[l]) updated[l] = translations.field[l];
      });
      onChange(updated);
    } catch {
      // silently fail
    } finally {
      setTranslating(false);
    }
  };

  // Bij single-lang destinations: geen tabs UI, alleen 1 input
  if (langs.length === 1) {
    const onlyLang = langs[0].code;
    return (
      <Box sx={{ mb: 2, ...sx }}>
        <TextField
          size="small"
          label={`${label} (${langs[0].label})`}
          value={i18n[onlyLang] || ''}
          onChange={e => handleLangChange(onlyLang, e.target.value)}
          multiline={multiline}
          rows={rows}
          helperText={helperText}
          required={required}
          disabled={disabled}
          fullWidth
        />
      </Box>
    );
  }

  const safeTab = Math.min(tab, langs.length - 1);
  const activeLang = langs[safeTab].code;

  return (
    <Box sx={{ mb: 2, ...sx }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
        <Tabs value={safeTab} onChange={(_, v) => setTab(v)} sx={{ minHeight: 32, '& .MuiTab-root': { minHeight: 32, py: 0.5, px: 1.5, minWidth: 40, fontSize: '0.75rem' } }}>
          {langs.map(l => <Tab key={l.code} label={l.label} />)}
        </Tabs>
        <Tooltip title="Auto-translate (DeepL)">
          <span>
            <IconButton size="small" onClick={handleTranslate} disabled={translating || disabled || (!i18n.en && !i18n.nl)}>
              {translating ? <CircularProgress size={16} /> : <TranslateIcon fontSize="small" />}
            </IconButton>
          </span>
        </Tooltip>
      </Box>
      <TextField
        size="small"
        label={`${label} (${langs[safeTab].label})`}
        value={i18n[activeLang] || ''}
        onChange={e => handleLangChange(activeLang, e.target.value)}
        multiline={multiline}
        rows={rows}
        helperText={helperText}
        required={required && (activeLang === 'en' || (activeLang === langs[0].code))}
        disabled={disabled}
        fullWidth
      />
    </Box>
  );
}
