import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Container, Typography, Button, Paper } from '@mui/material';
import { CheckCircle, Home, Receipt } from '@mui/icons-material';

const ConfirmationPage = () => {
  const navigate = useNavigate();

  return (
    <Box sx={{ py: 8, bgcolor: 'grey.50', minHeight: '80vh' }}>
      <Container maxWidth="sm">
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <CheckCircle sx={{ fontSize: 100, color: 'success.main', mb: 3 }} />
          <Typography variant="h4" fontWeight={700} gutterBottom>
            Bedankt voor je bestelling!
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            Je boeking is bevestigd. We hebben een bevestigingsmail gestuurd naar je e-mailadres.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
            Boekingsnummer: <strong>HB-2024-001234</strong>
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button variant="contained" startIcon={<Receipt />} onClick={() => navigate('/account/bookings')}>
              Bekijk boeking
            </Button>
            <Button variant="outlined" startIcon={<Home />} onClick={() => navigate('/')}>
              Terug naar home
            </Button>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default ConfirmationPage;
