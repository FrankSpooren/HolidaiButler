import { useState, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, Chip, Button, CircularProgress, Alert,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import CancelIcon from '@mui/icons-material/Cancel';
import FacebookIcon from '@mui/icons-material/Facebook';
import InstagramIcon from '@mui/icons-material/Instagram';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import TwitterIcon from '@mui/icons-material/Twitter';
import YouTubeIcon from '@mui/icons-material/YouTube';
import PinterestIcon from '@mui/icons-material/Pinterest';
import { useTranslation } from 'react-i18next';
import contentService from '../../api/contentService.js';

const PLATFORM_CONFIG = [
  { key: 'facebook', name: 'Facebook', icon: FacebookIcon, color: '#1877F2' },
  { key: 'instagram', name: 'Instagram', icon: InstagramIcon, color: '#E4405F' },
  { key: 'linkedin', name: 'LinkedIn', icon: LinkedInIcon, color: '#0A66C2' },
  { key: 'x', name: 'X (Twitter)', icon: TwitterIcon, color: '#000' },
  { key: 'pinterest', name: 'Pinterest', icon: PinterestIcon, color: '#BD081C' },
  { key: 'tiktok', name: 'TikTok', icon: null, color: '#000', emoji: '🎵' },
];

function getStatus(account) {
  if (!account) return { status: 'disconnected', label: 'Niet gekoppeld', color: 'default', icon: CancelIcon };
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

  useEffect(() => {
    setLoading(true);
    contentService.getSocialAccounts(destinationId).then(r => {
      setAccounts(r.data || []);
    }).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, [destinationId]);

  if (loading) return <Box sx={{ py: 4, textAlign: 'center' }}><CircularProgress /></Box>;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        {t('contentStudio.socialAccounts', 'Social Accounts')}
      </Typography>
      <Grid container spacing={2}>
        {PLATFORM_CONFIG.map(platform => {
          const account = accounts.find(a => a.platform === platform.key);
          const statusInfo = getStatus(account);
          const StatusIcon = statusInfo.icon;

          return (
            <Grid item xs={12} sm={6} md={4} key={platform.key}>
              <Card variant="outlined" sx={{
                borderColor: statusInfo.status === 'connected' ? 'success.main' : statusInfo.status === 'disconnected' ? 'divider' : 'warning.main',
                borderWidth: statusInfo.status === 'connected' ? 2 : 1,
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
                      Token: {statusInfo.daysLeft}d
                    </Typography>
                  )}

                  {/* Action button */}
                  <Box sx={{ mt: 1.5 }}>
                    {statusInfo.status === 'connected' && (
                      <Button size="small" variant="outlined" color="error" onClick={async () => {
                        if (account) {
                          await contentService.disconnectAccount(account.id);
                          setAccounts(prev => prev.filter(a => a.id !== account.id));
                        }
                      }}>
                        Disconnect
                      </Button>
                    )}
                    {statusInfo.status === 'disconnected' && (
                      <Button size="small" variant="contained" disabled>
                        Connect
                      </Button>
                    )}
                    {(statusInfo.status === 'fix' || statusInfo.status === 'expired' || statusInfo.status === 'expiring') && (
                      <Button size="small" variant="contained" color="warning" onClick={async () => {
                        if (account) {
                          await contentService.refreshAccountToken(account.id);
                          const r = await contentService.getSocialAccounts(destinationId);
                          setAccounts(r.data || []);
                        }
                      }}>
                        Reconnect
                      </Button>
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
