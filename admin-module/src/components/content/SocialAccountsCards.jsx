import { useState, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, Chip, Button, CircularProgress, Alert, Tooltip,
  Select, MenuItem, FormControl, InputLabel, Dialog, DialogTitle, DialogContent, DialogActions, TextField,
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
  { key: 'facebook', name: 'Facebook', icon: FacebookIcon, color: '#1877F2', connectMethod: 'meta' },
  { key: 'instagram', name: 'Instagram', icon: InstagramIcon, color: '#E4405F', connectMethod: 'meta' },
  { key: 'linkedin', name: 'LinkedIn', icon: LinkedInIcon, color: '#0A66C2', connectMethod: 'linkedin' },
  { key: 'x', name: 'X (Twitter)', icon: TwitterIcon, color: '#000', connectMethod: null, note: 'Binnenkort beschikbaar' },
  { key: 'pinterest', name: 'Pinterest', icon: PinterestIcon, color: '#BD081C', connectMethod: 'pinterest' },
  { key: 'youtube', name: 'YouTube', icon: YouTubeIcon, color: '#FF0000', connectMethod: 'youtube' },
  { key: 'tiktok', name: 'TikTok', icon: null, color: '#000', emoji: '🎵', connectMethod: null, note: 'Binnenkort beschikbaar' },
];

