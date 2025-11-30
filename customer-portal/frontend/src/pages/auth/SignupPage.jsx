import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Box, Container, Typography, TextField, Button, Paper, Divider, Alert, Checkbox, FormControlLabel } from '@mui/material';
import { Google as GoogleIcon } from '@mui/icons-material';
import useAuthStore from '../../store/authStore';

const SignupPage = () => {
  const navigate = useNavigate();
  const { signup, isLoading, error, clearError } = useAuthStore();
  const [formData, setFormData] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [acceptTerms, setAcceptTerms] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) clearError();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      return; // Add validation
    }
    try {
      await signup({ name: formData.name, email: formData.email, password: formData.password });
      navigate('/');
    } catch (err) {
      // Error is handled by store
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', bgcolor: 'grey.100', py: 4 }}>
      <Container maxWidth="sm">
        <Paper sx={{ p: 4 }}>
          <Typography variant="h4" fontWeight={700} textAlign="center" gutterBottom>
            Account aanmaken
          </Typography>
          <Typography variant="body1" color="text.secondary" textAlign="center" sx={{ mb: 4 }}>
            Word lid van HolidaiButler
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

          <form onSubmit={handleSubmit}>
            <TextField fullWidth label="Naam" name="name" value={formData.name} onChange={handleChange} required sx={{ mb: 2 }} />
            <TextField fullWidth label="E-mailadres" name="email" type="email" value={formData.email} onChange={handleChange} required sx={{ mb: 2 }} />
            <TextField fullWidth label="Wachtwoord" name="password" type="password" value={formData.password} onChange={handleChange} required sx={{ mb: 2 }} />
            <TextField fullWidth label="Bevestig wachtwoord" name="confirmPassword" type="password" value={formData.confirmPassword} onChange={handleChange} required sx={{ mb: 2 }} />
            <FormControlLabel control={<Checkbox checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} />} label="Ik ga akkoord met de algemene voorwaarden" sx={{ mb: 2 }} />
            <Button type="submit" variant="contained" fullWidth size="large" disabled={isLoading || !acceptTerms}>
              {isLoading ? 'Bezig...' : 'Account aanmaken'}
            </Button>
          </form>

          <Divider sx={{ my: 3 }}>of</Divider>

          <Button variant="outlined" fullWidth size="large" startIcon={<GoogleIcon />}>
            Doorgaan met Google
          </Button>

          <Typography variant="body2" textAlign="center" sx={{ mt: 3 }}>
            Heb je al een account?{' '}
            <Link to="/login" style={{ color: 'inherit', fontWeight: 600 }}>
              Log in
            </Link>
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
};

export default SignupPage;
