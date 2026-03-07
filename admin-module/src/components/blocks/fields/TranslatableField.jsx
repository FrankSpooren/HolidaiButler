import { useState } from 'react';
import { Box, Tabs, Tab, TextField, IconButton, CircularProgress, Tooltip } from '@mui/material';
import TranslateIcon from '@mui/icons-material/Translate';
import { translateTexts } from '../../../api/translationService.js';

const LANGS = [
  { code: 'en', label: 'EN' },
  { code: 'nl', label: 'NL' },
  { code: 'de', label: 'DE' },
  { code: 'es', label: 'ES' }
];

/**
 * Translatable field — supports both string values (simple) and i18n objects ({ en, nl, de, es }).
 * @param {Object} props
 * @param {string} props.label - Field label
 * @param {string|Object} props.value - String (stored as EN) or { en, nl, de, es }
 * @param {function} props.onChange - Called with updated i18n object
 * @param {boolean} props.multiline - Use multiline textarea
 * @param {number} props.rows - Rows for multiline
 */
export default function TranslatableField({ label, value, onChange, multiline, rows, helperText, required, disabled, sx }) {
  const [tab, setTab] = useState(0);
  const [translating, setTranslating] = useState(false);

  // Normalize value to i18n object
  const i18n = typeof value === 'string' ? { en: value, nl: '', de: '', es: '' } : (value || { en: '', nl: '', de: '', es: '' });

  const handleLangChange = (lang, val) => {
    onChange({ ...i18n, [lang]: val });
  };

  const handleTranslate = async () => {
    const sourceLang = i18n.en ? 'en' : i18n.nl ? 'nl' : null;
    const sourceText = i18n[sourceLang];
    if (!sourceLang || !sourceText) return;

    setTranslating(true);
    const targetLangs = LANGS.map(l => l.code).filter(l => l !== sourceLang);
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

  const activeLang = LANGS[tab].code;

  return (
    <Box sx={{ mb: 2, ...sx }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ minHeight: 32, '& .MuiTab-root': { minHeight: 32, py: 0.5, px: 1.5, minWidth: 40, fontSize: '0.75rem' } }}>
          {LANGS.map(l => <Tab key={l.code} label={l.label} />)}
        </Tabs>
        <Tooltip title="Auto-translate">
          <span>
            <IconButton size="small" onClick={handleTranslate} disabled={translating || disabled || (!i18n.en && !i18n.nl)}>
              {translating ? <CircularProgress size={16} /> : <TranslateIcon fontSize="small" />}
            </IconButton>
          </span>
        </Tooltip>
      </Box>
      <TextField
        size="small"
        label={`${label} (${LANGS[tab].label})`}
        value={i18n[activeLang] || ''}
        onChange={e => handleLangChange(activeLang, e.target.value)}
        multiline={multiline}
        rows={rows}
        helperText={helperText}
        required={required && activeLang === 'en'}
        disabled={disabled}
        fullWidth
      />
    </Box>
  );
}
