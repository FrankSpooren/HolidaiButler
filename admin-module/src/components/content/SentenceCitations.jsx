/**
 * SentenceCitations — Blok 6.1 Fase B
 *
 * Read-only preview-panel onder de editor met sentence-level hover-citations:
 * elke zin >20 chars wordt gerenderd als span met MUI Tooltip die de
 * bron-titels uit provenance.source_ids toont.
 *
 * EU AI Act Article 50 transparantie boven minimum-compliance:
 * reviewer kan visueel valideren of elk feit gegrond is in brand_sources.
 */
import { useEffect, useMemo, useState } from 'react';
import { Box, Tooltip, Typography, Chip, Alert, Skeleton, Link } from '@mui/material';
import VerifiedIcon from '@mui/icons-material/Verified';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import client from '../../api/client.js';

const MIN_SENTENCE_CHARS = 20;
const SENTENCE_SPLIT = /([.!?]+["')\]]?)(\s+|$)/g;

function stripHtml(html) {
  if (!html) return '';
  return String(html).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Splits text in sentences (>= MIN_SENTENCE_CHARS gets citation wrapper) */
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

  const provData = useMemo(() => {
    if (!provenance) return null;
    if (typeof provenance === 'string') {
      try { return JSON.parse(provenance); } catch { return null; }
    }
    return provenance;
  }, [provenance]);

  const sourceIds = useMemo(() => Array.isArray(provData?.source_ids) ? provData.source_ids : [], [provData]);

  // Fetch source names by IDs (batch via brand-sources endpoint)
  useEffect(() => {
    if (!destinationId || sourceIds.length === 0) {
      setSourceMap({});
      return;
    }
    let cancelled = false;
    setLoadingSources(true);
    client.get('/brand-sources', { params: { destinationId } })
      .then((r) => {
        if (cancelled) return;
        // v4.95 fix: brandSources endpoint returnt { data: { sources: [...], summary } }
        const rows = r.data?.data?.sources || r.data?.sources || (Array.isArray(r.data?.data) ? r.data.data : []);
        const map = {};
        for (const s of rows) {
          if (sourceIds.includes(s.id) || sourceIds.includes(String(s.id))) {
            map[s.id] = { id: s.id, title: s.title || s.url || `Source #${s.id}`, url: s.url };
          }
        }
        setSourceMap(map);
      })
      .catch(() => { if (!cancelled) setSourceMap({}); })
      .finally(() => { if (!cancelled) setLoadingSources(false); });
    return () => { cancelled = true; };
  }, [destinationId, sourceIds.join(',')]);

  const plainText = useMemo(() => stripHtml(body), [body]);
  const sentences = useMemo(() => splitSentences(plainText), [plainText]);

  if (!provData) {
    return (
      <Alert severity="info" icon={<InfoOutlinedIcon />} sx={{ mt: 2 }}>
        Dit item heeft geen provenance metadata. Bron-citations zijn alleen beschikbaar voor AI-gegenereerde content met EU AI Act provenance signature.
      </Alert>
    );
  }

  const sourceList = sourceIds.map((id) => sourceMap[id]).filter(Boolean);
  const tooltipText = sourceList.length > 0
    ? sourceList.map((s) => `• ${s.title}`).join('\n')
    : 'Geen geverifieerde bronnen voor deze zin (mogelijk hallucinatie of niet-grounded zin)';

  return (
    <Box sx={{ mt: 2, p: 2, bgcolor: 'action.hover', borderRadius: 2, border: 1, borderColor: 'divider' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, gap: 1, flexWrap: 'wrap' }}>
        <VerifiedIcon fontSize="small" color="primary" />
        <Typography variant="caption" sx={{ fontWeight: 600 }}>
          Hover-citations (EU AI Act transparantie)
        </Typography>
        <Chip
          size="small"
          label={`${sourceIds.length} bron${sourceIds.length === 1 ? '' : 'nen'}`}
          color={sourceIds.length > 0 ? 'success' : 'warning'}
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

      <Typography variant="body2" sx={{ lineHeight: 1.7 }} component="div">
        {sentences.length === 0 ? (
          <Typography variant="caption" color="text.secondary">Geen tekst om te citeren.</Typography>
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
                    {sourceList.length > 0 ? 'Geverifieerde bronnen' : 'Waarschuwing'}
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
                  borderBottom: sourceList.length > 0 ? '1px dotted' : '1px dashed',
                  borderColor: sourceList.length > 0 ? 'success.main' : 'warning.main',
                  cursor: 'help',
                  '&:hover': { bgcolor: sourceList.length > 0 ? 'success.50' : 'warning.50' },
                }}
              >
                {s}
              </Box>
            </Tooltip>
          );
        }).flatMap((el, i, arr) => i < arr.length - 1 ? [el, ' '] : [el])}
      </Typography>

      {sourceList.length > 0 && (
        <Box sx={{ mt: 1, pt: 1, borderTop: 1, borderColor: 'divider' }}>
          <Typography variant="caption" color="text.secondary">
            Bronnen ({sourceList.length}):
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
            {sourceList.map((s) => (
              s.url ? (
                <Link key={s.id} href={s.url} target="_blank" rel="noopener" underline="hover">
                  <Chip size="small" label={s.title} variant="outlined" clickable />
                </Link>
              ) : (
                <Chip key={s.id} size="small" label={s.title} variant="outlined" />
              )
            ))}
          </Box>
        </Box>
      )}

      {loadingSources && sourceIds.length > 0 && Object.keys(sourceMap).length === 0 && (
        <Skeleton variant="text" width={200} sx={{ mt: 1 }} />
      )}
    </Box>
  );
}
