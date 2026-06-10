import { useState } from 'react';
import { Button, CircularProgress, Tooltip, Snackbar, Alert } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { useDestination } from './DestinationContext.jsx';
import apiClient from '../../api/client.js';

/**
 * AltTextGeneratorButton — genereert WCAG 2.1 AA alt-text voor een
 * afbeelding-URL via Pixtral vision-model + DeepL multi-locale fan-out.
 *
 * Output i18n-object { en, nl, de, es, fr } met destination-specifieke
 * terminologie (uses buildBrandContextStructured server-side).
 *
 * Props:
 *   - imageUrl: required, full URL of relatief pad
 *   - currentAlt: huidig alt-text i18n-object (preview-check)
 *   - onGenerated(i18nAltText): callback bij success
 *
 * @version BLOK F4 (22-05-2026)
 */

export default function AltTextGeneratorButton({ imageUrl, currentAlt, onGenerated }) {
  const [loading, setLoading] = useState(false);
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' });
  const { destinationId } = useDestination();

  const hasAlt = currentAlt
    && (typeof currentAlt === 'string'
        ? String(currentAlt).trim().length > 0
        : Object.values(currentAlt).some(v => v && String(v).trim().length > 0));

  const handleClick = async () => {
    if (loading || !imageUrl) return;
    if (!destinationId) {
      setSnack({ open: true, message: 'Geen destinatie-context — kan geen alt-text genereren.', severity: 'warning' });
      return;
    }
    setLoading(true);
    try {
      const { data } = await apiClient.post(
        '/images/generate-alt-text',
        { imageUrl, destinationId },
        { timeout: 60000 }
      );
      if (data?.success && data.data?.altText) {
        onGenerated(data.data.altText);
        setSnack({
          open: true,
          message: `Alt-text gegenereerd (${data.data.confidence} confidence, ${data.data.sourceLocale.toUpperCase()} bron-locale).`,
          severity: 'success'
        });
      } else {
        setSnack({ open: true, message: data?.error?.message || 'Generatie mislukt', severity: 'error' });
      }
    } catch (err) {
      const code = err?.response?.data?.error?.code;
      const msg = err?.response?.data?.error?.message || err.message;
      setSnack({ open: true, message: `${code || 'Fout'}: ${msg}`, severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Tooltip title={imageUrl ? 'Genereer WCAG-conforme alt-text met Pixtral vision-AI' : 'Selecteer eerst een afbeelding'}>
        <span>
          <Button
            size="small"
            variant={hasAlt ? 'outlined' : 'contained'}
            startIcon={loading ? <CircularProgress size={14} /> : <AutoAwesomeIcon fontSize="small" />}
            onClick={handleClick}
            disabled={loading || !imageUrl || !destinationId}
            color={hasAlt ? 'inherit' : 'primary'}
          >
            {loading ? 'Genereren...' : (hasAlt ? 'Hergenereer alt-text met AI' : 'Genereer alt-text met AI')}
          </Button>
        </span>
      </Tooltip>
      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snack.severity} onClose={() => setSnack(s => ({ ...s, open: false }))}>
          {snack.message}
        </Alert>
      </Snackbar>
    </>
  );
}
