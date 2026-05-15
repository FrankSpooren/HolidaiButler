/**
 * ProvenancePanel — Blok 7.1 Fase B (v4.95)
 *
 * EU AI Act Article 50 provenance metadata panel met:
 *   - Real-time tamper-detection: re-verify automatisch (debounced 1.5s) bij body-changes
 *   - Re-verify snackbar feedback met timestamp
 *   - Clickable bron-chips met URL-open onClick
 *   - PDF audit-report download
 */
import { useEffect, useState, useRef } from 'react';
import {
  Box, Typography, Paper, Chip, Button, CircularProgress, Alert, Divider,
  IconButton, Tooltip, Stack, Skeleton, Collapse, Snackbar,
} from '@mui/material';
import VerifiedIcon from '@mui/icons-material/Verified';
import GppMaybeIcon from '@mui/icons-material/GppMaybe';
import ReportGmailerrorredIcon from '@mui/icons-material/ReportGmailerrorred';
import RefreshIcon from '@mui/icons-material/Refresh';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import FingerprintIcon from '@mui/icons-material/Fingerprint';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import client from '../../api/client.js';

const AUTO_REVERIFY_DEBOUNCE_MS = 1500;

function fmtDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('nl-NL', { dateStyle: 'medium', timeStyle: 'short' });
  } catch { return iso; }
}

function MonoChip({ label, full, color = 'default' }) {
  const [copied, setCopied] = useState(false);
  const copy = (e) => {
    e?.stopPropagation();
    navigator.clipboard?.writeText(full || label).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <Tooltip title={copied ? 'Gekopieerd!' : (full || label)} arrow>
      <Chip
        size="small"
        color={color}
        variant="outlined"
        label={label}
        onClick={copy}
        icon={<ContentCopyIcon style={{ fontSize: 12 }} />}
        sx={{ fontFamily: 'monospace', fontSize: 11, cursor: 'pointer' }}
      />
    </Tooltip>
  );
}

