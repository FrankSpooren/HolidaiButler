import { Alert, Button } from '@mui/material';
import { useTranslation } from 'react-i18next';

export default function ErrorBanner({ message, onRetry }) {
  const { t } = useTranslation();
  return (
    <Alert
      severity="error"
      action={onRetry && <Button color="inherit" size="small" onClick={onRetry}>{t('common.retry')}</Button>}
      sx={{ mb: 2 }}
    >
      {message || t('common.error')}
    </Alert>
  );
}
