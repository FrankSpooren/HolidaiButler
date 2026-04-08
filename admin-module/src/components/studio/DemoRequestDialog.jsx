import { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, IconButton, Box, Typography,
  TextField, Button, Alert, CircularProgress, FormControlLabel, Checkbox, Link
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { useTranslation } from 'react-i18next';

const API_BASE = import.meta.env.VITE_API_URL || '';

/**
 * Demo Request dialog for the studio landing page.
 * Captures lead contact details and POSTs to the existing
 * public /api/v1/contact endpoint (persists in demo_requests table).
 */
export default function DemoRequestDialog({ open, onClose }) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [consent, setConsent] = useState(false);
  const [hp, setHp] = useState(''); // honeypot
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const reset = () => {
    setName(''); setEmail(''); setCompany(''); setPhone('');
    setMessage(''); setConsent(false); setError(''); setSuccess(false);
  };

  const handleClose = () => {
    if (loading) return;
    reset();
    onClose?.();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !consent) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/v1/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          phone,
          company,
          message: message || t('studio.demo.defaultMessage', 'Ik wil graag een demo van de AI Content Studio.'),
          subject: 'Demo Request — Content Studio',
          source: 'studio_landing',
          consent,
          _hp: hp,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Request failed');
      }
      setSuccess(true);
    } catch (err) {
      setError(err.message || t('studio.demo.error', 'Er ging iets mis. Probeer het opnieuw.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      <DialogTitle sx={{ m: 0, p: 3, pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#1C1917' }}>
              {t('studio.demo.title', 'Gratis Demo Aanvragen')}
            </Typography>
            <Typography variant="body2" sx={{ color: '#6B7280', mt: 0.5 }}>
              {t('studio.demo.subtitle', 'Laat uw gegevens achter — we nemen binnen 1 werkdag contact op.')}
            </Typography>
          </Box>
          <IconButton onClick={handleClose} size="small" disabled={loading} sx={{ mt: -0.5, mr: -0.5 }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ px: 3, pb: 3 }}>
        {success ? (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <CheckCircleOutlineIcon sx={{ fontSize: 56, color: '#10B981', mb: 1 }} />
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
              {t('studio.demo.successTitle', 'Dank u wel!')}
            </Typography>
            <Typography variant="body2" sx={{ color: '#6B7280', mb: 3 }}>
              {t('studio.demo.successBody', 'We hebben uw aanvraag ontvangen en nemen binnen 1 werkdag contact op.')}
            </Typography>
            <Button variant="contained" onClick={handleClose}
              sx={{ bgcolor: '#5E8B7E', '&:hover': { bgcolor: '#4A7066' } }}>
              {t('common.close', 'Sluiten')}
            </Button>
          </Box>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {/* Honeypot — hidden from users */}
            <input type="text" value={hp} onChange={(e) => setHp(e.target.value)}
              style={{ position: 'absolute', left: '-9999px' }} tabIndex={-1} autoComplete="off" />

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mb: 2 }}>
              <TextField size="small" label={t('studio.demo.name', 'Naam')}
                value={name} onChange={(e) => setName(e.target.value)} autoFocus
                InputLabelProps={{ shrink: true }} placeholder="Jan Jansen" />
              <TextField size="small" label={t('studio.demo.company', 'Bedrijf / organisatie')}
                value={company} onChange={(e) => setCompany(e.target.value)}
                InputLabelProps={{ shrink: true }} placeholder="Jouw bedrijf" />
              <TextField size="small" label={t('studio.demo.email', 'E-mail')} type="email" required
                value={email} onChange={(e) => setEmail(e.target.value)}
                InputLabelProps={{ shrink: true }} placeholder="jan@bedrijf.nl" />
              <TextField size="small" label={t('studio.demo.phone', 'Telefoon')}
                value={phone} onChange={(e) => setPhone(e.target.value)}
                InputLabelProps={{ shrink: true }} placeholder="+31 6 12345678" />
            </Box>
            <TextField fullWidth multiline rows={3} size="small"
              label={t('studio.demo.message', 'Bericht (optioneel)')}
              value={message} onChange={(e) => setMessage(e.target.value)} sx={{ mb: 2 }}
              InputLabelProps={{ shrink: true }}
              placeholder={t('studio.demo.messagePlaceholder', 'Vertel kort wat je wilt bereiken...')} />

            <FormControlLabel
              control={<Checkbox checked={consent} onChange={(e) => setConsent(e.target.checked)} size="small" />}
              label={
                <Typography variant="caption" sx={{ color: '#6B7280' }}>
                  {t('studio.demo.consent', 'Ik ga akkoord met het verwerken van mijn gegevens om contact met mij op te nemen.')}{' '}
                  <Link href="https://holidaibutler.com/privacy" target="_blank" rel="noopener noreferrer"
                    sx={{ color: '#5E8B7E' }}>
                    {t('studio.demo.privacy', 'Privacyverklaring')}
                  </Link>
                </Typography>
              }
              sx={{ mb: 2, alignItems: 'flex-start' }}
            />

            <Button type="submit" fullWidth variant="contained" size="large"
              disabled={loading || !email || !consent}
              sx={{
                py: 1.25, fontSize: '0.95rem', fontWeight: 600,
                bgcolor: '#D4AF37', borderRadius: '8px',
                '&:hover': { bgcolor: '#B8941F' },
              }}>
              {loading ? <CircularProgress size={22} color="inherit" /> : t('studio.demo.submit', 'Demo Aanvragen')}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
