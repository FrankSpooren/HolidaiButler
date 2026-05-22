import { useState, useEffect } from 'react';
import {
  Box, Typography, Switch, FormControlLabel, Paper, Chip, CircularProgress,
  TextField as MuiTextField, IconButton, Button
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import { SelectField, TextField, TranslatableField, ColorField } from '../fields/index.js';
import { useDestination } from '../DestinationContext.jsx';
import apiClient from '../../../api/client.js';

/**
 * ChatbotWidgetEditor v2 (BLOK E3 — 22-05-2026)
 *
 * Verbeteringen t.o.v. v1:
 *   - Fetch destination chatbot config via GET /admin-portal/chatbot-configs
 *   - Inherit-from-destination toggle (default: inherit aan, override uit)
 *   - Bij override aan: editable name + welcomeMessage (i18n) + color +
 *     quickActions list (per item: label TranslatableField + intent string)
 *   - Live preview area met chat-bubble mockup (name, welcome, kleur)
 *
 * Backend block-data: { chatbotName, welcomeMessage, color, quickActions,
 * position, overrideEnabled } — bij overrideEnabled=false worden de destination
 * config-values gebruikt (resolved server-side in renderer of frontend).
 */

const POSITION_OPTIONS = [
  { value: 'bottom-right', label: 'Bottom Right' },
  { value: 'bottom-left', label: 'Bottom Left' },
];

function QuickActionsEditor({ items, onChange }) {
  const list = Array.isArray(items) ? items : [];
  const updateItem = (idx, patch) => {
    const next = [...list];
    next[idx] = { ...next[idx], ...patch };
    onChange(next);
  };
  const addItem = () => onChange([...list, { label: { en: '', nl: '', de: '', es: '', fr: '' }, intent: '' }]);
  const removeItem = (idx) => onChange(list.filter((_, i) => i !== idx));

  return (
    <Paper variant="outlined" sx={{ p: 1.5, mb: 2 }}>
      <Typography variant="caption" sx={{ display: 'block', mb: 1, color: 'text.secondary', fontWeight: 600 }}>
        Quick actions (snelkeuze-knoppen)
      </Typography>
      {list.map((item, idx) => (
        <Box key={idx} sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'flex-start' }}>
          <Box sx={{ flex: 1 }}>
            <TranslatableField label={`Label #${idx + 1}`} value={item.label} onChange={v => updateItem(idx, { label: v })} />
            <MuiTextField
              size="small"
              fullWidth
              label="Intent / action key"
              value={item.intent || ''}
              onChange={e => updateItem(idx, { intent: e.target.value })}
              helperText="bv. 'restaurants', 'beach_tips', 'help'"
              sx={{ mt: 0.5 }}
            />
          </Box>
          <IconButton size="small" onClick={() => removeItem(idx)} sx={{ mt: 1 }} title="Verwijderen">
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      ))}
      <Button size="small" startIcon={<AddIcon />} onClick={addItem} variant="outlined">
        Quick action toevoegen
      </Button>
    </Paper>
  );
}

function ChatPreview({ name, welcomeMessage, color, locale }) {
  const safeLocale = ['en', 'nl', 'de', 'es', 'fr'].includes(locale) ? locale : 'en';
  const welcome = typeof welcomeMessage === 'string'
    ? welcomeMessage
    : (welcomeMessage?.[safeLocale] || welcomeMessage?.en || welcomeMessage?.nl || '');
  const safeColor = (typeof color === 'string' && /^#?[0-9a-f]{3,8}$/i.test(color))
    ? (color.startsWith('#') ? color : `#${color}`)
    : '#3b82f6';

  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
      <Typography variant="caption" sx={{ display: 'block', mb: 1, color: 'text.secondary', fontWeight: 600 }}>
        Preview (taal: {safeLocale.toUpperCase()})
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
        <Box sx={{
          width: 36, height: 36, borderRadius: '50%', bgcolor: safeColor,
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexShrink: 0
        }}>
          <SmartToyIcon fontSize="small" />
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography variant="caption" sx={{ display: 'block', fontWeight: 600 }}>
            {name || '(geen chatbot naam ingesteld)'}
          </Typography>
          <Box sx={{
            mt: 0.5, p: 1.2, bgcolor: 'background.paper', borderRadius: 2,
            border: '1px solid', borderColor: 'divider', display: 'inline-block',
            maxWidth: '90%',
          }}>
            <Typography variant="body2">
              {welcome || '(geen welkomstboodschap)'}
            </Typography>
          </Box>
        </Box>
      </Box>
    </Paper>
  );
}

export default function ChatbotWidgetEditor({ block, onChange }) {
  const props = block.props || {};
  const update = (key, val) => onChange({ ...props, [key]: val });
  const { destinationId, defaultLanguage = 'en' } = useDestination();
  const [destConfig, setDestConfig] = useState(null);
  const [loading, setLoading] = useState(false);

  const overrideEnabled = props.overrideEnabled === true;

  useEffect(() => {
    if (!destinationId) { setDestConfig(null); return; }
    let cancelled = false;
    setLoading(true);
    apiClient.get('/chatbot-configs', { params: { destinationId } })
      .then(r => { if (!cancelled) setDestConfig(r.data?.data?.chatbot || null); })
      .catch(() => { if (!cancelled) setDestConfig(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [destinationId]);

  // Effective values: override OR inherit from destination
  const effectiveName = overrideEnabled ? props.chatbotName : (destConfig?.name || props.chatbotName);
  const effectiveWelcome = overrideEnabled ? props.welcomeMessage : (destConfig?.welcomeMessage || props.welcomeMessage);
  const effectiveColor = overrideEnabled ? props.color : (destConfig?.color || props.color);

  return (
    <>
      {loading && <Box sx={{ py: 1, textAlign: 'center' }}><CircularProgress size={16} /></Box>}

      {destConfig && (
        <Paper variant="outlined" sx={{ p: 1.5, mb: 2, bgcolor: 'info.50', borderColor: 'info.300' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Typography variant="caption" sx={{ fontWeight: 600 }}>Destination chatbot config:</Typography>
            <Chip size="small" label={destConfig.name || '(geen naam)'} color="primary" variant="outlined" />
          </Box>
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={overrideEnabled}
                onChange={e => update('overrideEnabled', e.target.checked)}
              />
            }
            label={<Typography variant="body2">Override deze block met custom config (i.p.v. destination-default)</Typography>}
          />
        </Paper>
      )}

      {overrideEnabled && (
        <>
          <TranslatableField label="Chatbot Name" value={props.chatbotName} onChange={v => update('chatbotName', v)} helperText="bv. HoliBot, Tessa, Wijze Warre" />
          <TranslatableField label="Welcome Message" value={props.welcomeMessage} onChange={v => update('welcomeMessage', v)} multiline rows={2} helperText="Eerste boodschap die chatbot toont" />
          <ColorField label="Avatar / accent color" value={props.color || '#3b82f6'} onChange={v => update('color', v)} />
          <QuickActionsEditor items={props.quickActions} onChange={v => update('quickActions', v)} />
        </>
      )}

      <ChatPreview
        name={typeof effectiveName === 'string' ? effectiveName : (effectiveName?.[defaultLanguage] || effectiveName?.en || effectiveName?.nl)}
        welcomeMessage={effectiveWelcome}
        color={effectiveColor}
        locale={defaultLanguage}
      />

      <SelectField label="Position" value={props.position || 'bottom-right'} onChange={v => update('position', v)} options={POSITION_OPTIONS} />
    </>
  );
}
