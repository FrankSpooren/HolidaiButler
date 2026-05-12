import { Box, Typography, Divider } from '@mui/material';
import { TranslatableField, SelectField, TextField, SwitchField } from '../fields/index.js';

const VARIANT_OPTIONS = [
  { value: 'inline', label: 'Inline (full width)' },
  { value: 'hero', label: 'Hero (centered, max-w-2xl)' },
  { value: 'header', label: 'Header (compact, max-w-xl)' },
];

const SEARCH_TYPE_OPTIONS = [
  { value: 'pois', label: 'POIs' },
  { value: 'events', label: 'Events' },
  { value: 'articles', label: 'Articles / Blog' },
];

/**
 * SearchEditor — Admin block editor for Search block (VII-E2 A1)
 */
export default function SearchEditor({ data, onChange }) {
  data = data || {};
  const updateField = (field, value) => {
    onChange({ ...data, [field]: value });
  };

  const toggleSearchType = (type) => {
    const current = data.searchTypes || ['pois', 'events', 'articles'];
    const next = current.includes(type)
      ? current.filter(t => t !== type)
      : [...current, type];
    // At least one type must be selected
    if (next.length === 0) return;
    updateField('searchTypes', next);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.05em' }}>
        Search Configuration
      </Typography>

      <TranslatableField
        label="Placeholder text"
        value={data.placeholder || {}}
        onChange={(val) => updateField('placeholder', val)}
        helperText="Text shown in the search input before the user types"
      />

      <SelectField
        label="Variant"
        value={data.variant || 'inline'}
        options={VARIANT_OPTIONS}
        onChange={(val) => updateField('variant', val)}
      />

      <Divider sx={{ my: 1 }} />

      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.05em' }}>
        Search Types
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {SEARCH_TYPE_OPTIONS.map(opt => (
          <SwitchField
            key={opt.value}
            label={opt.label}
            checked={(data.searchTypes || ['pois', 'events', 'articles']).includes(opt.value)}
            onChange={() => toggleSearchType(opt.value)}
          />
        ))}
      </Box>

      <Divider sx={{ my: 1 }} />

      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.05em' }}>
        Behavior
      </Typography>

      <SwitchField
        label="Show typeahead suggestions"
        checked={data.showSuggestions !== false}
        onChange={(val) => updateField('showSuggestions', val)}
      />

      <SwitchField
        label="Show recent searches"
        checked={data.showRecentSearches !== false}
        onChange={(val) => updateField('showRecentSearches', val)}
      />

      <SwitchField
        label="Chatbot fallback (when no results)"
        checked={data.enableChatbotFallback !== false}
        onChange={(val) => updateField('enableChatbotFallback', val)}
      />

      <TextField
        label="Results page URL (optional)"
        value={data.resultPageHref || ''}
        onChange={(val) => updateField('resultPageHref', val)}
        helperText="If set, pressing Enter navigates to this URL with ?q= parameter"
      />
    </Box>
  );
}