export default function ProvenancePanel({ itemId, body }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [autoVerifying, setAutoVerifying] = useState(false);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(true);
  const [snack, setSnack] = useState(null);
  const lastVerifiedBodyRef = useRef(null);
  const debounceTimerRef = useRef(null);

  const load = async () => {
    if (!itemId) return;
    setLoading(true);
    setError(null);
    try {
      const r = await client.get(`/content/items/${itemId}/provenance`);
      setData(r.data?.data || null);
      lastVerifiedBodyRef.current = body || null;
    } catch (err) {
      setError(err?.response?.data?.error?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [itemId]);

  // v4.95 Fix G: real-time body watching met debounced auto re-verify.
  // Bij elke body-wijziging > 0 chars verschil met laatst-geverifieerde state
  // start een 1.5s timer; na pauze fire /verify-provenance opnieuw met huidige body.
  useEffect(() => {
    if (!itemId || !data || body === undefined || body === null) return;
    if (lastVerifiedBodyRef.current === body) return;

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(async () => {
      setAutoVerifying(true);
      try {
        const r = await client.post(`/content/items/${itemId}/verify-provenance`, { content: body });
        setData((prev) => ({ ...(prev || {}), verify: r.data?.data?.verify }));
        lastVerifiedBodyRef.current = body;
      } catch (_) { /* fail silent — handmatige Re-verify blijft beschikbaar */ }
      finally { setAutoVerifying(false); }
    }, AUTO_REVERIFY_DEBOUNCE_MS);

    return () => { if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current); };
  }, [body, itemId, data]);

  const reVerify = async () => {
    if (!itemId) return;
    setVerifying(true);
    try {
      const r = await client.post(`/content/items/${itemId}/verify-provenance`, body ? { content: body } : {});
      const newVerify = r.data?.data?.verify;
      setData((prev) => ({ ...(prev || {}), verify: newVerify }));
      lastVerifiedBodyRef.current = body || null;
      // Fix F: visual feedback snackbar met timestamp + status
      const statusLabel = newVerify?.valid && !newVerify?.contentChanged ? 'VALID — signature intact'
                        : newVerify?.contentChanged ? 'CONTENT GEWIJZIGD na generatie'
                        : `INVALID — ${newVerify?.reason || 'unknown'}`;
      const severity = newVerify?.valid && !newVerify?.contentChanged ? 'success'
                     : newVerify?.contentChanged ? 'warning' : 'error';
      setSnack({ severity, text: `Geverifieerd om ${new Date().toLocaleTimeString('nl-NL')} — ${statusLabel}` });
    } catch (err) {
      setError(err?.response?.data?.error?.message || err.message);
      setSnack({ severity: 'error', text: 'Re-verify mislukt: ' + (err?.response?.data?.error?.message || err.message) });
    } finally {
      setVerifying(false);
    }
  };

  const downloadPDF = async () => {
    try {
      const r = await client.get(`/content/items/${itemId}/provenance-report.pdf`, { responseType: 'blob' });
      const blob = new Blob([r.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `provenance-item${itemId}-${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      setSnack({ severity: 'success', text: 'Audit-PDF gedownload.' });
    } catch (err) {
      setError('PDF download failed: ' + (err?.response?.data?.error?.message || err.message));
      setSnack({ severity: 'error', text: 'PDF download mislukt.' });
    }
  };

  if (!itemId) return null;
  if (loading && !data) {
    return <Box sx={{ mt: 2 }}><Skeleton variant="rounded" height={120} /></Box>;
  }
  if (error && !data) {
    return <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>;
  }
  if (!data) return null;

  const { provenance, verify } = data;
  const noProv = !provenance;

  const statusColor = verify?.valid && !verify?.contentChanged ? 'success'
                    : verify?.contentChanged ? 'warning'
                    : 'error';
  const StatusIcon = verify?.valid && !verify?.contentChanged ? VerifiedIcon
                   : verify?.contentChanged ? GppMaybeIcon
                   : ReportGmailerrorredIcon;
  const statusLabel = noProv ? 'Geen provenance metadata'
                    : verify?.valid && !verify?.contentChanged ? 'VALID — signature intact'
                    : verify?.contentChanged ? 'CONTENT GEWIJZIGD na generatie'
                    : `INVALID — ${verify?.reason || 'unknown'}`;

  // Source list met clickable URLs
  const sources = Array.isArray(provenance?.source_metadata) ? provenance.source_metadata.map((s, idx) => ({
    id: provenance.source_ids?.[idx] || idx,
    name: s.name || s.source_name || s.title || `Source #${idx + 1}`,
    url: s.url || s.source_url || null,
    type: s.type || s.source_type || null,
  })) : [];

  return (
    <>
      <Paper variant="outlined" sx={{ mt: 2, p: 0, overflow: 'hidden' }}>
        {/* Action-bar boven (sticky-feel binnen panel) */}
        <Box
          sx={{
            display: 'flex', alignItems: 'center', p: 1.5, gap: 1,
            bgcolor: `${statusColor}.50`, borderBottom: 1, borderColor: 'divider',
            cursor: 'pointer', flexWrap: 'wrap',
          }}
          onClick={() => setExpanded((v) => !v)}
        >
          <StatusIcon color={statusColor} />
          <Typography variant="subtitle2" sx={{ fontWeight: 700, flex: 1, minWidth: 200 }}>
            Provenance — {statusLabel}
            {autoVerifying && (
              <Typography component="span" variant="caption" sx={{ ml: 1, fontStyle: 'italic', color: 'text.secondary' }}>
                (auto-verifiëren…)
              </Typography>
            )}
          </Typography>
          {!noProv && (
            <>
              <Tooltip title="Handmatig re-verifiëren met huidige editor-content">
                <span>
                  <Button
                    size="small"
                    variant="outlined"
                    color="inherit"
                    startIcon={verifying ? <CircularProgress size={14} /> : <RefreshIcon />}
                    onClick={(e) => { e.stopPropagation(); reVerify(); }}
                    disabled={verifying}
                  >
                    Re-verify
                  </Button>
                </span>
              </Tooltip>
              <Tooltip title="Download EU AI Act audit-PDF rapport">
                <span>
                  <Button
                    size="small"
                    variant="contained"
                    color="primary"
                    startIcon={<PictureAsPdfIcon />}
                    onClick={(e) => { e.stopPropagation(); downloadPDF(); }}
                  >
                    Audit-PDF
                  </Button>
                </span>
              </Tooltip>
            </>
          )}
          <Chip size="small" label="EU AI Act Article 50" color="primary" variant="outlined" sx={{ fontSize: 10 }} />
          <IconButton size="small">
            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </Box>

        <Collapse in={expanded}>
          <Box sx={{ p: 2 }}>
            {noProv ? (
              <Alert severity="info" icon={<FingerprintIcon />}>
                Dit item heeft geen provenance metadata. Trigger een AI-improve actie om provenance retro-actief op te bouwen voor EU AI Act compliance.
              </Alert>
            ) : (
              <>
                {verify?.contentChanged && (
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>Content wijziging gedetecteerd</Typography>
                    <Typography variant="caption">
                      De huidige body komt niet overeen met de SHA-256 hash uit de provenance. Manuele edit na AI-generatie. Audit-trail vereist herziening.
                    </Typography>
                  </Alert>
                )}

                <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 0.5 }}>
                  {provenance.signature && (
                    <MonoChip
                      label={`sig ${String(provenance.signature).slice(0, 12)}…`}
                      full={`Signature: ${provenance.signature}`}
                      color={verify?.valid ? 'success' : 'error'}
                    />
                  )}
                  {provenance.content_sha256 && (
                    <MonoChip
                      label={`hash ${String(provenance.content_sha256).slice(0, 10)}…`}
                      full={`Content SHA-256: ${provenance.content_sha256}`}
                    />
                  )}
                </Stack>

                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.5, mb: 2 }}>
                  <Field label="Model" value={provenance.model} />
                  <Field label="Operation" value={provenance.operation} />
                  <Field label="Locale" value={provenance.locale} />
                  <Field label="Generated" value={fmtDate(provenance.generated_at)} />
                  <Field
                    label="Source IDs"
                    value={Array.isArray(provenance.source_ids) && provenance.source_ids.length > 0
                      ? provenance.source_ids.join(', ')
                      : '—'}
                  />
                  <Field label="Schema" value={provenance.schema_version} />
                </Box>

                {sources.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                      Geciteerde bronnen ({sources.length}):
                    </Typography>
                    <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                      {sources.map((s) => (
                        <Tooltip
                          key={s.id || s.name}
                          title={s.url ? `Open bron: ${s.url}` : 'Geen URL beschikbaar (lokale tekst-bron)'}
                          arrow
                        >
                          <Chip
                            size="small"
                            label={s.name}
                            variant="outlined"
                            color={s.url ? 'primary' : 'default'}
                            clickable={!!s.url}
                            onClick={s.url ? () => window.open(s.url, '_blank', 'noopener') : undefined}
                            icon={s.url ? <OpenInNewIcon style={{ fontSize: 14 }} /> : undefined}
                            sx={{ cursor: s.url ? 'pointer' : 'default' }}
                          />
                        </Tooltip>
                      ))}
                    </Stack>
                  </Box>
                )}

                {provenance.validation && (
                  <Box sx={{ mb: 1, p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
                    <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                      Validation result:
                    </Typography>
                    <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                      <Chip
                        size="small"
                        label={provenance.validation.passed === false ? 'Hallucination detected' : 'Passed'}
                        color={provenance.validation.passed === false ? 'error' : 'success'}
                      />
                      {typeof provenance.validation.hallucinationRate === 'number' && (
                        <Chip
                          size="small"
                          variant="outlined"
                          label={`Hallucination ${(provenance.validation.hallucinationRate * 100).toFixed(1)}%`}
                        />
                      )}
                      {provenance.validation.retries > 0 && (
                        <Chip size="small" variant="outlined" label={`${provenance.validation.retries} retries`} />
                      )}
                    </Stack>
                    {(provenance.validation.ungroundedEntities?.length > 0 || provenance.validation.ungrounded_entities?.length > 0) && (
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="caption" color="error.main">Ungrounded entities:</Typography>
                        <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                          {(provenance.validation.ungroundedEntities || provenance.validation.ungrounded_entities || []).slice(0, 10).map((e, idx) => (
                            <Chip
                              key={idx}
                              size="small"
                              label={typeof e === 'string' ? e : e?.entity || JSON.stringify(e)}
                              color="error"
                              variant="outlined"
                            />
                          ))}
                        </Stack>
                      </Box>
                    )}
                  </Box>
                )}
              </>
            )}
          </Box>
        </Collapse>
      </Paper>

      <Snackbar
        open={!!snack}
        autoHideDuration={4000}
        onClose={() => setSnack(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snack?.severity || 'info'} variant="filled" onClose={() => setSnack(null)} sx={{ width: '100%' }}>
          {snack?.text}
        </Alert>
      </Snackbar>
    </>
  );
}

function Field({ label, value }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.4 }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {value || '—'}
      </Typography>
    </Box>
  );
}
