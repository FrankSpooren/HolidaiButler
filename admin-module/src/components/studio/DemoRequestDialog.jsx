import { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, IconButton, Box, Typography,
  TextField, Button, Alert, CircularProgress, FormControlLabel, Checkbox, Link
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { useTranslation } from 'react-i18next';

const API_BASE = import.meta.env.VITE_API_URL || '';

const BLOCKED_DOMAINS = [
  'gmail.com', 'googlemail.com', 'hotmail.com', 'hotmail.nl', 'hotmail.de', 'hotmail.co.uk', 'hotmail.fr', 'hotmail.es',
  'outlook.com', 'outlook.nl', 'outlook.de', 'outlook.co.uk', 'outlook.fr', 'outlook.es',
  'live.com', 'live.nl', 'msn.com',
  'yahoo.com', 'yahoo.nl', 'yahoo.de', 'yahoo.co.uk', 'yahoo.fr', 'yahoo.es',
  'icloud.com', 'me.com', 'mac.com',
  'aol.com', 'protonmail.com', 'proton.me', 'zoho.com',
  'gmx.com', 'gmx.de', 'gmx.net', 'web.de', 't-online.de',
  'mail.com', 'yandex.com', 'tutanota.com',
];

function isBusinessEmail(email) {
  if (!email || !email.includes('@')) return false;
  const domain = email.split('@')[1]?.toLowerCase();
  return domain && !BLOCKED_DOMAINS.includes(domain);
}

/* Dark-theme input styles (same as LoginDialog) */
const inputSx = {
  '& .MuiOutlinedInput-root': {
    bgcolor: '#FFFFFF',
    color: '#1A1A1A',
    borderRadius: '8px',
    '& fieldset': { borderColor: '#2A3A4A' },
    '&:hover fieldset': { borderColor: '#02C39A' },
    '&.Mui-focused fieldset': { borderColor: '#02C39A' },
  },
  '& .MuiInputLabel-root': { color: '#8B9DAF' },
  '& .MuiInputLabel-root.Mui-focused': { color: '#02C39A' },
  '& .MuiInputLabel-shrink': {
    bgcolor: '#15293F',
    px: 0.75,
    borderRadius: '4px',
    color: '#C8D0DA',
  },
  '& .MuiInputLabel-shrink.Mui-focused': { color: '#02C39A' },
};

export default function DemoRequestDialog({ open, onClose }) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [consent, setConsent] = useState(false);
  const [hp, setHp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [success, setSuccess] = useState(false);

  const reset = () => {
    setName(''); setEmail(''); setCompany(''); setJobTitle(''); setPhone('');
    setMessage(''); setConsent(false); setError(''); setEmailError(''); setSuccess(false);
  };

  const handleClose = () => {
    if (loading) return;
    reset();
    onClose?.();
  };

  const handleEmailChange = (e) => {
    const val = e.target.value;
    setEmail(val);
    if (val && val.includes('@') && !isBusinessEmail(val)) {
      setEmailError(t('auth.studio.demo.emailBusiness', 'Gebruik a.u.b. uw zakelijke e-mailadres'));
    } else {
      setEmailError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !consent || !isBusinessEmail(email)) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/v1/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, email, phone, company, job_title: jobTitle,
          message: message || t('auth.studio.demo.defaultMessage', 'Ik wil graag een demo van PubliQio.'),
          subject: 'Demo Request — PubliQio',
          source: 'studio_landing',
          consent,
          _hp: hp,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Request failed');
      setSuccess(true);
    } catch (err) {
      setError(err.message || t('auth.studio.demo.error', 'Er ging iets mis. Probeer het opnieuw.'));
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = email && consent && isBusinessEmail(email) && !emailError;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '12px',
          overflow: 'hidden',
          bgcolor: '#15293F',
          color: '#FFFFFF',
        },
      }}
    >
      <DialogTitle sx={{ m: 0, p: 3, pb: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
          <Box>
            {/* PubliQio logo */}
            <Box sx={{ display: 'inline-flex', alignItems: 'baseline', mb: 1.5 }}>
              <Box component="span" sx={{ fontWeight: 800, fontSize: '1.35rem', color: '#FFFFFF' }}>Publi</Box>
              <Box component="span" sx={{ fontWeight: 900, fontSize: '1.35rem', color: '#02C39A' }}>Q</Box>
              <Box component="span" sx={{ fontWeight: 800, fontSize: '1.35rem', color: '#FFFFFF' }}>io</Box>
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#FFFFFF', fontSize: '1.05rem' }}>
              {t('auth.studio.demo.title', 'Gratis Demo Aanvragen')}
            </Typography>
            <Typography variant="body2" sx={{ color: '#8B9DAF', mt: 0.5, fontSize: '0.82rem' }}>
              {t('auth.studio.demo.subtitle', 'Laat uw gegevens achter — we nemen binnen 1 werkdag contact op.')}
            </Typography>
          </Box>
          <IconButton onClick={handleClose} size="small" disabled={loading} sx={{ mt: -0.5, mr: -0.5, color: '#8B9DAF' }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ px: 3, pb: 3 }}>
        {success ? (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <CheckCircleOutlineIcon sx={{ fontSize: 56, color: '#10B981', mb: 1 }} />
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, color: '#FFFFFF' }}>
              {t('auth.studio.demo.successTitle', 'Dank u wel!')}
            </Typography>
            <Typography variant="body2" sx={{ color: '#8B9DAF', mb: 3 }}>
              {t('auth.studio.demo.successBody', 'We hebben uw aanvraag ontvangen en nemen binnen 1 werkdag contact op.')}
            </Typography>
            <Button variant="contained" onClick={handleClose}
              sx={{ bgcolor: '#02C39A', color: '#0D1B2A', fontWeight: 600, '&:hover': { bgcolor: '#01A882' } }}>
              {t('auth.studio.demo.close', 'Sluiten')}
            </Button>
          </Box>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            <input type="text" value={hp} onChange={(e) => setHp(e.target.value)}
              style={{ position: 'absolute', left: '-9999px' }} tabIndex={-1} autoComplete="off" />

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mt: 1.5, mb: 2 }}>
              <TextField size="small" label={t('auth.studio.demo.name', 'Naam')}
                value={name} onChange={(e) => setName(e.target.value)} autoFocus sx={inputSx} />
              <TextField size="small" label={t('auth.studio.demo.email', 'Zakelijk e-mailadres')} type="email" required
                value={email} onChange={handleEmailChange}
                error={!!emailError} helperText={emailError}
                sx={inputSx}
                FormHelperTextProps={{ sx: { color: '#F87171' } }} />
              <TextField size="small" label={t('auth.studio.demo.company', 'Bedrijf / organisatie')}
                value={company} onChange={(e) => setCompany(e.target.value)} sx={inputSx} />
              <TextField size="small" label={t('auth.studio.demo.jobTitle', 'Functie')}
                value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} sx={inputSx} />
              <TextField size="small" label={t('auth.studio.demo.phone', 'Telefoon')}
                value={phone} onChange={(e) => setPhone(e.target.value)} sx={inputSx} />
            </Box>
            <TextField fullWidth multiline rows={3} size="small"
              label={t('auth.studio.demo.message', 'Bericht (optioneel)')}
              value={message} onChange={(e) => setMessage(e.target.value)} sx={{ mb: 2, ...inputSx }} />

            <FormControlLabel
              control={<Checkbox checked={consent} onChange={(e) => setConsent(e.target.checked)} size="small"
                sx={{ color: '#8B9DAF', '&.Mui-checked': { color: '#02C39A' } }} />}
              label={
                <Typography variant="caption" sx={{ color: '#8B9DAF' }}>
                  {t('auth.studio.demo.consent', 'Ik ga akkoord met het verwerken van mijn gegevens voor het behandelen van mijn demo-aanvraag.')}{' '}
                  <Link href="/privacy" target="_blank" rel="noopener noreferrer"
                    sx={{ color: '#02C39A' }}>
                    {t('auth.studio.demo.privacy', 'Privacybeleid')}
                  </Link>
                </Typography>
              }
              sx={{ mb: 2, alignItems: 'flex-start' }}
            />

            <Button type="submit" fullWidth variant="contained" size="large"
              disabled={loading || !canSubmit}
              sx={{
                py: 1.25, fontSize: '0.95rem', fontWeight: 600,
                bgcolor: '#F2C94C', color: '#0D1B2A',
                borderRadius: '8px',
                '&:hover': { bgcolor: '#E0B93B' },
                '&.Mui-disabled': { bgcolor: 'rgba(242,201,76,0.3)', color: 'rgba(13,27,42,0.5)' },
              }}>
              {loading ? <CircularProgress size={22} sx={{ color: '#0D1B2A' }} /> : t('auth.studio.demo.submit', 'Demo Aanvragen')}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
