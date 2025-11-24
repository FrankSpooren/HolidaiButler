import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Button } from '@mui/material';
import { Home as HomeIcon } from '@mui/icons-material';

const NotFound = () => {
  const navigate = useNavigate();
  
  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', p: 3 }}>
      <Typography variant="h1" fontWeight={700} sx={{ fontSize: '8rem', color: 'primary.main' }}>404</Typography>
      <Typography variant="h4" gutterBottom>Page Not Found</Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>The page you're looking for doesn't exist or has been moved.</Typography>
      <Button variant="contained" startIcon={<HomeIcon />} onClick={() => navigate('/dashboard')}>Go to Dashboard</Button>
    </Box>
  );
};

export default NotFound;
