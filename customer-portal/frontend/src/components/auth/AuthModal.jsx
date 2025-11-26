import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  TextField,
  Button,
  Divider,
  IconButton,
  InputAdornment,
  Link,
  Alert,
  CircularProgress,
  useTheme,
  useMediaQuery,
  alpha,
} from '@mui/material';
import {
  Close as CloseIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Google as GoogleIcon,
  Facebook as FacebookIcon,
  Apple as AppleIcon,
  Email as EmailIcon,
  Lock as LockIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

/**
 * AuthModal - Beautiful Login/Registration Modal
 *
 * Enterprise-level authentication UI with:
 * - Email/Password login
 * - Social login (Google, Facebook, Apple)
 * - Registration with validation
 * - Password reset flow
 * - Smooth animations
 * - Mobile-optimized
 *
 * Perfect for investor demos showing secure, modern authentication
 */

// Validation schemas
const loginSchema = yup.object({
  email: yup
    .string()
    .email('Ongeldig e-mailadres')
    .required('E-mail is verplicht'),
  password: yup
    .string()
    .min(8, 'Wachtwoord moet minimaal 8 tekens bevatten')
    .required('Wachtwoord is verplicht'),
});

const registerSchema = yup.object({
  name: yup
    .string()
    .min(2, 'Naam moet minimaal 2 tekens bevatten')
    .required('Naam is verplicht'),
  email: yup
    .string()
    .email('Ongeldig e-mailadres')
    .required('E-mail is verplicht'),
  password: yup
    .string()
    .min(8, 'Wachtwoord moet minimaal 8 tekens bevatten')
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Wachtwoord moet minimaal 1 hoofdletter, 1 kleine letter en 1 cijfer bevatten'
    )
    .required('Wachtwoord is verplicht'),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref('password'), null], 'Wachtwoorden komen niet overeen')
    .required('Bevestig je wachtwoord'),
});

const forgotPasswordSchema = yup.object({
  email: yup
    .string()
    .email('Ongeldig e-mailadres')
    .required('E-mail is verplicht'),
});

