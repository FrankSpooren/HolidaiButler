import { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Box, Typography, Chip, TextField, CircularProgress,
  Alert, Divider, IconButton, Tooltip
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CloseIcon from '@mui/icons-material/Close';
import VerifiedIcon from '@mui/icons-material/Verified';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import client from '../api/client.js';

const LANG_LABELS = { en: 'EN', nl: 'NL', de: 'DE', es: 'ES', fr: 'FR' };

/**
 * AutoFillBasisDialog — Genereert Tab-Basis veld-suggesties via POST /pages/auto-fill-basis.
 *
 * Integratie-first:
 *   - Endpoint: bestaande POST /api/v1/admin-portal/pages/auto-fill-basis (BLOK B backend).
 *   - DeepL bulk-translate gebeurt server-side, geen frontend translate-call nodig.
 *   - Provenance + validation worden getoond via badges, conform ConceptDialog patroon (v4.91+).
 *
 * Props:
 *   - open, onClose
 *   - destinationId (required), pageType, pageTopic (optionele user-hint)
 *   - onAccept(suggestion): callback wanneer reviewer accepteert
 *
 * @version BLOK B (22-05-2026)
 */
export default function AutoFillBasisDialog({ open, onClose, destinationId, pageType = 'general', pageTopic = '', onAccept }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [suggestion, setSuggestion] = useState(null);
  const [localTopic, setLocalTopic] = useState(pageTopic);

  const handleGenerate = async () => {
    if (!destinationId) {
      setError('Geen destination geselecteerd.');
      return;
    }
    setLoading(true);
    setError(null);
    setSuggestion(null);
    try {
      const { data } = await client.post('/pages/auto-fill-basis', {
        destinationId, pageType, pageTopic: localTopic
      });
      if (data?.success && data.data) {
        setSuggestion(data.data);
      } else {
        setError(data?.error?.message || 'Onbekende fout');
      }
    } catch (err) {
      const code = err?.response?.data?.error?.code;
      const msg = err?.response?.data?.error?.message || err.message;
      if (code === 'BRAND_PROFILE_MISSING') {
        setError('Brand profile is leeg. Run eerst "Brand Profile genereren" in Branding-tab.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = () => {
    if (suggestion && onAccept) onAccept(suggestion);
    handleClose();
  };

  const handleClose = () => {
    setSuggestion(null);
    setError(null);
    setLocalTopic(pageTopic);
    onClose();
  };

  const ungroundedEntities = suggestion?.validation?.ungrounded_entities || [];
  const hasWarning = ungroundedEntities.length > 0 || suggestion?.validation?.passed === false;
  const hasSources = suggestion?.has_internal_sources;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AutoAwesomeIcon color="primary" />
          <Typography variant="h6">Auto-fill Tab Basis via merkprofiel</Typography>
        </Box>
        <IconButton onClick={handleClose} size="small"><CloseIcon /></IconButton>
      </DialogTitle>

      <DialogContent dividers>
        {!suggestion && (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              AI genereert slug + titel + SEO-velden in alle ondersteunde talen van deze destinatie, gegrond in het merkprofiel + Knowledge Base + lokale POIs.
            </Typography>
            <TextField
              fullWidth
              size="small"
              label="Pagina onderwerp (optioneel — verfijnt suggesties)"
              value={localTopic}
              onChange={e => setLocalTopic(e.target.value)}
              placeholder="bv. 'Strandkalas in Calpe' of 'Wadlopen op Texel'"
              helperText={`Page type: ${pageType}`}
              sx={{ mb: 2 }}
            />
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          </Box>
        )}

        {suggestion && (
          <Box>
            {/* Badges */}
            <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
              <Tooltip title={`SHA-256: ${suggestion.provenance?.signature?.slice(0, 16)}...`}>
                <Chip size="small" icon={<VerifiedIcon />} label="EU AI Act provenance" color="success" variant="outlined" />
              </Tooltip>
              <Chip size="small" label={`Model: ${suggestion.provenance?.model || '—'}`} variant="outlined" />
              <Chip size="small" label={`Bronnen: ${suggestion.sources_count || 0}`} variant="outlined" />
              {!hasSources && (
                <Tooltip title="Geen interne Knowledge Base bronnen gebruikt — voeg PDFs/URLs toe in Branding voor betere grondering.">
                  <Chip size="small" icon={<WarningAmberIcon />} label="Geen interne bronnen" color="warning" variant="outlined" />
                </Tooltip>
              )}
            </Box>

            {hasWarning && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                  Mogelijke hallucinatie gedetecteerd
                </Typography>
                {ungroundedEntities.length > 0 && (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                    {ungroundedEntities.slice(0, 8).map((ent, i) => (
                      <Chip key={i} size="small" label={ent} color="warning" />
                    ))}
                  </Box>
                )}
                <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
                  Review zorgvuldig vóór accepteren. Hallucination rate: {(suggestion.validation?.hallucination_rate ?? 0).toFixed(2)}
                </Typography>
              </Alert>
            )}

            <Divider sx={{ mb: 2 }} />

            <Typography variant="overline" color="text.secondary">Slug</Typography>
            <Box sx={{ mb: 2, fontFamily: 'monospace', fontSize: '0.875rem', p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
              /{suggestion.slug}
            </Box>

            {(suggestion.supported_languages || []).map(lang => (
              <Box key={lang} sx={{ mb: 2 }}>
                <Typography variant="overline" color="text.secondary">
                  {LANG_LABELS[lang] || lang.toUpperCase()}
                  {lang === suggestion.default_language && (
                    <Chip size="small" label="primair" sx={{ ml: 1, height: 16, fontSize: '0.65rem' }} />
                  )}
                </Typography>
                <Box sx={{ pl: 1, borderLeft: '3px solid', borderColor: 'primary.light' }}>
                  <Typography variant="body2"><strong>Titel:</strong> {suggestion.title?.[lang] || '—'}</Typography>
                  <Typography variant="body2"><strong>SEO titel:</strong> {suggestion.seo_title?.[lang] || '—'}</Typography>
                  <Typography variant="body2"><strong>SEO beschrijving:</strong> {suggestion.seo_description?.[lang] || '—'}</Typography>
                </Box>
              </Box>
            ))}

            {suggestion.og_image_url && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="overline" color="text.secondary">OG Afbeelding</Typography>
                <Typography variant="caption" sx={{ display: 'block', wordBreak: 'break-all' }}>{suggestion.og_image_url}</Typography>
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
            <Button onClick={() => { setSuggestion(null); }} disabled={loading}>Opnieuw genereren</Button>
            <Button onClick={handleAccept} variant="contained" color="primary">
              Accepteer en vul velden
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
