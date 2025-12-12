import { Box, CircularProgress, Typography } from '@mui/material';

function LoadingSpinner({ message = 'Laden...' }) {
  return (
    <Box
      display="flex"
      flexDirection="column"
      justifyContent="center"
      alignItems="center"
      minHeight="60vh"
    >
      <CircularProgress size={60} thickness={4} />
      {message && (
        <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
          {message}
        </Typography>
      )}
    </Box>
  );
}

export default LoadingSpinner;
