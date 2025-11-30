import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Box, Container, Typography, TextField, Button, Paper, Divider, Alert } from '@mui/material';
import { Google as GoogleIcon } from '@mui/icons-material';
import useAuthStore from '../../store/authStore';

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isLoading, error, clearError } = useAuthStore();
  const [formData, setFormData] = useState({ email: '', password: '' });

  const from = location.state?.from?.pathname || '/';

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) clearError();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(formData.email, formData.password);
      navigate(from, { replace: true });
    } catch (err) {
      // Error is handled by store
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', bgcolor: 'grey.100', py: 4 }}>
      <Container maxWidth="sm">
        <Paper sx={{ p: 4 }}>
          <Typography variant="h4" fontWeight={700} textAlign="center" gutterBottom>
            Welkom terug
          </Typography>
          <Typography variant="body1" color="text.secondary" textAlign="center" sx={{ mb: 4 }}>
            Log in op je HolidaiButler account
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="E-mailadres"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              required
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Wachtwoord"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              required
              sx={{ mb: 3 }}
            />
            <Button type="submit" variant="contained" fullWidth size="large" disabled={isLoading}>
              {isLoading ? 'Bezig...' : 'Inloggen'}
            </Button>
          </form>

          <Divider sx={{ my: 3 }}>of</Divider>

          <Button variant="outlined" fullWidth size="large" startIcon={<GoogleIcon />} sx={{ mb: 2 }}>
            Doorgaan met Google
          </Button>

          <Typography variant="body2" textAlign="center" sx={{ mt: 3 }}>
            Nog geen account?{' '}
            <Link to="/signup" style={{ color: 'inherit', fontWeight: 600 }}>
              Meld je aan
            </Link>
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
};

export default LoginPage;
