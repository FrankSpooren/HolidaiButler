import React from 'react';
import { Box, Typography, Card, CardContent, Button } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';

const Leads = () => {
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight={700}>Leads</Typography>
        <Button variant="contained" startIcon={<AddIcon />}>New Lead</Button>
      </Box>
      <Card><CardContent><Typography color="text.secondary">Lead management with scoring, qualification, and conversion tracking.</Typography></CardContent></Card>
    </Box>
  );
};

export default Leads;
