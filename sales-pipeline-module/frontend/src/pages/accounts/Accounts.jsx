import React from 'react';
import { Box, Typography, Card, CardContent, Button } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';

const Accounts = () => {
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight={700}>Accounts</Typography>
        <Button variant="contained" startIcon={<AddIcon />}>New Account</Button>
      </Box>
      <Card>
        <CardContent>
          <Typography color="text.secondary">Account management with company profiles, deal history, and health scoring.</Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Accounts;
