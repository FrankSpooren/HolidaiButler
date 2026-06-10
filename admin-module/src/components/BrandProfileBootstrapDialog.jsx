import { useState, useMemo, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Box, Typography, Chip, CircularProgress, LinearProgress,
  Alert, AlertTitle, Divider, IconButton, Tooltip, List, ListItem, ListItemText
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CloseIcon from '@mui/icons-material/Close';
import VerifiedIcon from '@mui/icons-material/Verified';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import client from '../api/client.js';

/**
 * BrandProfileBootstrapDialog v3 — AI Merkprofiel generator met progress-UX.
 *
 * v3 wijzigingen (22-05-2026 — Frank UX feedback):
 *   - Progress-stages tijdens AI-call (animeert door bekende fases ipv stille spinner)
 *   - 180s timeout (was default 60s — onvoldoende voor enterprise validation
 *     + auto-retry-loop bij hallucinatie-detectie)
 *
 * 4-state UX (v2 behouden):
 *   - A: Profiel leeg + geen bronnen           → adviseer eerst content toevoegen
 *   - B: Profiel leeg + bronnen aanwezig       → "Genereer met AI" (mode=full)
 *   - C: Profiel gedeeltelijk + bronnen aanw.  → "Vul aan met AI" (mode=fill-missing)
 *   - D: Profiel volledig + bronnen aanw.      → "Hergenereer met AI" (mode=full + forceRegenerate)
 */

const BP_GENERATED_KEYS = ['company_description', 'industry', 'usps', 'mission', 'vision', 'core_values', 'seo_keywords', 'content_goals'];

const AI_TIMEOUT_MS = 180_000;

const PROGRESS_STAGES = [
  { at: 0,    label: 'Knowledge Base bronnen ophalen...',        pct: 5 },
  { at: 3,    label: 'POIs en branding context verzamelen...',   pct: 15 },
  { at: 8,    label: 'Mistral AI genereert merkprofiel...',      pct: 35 },
  { at: 25,   label: 'Validatie: per-zin grondingscontrole...',  pct: 60 },
  { at: 45,   label: 'Eventuele retries bij hallucinatie-detectie...', pct: 75 },
  { at: 70,   label: 'EU AI Act provenance signature berekenen...', pct: 88 },
  { at: 90,   label: 'Bijna klaar — laatste validatie...',       pct: 95 },
  { at: 120,  label: 'Duurt langer dan verwacht — bronnen-rijkheid checken...', pct: 97 }
];

function isFieldEmpty(value) {
  if (value === null || value === undefined) return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return String(value).trim().length === 0;
}

function detectState({ currentBp, knowledgeCount, poiCount, hasBranding }) {
  const filledFields = BP_GENERATED_KEYS.filter(k => !isFieldEmpty(currentBp?.[k]));
  const hasData = (knowledgeCount > 0) || (poiCount > 0) || hasBranding;
  if (filledFields.length === 0 && !hasData) return { code: 'A', filled: 0, missing: BP_GENERATED_KEYS.length };
  if (filledFields.length === 0 && hasData) return { code: 'B', filled: 0, missing: BP_GENERATED_KEYS.length };
  if (filledFields.length === BP_GENERATED_KEYS.length) return { code: 'D', filled: BP_GENERATED_KEYS.length, missing: 0 };
  return { code: 'C', filled: filledFields.length, missing: BP_GENERATED_KEYS.length - filledFields.length };
}

const STATE_CONFIG = {
  A: { severity: 'warning', titleAlert: 'Eerst content toevoegen',
    intro: 'Het merkprofiel is leeg en er zijn nog geen bronnen om uit te putten (geen Knowledge Base items, geen POIs, geen branding payoff/tone-of-voice). AI-generatie zou alleen generiek resultaat opleveren.\n\nWat te doen: upload eerst documenten (PDFs, persberichten, brochures of website-URLs) in Knowledge Base hieronder, vul Branding (payoff + tone of voice) en voeg POIs toe. Daarna kan AI een gegrond merkprofiel maken.',
    buttonLabel: 'Eerst content toevoegen', buttonDisabled: true, mode: null },
  B: { severity: 'info', titleAlert: 'Klaar voor AI-generatie',
    intro: 'Het merkprofiel is nog leeg. AI kan een eerste opzet maken op basis van beschikbare bronnen. Mistral AI genereert via gevalideerde RAG met EU AI Act provenance + per-zin grondingscontrole.\n\nDoorlooptijd: 30-120 seconden afhankelijk van bronnen-omvang en eventuele auto-retries bij hallucinatie-detectie. Na generatie verschijnt een preview met provenance-handtekening en waarschuwing bij ongegronde entiteiten. Controleer elk veld op feitelijke juistheid vóór opslaan.',
    buttonLabel: 'Genereer met AI', buttonDisabled: false, mode: 'full' },
  C: { severity: 'info', titleAlert: 'Aanvullen met AI',
    intro: 'Sommige velden zijn al ingevuld. AI vult alléén de ontbrekende velden aan op basis van beschikbare bronnen — bestaande inhoud blijft volledig behouden.\n\nDoorlooptijd: 20-90 seconden. Mistral AI gebruikt de huidige velden als context om consistente toon te behouden. Controleer alle nieuwe AI-output op feitelijke juistheid vóór opslaan.',
    buttonLabel: 'Vul aan met AI', buttonDisabled: false, mode: 'fill-missing' },
  D: { severity: 'success', titleAlert: 'Merkprofiel is compleet',
    intro: 'Alle 8 brand_profile velden zijn gevuld. AI kan op verzoek alternatieven genereren — bestaande inhoud wordt VOLLEDIG overschreven na akkoord.\n\nDoorlooptijd: 30-120 seconden. Maak eerst een backup van de huidige content als je deze wilt behouden. Controleer alle AI-output op feitelijke juistheid vóór opslaan.',
    buttonLabel: 'Hergenereer met AI (overschrijft)', buttonDisabled: false, mode: 'full', forceRegenerate: true }
};

function ProgressStage({ secondsElapsed }) {
  const current = useMemo(() => {
    let active = PROGRESS_STAGES[0];
    for (const s of PROGRESS_STAGES) {
      if (secondsElapsed >= s.at) active = s;
    }
    return active;
  }, [secondsElapsed]);
  return (
    <Box sx={{ mb: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CircularProgress size={16} />
          <Typography variant="body2" sx={{ fontWeight: 500 }}>{current.label}</Typography>
        </Box>
        <Typography variant="caption" color="text.secondary">
          {secondsElapsed}s · max 180s
        </Typography>
      </Box>
      <LinearProgress variant="determinate" value={current.pct} sx={{ height: 6, borderRadius: 1 }} />
    </Box>
  );
}

export default function BrandProfileBootstrapDialog({
  open, onClose, destinationId, onAccept,
  currentBp = {}, knowledgeCount = 0, poiCount = 0, hasBranding = false
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [suggestion, setSuggestion] = useState(null);
  const [secondsElapsed, setSecondsElapsed] = useState(0);

  useEffect(() => {
    if (!loading) { setSecondsElapsed(0); return; }
    const t = setInterval(() => setSecondsElapsed(s => s + 1), 1000);
    return () => clearInterval(t);
  }, [loading]);

  const state = useMemo(
    () => detectState({ currentBp, knowledgeCount, poiCount, hasBranding }),
    [currentBp, knowledgeCount, poiCount, hasBranding]
  );
  const config = STATE_CONFIG[state.code];

  const handleGenerate = async () => {
    if (config.buttonDisabled) return;
    if (!destinationId) { setError('Geen destination geselecteerd.'); return; }
    setLoading(true);
    setError(null);
    setSuggestion(null);
    try {
      const { data } = await client.post('/brand-profile/bootstrap', {
        destinationId,
        mode: config.mode,
        forceRegenerate: !!config.forceRegenerate
      }, { timeout: AI_TIMEOUT_MS });
      if (data?.success && data.data) {
        setSuggestion(data.data);
      } else {
        setError(data?.error?.message || 'Onbekende fout');
      }
    } catch (err) {
      if (err?.code === 'ECONNABORTED' || /timeout/i.test(err?.message || '')) {
        setError(`Time-out na ${AI_TIMEOUT_MS / 1000}s. Mogelijke oorzaken: heel weinig Knowledge bronnen + veel retries, of trage Mistral respons. Probeer opnieuw of voeg meer bronnen toe vóór generatie.`);
      } else {
        setError(err?.response?.data?.error?.message || err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = () => {
    if (suggestion?.generated && onAccept) onAccept(suggestion.generated, suggestion);
    handleClose();
  };

  const handleClose = () => {
    setSuggestion(null);
    setError(null);
    onClose();
  };

  const generated = suggestion?.generated;
  const aiFields = suggestion?.ai_generated_fields || [];
  const ungrounded = suggestion?.validation?.ungrounded_entities || [];
  const hasWarning = ungrounded.length > 0 || suggestion?.validation?.passed === false;
  const hasSources = suggestion?.has_internal_sources;
  const attempts = suggestion?.validation?.attempts ?? 1;

  return (
    <Dialog open={open} onClose={loading ? undefined : handleClose} maxWidth="md" fullWidth disableEscapeKeyDown={loading}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AutoAwesomeIcon color="primary" />
          <Typography variant="h6">AI Merkprofiel</Typography>
        </Box>
        <IconButton onClick={handleClose} size="small" disabled={loading}><CloseIcon /></IconButton>
      </DialogTitle>

      <DialogContent dividers>
        {loading && <ProgressStage secondsElapsed={secondsElapsed} />}

        {!loading && !suggestion && (
          <Box>
            <Alert severity={config.severity} sx={{ mb: 2 }} icon={config.severity === 'warning' ? <WarningAmberIcon /> : <InfoOutlinedIcon />}>
              <AlertTitle>{config.titleAlert}</AlertTitle>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{config.intro}</Typography>
            </Alert>

            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
              <Chip size="small" label={`${state.filled}/${BP_GENERATED_KEYS.length} velden gevuld`} color={state.filled === 0 ? 'default' : 'primary'} variant="outlined" />
              <Chip size="small" label={`Knowledge: ${knowledgeCount} bron${knowledgeCount === 1 ? '' : 'nen'}`} color={knowledgeCount > 0 ? 'success' : 'default'} variant="outlined" />
              <Chip size="small" label={`POIs: ${poiCount}`} color={poiCount > 0 ? 'success' : 'default'} variant="outlined" />
              <Chip size="small" label={`Branding payoff: ${hasBranding ? 'aanwezig' : 'ontbreekt'}`} color={hasBranding ? 'success' : 'default'} variant="outlined" />
            </Box>

            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              <strong>Disclaimer:</strong> AI-gegenereerde content. Controleer elk veld op feitelijke juistheid vóór opslaan. EU AI Act provenance signature beschikbaar in de preview.
            </Typography>

            {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
          </Box>
        )}

        {!loading && suggestion && generated && (
          <Box>
            <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
              <Tooltip title={`SHA-256: ${suggestion.provenance?.signature?.slice(0, 16)}...`}>
                <Chip size="small" icon={<VerifiedIcon />} label="EU AI Act provenance" color="success" variant="outlined" />
              </Tooltip>
              <Chip size="small" label={`Model: ${suggestion.provenance?.model || '—'}`} variant="outlined" />
              <Chip size="small" label={`Bronnen: ${suggestion.sources_count || 0}`} variant="outlined" />
              <Chip size="small" label={`Per-zin gecheckt: ${suggestion.validation?.per_sentence_checked ? 'ja' : 'nee'}`} variant="outlined" color={suggestion.validation?.per_sentence_checked ? 'success' : 'default'} />
              {attempts > 1 && <Chip size="small" label={`AI retries: ${attempts - 1}`} variant="outlined" color="warning" />}
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

            {suggestion.mode === 'fill-missing' && (
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  AI heeft alléén deze ontbrekende velden gegenereerd: <strong>{aiFields.join(', ')}</strong>. Bestaande velden in jouw merkprofiel zijn ongewijzigd.
                </Typography>
              </Alert>
            )}

            <Divider sx={{ mb: 2 }} />

            <Field label="Industrie" value={generated.industry} isNew={aiFields.includes('industry')} />
            <Field label="Bedrijfsbeschrijving" value={generated.company_description} multiline isNew={aiFields.includes('company_description')} />
            <ArrayField label="USPs" items={generated.usps} isNew={aiFields.includes('usps')} />
            <Field label="Missie" value={generated.mission} isNew={aiFields.includes('mission')} />
            <Field label="Visie" value={generated.vision} isNew={aiFields.includes('vision')} />
            <ArrayField label="Kernwaarden" items={generated.core_values} isNew={aiFields.includes('core_values')} />
            <ArrayField label="SEO Keywords" items={generated.seo_keywords} isNew={aiFields.includes('seo_keywords')} />
            {generated.content_goals && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="overline" color="text.secondary">
                  Content Goals {aiFields.includes('content_goals') && <Chip size="small" label="AI" sx={{ ml: 0.5, height: 14, fontSize: '0.6rem' }} color="primary" />}
                </Typography>
                <Box sx={{ pl: 1, borderLeft: '3px solid', borderColor: 'primary.light' }}>
                  <Typography variant="body2">{generated.content_goals.blogs_per_month ?? '—'} blogs/maand</Typography>
                  <Typography variant="body2">{generated.content_goals.posts_per_week ?? '—'} social posts/week</Typography>
                </Box>
              </Box>
            )}

            <Typography variant="caption" color="text.secondary">
              Gegenereerd in {suggestion.elapsed_ms}ms · {attempts} AI-call(s) · AI-log #{suggestion.ai_generation_log_id || '—'}
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>Annuleren</Button>
        {!suggestion && (
          <Button
            onClick={handleGenerate}
            disabled={loading || config.buttonDisabled}
            variant="contained"
            startIcon={loading ? <CircularProgress size={16} /> : <AutoAwesomeIcon />}
          >
            {loading ? `Genereren... ${secondsElapsed}s` : config.buttonLabel}
          </Button>
        )}
        {suggestion && !loading && (
          <>
            <Button onClick={() => setSuggestion(null)}>Opnieuw genereren</Button>
            <Button onClick={handleAccept} variant="contained" color="primary">
              Accepteer en vul Merkprofiel
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}

function Field({ label, value, multiline, isNew }) {
  if (!value) return null;
  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="overline" color="text.secondary">
        {label}
        {isNew && <Chip size="small" label="AI" sx={{ ml: 0.5, height: 14, fontSize: '0.6rem' }} color="primary" />}
      </Typography>
      <Box sx={{ pl: 1, borderLeft: '3px solid', borderColor: isNew ? 'primary.main' : 'grey.300' }}>
        <Typography variant="body2" sx={{ whiteSpace: multiline ? 'pre-wrap' : 'normal' }}>{value}</Typography>
      </Box>
    </Box>
  );
}

function ArrayField({ label, items, isNew }) {
  if (!Array.isArray(items) || items.length === 0) return null;
  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="overline" color="text.secondary">
        {label}
        {isNew && <Chip size="small" label="AI" sx={{ ml: 0.5, height: 14, fontSize: '0.6rem' }} color="primary" />}
      </Typography>
      <List dense disablePadding sx={{ pl: 1, borderLeft: '3px solid', borderColor: isNew ? 'primary.main' : 'grey.300' }}>
        {items.map((it, i) => (
          <ListItem key={i} disablePadding>
            <ListItemText primaryTypographyProps={{ variant: 'body2' }} primary={`• ${it}`} />
          </ListItem>
        ))}
      </List>
    </Box>
  );
}
