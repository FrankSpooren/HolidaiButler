import { useMemo } from 'react';
import { Chip, Tooltip } from '@mui/material';
import LanguageIcon from '@mui/icons-material/Language';
import { useDestination } from './DestinationContext.jsx';

/**
 * LocaleCoverageBadge — toont i18n-completeness van een block-props tree.
 *
 * Walks recursief door props, identificeert i18n-objects (keys subset van
 * SUPPORTED_LOCALES), telt per taal of value gevuld is, retourneert badge
 * met coverage-rate en tooltip met ontbrekende talen.
 *
 * Coverage-state:
 *   - Geen i18n-objects in props -> renders niets (legacy block of geen text-content)
 *   - Alle supported_languages volledig gevuld -> groen 'X/X'
 *   - 1 taal ontbreekt -> oranje 'X/Y' + tooltip met taal-codes
 *   - Meerdere talen ontbreken -> rood + tooltip
 *
 * Wordt geconsumeerd in BlockEditorCard header naast VisibilityBadge.
 *
 * @version BLOK D (22-05-2026)
 */

const SUPPORTED_LOCALES = ['en', 'nl', 'de', 'es', 'fr'];
const DEFAULT_LANGS = ['en', 'nl', 'de', 'es'];

function isI18nObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const keys = Object.keys(value);
  if (keys.length === 0) return false;
  return keys.every(k => SUPPORTED_LOCALES.includes(k));
}

function collectI18nObjects(value, results) {
  if (value === null || value === undefined) return;
  if (Array.isArray(value)) {
    value.forEach(item => collectI18nObjects(item, results));
    return;
  }
  if (typeof value === 'object') {
    if (isI18nObject(value)) {
      results.push(value);
      return;
    }
    Object.values(value).forEach(v => collectI18nObjects(v, results));
  }
}

export default function LocaleCoverageBadge({ props }) {
  const destCtx = useDestination();
  const supportedLanguages = (Array.isArray(destCtx?.supportedLanguages) && destCtx.supportedLanguages.length > 0)
    ? destCtx.supportedLanguages.filter(l => SUPPORTED_LOCALES.includes(l))
    : DEFAULT_LANGS;

  const i18nObjects = useMemo(() => {
    const results = [];
    collectI18nObjects(props || {}, results);
    return results;
  }, [props]);

  const langStats = useMemo(() => {
    const stats = {};
    for (const lang of supportedLanguages) {
      let filled = 0;
      for (const obj of i18nObjects) {
        const v = obj[lang];
        if (v && String(v).trim().length > 0) filled++;
      }
      stats[lang] = filled;
    }
    return stats;
  }, [i18nObjects, supportedLanguages]);

  if (i18nObjects.length === 0) return null;

  const totalFields = i18nObjects.length;
  const missingLangs = supportedLanguages.filter(lang => langStats[lang] < totalFields);
  const completeLangs = supportedLanguages.length - missingLangs.length;
  const allComplete = missingLangs.length === 0;

  let color;
  if (allComplete) color = 'success';
  else if (missingLangs.length === 1) color = 'warning';
  else color = 'error';

  const label = `${completeLangs}/${supportedLanguages.length}`;
  const tooltip = allComplete
    ? `i18n volledig: alle ${supportedLanguages.length} talen ingevuld voor ${totalFields} tekstveld${totalFields === 1 ? '' : 'en'}`
    : `Ontbrekend in: ${missingLangs.map(l => l.toUpperCase()).join(', ')}. ${supportedLanguages.length - missingLangs.length} van ${supportedLanguages.length} talen volledig.`;

  return (
    <Tooltip title={tooltip} arrow>
      <Chip
        icon={<LanguageIcon sx={{ fontSize: '0.85rem !important' }} />}
        label={label}
        size="small"
        color={color}
        variant={allComplete ? 'filled' : 'outlined'}
        sx={{ height: 20, fontSize: '0.65rem', '& .MuiChip-icon': { ml: 0.5 } }}
      />
    </Tooltip>
  );
}
