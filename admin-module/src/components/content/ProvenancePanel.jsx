/**
 * ProvenancePanel — Blok 7.1 Fase B (v4.95)
 *
 * EU AI Act Article 50 provenance metadata panel voor reviewer/auditor:
 *   - Signature (SHA-256) + content hash
 *   - Model + operation + locale + generated_at
 *   - Source IDs + source-metadata-titles
 *   - Validation result: passed, hallucination_rate, retries, ungrounded entities
 *   - Tamper status: VALID / CONTENT MODIFIED / INVALID via /verify-provenance
 *   - Action buttons: Re-verify + Download PDF audit-report
 */
import { useEffect, useState } from 'react';
import {
  Box, Typography, Paper, Chip, Button, CircularProgress, Alert, Divider,
  IconButton, Tooltip, Stack, Skeleton, Collapse,
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
import client from '../../api/client.js';

function fmtDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('nl-NL', { dateStyle: 'medium', timeStyle: 'short' });
  } catch { return iso; }
}

function MonoChip({ label, full, color = 'default' }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
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
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(true);

  const load = async () => {
    if (!itemId) return;
    setLoading(true);
    setError(null);
    try {
      const r = await client.get(`/content/items/${itemId}/provenance`);
      setData(r.data?.data || null);
    } catch (err) {
      setError(err?.response?.data?.error?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [itemId]);

  const reVerify = async () => {
    if (!itemId) return;
    setVerifying(true);
    try {
      const r = await client.post(`/content/items/${itemId}/verify-provenance`, body ? { content: body } : {});
      setData((prev) => ({ ...(prev || {}), verify: r.data?.data?.verify }));
    } catch (err) {
      setError(err?.response?.data?.error?.message || err.message);
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
    } catch (err) {
      setError('PDF download failed: ' + (err?.response?.data?.error?.message || err.message));
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

  return (
    <Paper variant="outlined" sx={{ mt: 2, p: 0, overflow: 'hidden' }}>
      <Box
        sx={{
          display: 'flex', alignItems: 'center', p: 1.5, gap: 1,
          bgcolor: `${statusColor}.50`, borderBottom: 1, borderColor: 'divider',
          cursor: 'pointer',
        }}
        onClick={() => setExpanded((v) => !v)}
      >
        <StatusIcon color={statusColor} />
        <Typography variant="subtitle2" sx={{ fontWeight: 700, flex: 1 }}>
          Provenance — {statusLabel}
        </Typography>
        <Chip
          size="small"
          label="EU AI Act Article 50"
          color="primary"
          variant="outlined"
          sx={{ fontSize: 10 }}
        />
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

              {Array.isArray(provenance.source_metadata) && provenance.source_metadata.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                    Cited sources ({provenance.source_metadata.length}):
                  </Typography>
                  <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                    {provenance.source_metadata.map((s, idx) => (
                      <Chip
                        key={idx}
                        size="small"
                        label={s.name || `Source #${idx + 1}`}
                        variant="outlined"
                        onClick={s.url ? () => window.open(s.url, '_blank', 'noopener') : undefined}
                        clickable={!!s.url}
                      />
                    ))}
                  </Stack>
                </Box>
              )}

              {provenance.validation && (
                <Box sx={{ mb: 2, p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
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

              <Divider sx={{ my: 1.5 }} />
            </>
          )}

          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
            {!noProv && (
              <Button
                size="small"
                variant="outlined"
                startIcon={verifying ? <CircularProgress size={14} /> : <RefreshIcon />}
                onClick={reVerify}
                disabled={verifying}
              >
                Re-verify signature
              </Button>
            )}
            <Button
              size="small"
              variant="contained"
              color="primary"
              startIcon={<PictureAsPdfIcon />}
              onClick={downloadPDF}
            >
              Download audit-PDF
            </Button>
          </Stack>
        </Box>
      </Collapse>
    </Paper>
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
