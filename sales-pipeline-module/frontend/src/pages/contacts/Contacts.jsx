import React from 'react';
import { Box, Typography, Card, CardContent, Button } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';

const Contacts = () => {
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight={700}>Contacts</Typography>
        <Button variant="contained" startIcon={<AddIcon />}>New Contact</Button>
      </Box>
      <Card><CardContent><Typography color="text.secondary">Contact management with activity tracking and communication history.</Typography></CardContent></Card>
    </Box>
  );
};

export default Contacts;
