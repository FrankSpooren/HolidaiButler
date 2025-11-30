import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Container, Typography, Button, Grid } from '@mui/material';

const TicketDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  return (
    <Box sx={{ py: 4 }}>
      <Container maxWidth="lg">
        <Grid container spacing={4}>
          <Grid item xs={12} md={8}>
            <Typography variant="h3" fontWeight={700} gutterBottom>
              Ticket Details
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Bekijk de details en koop je ticket.
            </Typography>
          </Grid>
          <Grid item xs={12} md={4}>
            <Box sx={{ bgcolor: 'grey.100', p: 3, borderRadius: 2 }}>
              <Typography variant="h4" fontWeight={700} color="primary" gutterBottom>
                €25
              </Typography>
              <Button variant="contained" fullWidth size="large" onClick={() => navigate(`/checkout?type=ticket&id=${id}`)}>
                Koop nu
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default TicketDetailPage;
