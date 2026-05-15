/**
 * SentenceCitations — Blok 6.1 Fase B (v4.95)
 *
 * Compact chip-first view voor EU AI Act Article 50 transparantie.
 * Standaard: header met signature + model + clickable bron-chips.
 * Expand-toggle "Toon zinsanalyse" laat per-zin (>20 chars) hover-citations
 * met dotted-underline + tooltip zien voor diepe audit (regulator-modus).
 *
 * Dupliceert NIET meer de volledige body-tekst (staat al in TipTap editor).
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Box, Tooltip, Typography, Chip, Alert, Skeleton, Button, Collapse, Stack,
} from '@mui/material';
import VerifiedIcon from '@mui/icons-material/Verified';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import client from '../../api/client.js';
import { useNavigate } from 'react-router-dom';
import useDestinationCode from '../../lib/useDestinationCode.js';

const MIN_SENTENCE_CHARS = 20;
const SENTENCE_SPLIT = /([.!?]+["')\]]?)(\s+|$)/g;

function stripHtml(html) {
  if (!html) return '';
  return String(html).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function splitSentences(text) {
  if (!text) return [];
  const parts = [];
  let cursor = 0;
  let match;
  SENTENCE_SPLIT.lastIndex = 0;
  while ((match = SENTENCE_SPLIT.exec(text)) !== null) {
    const endIdx = match.index + match[1].length;
    const sentence = text.slice(cursor, endIdx).trim();
    if (sentence) parts.push(sentence);
    cursor = endIdx + match[2].length;
  }
  if (cursor < text.length) {
    const tail = text.slice(cursor).trim();
    if (tail) parts.push(tail);
  }
  return parts;
}

export default function SentenceCitations({ provenance, body, destinationId }) {
  const [sourceMap, setSourceMap] = useState({});
  const [loadingSources, setLoadingSources] = useState(false);
  const [showSentenceAnalysis, setShowSentenceAnalysis] = useState(false);
  const navigate = useNavigate();
  const destinationCode = useDestinationCode(destinationId);

  const provData = useMemo(() => {
    if (!provenance) return null;
    if (typeof provenance === 'string') {
      try { return JSON.parse(provenance); } catch { return null; }
    }
    return provenance;
  }, [provenance]);

  const sourceIds = useMemo(() => Array.isArray(provData?.source_ids) ? provData.source_ids : [], [provData]);

  // Build source list from stored provenance.source_metadata (heeft name+url+type)
  // Fallback: fetch brand_knowledge by ID indien metadata leeg is.
  const inlineSources = useMemo(() => {
    if (!Array.isArray(provData?.source_metadata)) return [];
    return provData.source_metadata.map((s, idx) => ({
      id: sourceIds[idx] || idx,
      name: s.name || s.source_name || s.title || `Source #${idx + 1}`,
      url: s.url || s.source_url || null,
      type: s.type || s.source_type || null,
    }));
  }, [provData, sourceIds]);

  useEffect(() => {
    if (!destinationId || sourceIds.length === 0 || inlineSources.every((s) => s.name && !s.name.startsWith('Source #'))) {
      // Inline metadata heeft al de namen — skip fetch
      const map = {};
      inlineSources.forEach((s) => { map[s.id] = s; });
      setSourceMap(map);
      return;
    }
    let cancelled = false;
    setLoadingSources(true);
    client.get('/brand-sources', { params: { destinationId } })
      .then((r) => {
        if (cancelled) return;
        // Backend returnt { data: { sources: [...], summary } }
        const rows = r.data?.data?.sources || r.data?.sources || [];
        const map = {};
        for (const s of rows) {
          if (sourceIds.includes(s.id) || sourceIds.includes(String(s.id))) {
            map[s.id] = {
              id: s.id,
              name: s.source_name || s.title || `Source #${s.id}`,
              url: s.source_url || s.url || null,
              type: s.source_type || null,
            };
          }
        }
        setSourceMap(map);
      })
      .catch(() => { if (!cancelled) setSourceMap({}); })
      .finally(() => { if (!cancelled) setLoadingSources(false); });
    return () => { cancelled = true; };
  }, [destinationId, sourceIds.join(','), inlineSources.length]);

  const resolvedSources = useMemo(() => {
    if (Object.keys(sourceMap).length > 0) return Object.values(sourceMap);
    return inlineSources;
  }, [sourceMap, inlineSources]);

  const plainText = useMemo(() => stripHtml(body), [body]);
  const sentences = useMemo(() => splitSentences(plainText), [plainText]);

  if (!provData) {
    return (
      <Alert severity="info" icon={<InfoOutlinedIcon />} sx={{ mt: 2 }}>
        Dit item heeft geen provenance metadata. Bron-citations zijn alleen beschikbaar voor AI-gegenereerde content met EU AI Act provenance signature.
      </Alert>
    );
  }

  const hasSources = resolvedSources.length > 0;
  const tooltipText = hasSources
    ? resolvedSources.map((s) => `• ${s.name}`).join('\n')
    : 'Geen geverifieerde bronnen voor deze zin (mogelijk hallucinatie of niet-grounded zin)';

  return (
    <Box sx={{ mt: 2, p: 2, bgcolor: 'action.hover', borderRadius: 2, border: 1, borderColor: 'divider' }}>
      {/* Header: signature + model + bron-count */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, gap: 1, flexWrap: 'wrap' }}>
        <VerifiedIcon fontSize="small" color="primary" />
        <Typography variant="caption" sx={{ fontWeight: 600 }}>
          Hover-citations (EU AI Act transparantie)
        </Typography>
        <Chip
          size="small"
          label={`${sourceIds.length} bron${sourceIds.length === 1 ? '' : 'nen'}`}
          color={hasSources ? 'success' : 'warning'}
          variant="outlined"
        />
        {provData.signature && (
          <Chip
            size="small"
            label={`Signature ${String(provData.signature).slice(0, 12)}...`}
            sx={{ fontFamily: 'monospace', fontSize: 11 }}
            variant="outlined"
          />
        )}
        {provData.model && (
          <Chip size="small" label={`Model: ${provData.model}`} variant="outlined" />
        )}
      </Box>

      {/* Clickable bron-chips */}
      {loadingSources && resolvedSources.length === 0 ? (
        <Skeleton variant="rounded" width={300} height={28} />
      ) : hasSources ? (
        <Box sx={{ mt: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
            Geciteerde bronnen ({resolvedSources.length}):
          </Typography>
          <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
            {resolvedSources.map((s) => {
              const hasUrl = !!s.url;
              const canDeepLink = !hasUrl && s.id && destinationCode;
              const onClick = hasUrl
                ? () => window.open(s.url, '_blank', 'noopener')
                : canDeepLink
                  ? () => navigate(`/branding?dest=${encodeURIComponent(destinationCode)}&kb=${encodeURIComponent(s.id)}`)
                  : undefined;
              const tooltip = hasUrl
                ? `Open bron: ${s.url}`
                : canDeepLink
                  ? `Open bron in Merk Profiel → Knowledge Base`
                  : 'Bron niet meer beschikbaar in Merk Profiel';
              return (
                <Tooltip key={s.id || s.name} title={tooltip} arrow>
                  <Chip
                    size="small"
                    label={s.name}
                    variant="outlined"
                    color={hasUrl || canDeepLink ? 'primary' : 'default'}
                    clickable={!!onClick}
                    onClick={onClick}
                    icon={hasUrl ? <OpenInNewIcon style={{ fontSize: 14 }} /> : undefined}
                    sx={{ cursor: onClick ? 'pointer' : 'default' }}
                  />
                </Tooltip>
              );
            })}
          </Stack>
        </Box>
      ) : (
        <Alert severity="warning" sx={{ mt: 1, py: 0.5 }}>
          <Typography variant="caption">Provenance bevat source_ids maar geen geverifieerde bron-namen — backfill of metadata-update nodig.</Typography>
        </Alert>
      )}

      {/* Expand-toggle voor zinsanalyse (default collapsed) */}
      <Button
        size="small"
        variant="text"
        sx={{ mt: 1.5, textTransform: 'none', fontSize: 12 }}
        startIcon={showSentenceAnalysis ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        onClick={() => setShowSentenceAnalysis((v) => !v)}
      >
        {showSentenceAnalysis ? 'Verberg zinsanalyse' : 'Toon zinsanalyse (per-zin grounding check)'}
      </Button>

      <Collapse in={showSentenceAnalysis}>
        <Box sx={{ mt: 1.5, p: 1.5, bgcolor: 'background.paper', borderRadius: 1, border: 1, borderColor: 'divider' }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            Hover over een zin {`>${MIN_SENTENCE_CHARS}`} chars om de bron-tooltip te zien.
            {hasSources ? ' Groen dotted = geverifieerde bronnen.' : ' Oranje dashed = geen bron-grounding.'}
          </Typography>
          <Typography variant="body2" sx={{ lineHeight: 1.7 }} component="div">
            {sentences.length === 0 ? (
              <Typography variant="caption" color="text.secondary">Geen tekst om te analyseren.</Typography>
            ) : sentences.map((s, idx) => {
              if (s.length < MIN_SENTENCE_CHARS) {
                return <span key={idx}>{s} </span>;
              }
              return (
                <Tooltip
                  key={idx}
                  title={
                    <Box>
                      <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                        {hasSources ? 'Geverifieerde bronnen' : 'Waarschuwing'}
                      </Typography>
                      <Typography variant="caption" component="div" sx={{ whiteSpace: 'pre-line' }}>
                        {tooltipText}
                      </Typography>
                    </Box>
                  }
                  arrow
                  placement="top"
                >
                  <Box
                    component="span"
                    sx={{
                      borderBottom: hasSources ? '1px dotted' : '1px dashed',
                      borderColor: hasSources ? 'success.main' : 'warning.main',
                      cursor: 'help',
                      '&:hover': { bgcolor: hasSources ? 'success.50' : 'warning.50' },
                    }}
                  >
                    {s}
                  </Box>
                </Tooltip>
              );
            }).flatMap((el, i, arr) => i < arr.length - 1 ? [el, ' '] : [el])}
          </Typography>
        </Box>
      </Collapse>
    </Box>
  );
}