const LANGUAGES = [
  { code: 'nl', label: 'Nederlands' },
  { code: 'en', label: 'English' },
  { code: 'de', label: 'Deutsch' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
];

function getStatus(account, t) {
  if (!account) return { status: 'disconnected', label: t('contentStudio.social.notConnected', 'Niet gekoppeld'), color: 'default', icon: CancelIcon };
  if (account.status === 'pending') return { status: 'pending', label: 'In afwachting', color: 'info', icon: WarningIcon };
  if (account.status !== 'active') return { status: 'fix', label: 'Fix nodig', color: 'warning', icon: WarningIcon };
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
  const [enabledPlatforms, setEnabledPlatforms] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [connecting, setConnecting] = useState(null);
  const [metaDialog, setMetaDialog] = useState(null);
  const [metaToken, setMetaToken] = useState('');
  const [metaPageId, setMetaPageId] = useState('');
  const [showAllPlatforms, setShowAllPlatforms] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [accountsRes, platformsRes] = await Promise.all([
        contentService.getSocialAccounts(destinationId),
        contentService.getSocialPlatforms(destinationId),
      ]);
      setAccounts(accountsRes.data || []);
      setEnabledPlatforms(platformsRes.data || {});
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [destinationId]);

  const handleConnect = async (platform) => {
    if (!platform.connectMethod) return;

    // Meta platforms: open token dialog
    if (platform.connectMethod === 'meta') {
      setMetaDialog({ platform: platform.key });
      setMetaToken('');
      setMetaPageId('');
      return;
    }

    setConnecting(platform.key);
    try {
      const methodName = `connect${platform.connectMethod.charAt(0).toUpperCase()}${platform.connectMethod.slice(1)}`;
      const connectFn = contentService[methodName];
      if (!connectFn) throw new Error(`Connect method ${methodName} not found`);
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

  const handleMetaConnect = async () => {
    if (!metaToken.trim() || !metaDialog) return;
    setConnecting(metaDialog.platform);
    try {
      await contentService.connectMeta({
        destination_id: destinationId,
        platform: metaDialog.platform,
        access_token: metaToken.trim(),
        page_id: metaPageId.trim() || undefined,
      });
      setMetaDialog(null);
      setMetaToken('');
      setMetaPageId('');
      loadData();
    } catch (e) {
      setError(e.response?.data?.error?.message || e.message);
    } finally {
      setConnecting(null);
    }
  };

  const handleRefresh = async (account) => {
    try {
      await contentService.refreshAccountToken(account.id);
      loadData();
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

  const handleLanguageChange = async (account, newLang) => {
    try {
      await contentService.updateSocialAccount(account.id, { target_language: newLang });
      setAccounts(prev => prev.map(a => a.id === account.id ? { ...a, target_language: newLang } : a));
    } catch (e) {
      setError(e.response?.data?.error?.message || e.message);
    }
  };

  if (loading) return <Box sx={{ py: 4, textAlign: 'center' }}><CircularProgress /></Box>;

  // Show enabled platforms first, then "Extra kanaal toevoegen" for the rest
  const enabledKeys = enabledPlatforms ? Object.entries(enabledPlatforms).filter(([, v]) => v === true).map(([k]) => k) : [];
  const enabledPlatformsList = enabledKeys.length > 0
    ? PLATFORM_CONFIG.filter(p => enabledKeys.includes(p.key))
    : PLATFORM_CONFIG;
  const extraPlatforms = PLATFORM_CONFIG.filter(p => !enabledKeys.includes(p.key));
  const visiblePlatforms = showAllPlatforms ? PLATFORM_CONFIG : enabledPlatformsList;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="h6">
          {t('contentStudio.socialAccounts', 'Social Accounts')}
        </Typography>
        {extraPlatforms.length > 0 && (
          <Button size="small" variant="outlined" onClick={() => setShowAllPlatforms(p => !p)}>
            {showAllPlatforms ? 'Toon alleen actieve' : `+ ${extraPlatforms.length} extra kanalen`}
          </Button>
        )}
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {t('contentStudio.socialAccountsDesc', 'Koppel je social media accounts om content direct te publiceren. Kanalen worden beheerd via Instellingen → Modules & kanalen.')}
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      {visiblePlatforms.length === 0 && (
        <Alert severity="info">
          {t('contentStudio.noPlatformsEnabled', 'Geen social media platformen ingeschakeld voor deze destination. Configureer dit in de feature flags.')}
        </Alert>
      )}

      <Grid container spacing={2}>
        {visiblePlatforms.map(platform => {
          const account = accounts.find(a => a.platform === platform.key);
          const statusInfo = getStatus(account, t);
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

                  {/* Account info + verification link */}
                  {account && (
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        {account.account_name || account.account_id || '—'}
                      </Typography>
                      {statusInfo.status === 'connected' && account.account_id && (() => {
                        let meta = {};
                        try { meta = typeof account.metadata === 'string' ? JSON.parse(account.metadata) : (account.metadata || {}); } catch { /* empty */ }
                        const verifyUrl = meta.pageUrl
                          || (platform.key === 'facebook' ? `https://www.facebook.com/${account.account_id}` : null)
                          || (platform.key === 'instagram' ? `https://www.instagram.com/${account.account_name || account.account_id}` : null)
                          || (platform.key === 'linkedin' ? `https://www.linkedin.com/company/${account.account_id}` : null)
                          || (platform.key === 'youtube' ? `https://www.youtube.com/channel/${account.account_id}` : null)
                          || (platform.key === 'pinterest' ? `https://www.pinterest.com/${account.account_id}` : null);
                        return verifyUrl ? (
                          <Box sx={{ mt: 0.5 }}>
                            <Typography component="a" variant="caption" href={verifyUrl} target="_blank" rel="noopener noreferrer"
                              sx={{ color: platform.color, textDecoration: 'underline', cursor: 'pointer', '&:hover': { opacity: 0.8 } }}>
                              Controleer account →
                            </Typography>
                          </Box>
                        ) : null;
                      })()}
                    </Box>
                  )}

                  {/* Token countdown */}
                  {statusInfo.daysLeft !== undefined && (
                    <Typography variant="caption" display="block" color={statusInfo.daysLeft < 7 ? 'warning.main' : 'text.secondary'}>
                      Token geldig: {statusInfo.daysLeft} dagen
                    </Typography>
                  )}

                  {/* Target language dropdown — only for connected accounts */}
                  {account && statusInfo.status === 'connected' && (
                    <FormControl size="small" sx={{ mt: 1.5, minWidth: 140 }}>
                      <InputLabel id={`lang-${account.id}`}>{t('contentStudio.targetLanguage', 'Doeltaal')}</InputLabel>
                      <Select
                        labelId={`lang-${account.id}`}
                        value={account.target_language || 'en'}
                        label={t('contentStudio.targetLanguage', 'Doeltaal')}
                        onChange={(e) => handleLanguageChange(account, e.target.value)}
                        size="small"
                      >
                        {LANGUAGES.map(l => (
                          <MenuItem key={l.code} value={l.code}>{l.label}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}

                  {/* Action buttons */}
                  <Box sx={{ mt: 1.5, display: 'flex', flexDirection: 'column', gap: 0.5, alignItems: 'center' }}>
                    {statusInfo.status === 'connected' && (
                      <Button size="small" variant="outlined" color="error" onClick={() => handleDisconnect(account)}>
                        {t('contentStudio.disconnect', 'Ontkoppelen')}
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
                        {t('contentStudio.connect', 'Koppelen')}
                      </Button>
                    )}
                    {statusInfo.status === 'disconnected' && !canConnect && (
                      <Tooltip title={platform.note || 'Niet beschikbaar'}>
                        <span>
                          <Button size="small" variant="outlined" disabled>
                            {platform.note || t('contentStudio.connect', 'Koppelen')}
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
                        {t('contentStudio.finishAuth', 'Autorisatie afronden')}
                      </Button>
                    )}
                    {(statusInfo.status === 'fix' || statusInfo.status === 'expired' || statusInfo.status === 'expiring') && (
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Button size="small" variant="contained" color="warning" onClick={() => handleRefresh(account)}>
                          {t('contentStudio.refreshToken', 'Token vernieuwen')}
                        </Button>
                        {canConnect && (
                          <Button size="small" variant="outlined" color="warning" onClick={() => handleConnect(platform)}>
                            {t('contentStudio.reconnect', 'Opnieuw koppelen')}
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

      {/* Meta (Facebook/Instagram) Token Dialog */}
      <Dialog open={!!metaDialog} onClose={() => setMetaDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {metaDialog?.platform === 'facebook' ? 'Facebook' : 'Instagram'} koppelen
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Voer een Page Access Token in vanuit Meta Business Suite.
            Ga naar <strong>business.facebook.com → Settings → Accounts → Pages → jouw pagina → Generate Token</strong>.
          </Typography>
          <TextField
            fullWidth size="small" label="Page Access Token" value={metaToken}
            onChange={e => setMetaToken(e.target.value)} sx={{ mb: 2 }}
            placeholder="EAA..." multiline rows={3}
          />
          <TextField
            fullWidth size="small" label="Page ID (optioneel)" value={metaPageId}
            onChange={e => setMetaPageId(e.target.value)}
            placeholder="123456789" helperText="Als je meerdere pagina's hebt, vul het Page ID in"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMetaDialog(null)}>{t('common.cancel', 'Annuleren')}</Button>
          <Button variant="contained" onClick={handleMetaConnect}
            disabled={!metaToken.trim() || connecting === metaDialog?.platform}
            startIcon={connecting === metaDialog?.platform ? <CircularProgress size={16} /> : <LinkIcon />}
            sx={{ bgcolor: metaDialog?.platform === 'facebook' ? '#1877F2' : '#E4405F' }}>
            Koppelen
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
