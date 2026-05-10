import { Box, Typography, Divider } from '@mui/material';
import { SelectField, TextField, SwitchField } from '../fields/index.js';

const LAYOUT_OPTIONS = [
  { value: 'auto', label: 'Auto (responsive)' },
  { value: 'horizontal', label: 'Horizontal' },
  { value: 'vertical', label: 'Vertical (stacked)' },
];

const FILTER_TYPES = [
  { value: 'category', label: 'Category chips' },
  { value: 'rating', label: 'Rating filter' },
  { value: 'date_preset', label: 'Date preset (events)' },
  { value: 'sort', label: 'Sort options' },
];

/**
 * FilterBarEditor — Admin block editor for Filter Bar block (VII-E2 A2)
 */
export default function FilterBarEditor({ data, onChange }) {
  const updateField = (field, value) => {
    onChange({ ...data, [field]: value });
  };

  const toggleFilter = (filterType) => {
    const current = data.filters || ['category', 'rating', 'date_preset', 'sort'];
    const next = current.includes(filterType)
      ? current.filter(f => f !== filterType)
      : [...current, filterType];
    if (next.length === 0) return;
    updateField('filters', next);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.05em' }}>
        Filter Bar Configuration
      </Typography>

      <TextField
        label="Title (optional)"
        value={data.title || ''}
        onChange={(val) => updateField('title', val)}
        helperText="Shown above the filter chips"
      />

      <SelectField
        label="Layout"
        value={data.layout || 'auto'}
        options={LAYOUT_OPTIONS}
        onChange={(val) => updateField('layout', val)}
      />

      <Divider sx={{ my: 1 }} />

      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.05em' }}>
        Enabled Filters
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {FILTER_TYPES.map(opt => (
          <SwitchField
            key={opt.value}
            label={opt.label}
            checked={(data.filters || ['category', 'rating', 'date_preset', 'sort']).includes(opt.value)}
            onChange={() => toggleFilter(opt.value)}
          />
        ))}
      </Box>

      <Divider sx={{ my: 1 }} />

      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.05em' }}>
        Behavior
      </Typography>

      <SwitchField
        label="Show reset button"
        checked={data.showResetButton !== false}
        onChange={(val) => updateField('showResetButton', val)}
      />

      <SwitchField
        label="Show active filter count"
        checked={data.showActiveCount !== false}
        onChange={(val) => updateField('showActiveCount', val)}
      />

      <SwitchField
        label="Collapsible on mobile"
        checked={data.collapsibleOnMobile !== false}
        onChange={(val) => updateField('collapsibleOnMobile', val)}
      />

      <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1, fontSize: '0.75rem' }}>
        Place this block above a POI Grid or Event Calendar to control their filters.
        Filters are shared via page context — no manual linking needed.
      </Typography>
    </Box>
  );
}
