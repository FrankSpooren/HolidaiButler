import { useState } from 'react';
import { Box, TextField, IconButton, Button, Select, MenuItem, FormControl, InputLabel, Collapse, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';

const VARIANT_OPTIONS = [
  { value: 'primary', label: 'Primary' },
  { value: 'secondary', label: 'Secondary' },
  { value: 'outline', label: 'Outline' },
  { value: 'chatbot', label: 'Chatbot Action' }
];

const BUTTON_SIZE_OPTIONS = [
  { value: '', label: 'Default' },
  { value: 'sm', label: 'Small' },
  { value: 'md', label: 'Medium' },
  { value: 'lg', label: 'Large' }
];

const BUTTON_RADIUS_OPTIONS = [
  { value: '', label: 'Default' },
  { value: 'none', label: 'None (0px)' },
  { value: 'sm', label: 'Small (4px)' },
  { value: 'md', label: 'Medium (8px)' },
  { value: 'lg', label: 'Large (16px)' },
  { value: 'full', label: 'Pill' }
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
  const [expandedStyle, setExpandedStyle] = useState({});

  const toggleStyle = (idx) => setExpandedStyle(s => ({ ...s, [idx]: !s[idx] }));

  const updateButton = (idx, field, val) => {
    const updated = buttons.map((b, i) => {
      if (i !== idx) return b;
      const btn = { ...b, [field]: val };
      if (field === 'variant' && val === 'chatbot') {
        btn.href = '';
      } else if (field === 'variant' && val !== 'chatbot') {
        btn.chatbotAction = undefined;
      }
      if (field === 'chatbotAction') {
        btn.chatbotAction = ACTION_MESSAGES[val] || '';
      }
      return btn;
    });
    onChange(updated);
  };

  const updateButtonStyle = (idx, field, val) => {
    const updated = buttons.map((b, i) => {
      if (i !== idx) return b;
      return { ...b, buttonStyle: { ...(b.buttonStyle || {}), [field]: val } };
    });
    onChange(updated);
  };

  const addButton = () => {
    onChange([...buttons, { label: '', href: '', variant: 'primary' }]);
  };

  const removeButton = (idx) => {
    onChange(buttons.filter((_, i) => i !== idx));
    setExpandedStyle(s => { const n = { ...s }; delete n[idx]; return n; });
  };

  return (
    <Box sx={{ mb: 2, ...sx }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Box sx={{ fontSize: '0.875rem', fontWeight: 500, color: 'text.secondary' }}>{label || 'Buttons'}</Box>
        <Button size="small" startIcon={<AddIcon />} onClick={addButton} disabled={disabled}>Add</Button>
      </Box>
      {buttons.map((btn, idx) => {
        const bs = btn.buttonStyle || {};
        return (
          <Box key={idx} sx={{ mb: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1 }}>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', flexWrap: 'wrap' }}>
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

            {/* Styling toggle */}
            <Box
              onClick={() => toggleStyle(idx)}
              sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer', mt: 0.5, color: 'text.secondary', '&:hover': { color: 'text.primary' } }}
            >
              {expandedStyle[idx] ? <ExpandLessIcon sx={{ fontSize: 16 }} /> : <ExpandMoreIcon sx={{ fontSize: 16 }} />}
              <Typography variant="caption" sx={{ ml: 0.5 }}>Button Styling</Typography>
            </Box>
            <Collapse in={!!expandedStyle[idx]}>
              <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  {/* Background Color */}
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" color="text.secondary">Background</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Box sx={{ width: 24, height: 24, borderRadius: 0.5, border: '1px solid', borderColor: 'divider', bgcolor: bs.bgColor || '#ccc', cursor: 'pointer', flexShrink: 0 }} component="label">
                        <input type="color" value={bs.bgColor || '#666666'} onChange={e => updateButtonStyle(idx, 'bgColor', e.target.value)} style={{ opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }} />
                      </Box>
                      <TextField size="small" value={bs.bgColor || ''} onChange={e => updateButtonStyle(idx, 'bgColor', e.target.value)} placeholder="Auto" sx={{ flex: 1 }} InputProps={{ sx: { fontSize: '0.75rem', height: 28 } }} />
                    </Box>
                  </Box>
                  {/* Text Color */}
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" color="text.secondary">Text</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Box sx={{ width: 24, height: 24, borderRadius: 0.5, border: '1px solid', borderColor: 'divider', bgcolor: bs.textColor || '#fff', cursor: 'pointer', flexShrink: 0 }} component="label">
                        <input type="color" value={bs.textColor || '#ffffff'} onChange={e => updateButtonStyle(idx, 'textColor', e.target.value)} style={{ opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }} />
                      </Box>
                      <TextField size="small" value={bs.textColor || ''} onChange={e => updateButtonStyle(idx, 'textColor', e.target.value)} placeholder="Auto" sx={{ flex: 1 }} InputProps={{ sx: { fontSize: '0.75rem', height: 28 } }} />
                    </Box>
                  </Box>
                  {/* Border Color */}
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" color="text.secondary">Border</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Box sx={{ width: 24, height: 24, borderRadius: 0.5, border: '1px solid', borderColor: 'divider', bgcolor: bs.borderColor || 'transparent', cursor: 'pointer', flexShrink: 0 }} component="label">
                        <input type="color" value={bs.borderColor || '#666666'} onChange={e => updateButtonStyle(idx, 'borderColor', e.target.value)} style={{ opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }} />
                      </Box>
                      <TextField size="small" value={bs.borderColor || ''} onChange={e => updateButtonStyle(idx, 'borderColor', e.target.value)} placeholder="None" sx={{ flex: 1 }} InputProps={{ sx: { fontSize: '0.75rem', height: 28 } }} />
                    </Box>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <FormControl size="small" sx={{ flex: 1 }}>
                    <InputLabel>Size</InputLabel>
                    <Select label="Size" value={bs.size || ''} onChange={e => updateButtonStyle(idx, 'size', e.target.value)}>
                      {BUTTON_SIZE_OPTIONS.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
                    </Select>
                  </FormControl>
                  <FormControl size="small" sx={{ flex: 1 }}>
                    <InputLabel>Corners</InputLabel>
                    <Select label="Corners" value={bs.borderRadius || ''} onChange={e => updateButtonStyle(idx, 'borderRadius', e.target.value)}>
                      {BUTTON_RADIUS_OPTIONS.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Box>
                {/* Preview */}
                <Box sx={{ mt: 0.5 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>Preview</Typography>
                  <Box
                    component="span"
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      px: bs.size === 'lg' ? 3 : bs.size === 'sm' ? 1 : 2,
                      py: bs.size === 'lg' ? 1.5 : bs.size === 'sm' ? 0.5 : 1,
                      fontSize: bs.size === 'lg' ? '1rem' : bs.size === 'sm' ? '0.75rem' : '0.875rem',
                      fontWeight: 500,
                      bgcolor: bs.bgColor || (btn.variant === 'outline' ? 'transparent' : 'primary.main'),
                      color: bs.textColor || '#fff',
                      border: bs.borderColor ? `2px solid ${bs.borderColor}` : (btn.variant === 'outline' ? '2px solid' : 'none'),
                      borderColor: bs.borderColor || 'primary.main',
                      borderRadius: bs.borderRadius === 'full' ? '9999px' : bs.borderRadius === 'lg' ? '16px' : bs.borderRadius === 'md' ? '8px' : bs.borderRadius === 'sm' ? '4px' : bs.borderRadius === 'none' ? '0' : '8px',
                    }}
                  >
                    {btn.label || 'Button'}
                  </Box>
                </Box>
              </Box>
            </Collapse>
          </Box>
        );
      })}
    </Box>
  );
}
