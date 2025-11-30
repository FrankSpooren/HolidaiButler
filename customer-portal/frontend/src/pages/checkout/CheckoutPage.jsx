import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Box, Container, Typography, TextField, Button, Paper, Grid, Stepper, Step, StepLabel, Divider, Alert } from '@mui/material';
import { CreditCard, Person, CheckCircle } from '@mui/icons-material';

const CheckoutPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    cardNumber: '', expiry: '', cvv: '', cardName: '',
  });

  const type = searchParams.get('type') || 'ticket';
  const id = searchParams.get('id');

  const steps = ['Gegevens', 'Betaling', 'Bevestiging'];

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleNext = () => {
    if (activeStep === steps.length - 1) {
      navigate('/checkout/confirmation');
    } else {
      setActiveStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  return (
    <Box sx={{ py: 4, bgcolor: 'grey.50', minHeight: '80vh' }}>
      <Container maxWidth="md">
        <Typography variant="h3" fontWeight={700} gutterBottom>
          Afrekenen
        </Typography>

        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        <Grid container spacing={4}>
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 3 }}>
              {activeStep === 0 && (
                <>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                    <Person color="primary" />
                    <Typography variant="h6" fontWeight={600}>Je gegevens</Typography>
                  </Box>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField fullWidth label="Voornaam" name="firstName" value={formData.firstName} onChange={handleChange} required />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField fullWidth label="Achternaam" name="lastName" value={formData.lastName} onChange={handleChange} required />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField fullWidth label="E-mailadres" name="email" type="email" value={formData.email} onChange={handleChange} required />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField fullWidth label="Telefoonnummer" name="phone" value={formData.phone} onChange={handleChange} />
                    </Grid>
                  </Grid>
                </>
              )}

              {activeStep === 1 && (
                <>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                    <CreditCard color="primary" />
                    <Typography variant="h6" fontWeight={600}>Betaalgegevens</Typography>
                  </Box>
                  <Alert severity="info" sx={{ mb: 3 }}>
                    Dit is een demo. Gebruik test kaart: 4111 1111 1111 1111
                  </Alert>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <TextField fullWidth label="Kaartnummer" name="cardNumber" value={formData.cardNumber} onChange={handleChange} required />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField fullWidth label="Vervaldatum (MM/JJ)" name="expiry" value={formData.expiry} onChange={handleChange} required />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField fullWidth label="CVV" name="cvv" value={formData.cvv} onChange={handleChange} required />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField fullWidth label="Naam op kaart" name="cardName" value={formData.cardName} onChange={handleChange} required />
                    </Grid>
                  </Grid>
                </>
              )}

              {activeStep === 2 && (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <CheckCircle sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
                  <Typography variant="h5" fontWeight={600} gutterBottom>
                    Controleer je bestelling
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    Klik op "Betalen" om je bestelling af te ronden.
                  </Typography>
                </Box>
              )}

              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
                <Button onClick={handleBack} disabled={activeStep === 0}>
                  Terug
                </Button>
                <Button variant="contained" onClick={handleNext}>
                  {activeStep === steps.length - 1 ? 'Betalen' : 'Volgende'}
                </Button>
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Overzicht
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography>Subtotaal</Typography>
                <Typography>€25,00</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography>Servicekosten</Typography>
                <Typography>€2,50</Typography>
              </Box>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="h6" fontWeight={600}>Totaal</Typography>
                <Typography variant="h6" fontWeight={600} color="primary">€27,50</Typography>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default CheckoutPage;
