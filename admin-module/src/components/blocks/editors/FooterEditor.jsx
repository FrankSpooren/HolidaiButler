import { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Switch, FormControlLabel, IconButton, Button, Divider,
  Chip, CircularProgress, Alert
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { SelectField, TextField, TranslatableField, ColorField, SwitchField } from '../fields/index.js';
import { useDestination } from '../DestinationContext.jsx';
import apiClient from '../../../api/client.js';

/**
 * FooterEditor (BLOK F2 — 22-05-2026)
 *
 * Nieuw block type met auto-fill uit destinations.branding.footer +
 * .socialLinks + .contactEmail + .payoff + .navicon. Per-block override
 * mogelijk via toggle.
 *
 * Output: block.props = { useDestinationDefault, columns, copyright (i18n),
 * payoff (i18n), showSocial, showNewsletter, accentColor, contactEmail,
 * contactPhone, socialLinks }
 *
 * Runtime Footer.tsx leest props + destination.branding fallback.
 */

const COLUMN_TYPE_OPTIONS = [
  { value: 'brand', label: 'Brand block (logo + payoff)' },
  { value: 'navigation', label: 'Navigation links' },
  { value: 'contact', label: 'Contact info' },
  { value: 'social', label: 'Social media icons' },
  { value: 'newsletter', label: 'Newsletter signup' },
  { value: 'custom', label: 'Custom rich-text' },
];

function ColumnsEditor({ columns, onChange }) {
  const list = Array.isArray(columns) ? columns : [];
  const update = (idx, patch) => {
    const next = [...list];
    next[idx] = { ...next[idx], ...patch };
    onChange(next);
  };
  const add = () => onChange([...list, { type: 'navigation', title: { en: '', nl: '', de: '', es: '', fr: '' } }]);
  const remove = (idx) => onChange(list.filter((_, i) => i !== idx));

  return (
    <Paper variant="outlined" sx={{ p: 1.5, mb: 2 }}>
      <Typography variant="caption" sx={{ display: 'block', mb: 1, fontWeight: 600, color: 'text.secondary' }}>
        Footer kolommen
      </Typography>
      {list.map((col, idx) => (
        <Box key={idx} sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'flex-start' }}>
          <Box sx={{ flex: 1 }}>
            <SelectField label={`Kolom ${idx + 1} type`} value={col.type || 'navigation'} options={COLUMN_TYPE_OPTIONS} onChange={v => update(idx, { type: v })} />
            <TranslatableField label="Kolom titel" value={col.title} onChange={v => update(idx, { title: v })} />
          </Box>
          <IconButton size="small" onClick={() => remove(idx)} sx={{ mt: 1 }}><DeleteIcon fontSize="small" /></IconButton>
        </Box>
      ))}
      <Button size="small" startIcon={<AddIcon />} onClick={add} variant="outlined">Kolom toevoegen</Button>
    </Paper>
  );
}

function FooterPreview({ data, brandingDefaults, defaultLanguage }) {
  const effective = data.useDestinationDefault !== false
    ? brandingDefaults
    : data;
  const safeLocale = defaultLanguage || 'en';

  const copyright = typeof effective.copyright === 'string'
    ? effective.copyright
    : effective.copyright?.[safeLocale] || effective.copyright?.en || `© ${new Date().getFullYear()}`;
  const payoff = typeof effective.payoff === 'string'
    ? effective.payoff
    : effective.payoff?.[safeLocale] || effective.payoff?.en || '';

  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
      <Typography variant="caption" sx={{ display: 'block', mb: 1, fontWeight: 600 }}>
        Preview {data.useDestinationDefault !== false ? '(merkprofiel-default)' : '(custom override)'}
      </Typography>
      {payoff && <Typography variant="body2" sx={{ fontStyle: 'italic', mb: 1 }}>{payoff}</Typography>}
      {Array.isArray(effective.columns) && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
          {effective.columns.map((c, i) => (
            <Chip key={i} size="small" label={`${c.type}: ${typeof c.title === 'string' ? c.title : c.title?.[safeLocale] || c.title?.en || ''}`} variant="outlined" />
          ))}
        </Box>
      )}
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
        {effective.showSocial !== false && Array.isArray(brandingDefaults?.socialLinks) && brandingDefaults.socialLinks.length > 0 && (
          <Chip size="small" label={`${brandingDefaults.socialLinks.length} social links`} />
        )}
        {effective.showNewsletter && <Chip size="small" label="Newsletter" color="primary" variant="outlined" />}
        {effective.contactEmail && <Chip size="small" label={effective.contactEmail} />}
      </Box>
      <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'text.secondary' }}>{copyright}</Typography>
    </Paper>
  );
}

