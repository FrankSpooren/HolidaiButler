import { useState, useEffect } from 'react';
import { Box, Typography, Chip, Alert, AlertTitle, IconButton, Collapse, CircularProgress } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorIcon from '@mui/icons-material/Error';
import InfoIcon from '@mui/icons-material/Info';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useTranslation } from 'react-i18next';
import client from '../../api/client.js';

/**
 * PageQualityPanel — VII-E4 Cluster 3 (E4.3.2)
 *
 * Shows quality validation results inline in the Page Editor.
 * Option (b): warnings only — never blocks publish.
 */

const SEVERITY_CONFIG = {
  error: { icon: ErrorIcon, color: 'error', label: 'Fout' },
  warning: { icon: WarningAmberIcon, color: 'warning', label: 'Waarschuwing' },
  info: { icon: InfoIcon, color: 'info', label: 'Info' },
};

const CATEGORY_LABELS = {
  seo: 'SEO',
  accessibility: 'Toegankelijkheid',
  content: 'Content',
  data: 'Data',
  performance: 'Performance',
};

export default function PageQualityPanel({ pageId, onValidated }) {
  const { t } = useTranslation();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(true);

  const validate = async () => {
    if (!pageId) return;
    setLoading(true);
    try {
      const { data } = await client.get(`/admin-portal/pages/${pageId}/validate`);
      setResult(data);
      if (onValidated) onValidated(data);
    } catch {
      setResult(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    validate();
  }, [pageId]);

  if (!pageId) return null;

  const scoreColor = !result ? 'default'
    : result.errors > 0 ? 'error'
    : result.warnings > 0 ? 'warning'
    : 'success';

  return (
    <Box sx={{ mb: 2, border: 1, borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
      {/* Header */}
      <Box
        onClick={() => setExpanded(!expanded)}
        sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1, cursor: 'pointer', bgcolor: 'action.hover', '&:hover': { bgcolor: 'action.selected' } }}
      >
        {loading ? (
          <CircularProgress size={18} />
        ) : scoreColor === 'success' ? (
          <CheckCircleIcon sx={{ fontSize: 18, color: 'success.main' }} />
        ) : scoreColor === 'error' ? (
          <ErrorIcon sx={{ fontSize: 18, color: 'error.main' }} />
        ) : scoreColor === 'warning' ? (
          <WarningAmberIcon sx={{ fontSize: 18, color: 'warning.main' }} />
        ) : null}

        <Typography variant="subtitle2" sx={{ flex: 1, fontWeight: 600, fontSize: '0.8rem' }}>
          {t('quality.title', 'Kwaliteitscheck')}
        </Typography>

        {result && (
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {result.errors > 0 && <Chip size="small" label={`${result.errors} ${t('quality.errors', 'fouten')}`} color="error" sx={{ height: 20, fontSize: '0.65rem' }} />}
            {result.warnings > 0 && <Chip size="small" label={`${result.warnings} ${t('quality.warnings', 'waarschuwingen')}`} color="warning" sx={{ height: 20, fontSize: '0.65rem' }} />}
            {result.total === 0 && <Chip size="small" label={t('quality.allGood', 'Alles goed')} color="success" sx={{ height: 20, fontSize: '0.65rem' }} />}
          </Box>
        )}

        <IconButton size="small" onClick={(e) => { e.stopPropagation(); validate(); }} title={t('quality.refresh', 'Opnieuw checken')}>
          <RefreshIcon sx={{ fontSize: 16 }} />
        </IconButton>

        <ExpandMoreIcon sx={{ fontSize: 18, transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </Box>

      {/* Issues list */}
      <Collapse in={expanded}>
        <Box sx={{ px: 2, py: 1 }}>
          {loading && <Typography variant="caption" color="text.secondary">Valideren...</Typography>}

          {result && result.issues.length === 0 && !loading && (
            <Alert severity="success" sx={{ py: 0.5 }}>
              <AlertTitle sx={{ fontSize: '0.8rem', mb: 0 }}>{t('quality.noIssues', 'Geen problemen gevonden')}</AlertTitle>
            </Alert>
          )}

          {result && result.issues.map((issue, i) => {
            const cfg = SEVERITY_CONFIG[issue.severity] || SEVERITY_CONFIG.info;
            const SeverityIcon = cfg.icon;
            return (
              <Alert key={i} severity={issue.severity} sx={{ py: 0.25, px: 1, mb: 0.5, '& .MuiAlert-message': { fontSize: '0.75rem' } }}
                icon={<SeverityIcon sx={{ fontSize: 16 }} />}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Chip label={CATEGORY_LABELS[issue.category] || issue.category} size="small" sx={{ height: 16, fontSize: '0.6rem' }} />
                  <Typography variant="caption">{issue.message}</Typography>
                </Box>
              </Alert>
            );
          })}
        </Box>
      </Collapse>
    </Box>
  );
}
