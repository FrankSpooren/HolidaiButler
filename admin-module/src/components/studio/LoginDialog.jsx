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

/**
 * Compact login dialog triggered from the studio landing header.
 * Reuses existing auth logic — on success navigates to /content-studio.
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
      PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}
    >
      <DialogTitle sx={{ m: 0, p: 3, pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#1C1917' }}>
              {t('auth.studio.welcome', 'Welkom bij uw Content Studio')}
            </Typography>
            <Typography variant="body2" sx={{ color: '#6B7280', mt: 0.5 }}>
              {t('auth.studio.welcomeSubtitle', 'Log in met uw account om te starten')}
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small" sx={{ mt: -0.5, mr: -0.5 }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent sx={{ px: 3, pb: 3 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <form onSubmit={handleSubmit}>
          <TextField fullWidth label={t('auth.email')} type="email" autoComplete="email"
            value={email} onChange={(e) => setEmail(e.target.value)} sx={{ mb: 2 }} required size="small" autoFocus />
          <TextField fullWidth label={t('auth.password')}
            type={showPassword ? 'text' : 'password'} autoComplete="current-password"
            value={password} onChange={(e) => setPassword(e.target.value)} sx={{ mb: 3 }} required size="small"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" size="small">
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
              bgcolor: '#5E8B7E', borderRadius: '8px',
              '&:hover': { bgcolor: '#4A7066' },
            }}>
            {loading ? <CircularProgress size={22} color="inherit" /> : t('auth.login')}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
