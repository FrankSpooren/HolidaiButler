import { Box, TextField, IconButton, Button, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';

const VARIANT_OPTIONS = [
  { value: 'primary', label: 'Primary' },
  { value: 'secondary', label: 'Secondary' },
  { value: 'outline', label: 'Outline' },
  { value: 'chatbot', label: 'Chatbot Action' }
];

const CHATBOT_ACTIONS = [
  { value: '', label: '(Open chatbot)' },
  { value: 'plan_day', label: 'Plan my day' },
  { value: 'browse_categories', label: 'Browse categories' },
  { value: 'route_planner', label: 'Route planner' },
  { value: 'tip_of_day', label: 'Tip of the Day' },
];

// Map action keys to messages dispatched via CustomEvent to ChatbotWidget
const ACTION_MESSAGES = {
  plan_day: 'Stel een dagprogramma voor me samen op basis van mijn interesses en het weer van vandaag.',
  browse_categories: 'Welke categorieën zijn er? Laat me zoeken op rubriek.',
  route_planner: 'Ik wil een routebeschrijving. Welke bezienswaardigheden kan ik combineren in een route?',
  tip_of_day: '__TIP_VAN_DE_DAG__',
};

export default function ButtonListField({ label, value, onChange, disabled, sx }) {
  const buttons = Array.isArray(value) ? value : [];

  const updateButton = (idx, field, val) => {
    const updated = buttons.map((b, i) => {
      if (i !== idx) return b;
      const btn = { ...b, [field]: val };
      // When switching to chatbot, clear href; when switching away, clear chatbotAction
      if (field === 'variant' && val === 'chatbot') {
        btn.href = '';
      } else if (field === 'variant' && val !== 'chatbot') {
        btn.chatbotAction = undefined;
      }
      // Map chatbot action key to message
      if (field === 'chatbotAction') {
        btn.chatbotAction = ACTION_MESSAGES[val] || '';
      }
      return btn;
    });
    onChange(updated);
  };

  const addButton = () => {
    onChange([...buttons, { label: '', href: '', variant: 'primary' }]);
  };

  const removeButton = (idx) => {
    onChange(buttons.filter((_, i) => i !== idx));
  };

  return (
    <Box sx={{ mb: 2, ...sx }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Box sx={{ fontSize: '0.875rem', fontWeight: 500, color: 'text.secondary' }}>{label || 'Buttons'}</Box>
        <Button size="small" startIcon={<AddIcon />} onClick={addButton} disabled={disabled}>Add</Button>
      </Box>
      {buttons.map((btn, idx) => (
        <Box key={idx} sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <TextField size="small" label="Label" value={btn.label || ''} onChange={e => updateButton(idx, 'label', e.target.value)} disabled={disabled} sx={{ flex: 1, minWidth: 120 }} />
          {btn.variant === 'chatbot' ? (
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>Action</InputLabel>
              <Select
                value={Object.entries(ACTION_MESSAGES).find(([, msg]) => msg === btn.chatbotAction)?.[0] || ''}
                label="Action"
                onChange={e => updateButton(idx, 'chatbotAction', e.target.value)}
                disabled={disabled}
              >
                {CHATBOT_ACTIONS.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
              </Select>
            </FormControl>
          ) : (
            <TextField size="small" label="URL" value={btn.href || ''} onChange={e => updateButton(idx, 'href', e.target.value)} disabled={disabled} sx={{ flex: 1.5, minWidth: 160 }} />
          )}
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <InputLabel>Style</InputLabel>
            <Select value={btn.variant || 'primary'} label="Style" onChange={e => updateButton(idx, 'variant', e.target.value)} disabled={disabled}>
              {VARIANT_OPTIONS.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
            </Select>
          </FormControl>
          <IconButton size="small" onClick={() => removeButton(idx)} disabled={disabled}><DeleteIcon fontSize="small" /></IconButton>
        </Box>
      ))}
    </Box>
  );
}
