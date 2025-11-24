/**
 * Login Page
 */

import React, { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  TextField,
  Button,
  Typography,
  Link,
  InputAdornment,
  IconButton,
  Divider,
  Alert
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Email as EmailIcon,
  Lock as LockIcon
} from '@mui/icons-material';
import useAuthStore from '../../store/authStore';

const Login = () => {
  const navigate = useNavigate();
  const { login, is2FARequired, verify2FA, isLoading } = useAuthStore();

  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (is2FARequired) {
      const result = await verify2FA(twoFactorCode);
      if (result.success) {
        navigate('/dashboard');
      } else {
        setError(result.error || 'Invalid code');
      }
    } else {
      const result = await login(formData.email, formData.password);
      if (result.success) {
        navigate('/dashboard');
      } else if (result.requires2FA) {
        // 2FA form will be shown
      } else {
        setError(result.error || 'Login failed');
      }
    }
  };

  if (is2FARequired) {
    return (
      <Box component="form" onSubmit={handleSubmit}>
        <Typography variant="h5" fontWeight={600} textAlign="center" gutterBottom>
          Two-Factor Authentication
        </Typography>
        <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ mb: 3 }}>
          Enter the 6-digit code from your authenticator app
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <TextField
          fullWidth
          label="Authentication Code"
          name="code"
          value={twoFactorCode}
          onChange={(e) => setTwoFactorCode(e.target.value)}
          placeholder="000000"
          inputProps={{ maxLength: 6 }}
          sx={{ mb: 3 }}
        />

        <Button
          type="submit"
          fullWidth
          variant="contained"
          size="large"
          disabled={isLoading || twoFactorCode.length !== 6}
          sx={{ mb: 2 }}
        >
          {isLoading ? 'Verifying...' : 'Verify'}
        </Button>
      </Box>
    );
  }

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Typography variant="h5" fontWeight={600} textAlign="center" gutterBottom>
        Welcome Back
      </Typography>
      <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ mb: 3 }}>
        Sign in to your account to continue
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <TextField
        fullWidth
        label="Email Address"
        name="email"
        type="email"
        value={formData.email}
        onChange={handleChange}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <EmailIcon sx={{ color: 'text.secondary' }} />
            </InputAdornment>
          )
        }}
        sx={{ mb: 2 }}
      />

      <TextField
        fullWidth
        label="Password"
        name="password"
        type={showPassword ? 'text' : 'password'}
        value={formData.password}
        onChange={handleChange}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <LockIcon sx={{ color: 'text.secondary' }} />
            </InputAdornment>
          ),
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                onClick={() => setShowPassword(!showPassword)}
                edge="end"
              >
                {showPassword ? <VisibilityOff /> : <Visibility />}
              </IconButton>
            </InputAdornment>
          )
        }}
        sx={{ mb: 1 }}
      />

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
        <Link component={RouterLink} to="/forgot-password" variant="body2">
          Forgot password?
        </Link>
      </Box>

      <Button
        type="submit"
        fullWidth
        variant="contained"
        size="large"
        disabled={isLoading}
        sx={{ mb: 2 }}
      >
        {isLoading ? 'Signing in...' : 'Sign In'}
      </Button>

      <Divider sx={{ my: 2 }}>
        <Typography variant="body2" color="text.secondary">
          or
        </Typography>
      </Divider>

      <Typography variant="body2" textAlign="center">
        Don't have an account?{' '}
        <Link component={RouterLink} to="/register" fontWeight={600}>
          Sign Up
        </Link>
      </Typography>
    </Box>
  );
};

export default Login;
