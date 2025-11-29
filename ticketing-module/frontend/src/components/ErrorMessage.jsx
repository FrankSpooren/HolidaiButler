import { Alert, AlertTitle, Button, Box } from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';

function ErrorMessage({ title = 'Fout', message, onRetry }) {
  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', mt: 4 }}>
      <Alert
        severity="error"
        action={
          onRetry && (
            <Button
              color="inherit"
              size="small"
              startIcon={<RefreshIcon />}
              onClick={onRetry}
            >
              Opnieuw
            </Button>
          )
        }
      >
        <AlertTitle>{title}</AlertTitle>
        {message || 'Er is een fout opgetreden. Probeer het later opnieuw.'}
      </Alert>
    </Box>
  );
}

export default ErrorMessage;
