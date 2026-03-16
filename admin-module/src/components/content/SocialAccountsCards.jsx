import { useState, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, Chip, Button, CircularProgress, Alert, Tooltip,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import CancelIcon from '@mui/icons-material/Cancel';
import LinkIcon from '@mui/icons-material/Link';
import FacebookIcon from '@mui/icons-material/Facebook';
import InstagramIcon from '@mui/icons-material/Instagram';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import TwitterIcon from '@mui/icons-material/Twitter';
import YouTubeIcon from '@mui/icons-material/YouTube';
import PinterestIcon from '@mui/icons-material/Pinterest';
import { useTranslation } from 'react-i18next';
import contentService from '../../api/contentService.js';

const PLATFORM_CONFIG = [
  { key: 'facebook', name: 'Facebook', icon: FacebookIcon, color: '#1877F2', connectMethod: null, note: 'Via Meta Business Suite' },
  { key: 'instagram', name: 'Instagram', icon: InstagramIcon, color: '#E4405F', connectMethod: null, note: 'Via Meta Business Suite' },
  { key: 'linkedin', name: 'LinkedIn', icon: LinkedInIcon, color: '#0A66C2', connectMethod: 'connectLinkedIn' },
  { key: 'x', name: 'X (Twitter)', icon: TwitterIcon, color: '#000', connectMethod: null, note: 'API keys vereist' },
  { key: 'pinterest', name: 'Pinterest', icon: PinterestIcon, color: '#BD081C', connectMethod: 'connectPinterest' },
  { key: 'youtube', name: 'YouTube', icon: YouTubeIcon, color: '#FF0000', connectMethod: 'connectYouTube' },
  { key: 'tiktok', name: 'TikTok', icon: null, color: '#000', emoji: '🎵', connectMethod: null, note: 'Binnenkort beschikbaar' },
];

function getStatus(account) {
  if (!account) return { status: 'disconnected', label: 'Niet gekoppeld', color: 'default', icon: CancelIcon };
  if (account.status === 'pending') return { status: 'pending', label: 'In afwachting', color: 'info', icon: WarningIcon };
  if (account.status !== 'active') return { status: 'fix', label: 'Fix nodig', color: 'warning', icon: WarningIcon };
  // Check token expiry
  if (account.token_expires_at) {
    const daysLeft = Math.ceil((new Date(account.token_expires_at) - new Date()) / (1000 * 60 * 60 * 24));
    if (daysLeft < 0) return { status: 'expired', label: 'Token verlopen', color: 'error', icon: WarningIcon, daysLeft: 0 };
    if (daysLeft < 7) return { status: 'expiring', label: `Token: ${daysLeft}d`, color: 'warning', icon: WarningIcon, daysLeft };
    return { status: 'connected', label: 'Gekoppeld', color: 'success', icon: CheckCircleIcon, daysLeft };
  }
  return { status: 'connected', label: 'Gekoppeld', color: 'success', icon: CheckCircleIcon };
}

export default function SocialAccountsCards({ destinationId }) {
  const { t } = useTranslation();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [connecting, setConnecting] = useState(null);

  const loadAccounts = () => {
    setLoading(true);
    contentService.getSocialAccounts(destinationId).then(r => {
      setAccounts(r.data || []);
    }).catch(e => setError(e.message)).finally(() => setLoading(false));
  };

  useEffect(() => { loadAccounts(); }, [destinationId]);

  const handleConnect = async (platform) => {
    if (!platform.connectMethod) return;
    setConnecting(platform.key);
    try {
      const connectFn = contentService[platform.connectMethod];
      if (!connectFn) throw new Error(`Connect method ${platform.connectMethod} not found`);
      const result = await connectFn({ destination_id: destinationId });
      if (result.data?.authorizationUrl) {
        window.open(result.data.authorizationUrl, '_blank', 'width=600,height=700');
      }
    } catch (e) {
      setError(e.response?.data?.error?.message || e.message);
    } finally {
      setConnecting(null);
    }
  };

  const handleRefresh = async (account) => {
    try {
      await contentService.refreshAccountToken(account.id);
      loadAccounts();
    } catch (e) {
      setError(e.response?.data?.error?.message || e.message);
    }
  };

  const handleDisconnect = async (account) => {
    try {
      await contentService.disconnectAccount(account.id);
      setAccounts(prev => prev.filter(a => a.id !== account.id));
    } catch (e) {
      setError(e.response?.data?.error?.message || e.message);
    }
  };

  if (loading) return <Box sx={{ py: 4, textAlign: 'center' }}><CircularProgress /></Box>;

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        {t('contentStudio.socialAccounts', 'Social Accounts')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Koppel je social media accounts om content direct te publiceren vanuit het Content Studio.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      <Grid container spacing={2}>
        {PLATFORM_CONFIG.map(platform => {
          const account = accounts.find(a => a.platform === platform.key);
          const statusInfo = getStatus(account);
          const StatusIcon = statusInfo.icon;
          const isConnecting = connecting === platform.key;
          const canConnect = !!platform.connectMethod;

          return (
            <Grid item xs={12} sm={6} md={4} key={platform.key}>
              <Card variant="outlined" sx={{
                borderColor: statusInfo.status === 'connected' ? 'success.main' : statusInfo.status === 'disconnected' ? 'divider' : 'warning.main',
                borderWidth: statusInfo.status === 'connected' ? 2 : 1,
                transition: 'border-color 0.2s',
              }}>
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  {/* Platform icon */}
                  <Box sx={{ mb: 1 }}>
                    {platform.icon ? (
                      <platform.icon sx={{ fontSize: 36, color: platform.color }} />
                    ) : (
                      <Typography variant="h5">{platform.emoji}</Typography>
                    )}
                  </Box>

                  {/* Platform name */}
                  <Typography variant="subtitle1" fontWeight={600}>{platform.name}</Typography>

                  {/* Status chip */}
                  <Box sx={{ my: 1 }}>
                    <Chip
                      icon={<StatusIcon sx={{ fontSize: 16 }} />}
                      label={statusInfo.label}
                      color={statusInfo.color}
                      size="small"
                    />
                  </Box>

                  {/* Account info */}
                  {account && (
                    <Typography variant="caption" color="text.secondary">
                      {account.account_name || account.account_id || '—'}
                    </Typography>
                  )}

                  {/* Token countdown */}
                  {statusInfo.daysLeft !== undefined && (
                    <Typography variant="caption" display="block" color={statusInfo.daysLeft < 7 ? 'warning.main' : 'text.secondary'}>
                      Token geldig: {statusInfo.daysLeft} dagen
                    </Typography>
                  )}

                  {/* Action buttons */}
                  <Box sx={{ mt: 1.5, display: 'flex', flexDirection: 'column', gap: 0.5, alignItems: 'center' }}>
                    {statusInfo.status === 'connected' && (
                      <Button size="small" variant="outlined" color="error" onClick={() => handleDisconnect(account)}>
                        Ontkoppelen
                      </Button>
                    )}
                    {statusInfo.status === 'disconnected' && canConnect && (
                      <Button
                        size="small"
                        variant="contained"
                        startIcon={isConnecting ? <CircularProgress size={14} /> : <LinkIcon />}
                        disabled={isConnecting}
                        onClick={() => handleConnect(platform)}
                        sx={{ bgcolor: platform.color, '&:hover': { bgcolor: platform.color, filter: 'brightness(0.85)' } }}
                      >
                        Koppelen
                      </Button>
                    )}
                    {statusInfo.status === 'disconnected' && !canConnect && (
                      <Tooltip title={platform.note || 'Niet beschikbaar'}>
                        <span>
                          <Button size="small" variant="outlined" disabled>
                            {platform.note || 'Koppelen'}
                          </Button>
                        </span>
                      </Tooltip>
                    )}
                    {statusInfo.status === 'pending' && canConnect && (
                      <Button
                        size="small"
                        variant="contained"
                        color="info"
                        startIcon={isConnecting ? <CircularProgress size={14} /> : <LinkIcon />}
                        disabled={isConnecting}
                        onClick={() => handleConnect(platform)}
                      >
                        Autorisatie afronden
                      </Button>
                    )}
                    {(statusInfo.status === 'fix' || statusInfo.status === 'expired' || statusInfo.status === 'expiring') && (
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Button size="small" variant="contained" color="warning" onClick={() => handleRefresh(account)}>
                          Token vernieuwen
                        </Button>
                        {canConnect && (
                          <Button size="small" variant="outlined" color="warning" onClick={() => handleConnect(platform)}>
                            Opnieuw koppelen
                          </Button>
                        )}
                      </Box>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
}