const AuthModal = ({ open, onClose, defaultMode = 'login', onSuccess }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [mode, setMode] = useState(defaultMode); // 'login' | 'register' | 'forgot-password'
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Select correct schema based on mode
  const getSchema = () => {
    switch (mode) {
      case 'register':
        return registerSchema;
      case 'forgot-password':
        return forgotPasswordSchema;
      default:
        return loginSchema;
    }
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: yupResolver(getSchema()),
  });

  // Handle mode change
  const handleModeChange = (newMode) => {
    setMode(newMode);
    setError(null);
    setSuccessMessage(null);
    reset();
  };

  // Handle form submission
  const onSubmit = async (data) => {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));

      if (mode === 'forgot-password') {
        setSuccessMessage('Reset link verzonden! Controleer je e-mail.');
        setTimeout(() => {
          handleModeChange('login');
        }, 3000);
      } else {
        // Success - call parent callback
        onSuccess?.(data);
        onClose();
      }
    } catch (err) {
      setError(err.message || 'Er is iets misgegaan. Probeer het opnieuw.');
    } finally {
      setLoading(false);
    }
  };

  // Social login handlers
  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      // Implement Google OAuth
      console.log('Google login');
      await new Promise((resolve) => setTimeout(resolve, 1000));
      onSuccess?.({ provider: 'google' });
      onClose();
    } catch (err) {
      setError('Google login mislukt');
    } finally {
      setLoading(false);
    }
  };

  const handleFacebookLogin = async () => {
    setLoading(true);
    try {
      // Implement Facebook OAuth
      console.log('Facebook login');
      await new Promise((resolve) => setTimeout(resolve, 1000));
      onSuccess?.({ provider: 'facebook' });
      onClose();
    } catch (err) {
      setError('Facebook login mislukt');
    } finally {
      setLoading(false);
    }
  };

  const handleAppleLogin = async () => {
    setLoading(true);
    try {
      // Implement Apple Sign In
      console.log('Apple login');
      await new Promise((resolve) => setTimeout(resolve, 1000));
      onSuccess?.({ provider: 'apple' });
      onClose();
    } catch (err) {
      setError('Apple login mislukt');
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    switch (mode) {
      case 'register':
        return 'Maak een account';
      case 'forgot-password':
        return 'Wachtwoord vergeten?';
      default:
        return 'Welkom terug!';
    }
  };

  const getSubtitle = () => {
    switch (mode) {
      case 'register':
        return 'Registreer je om je favorieten op te slaan en persoonlijke aanbevelingen te ontvangen';
      case 'forgot-password':
        return 'Voer je e-mailadres in en we sturen je een link om je wachtwoord te resetten';
      default:
        return 'Log in om door te gaan met je boeking';
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          borderRadius: isMobile ? 0 : 3,
          maxWidth: 480,
        },
      }}
    >
      <DialogContent sx={{ p: 0 }}>
        {/* Header */}
        <Box
          sx={{
            position: 'relative',
            p: 3,
            pb: 2,
            background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
            color: 'white',
          }}
        >
          <IconButton
            onClick={onClose}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
              color: 'white',
              width: 48,
              height: 48,
            }}
            aria-label="Sluiten"
          >
            <CloseIcon />
          </IconButton>

          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
            {getTitle()}
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.9 }}>
            {getSubtitle()}
          </Typography>
        </Box>

        {/* Content */}
        <Box sx={{ p: 3 }}>
          {/* Alerts */}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
          {successMessage && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {successMessage}
            </Alert>
          )}

          {/* Social Login (not for forgot password) */}
          {mode !== 'forgot-password' && (
            <>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 3 }}>
                <Button
                  variant="outlined"
                  size="large"
                  fullWidth
                  startIcon={<GoogleIcon />}
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  sx={{
                    justifyContent: 'flex-start',
                    pl: 3,
                    height: 56,
                    textTransform: 'none',
                    fontSize: '1rem',
                    borderColor: 'divider',
                    '&:hover': {
                      borderColor: 'primary.main',
                      bgcolor: alpha(theme.palette.primary.main, 0.05),
                    },
                  }}
                >
                  Doorgaan met Google
                </Button>

                <Button
                  variant="outlined"
                  size="large"
                  fullWidth
                  startIcon={<FacebookIcon />}
                  onClick={handleFacebookLogin}
                  disabled={loading}
                  sx={{
                    justifyContent: 'flex-start',
                    pl: 3,
                    height: 56,
                    textTransform: 'none',
                    fontSize: '1rem',
                    borderColor: 'divider',
                    '&:hover': {
                      borderColor: '#1877F2',
                      bgcolor: alpha('#1877F2', 0.05),
                    },
                  }}
                >
                  Doorgaan met Facebook
                </Button>

                <Button
                  variant="outlined"
                  size="large"
                  fullWidth
                  startIcon={<AppleIcon />}
                  onClick={handleAppleLogin}
                  disabled={loading}
                  sx={{
                    justifyContent: 'flex-start',
                    pl: 3,
                    height: 56,
                    textTransform: 'none',
                    fontSize: '1rem',
                    borderColor: 'divider',
                    '&:hover': {
                      borderColor: 'text.primary',
                      bgcolor: alpha(theme.palette.text.primary, 0.05),
                    },
                  }}
                >
                  Doorgaan met Apple
                </Button>
              </Box>

              <Divider sx={{ my: 3 }}>
                <Typography variant="body2" color="text.secondary">
                  Of met e-mail
                </Typography>
              </Divider>
            </>
          )}

          {/* Email/Password Form */}
          <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
            {/* Name (register only) */}
            {mode === 'register' && (
              <TextField
                fullWidth
                label="Volledige naam"
                placeholder="John Doe"
                {...register('name')}
                error={!!errors.name}
                helperText={errors.name?.message}
                disabled={loading}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonIcon color="action" />
                    </InputAdornment>
                  ),
                }}
                sx={{ mb: 2 }}
              />
            )}

            {/* Email */}
            <TextField
              fullWidth
              type="email"
              label="E-mailadres"
              placeholder="john@example.com"
              {...register('email')}
              error={!!errors.email}
              helperText={errors.email?.message}
              disabled={loading}
              autoComplete="email"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailIcon color="action" />
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 2 }}
            />

            {/* Password (not for forgot password) */}
            {mode !== 'forgot-password' && (
              <TextField
                fullWidth
                type={showPassword ? 'text' : 'password'}
                label="Wachtwoord"
                placeholder="••••••••"
                {...register('password')}
                error={!!errors.password}
                helperText={errors.password?.message}
                disabled={loading}
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockIcon color="action" />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                        aria-label="Toggle password visibility"
                      >
                        {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{ mb: 2 }}
              />
            )}

            {/* Confirm Password (register only) */}
            {mode === 'register' && (
              <TextField
                fullWidth
                type={showConfirmPassword ? 'text' : 'password'}
                label="Bevestig wachtwoord"
                placeholder="••••••••"
                {...register('confirmPassword')}
                error={!!errors.confirmPassword}
                helperText={errors.confirmPassword?.message}
                disabled={loading}
                autoComplete="new-password"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockIcon color="action" />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        edge="end"
                        aria-label="Toggle confirm password visibility"
                      >
                        {showConfirmPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{ mb: 2 }}
              />
            )}

            {/* Forgot Password Link (login only) */}
            {mode === 'login' && (
              <Box sx={{ textAlign: 'right', mb: 3 }}>
                <Link
                  component="button"
                  type="button"
                  variant="body2"
                  onClick={() => handleModeChange('forgot-password')}
                  sx={{ textDecoration: 'none' }}
                >
                  Wachtwoord vergeten?
                </Link>
              </Box>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              variant="contained"
              size="large"
              fullWidth
              disabled={loading}
              sx={{
                height: 56,
                fontSize: '1rem',
                fontWeight: 600,
                mb: 2,
                mt: mode === 'register' ? 1 : 0,
              }}
            >
              {loading ? (
                <CircularProgress size={24} color="inherit" />
              ) : mode === 'register' ? (
                'Account aanmaken'
              ) : mode === 'forgot-password' ? (
                'Reset link versturen'
              ) : (
                'Inloggen'
              )}
            </Button>

            {/* Switch Mode Links */}
            <Box sx={{ textAlign: 'center' }}>
              {mode === 'login' ? (
                <Typography variant="body2" color="text.secondary">
                  Nog geen account?{' '}
                  <Link
                    component="button"
                    type="button"
                    onClick={() => handleModeChange('register')}
                    sx={{ fontWeight: 600, textDecoration: 'none' }}
                  >
                    Registreer nu
                  </Link>
                </Typography>
              ) : mode === 'register' ? (
                <Typography variant="body2" color="text.secondary">
                  Heb je al een account?{' '}
                  <Link
                    component="button"
                    type="button"
                    onClick={() => handleModeChange('login')}
                    sx={{ fontWeight: 600, textDecoration: 'none' }}
                  >
                    Log in
                  </Link>
                </Typography>
              ) : (
                <Link
                  component="button"
                  type="button"
                  variant="body2"
                  onClick={() => handleModeChange('login')}
                  sx={{ textDecoration: 'none' }}
                >
                  ← Terug naar login
                </Link>
              )}
            </Box>

            {/* Terms (register only) */}
            {mode === 'register' && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 3, textAlign: 'center' }}>
                Door te registreren ga je akkoord met onze{' '}
                <Link href="/terms" sx={{ textDecoration: 'none' }}>
                  Algemene Voorwaarden
                </Link>{' '}
                en{' '}
                <Link href="/privacy" sx={{ textDecoration: 'none' }}>
                  Privacybeleid
                </Link>
              </Typography>
            )}
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default AuthModal;
