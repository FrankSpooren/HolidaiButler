import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Container, Typography, Button, Grid, TextField } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';

const RestaurantDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  return (
    <Box sx={{ py: 4 }}>
      <Container maxWidth="lg">
        <Grid container spacing={4}>
          <Grid item xs={12} md={8}>
            <Typography variant="h3" fontWeight={700} gutterBottom>
              Restaurant Details
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Bekijk het menu en reserveer een tafel.
            </Typography>
          </Grid>
          <Grid item xs={12} md={4}>
            <Box sx={{ bgcolor: 'grey.100', p: 3, borderRadius: 2 }}>
              <Typography variant="h5" fontWeight={600} gutterBottom>
                Reserveren
              </Typography>
              <TextField fullWidth label="Aantal personen" type="number" defaultValue={2} sx={{ mb: 2 }} />
              <TextField fullWidth label="Datum" type="date" InputLabelProps={{ shrink: true }} sx={{ mb: 2 }} />
              <TextField fullWidth label="Tijd" type="time" InputLabelProps={{ shrink: true }} sx={{ mb: 2 }} />
              <Button variant="contained" fullWidth size="large" onClick={() => navigate(`/checkout?type=restaurant&id=${id}`)}>
                Reserveer nu
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default RestaurantDetailPage;
