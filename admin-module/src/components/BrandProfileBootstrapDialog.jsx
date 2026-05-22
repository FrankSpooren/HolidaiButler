import { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Box, Typography, Chip, CircularProgress,
  Alert, Divider, IconButton, Tooltip, List, ListItem, ListItemText
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CloseIcon from '@mui/icons-material/Close';
import VerifiedIcon from '@mui/icons-material/Verified';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import client from '../api/client.js';

/**
 * BrandProfileBootstrapDialog — Genereert brand_profile JSON via POST /brand-profile/bootstrap.
 *
 * Integratie-first:
 *   - Endpoint: bestaande POST /api/v1/admin-portal/brand-profile/bootstrap (BLOK B backend).
 *   - Save-flow: reviewer accepteert → onAccept(generated) callback → parent slaat op via existing PUT /brand-profile.
 *   - Provenance + validation getoond volgens ConceptDialog patroon (v4.91+).
 *
 * Props:
 *   - open, onClose
 *   - destinationId (required)
 *   - hasExisting (bool): toont waarschuwing "overschrijft bestaand profile" bij true
 *   - onAccept(brandProfileObj): callback wanneer reviewer accepteert
 *
 * @version BLOK B (22-05-2026)
 */
export default function BrandProfileBootstrapDialog({ open, onClose, destinationId, hasExisting = false, onAccept }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [suggestion, setSuggestion] = useState(null);

  const handleGenerate = async () => {
    if (!destinationId) {
      setError('Geen destination geselecteerd.');
      return;
    }
    setLoading(true);
    setError(null);
    setSuggestion(null);
    try {
      const { data } = await client.post('/admin-portal/brand-profile/bootstrap', {
        destinationId,
        forceRegenerate: hasExisting
      });
      if (data?.success && data.data) {
        setSuggestion(data.data);
      } else {
        setError(data?.error?.message || 'Onbekende fout');
      }
    } catch (err) {
      setError(err?.response?.data?.error?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = () => {
    if (suggestion?.generated && onAccept) onAccept(suggestion.generated);
    handleClose();
  };

  const handleClose = () => {
    setSuggestion(null);
    setError(null);
    onClose();
  };

  const generated = suggestion?.generated;
  const ungrounded = suggestion?.validation?.ungrounded_entities || [];
  const hasWarning = ungrounded.length > 0 || suggestion?.validation?.passed === false;
  const hasSources = suggestion?.has_internal_sources;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AutoAwesomeIcon color="primary" />
          <Typography variant="h6">Brand Profile genereren met AI</Typography>
        </Box>
        <IconButton onClick={handleClose} size="small"><CloseIcon /></IconButton>
      </DialogTitle>

      <DialogContent dividers>
        {!suggestion && (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              AI genereert een volledig brand_profile (bedrijfsbeschrijving, USPs, missie, visie, kernwaarden,
              SEO keywords, content goals) op basis van: bestaande Knowledge Base (PDFs/URLs/text), branding payoff
              en tone-of-voice, en de top-30 POIs van deze destinatie.
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              <strong>Tip:</strong> upload eerst relevante documenten (gids, persbericht, website-URL) in de Knowledge
              Base sectie hieronder voor een rijker resultaat. Na generatie kun je elk veld free-form aanpassen.
            </Typography>
            {hasExisting && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                Er is al een brand_profile aanwezig. Bij accepteren wordt dit overschreven.
                Maak eerst een backup als je het wilt behouden.
              </Alert>
            )}
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          </Box>
        )}

        {suggestion && generated && (
          <Box>
            <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
              <Tooltip title={`SHA-256: ${suggestion.provenance?.signature?.slice(0, 16)}...`}>
                <Chip size="small" icon={<VerifiedIcon />} label="EU AI Act provenance" color="success" variant="outlined" />
              </Tooltip>
              <Chip size="small" label={`Model: ${suggestion.provenance?.model || '—'}`} variant="outlined" />
              <Chip size="small" label={`Bronnen: ${suggestion.sources_count || 0}`} variant="outlined" />
              {!hasSources && (
                <Tooltip title="Geen interne Knowledge Base bronnen — voeg PDFs/URLs toe voor betere grondering.">
                  <Chip size="small" icon={<WarningAmberIcon />} label="Geen interne bronnen" color="warning" variant="outlined" />
                </Tooltip>
              )}
            </Box>

            {hasWarning && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>Mogelijke hallucinatie gedetecteerd</Typography>
                {ungrounded.length > 0 && (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                    {ungrounded.slice(0, 10).map((ent, i) => (
                      <Chip key={i} size="small" label={ent} color="warning" />
                    ))}
                  </Box>
                )}
                <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
                  Review en pas aan vóór accepteren. Hallucination rate: {(suggestion.validation?.hallucination_rate ?? 0).toFixed(2)}
                </Typography>
              </Alert>
            )}

            <Divider sx={{ mb: 2 }} />

            <Field label="Industrie" value={generated.industry} />
            <Field label="Bedrijfsbeschrijving" value={generated.company_description} multiline />
            <ArrayField label="USPs" items={generated.usps} />
            <Field label="Missie" value={generated.mission} />
            <Field label="Visie" value={generated.vision} />
            <ArrayField label="Kernwaarden" items={generated.core_values} />
            <ArrayField label="SEO Keywords" items={generated.seo_keywords} />
            {generated.content_goals && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="overline" color="text.secondary">Content Goals</Typography>
                <Box sx={{ pl: 1, borderLeft: '3px solid', borderColor: 'primary.light' }}>
                  <Typography variant="body2">{generated.content_goals.blogs_per_month ?? '—'} blogs/maand</Typography>
                  <Typography variant="body2">{generated.content_goals.posts_per_week ?? '—'} social posts/week</Typography>
                </Box>
              </Box>
            )}

            <Typography variant="caption" color="text.secondary">
              Gegenereerd in {suggestion.elapsed_ms}ms · AI-log #{suggestion.ai_generation_log_id || '—'}
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>Annuleren</Button>
        {!suggestion && (
          <Button onClick={handleGenerate} disabled={loading} variant="contained" startIcon={loading ? <CircularProgress size={16} /> : <AutoAwesomeIcon />}>
            {loading ? 'Genereren...' : 'Genereer met AI'}
          </Button>
        )}
        {suggestion && (
          <>
            <Button onClick={() => setSuggestion(null)} disabled={loading}>Opnieuw genereren</Button>
            <Button onClick={handleAccept} variant="contained" color="primary">
              Accepteer en vul Merk Profiel
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}

function Field({ label, value, multiline }) {
  if (!value) return null;
  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="overline" color="text.secondary">{label}</Typography>
      <Box sx={{ pl: 1, borderLeft: '3px solid', borderColor: 'primary.light' }}>
        <Typography variant="body2" sx={{ whiteSpace: multiline ? 'pre-wrap' : 'normal' }}>{value}</Typography>
      </Box>
    </Box>
  );
}

function ArrayField({ label, items }) {
  if (!Array.isArray(items) || items.length === 0) return null;
  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="overline" color="text.secondary">{label}</Typography>
      <List dense disablePadding sx={{ pl: 1, borderLeft: '3px solid', borderColor: 'primary.light' }}>
        {items.map((it, i) => (
          <ListItem key={i} disablePadding>
            <ListItemText primaryTypographyProps={{ variant: 'body2' }} primary={`• ${it}`} />
          </ListItem>
        ))}
      </List>
    </Box>
  );
}
