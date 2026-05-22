import { useState, useMemo } from 'react';
import { Box, Tabs, Tab, IconButton, CircularProgress, Tooltip, Typography } from '@mui/material';
import TranslateIcon from '@mui/icons-material/Translate';
import { RichTextField } from './index.js';
import { translateTexts } from '../../../api/translationService.js';
import { useDestination } from '../DestinationContext.jsx';

/**
 * TranslatableRichTextField — i18n-aware wrapper rond RichTextField (TipTap).
 *
 * Eén TipTap-editor instance per actieve taal-tab. Value is een i18n-object
 * { en: '<p>...</p>', nl: '<p>...</p>', ... }; backward-compat: legacy string
 * wordt behandeld als EN-value.
 *
 * Auto-translate via DeepL (existing pipeline) — wordt zacht naar HTML
 * vertaald (DeepL handeling van HTML tags is robust).
 *
 * @version BLOK D (22-05-2026) — i18n-aware RichTextField wrapper
 */

const ALL_LANGS = [
  { code: 'en', label: 'EN' },
  { code: 'nl', label: 'NL' },
  { code: 'de', label: 'DE' },
  { code: 'es', label: 'ES' },
  { code: 'fr', label: 'FR' }
];
const DEFAULT_LANGS = ['en', 'nl', 'de', 'es'];

export default function TranslatableRichTextField({ label, value, onChange, supportedLanguages, helperText }) {
  const [tab, setTab] = useState(0);
  const [translating, setTranslating] = useState(false);
  const destCtx = useDestination();

  const langs = useMemo(() => {
    const allowed = Array.isArray(supportedLanguages) && supportedLanguages.length > 0
      ? supportedLanguages
      : (Array.isArray(destCtx?.supportedLanguages) && destCtx.supportedLanguages.length > 0
          ? destCtx.supportedLanguages
          : DEFAULT_LANGS);
    return ALL_LANGS.filter(l => allowed.includes(l.code));
  }, [supportedLanguages, destCtx?.supportedLanguages]);

  const i18n = typeof value === 'string'
    ? { en: value, nl: '', de: '', es: '', fr: '' }
    : (value && typeof value === 'object'
        ? { en: '', nl: '', de: '', es: '', fr: '', ...value }
        : { en: '', nl: '', de: '', es: '', fr: '' });

  const handleLangChange = (lang, html) => onChange({ ...i18n, [lang]: html });

  const handleTranslate = async () => {
    const sourceLang = i18n.en ? 'en' : i18n.nl ? 'nl' : null;
    const sourceHtml = sourceLang ? i18n[sourceLang] : null;
    if (!sourceLang || !sourceHtml || sourceHtml === '<p></p>') return;

    setTranslating(true);
    const targetLangs = langs.map(l => l.code).filter(l => l !== sourceLang);
    if (targetLangs.length === 0) {
      setTranslating(false);
      return;
    }
    try {
      const translations = await translateTexts(
        [{ key: 'richcontent', value: sourceHtml }],
        sourceLang,
        targetLangs,
        { isHtml: true }
      );
      const updated = { ...i18n };
      targetLangs.forEach(l => {
        if (translations.richcontent?.[l]) updated[l] = translations.richcontent[l];
      });
      onChange(updated);
    } catch {
      // silently fail
    } finally {
      setTranslating(false);
    }
  };

  if (langs.length === 1) {
    const onlyLang = langs[0].code;
    return (
      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 500 }}>
          {label} ({langs[0].label})
        </Typography>
        <RichTextField
          label={label}
          value={i18n[onlyLang] || ''}
          onChange={v => handleLangChange(onlyLang, v)}
          helperText={helperText}
        />
      </Box>
    );
  }

  const safeTab = Math.min(tab, langs.length - 1);
  const activeLang = langs[safeTab].code;

  return (
    <Box sx={{ mb: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
        <Typography variant="body2" sx={{ fontWeight: 500 }}>{label}</Typography>
        <Tabs
          value={safeTab}
          onChange={(_, v) => setTab(v)}
          sx={{ minHeight: 32, '& .MuiTab-root': { minHeight: 32, py: 0.5, px: 1.5, minWidth: 40, fontSize: '0.75rem' } }}
        >
          {langs.map(l => <Tab key={l.code} label={l.label} />)}
        </Tabs>
        <Tooltip title="Auto-translate alle talen (DeepL, HTML-safe)">
          <span>
            <IconButton size="small" onClick={handleTranslate} disabled={translating || (!i18n.en && !i18n.nl)}>
              {translating ? <CircularProgress size={16} /> : <TranslateIcon fontSize="small" />}
            </IconButton>
          </span>
        </Tooltip>
      </Box>
      {/* Eén RichTextField per render — key forceert remount bij taal-switch om TipTap state schoon te houden */}
      <RichTextField
        key={activeLang}
        label={`${label} (${langs[safeTab].label})`}
        value={i18n[activeLang] || ''}
        onChange={v => handleLangChange(activeLang, v)}
        helperText={helperText}
      />
    </Box>
  );
}
