import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Container, Typography, Button, Grid } from '@mui/material';

const EventDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  return (
    <Box sx={{ py: 4 }}>
      <Container maxWidth="lg">
        <Typography variant="h3" fontWeight={700} gutterBottom>
          Event Details
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Bekijk de details van dit evenement.
        </Typography>
        <Button variant="contained" onClick={() => navigate('/agenda')}>
          Terug naar agenda
        </Button>
      </Container>
    </Box>
  );
};

export default EventDetailPage;
