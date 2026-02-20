import { Box, Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', gap: 2 }}>
      <Typography variant="h1" sx={{ fontWeight: 700, color: 'text.secondary' }}>404</Typography>
      <Typography variant="h6" color="text.secondary">Pagina niet gevonden</Typography>
      <Button variant="contained" onClick={() => navigate('/dashboard')}>Terug naar Dashboard</Button>
    </Box>
  );
}
