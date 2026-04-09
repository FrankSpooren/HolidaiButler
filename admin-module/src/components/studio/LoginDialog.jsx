import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog, DialogTitle, DialogContent, IconButton, Box, Typography,
  TextField, Button, Alert, InputAdornment, CircularProgress
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { useTranslation } from 'react-i18next';
import useAuthStore from '../../stores/authStore.js';

/* Shared dark-theme input styles */
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

/**
 * Compact login dialog — dark theme matching the studio landing page.
 */
export default function LoginDialog({ open, onClose }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const login = useAuthStore(s => s.login);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setError('');
    try {
      const result = await login(email, password);
      const user = result.data?.user;
      // Apply user's preferred language if set
      if (user?.preferred_language) {
        const { default: i18n } = await import('../../i18n/index.js');
        i18n.changeLanguage(user.preferred_language);
        localStorage.setItem('hb-admin-lang', user.preferred_language);
      }
      onClose?.();
      if (user?.destinationType === 'content_only' || window.location.hostname.startsWith('studio.')) {
        navigate('/content-studio', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      const code = err.response?.data?.error?.code;
      if (code === 'INVALID_CREDENTIALS' || code === 'ADMIN_REQUIRED') {
        setError(t('auth.invalidCredentials'));
      } else {
        setError(t('auth.serverError'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
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
              {t('auth.studio.welcome', 'Welkom bij uw Content Studio')}
            </Typography>
            <Typography variant="body2" sx={{ color: '#8B9DAF', mt: 0.5, fontSize: '0.82rem' }}>
              {t('auth.studio.welcomeSubtitle', 'Log in met uw account om te starten')}
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small" sx={{ mt: -0.5, mr: -0.5, color: '#8B9DAF' }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent sx={{ px: 3, pb: 3 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <form onSubmit={handleSubmit}>
          <TextField fullWidth label={t('auth.email')} type="email" autoComplete="email"
            value={email} onChange={(e) => setEmail(e.target.value)}
            sx={{ mt: 1.5, mb: 2, ...inputSx }} required size="small" autoFocus />
          <TextField fullWidth label={t('auth.password')}
            type={showPassword ? 'text' : 'password'} autoComplete="current-password"
            value={password} onChange={(e) => setPassword(e.target.value)}
            sx={{ mb: 3, ...inputSx }} required size="small"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" size="small"
                    sx={{ color: '#6B7280' }}>
                    {showPassword ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                  </IconButton>
                </InputAdornment>
              )
            }}
          />
          <Button type="submit" fullWidth variant="contained" size="large"
            disabled={loading || !email || !password}
            sx={{
              py: 1.25, fontSize: '0.95rem', fontWeight: 600,
              bgcolor: '#F2C94C', color: '#0D1B2A',
              borderRadius: '8px',
              '&:hover': { bgcolor: '#E0B93B' },
              '&.Mui-disabled': { bgcolor: 'rgba(242,201,76,0.3)', color: 'rgba(13,27,42,0.5)' },
            }}>
            {loading ? <CircularProgress size={22} sx={{ color: '#0D1B2A' }} /> : t('auth.login')}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