export default function FooterEditor({ block, onChange }) {
  const props = block.props || {};
  const update = (key, val) => onChange({ ...props, [key]: val });
  const { destinationId, destinationName, defaultLanguage } = useDestination();
  const [destBranding, setDestBranding] = useState(null);
  const [loading, setLoading] = useState(false);
  const overrideEnabled = props.useDestinationDefault === false;

  useEffect(() => {
    if (!destinationId) return;
    let cancelled = false;
    setLoading(true);
    apiClient.get('/settings/branding')
      .then(r => {
        if (cancelled) return;
        const list = r.data?.data || r.data || [];
        const dest = Array.isArray(list) ? list.find(d => Number(d.id) === Number(destinationId)) : null;
        setDestBranding(dest?.branding || null);
      })
      .catch(() => { if (!cancelled) setDestBranding(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [destinationId]);

  const brandingDefaults = destBranding ? {
    columns: destBranding.footer?.columns || [],
    copyright: destBranding.footer?.copyright || `© ${new Date().getFullYear()} ${destinationName || ''}`,
    payoff: destBranding.payoff || '',
    showSocial: destBranding.footer?.showSocial !== false,
    showNewsletter: destBranding.footer?.showNewsletter || false,
    socialLinks: destBranding.socialLinks || [],
    contactEmail: destBranding.contactEmail || null,
  } : null;

  const handleAutoFillFromBranding = () => {
    if (!brandingDefaults) return;
    onChange({
      ...props,
      useDestinationDefault: false,
      columns: brandingDefaults.columns,
      copyright: typeof brandingDefaults.copyright === 'string'
        ? { en: brandingDefaults.copyright, nl: brandingDefaults.copyright, de: '', es: '', fr: '' }
        : brandingDefaults.copyright,
      payoff: typeof brandingDefaults.payoff === 'string'
        ? { en: brandingDefaults.payoff, nl: brandingDefaults.payoff, de: '', es: '', fr: '' }
        : brandingDefaults.payoff,
      showSocial: brandingDefaults.showSocial,
      showNewsletter: brandingDefaults.showNewsletter,
      contactEmail: brandingDefaults.contactEmail,
    });
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.05em' }}>
        Footer
      </Typography>

      {loading && <CircularProgress size={16} />}

      {brandingDefaults && !loading && (
        <Alert severity="info" sx={{ mb: 1 }}
          action={
            <Button size="small" variant="contained" startIcon={<AutoAwesomeIcon fontSize="small" />} onClick={handleAutoFillFromBranding}>
              Vul uit merkprofiel
            </Button>
          }
        >
          <Typography variant="body2">
            {destinationName} merkprofiel: {brandingDefaults.columns?.length || 0} kolommen,
            {' '}{brandingDefaults.socialLinks.length} social-links,
            {' '}payoff {brandingDefaults.payoff ? 'aanwezig' : 'ontbreekt'}.
          </Typography>
        </Alert>
      )}

      <FormControlLabel
        control={
          <Switch
            checked={overrideEnabled}
            onChange={e => update('useDestinationDefault', !e.target.checked)}
          />
        }
        label={<Typography variant="body2">Custom override (i.p.v. destination-default uit Branding)</Typography>}
      />

      <FooterPreview data={props} brandingDefaults={brandingDefaults} defaultLanguage={defaultLanguage} />

      {overrideEnabled && (
        <>
          <Divider />
          <ColumnsEditor columns={props.columns} onChange={v => update('columns', v)} />
          <TranslatableField label="Payoff / slogan" value={props.payoff} onChange={v => update('payoff', v)} helperText="Korte tag-line onder logo" />
          <TranslatableField label="Copyright" value={props.copyright} onChange={v => update('copyright', v)} helperText="bv. © 2026 Brand Name" />
          <TextField label="Contact email" value={props.contactEmail || ''} onChange={v => update('contactEmail', v)} />
          <TextField label="Contact phone" value={props.contactPhone || ''} onChange={v => update('contactPhone', v)} />
          <SwitchField label="Show social media icons" value={props.showSocial !== false} onChange={v => update('showSocial', v)} />
          <SwitchField label="Show newsletter signup" value={props.showNewsletter || false} onChange={v => update('showNewsletter', v)} />
          <ColorField label="Accent color (override branding)" value={props.accentColor || ''} onChange={v => update('accentColor', v)} />
        </>
      )}
    </Box>
  );
}
