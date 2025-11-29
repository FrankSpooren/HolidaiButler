import { useState, useEffect } from 'react';
import {
  Snackbar,
  Alert,
  Box,
  Typography,
  LinearProgress,
  IconButton,
  Collapse,
  Paper,
  Button,
  Chip,
} from '@mui/material';
import {
  WifiOff as OfflineIcon,
  Wifi as OnlineIcon,
  Sync as SyncIcon,
  CloudDownload as DownloadIcon,
  Close as CloseIcon,
  CheckCircle as SuccessIcon,
} from '@mui/icons-material';
import { useOffline, useOnlineStatus } from '../hooks/useOffline';

function OfflineIndicator() {
  const isOnline = useOnlineStatus();
  const {
    isSyncing,
    lastSyncTime,
    offlineStats,
    syncData,
    downloadForOffline,
    isSupported,
  } = useOffline();

  const [showBanner, setShowBanner] = useState(false);
  const [showSnackbar, setShowSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [wasOffline, setWasOffline] = useState(false);

  // Show banner when going offline
  useEffect(() => {
    if (!isOnline) {
      setShowBanner(true);
      setWasOffline(true);
    } else if (wasOffline) {
      // Show "back online" message
      setSnackbarMessage('Je bent weer online! Data wordt gesynchroniseerd...');
      setShowSnackbar(true);
      setShowBanner(false);
      setWasOffline(false);
    }
  }, [isOnline, wasOffline]);

  const handleSync = async () => {
    await syncData();
    setSnackbarMessage('Synchronisatie voltooid');
    setShowSnackbar(true);
  };

  const handleDownload = async () => {
    await downloadForOffline();
    setSnackbarMessage('Tickets gedownload voor offline gebruik');
    setShowSnackbar(true);
  };

  const formatLastSync = () => {
    if (!lastSyncTime) return 'Nooit';

    const now = new Date();
    const diff = now - lastSyncTime;
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return 'Zojuist';
    if (minutes < 60) return `${minutes} min geleden`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} uur geleden`;

    const days = Math.floor(hours / 24);
    return `${days} dagen geleden`;
  };

  if (!isSupported) {
    return null;
  }

  return (
    <>
      {/* Offline Banner */}
      <Collapse in={showBanner && !isOnline}>
        <Paper
          elevation={0}
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 1200,
            bgcolor: 'warning.main',
            color: 'warning.contrastText',
            px: 2,
            py: 1,
          }}
        >
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box display="flex" alignItems="center" gap={1}>
              <OfflineIcon />
              <Typography variant="body2" fontWeight="medium">
                Je bent offline
              </Typography>
              {offlineStats && (
                <Chip
                  label={`${offlineStats.ticketsCount} tickets beschikbaar`}
                  size="small"
                  sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'inherit' }}
                />
              )}
            </Box>
            <IconButton
              size="small"
              onClick={() => setShowBanner(false)}
              sx={{ color: 'inherit' }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        </Paper>
      </Collapse>

      {/* Sync Progress */}
      {isSyncing && (
        <Box
          sx={{
            position: 'fixed',
            top: showBanner && !isOnline ? 48 : 0,
            left: 0,
            right: 0,
            zIndex: 1199,
          }}
        >
          <LinearProgress color="primary" />
        </Box>
      )}

      {/* Online Status Indicator (small, persistent) */}
      <Box
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          zIndex: 1100,
        }}
      >
        <Paper
          elevation={3}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            px: 2,
            py: 1,
            borderRadius: 2,
            bgcolor: isOnline ? 'success.light' : 'warning.light',
          }}
        >
          {isOnline ? (
            <OnlineIcon color="success" fontSize="small" />
          ) : (
            <OfflineIcon color="warning" fontSize="small" />
          )}
          <Typography variant="caption" fontWeight="medium">
            {isOnline ? 'Online' : 'Offline'}
          </Typography>

          {isOnline && (
            <>
              <Box sx={{ borderLeft: '1px solid', borderColor: 'divider', height: 20, mx: 1 }} />
              <Typography variant="caption" color="text.secondary">
                Sync: {formatLastSync()}
              </Typography>
              <IconButton
                size="small"
                onClick={handleSync}
                disabled={isSyncing}
                sx={{ ml: 0.5 }}
              >
                <SyncIcon fontSize="small" className={isSyncing ? 'spin' : ''} />
              </IconButton>
            </>
          )}
        </Paper>
      </Box>

      {/* Download for Offline Button (only when online) */}
      {isOnline && offlineStats?.ticketsCount === 0 && (
        <Box
          sx={{
            position: 'fixed',
            bottom: 70,
            right: 16,
            zIndex: 1100,
          }}
        >
          <Button
            variant="contained"
            size="small"
            startIcon={<DownloadIcon />}
            onClick={handleDownload}
            disabled={isSyncing}
          >
            Download voor offline
          </Button>
        </Box>
      )}

      {/* Snackbar for notifications */}
      <Snackbar
        open={showSnackbar}
        autoHideDuration={4000}
        onClose={() => setShowSnackbar(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setShowSnackbar(false)}
          severity="success"
          icon={<SuccessIcon />}
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </>
  );
}

export default OfflineIndicator;
