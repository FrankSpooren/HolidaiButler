import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Paper, Typography, TextField, Button,
  Alert, InputAdornment, IconButton, CircularProgress, Link,
  Table, TableHead, TableBody, TableRow, TableCell, TableContainer
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TranslateIcon from '@mui/icons-material/Translate';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import BrushIcon from '@mui/icons-material/Brush';
import BarChartIcon from '@mui/icons-material/BarChart';
import SecurityIcon from '@mui/icons-material/Security';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import { useTranslation } from 'react-i18next';
import useAuthStore from '../stores/authStore.js';
import { isStudioMode } from '../utils/studioMode.js';

const USP_ITEMS = [
  { icon: AutoAwesomeIcon, titleKey: 'auth.usp.aiTitle', descKey: 'auth.usp.aiDesc', titleFallback: 'Relevante Content Generatie', descFallback: 'Genereer blogs, social posts en video scripts, gebaseerd op actueel online vertoond gedrag via onze multi-source strategie.' },
  { icon: TrendingUpIcon, titleKey: 'auth.usp.seoTitle', descKey: 'auth.usp.seoDesc', titleFallback: 'SEO Optimalisatie', descFallback: 'Ingebouwde SEO-scoring en automatische verbetering voor maximale vindbaarheid (zelflerende systematiek).' },
  { icon: TranslateIcon, titleKey: 'auth.usp.translateTitle', descKey: 'auth.usp.translateDesc', titleFallback: 'Meertaligheid', descFallback: 'Vertaal in onge\u00ebvenaarde nauwkeurigheid naar 100+ talen met \u00e9\u00e9n klik.' },
  { icon: CalendarMonthIcon, titleKey: 'auth.usp.calendarTitle', descKey: 'auth.usp.calendarDesc', titleFallback: 'Optimale Content Flow', descFallback: 'Plan en publiceer content over alle kanalen vanuit \u00e9\u00e9n overzicht, inclusief batch-functie en speciale campagne-tool.' },
  { icon: BrushIcon, titleKey: 'auth.usp.brandTitle', descKey: 'auth.usp.brandDesc', titleFallback: 'Merk Profiel & Tone of Voice', descFallback: 'Uw merkidentiteit, doelgroepen en knowledge base als fundament voor elke AI-generatie.' },
  { icon: BarChartIcon, titleKey: 'auth.usp.analyticsTitle', descKey: 'auth.usp.analyticsDesc', titleFallback: 'Analytics', descFallback: 'Statistieken per content item en kanaal t.b.v. automatisch verbeteren van content.' },
];

// yes = full support, partial = limited, no = not available
// short = compact label for mobile (max ~25 chars)
const COMPARE_FEATURES = [
  { feature: 'AI content generatie (blog, social, video)', short: 'AI content generatie', studio: 'yes', hootsuite: 'partial', jasper: 'yes' },
  { feature: 'Multi-source trending analyse', short: 'Trending analyse', studio: 'yes', hootsuite: 'no', jasper: 'no' },
  { feature: 'Zelflerende SEO-scoring & auto-improve', short: 'SEO-scoring & auto-improve', studio: 'yes', hootsuite: 'no', jasper: 'partial' },
  { feature: 'Meertalig publiceren (100+ talen)', short: 'Meertalig (100+ talen)', studio: 'yes', hootsuite: 'partial', jasper: 'partial' },
  { feature: 'Merk Profiel & Tone of Voice engine', short: 'Tone of Voice engine', studio: 'yes', hootsuite: 'no', jasper: 'partial' },
  { feature: 'Knowledge Base (PDF/URL/tekst)', short: 'Knowledge Base', studio: 'yes', hootsuite: 'no', jasper: 'yes' },
  { feature: 'Doelgroep-persona\u2019s', short: 'Doelgroep-persona\u2019s', studio: 'yes', hootsuite: 'no', jasper: 'partial' },
  { feature: 'Content kalender + batch planning', short: 'Kalender + batch', studio: 'yes', hootsuite: 'yes', jasper: 'no' },
  { feature: 'One-click campagne generatie', short: 'One-click campagne', studio: 'yes', hootsuite: 'no', jasper: 'no' },
  { feature: 'Multi-platform publishing (6+ kanalen)', short: 'Multi-platform publish', studio: 'yes', hootsuite: 'yes', jasper: 'no' },
  { feature: 'Per-platform content repurposing', short: 'Content repurposing', studio: 'yes', hootsuite: 'partial', jasper: 'partial' },
  { feature: 'Per-item & per-kanaal analytics', short: 'Per-item analytics', studio: 'yes', hootsuite: 'yes', jasper: 'no' },
  { feature: 'Brand voice real-time check', short: 'Brand voice check', studio: 'yes', hootsuite: 'no', jasper: 'partial' },
  { feature: 'EU AI Act & GDPR compliant', short: 'EU AI Act & GDPR', studio: 'yes', hootsuite: 'partial', jasper: 'no' },
  { feature: '100% Europese infrastructuur', short: '100% EU infra', studio: 'yes', hootsuite: 'no', jasper: 'no' },
  { feature: 'Concurrent-analyse', short: 'Concurrent-analyse', studio: 'yes', hootsuite: 'partial', jasper: 'no' },
];

function FeatureIcon({ value, small }) {
  const sz = small ? 15 : 18;
  if (value === 'yes') return <CheckCircleIcon sx={{ fontSize: sz, color: '#22c55e' }} />;
  if (value === 'partial') return <RemoveCircleOutlineIcon sx={{ fontSize: sz, color: '#f59e0b' }} />;
  return <CancelIcon sx={{ fontSize: sz, color: '#d1d5db' }} />;
}

export default function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const login = useAuthStore(s => s.login);
  const studioMode = isStudioMode();

  const [uspIndex, setUspIndex] = useState(0);
  const touchStartX = useRef(0);

  const handleTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e) => {
    const delta = touchStartX.current - e.changedTouches[0].clientX;
    if (delta > 50) setUspIndex(i => Math.min(i + 1, USP_ITEMS.length - 1));
    else if (delta < -50) setUspIndex(i => Math.max(i - 1, 0));
  };

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    setError('');

    try {
      const result = await login(email, password);
      const user = result.data?.user;
      if (studioMode || user?.destinationType === 'content_only') {
        navigate('/content-studio', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      const code = err.response?.data?.error?.code;
      if (code === 'INVALID_CREDENTIALS' || code === 'ADMIN_REQUIRED') {
        setError(t('auth.invalidCredentials'));
      } else {
        setError(t('auth.serverError'));
      }
    } finally {
      setLoading(false);
    }
  };

  // Standard admin login (non-studio)
  if (!studioMode) {
    return (
      <Box sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)'
      }}>
        <Paper elevation={8} sx={{ p: 5, maxWidth: 420, width: '100%', borderRadius: 3 }}>
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary' }}>
              HolidaiButler
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              {t('auth.loginTitle')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {t('auth.loginSubtitle')}
            </Typography>
          </Box>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <form onSubmit={handleSubmit}>
            <TextField fullWidth label={t('auth.email')} type="email" autoComplete="email"
              value={email} onChange={(e) => setEmail(e.target.value)} sx={{ mb: 2 }} required />
            <TextField fullWidth label={t('auth.password')}
              type={showPassword ? 'text' : 'password'} autoComplete="current-password"
              value={password} onChange={(e) => setPassword(e.target.value)} sx={{ mb: 3 }} required
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" size="small">
                      {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
            <Button type="submit" fullWidth variant="contained" size="large"
              disabled={loading || !email || !password} sx={{ py: 1.5, fontSize: '1rem' }}>
              {loading ? <CircularProgress size={24} color="inherit" /> : t('auth.login')}
            </Button>
          </form>
        </Paper>
      </Box>
    );
  }

  // ─── STUDIO MODE: Branded landing page ───
  return (
    <Box sx={{
      minHeight: '100vh',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      bgcolor: '#FAFAF8',
      color: '#1C1917',
    }}>
      {/* ── HERO SECTION ── */}
      <Box sx={{
        background: 'linear-gradient(160deg, #7FA594, #5E8B7E)',
        color: '#fff',
        pt: { xs: 6, md: 10 },
        pb: { xs: 8, md: 12 },
        px: 3,
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <Box sx={{
          position: 'absolute', inset: 0, opacity: 0.04,
          backgroundImage: 'radial-gradient(circle at 25% 25%, #fff 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }} />

        <Box sx={{ position: 'relative', maxWidth: 800, mx: 'auto' }}>
          <Box
            component="img"
            src="/hb-logo.png"
            alt="HolidaiButler"
            sx={{
              width: { xs: 80, md: 100 },
              height: 'auto',
              mb: 2,
              mx: 'auto',
              display: 'block',
              mixBlendMode: 'multiply',
              borderRadius: '16px',
            }}
          />

          <Typography sx={{
            fontSize: { xs: '2rem', md: '2.75rem' },
            fontWeight: 800,
            lineHeight: 1.15,
            mb: 2,
            letterSpacing: '-0.02em',
          }}>
            AI{' '}
            <Box component="span" sx={{ color: '#D4AF37' }}>Content Studio</Box>
          </Typography>

          <Typography sx={{
            fontSize: { xs: '1rem', md: '1.2rem' },
            maxWidth: 620,
            mx: 'auto',
            opacity: 0.9,
            lineHeight: 1.7,
            mb: 4,
          }}>
            {t('auth.studioHeroText', 'Uw AI-aangedreven content engine. Genereer, optimaliseer en publiceer professionele content in uw eigen merkstem \u2014 op alle platforms tegelijk.')}
          </Typography>

          <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'center', flexWrap: 'wrap' }}>
            {['EU AI Act Compliant', 'GDPR-proof', 'Mistral AI', 'DeepL Pro', '100% EU Data'].map(badge => (
              <Box key={badge} sx={{
                bgcolor: 'rgba(255,255,255,0.15)',
                px: 2, py: 0.75,
                borderRadius: '24px',
                fontSize: '0.8rem',
                fontWeight: 500,
                backdropFilter: 'blur(8px)',
              }}>
                {badge}
              </Box>
            ))}
          </Box>
        </Box>
      </Box>

      {/* ── MAIN: LOGIN + USPs ── */}
      <Box sx={{
        maxWidth: 1100,
        mx: 'auto',
        px: 3,
        mt: { xs: -4, md: -6 },
        position: 'relative',
        zIndex: 1,
      }}>
        <Box sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          gap: 4,
          alignItems: 'flex-start',
        }}>
          {/* Login Card */}
          <Paper elevation={12} sx={{
            p: 4,
            borderRadius: 3,
            width: { xs: '100%', md: 380 },
            flexShrink: 0,
          }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5, color: '#1C1917' }}>
              {t('auth.studioWelcome', 'Welkom bij uw Content Studio')}
            </Typography>
            <Typography variant="body2" sx={{ color: '#6B7280', mb: 3 }}>
              {t('auth.studioLoginSubtitle', 'Log in met uw account om te starten')}
            </Typography>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <form onSubmit={handleSubmit}>
              <TextField fullWidth label={t('auth.email')} type="email" autoComplete="email"
                value={email} onChange={(e) => setEmail(e.target.value)} sx={{ mb: 2 }} required size="small" />
              <TextField fullWidth label={t('auth.password')}
                type={showPassword ? 'text' : 'password'} autoComplete="current-password"
                value={password} onChange={(e) => setPassword(e.target.value)} sx={{ mb: 3 }} required size="small"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" size="small">
                        {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />
              <Button type="submit" fullWidth variant="contained" size="large"
                disabled={loading || !email || !password}
                sx={{
                  py: 1.25, fontSize: '0.95rem', fontWeight: 600,
                  bgcolor: '#5E8B7E', borderRadius: '8px',
                  '&:hover': { bgcolor: '#4A7066' },
                }}>
                {loading ? <CircularProgress size={22} color="inherit" /> : t('auth.login')}
              </Button>
            </form>
          </Paper>

          {/* USP Section */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{
              fontSize: '0.75rem', fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '2px',
              color: '#D4AF37', mb: 1.5,
            }}>
              {t('auth.studioFeaturesLabel', 'Wat maakt de Content Studio uniek?')}
            </Typography>

            {/* Desktop: 2x3 grid */}
            <Box sx={{
              display: { xs: 'none', md: 'grid' },
              gridTemplateColumns: '1fr 1fr',
              gap: 2,
            }}>
              {USP_ITEMS.map(({ icon: Icon, titleKey, descKey, titleFallback, descFallback }) => (
                <Box key={titleKey} sx={{
                  bgcolor: '#fff',
                  border: '1px solid rgba(0,0,0,0.06)',
                  borderRadius: '12px',
                  p: 2.5,
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
                  },
                }}>
                  <Box sx={{
                    width: 36, height: 36, borderRadius: '8px',
                    bgcolor: 'rgba(127, 165, 148, 0.12)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    mb: 1.5,
                  }}>
                    <Icon sx={{ fontSize: 20, color: '#5E8B7E' }} />
                  </Box>
                  <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', mb: 0.5, color: '#1C1917' }}>
                    {t(titleKey, titleFallback)}
                  </Typography>
                  <Typography sx={{ fontSize: '0.8rem', color: '#6B7280', lineHeight: 1.5 }}>
                    {t(descKey, descFallback)}
                  </Typography>
                </Box>
              ))}
            </Box>

            {/* Mobile: state-based carousel (1 card at a time, swipeable) */}
            <Box sx={{ display: { xs: 'block', md: 'none' } }}>
              {(() => {
                const { icon: Icon, titleKey, descKey, titleFallback, descFallback } = USP_ITEMS[uspIndex];
                return (
                  <Box
                    onTouchStart={handleTouchStart}
                    onTouchEnd={handleTouchEnd}
                    sx={{
                    bgcolor: '#fff',
                    border: '1px solid rgba(0,0,0,0.06)',
                    borderRadius: '12px',
                    p: 2.5,
                    minHeight: 160,
                  }}>
                    <Box sx={{
                      width: 36, height: 36, borderRadius: '8px',
                      bgcolor: 'rgba(127, 165, 148, 0.12)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      mb: 1.5,
                    }}>
                      <Icon sx={{ fontSize: 20, color: '#5E8B7E' }} />
                    </Box>
                    <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', mb: 0.5, color: '#1C1917' }}>
                      {t(titleKey, titleFallback)}
                    </Typography>
                    <Typography sx={{ fontSize: '0.8rem', color: '#6B7280', lineHeight: 1.5 }}>
                      {t(descKey, descFallback)}
                    </Typography>
                  </Box>
                );
              })()}

              {/* Carousel dots */}
              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.75, mt: 2 }}>
                {USP_ITEMS.map((_, i) => (
                  <Box
                    key={i}
                    onClick={() => setUspIndex(i)}
                    sx={{
                      width: uspIndex === i ? 20 : 8,
                      height: 8,
                      borderRadius: 4,
                      bgcolor: uspIndex === i ? '#5E8B7E' : '#d1d5db',
                      transition: 'all 0.3s',
                      cursor: 'pointer',
                    }}
                  />
                ))}
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* ── COMPARISON TABLE ── */}
      <Box sx={{ maxWidth: 900, mx: 'auto', px: 3, mt: 6 }}>
        <Typography sx={{
          fontSize: '0.75rem', fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '2px',
          color: '#D4AF37', mb: 1,
        }}>
          {t('auth.compareLabel', 'Vergelijk met de concurrentie')}
        </Typography>
        <Typography sx={{ fontSize: '1.5rem', fontWeight: 800, mb: 0.5, color: '#1C1917', letterSpacing: '-0.01em' }}>
          {t('auth.compareTitle', 'AI Content Studio vs. Hootsuite vs. Jasper AI')}
        </Typography>
        <Typography sx={{ fontSize: '0.9rem', color: '#6B7280', mb: 3, lineHeight: 1.6 }}>
          {t('auth.compareSubtitle', 'Eén platform dat content generatie, SEO, meertaligheid én publishing combineert. Geen losse tools meer nodig.')}
        </Typography>

        <TableContainer component={Paper} elevation={2} sx={{ borderRadius: 2 }}>
          <Table size="small" sx={{ tableLayout: 'fixed', width: '100%' }}>
            <TableHead>
              <TableRow sx={{ bgcolor: '#f8faf9' }}>
                <TableCell sx={{ fontWeight: 700, fontSize: { xs: '0.65rem', md: '0.8rem' }, color: '#374151', borderBottom: '2px solid #e5e7eb', width: { xs: '40%', md: '40%' }, p: { xs: '6px 8px', md: '6px 16px' } }}>
                  Feature
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 800, fontSize: { xs: '0.6rem', md: '0.8rem' }, color: '#5E8B7E', borderBottom: '2px solid #5E8B7E', bgcolor: 'rgba(127,165,148,0.06)', width: '20%', p: { xs: '6px 4px', md: '6px 16px' }, lineHeight: 1.2 }}>
                  <Box sx={{ display: { xs: 'none', md: 'block' } }}>AI Content Studio</Box>
                  <Box sx={{ display: { xs: 'block', md: 'none' } }}>ACS</Box>
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 600, fontSize: { xs: '0.6rem', md: '0.8rem' }, color: '#6B7280', borderBottom: '2px solid #e5e7eb', width: '20%', p: { xs: '6px 4px', md: '6px 16px' }, lineHeight: 1.2 }}>
                  <Box sx={{ display: { xs: 'none', md: 'block' } }}>Hootsuite</Box>
                  <Box sx={{ display: { xs: 'block', md: 'none' } }}>HT</Box>
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 600, fontSize: { xs: '0.6rem', md: '0.8rem' }, color: '#6B7280', borderBottom: '2px solid #e5e7eb', width: '20%', p: { xs: '6px 4px', md: '6px 16px' }, lineHeight: 1.2 }}>
                  <Box sx={{ display: { xs: 'none', md: 'block' } }}>Jasper AI</Box>
                  <Box sx={{ display: { xs: 'block', md: 'none' } }}>Jasper</Box>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {COMPARE_FEATURES.map(({ feature, short, studio, hootsuite, jasper }, idx) => {
                const rowBg = idx % 2 === 0 ? '#fff' : '#fafbfa';
                return (
                <TableRow key={feature} sx={{ bgcolor: rowBg, '&:hover': { bgcolor: 'rgba(127,165,148,0.04)' } }}>
                  <TableCell sx={{ fontSize: { xs: '0.65rem', md: '0.8rem' }, color: '#374151', py: { xs: 0.75, md: 1.25 }, px: { xs: 1, md: 2 }, lineHeight: 1.3 }}>
                    <Box sx={{ display: { xs: 'none', md: 'block' } }}>{feature}</Box>
                    <Box sx={{ display: { xs: 'block', md: 'none' } }}>{short}</Box>
                  </TableCell>
                  <TableCell align="center" sx={{ bgcolor: 'rgba(127,165,148,0.04)', p: { xs: '4px', md: '6px 16px' } }}>
                    <Box sx={{ display: { xs: 'none', md: 'flex' }, justifyContent: 'center' }}><FeatureIcon value={studio} /></Box>
                    <Box sx={{ display: { xs: 'flex', md: 'none' }, justifyContent: 'center' }}><FeatureIcon value={studio} small /></Box>
                  </TableCell>
                  <TableCell align="center" sx={{ p: { xs: '4px', md: '6px 16px' } }}>
                    <Box sx={{ display: { xs: 'none', md: 'flex' }, justifyContent: 'center' }}><FeatureIcon value={hootsuite} /></Box>
                    <Box sx={{ display: { xs: 'flex', md: 'none' }, justifyContent: 'center' }}><FeatureIcon value={hootsuite} small /></Box>
                  </TableCell>
                  <TableCell align="center" sx={{ p: { xs: '4px', md: '6px 16px' } }}>
                    <Box sx={{ display: { xs: 'none', md: 'flex' }, justifyContent: 'center' }}><FeatureIcon value={jasper} /></Box>
                    <Box sx={{ display: { xs: 'flex', md: 'none' }, justifyContent: 'center' }}><FeatureIcon value={jasper} small /></Box>
                  </TableCell>
                </TableRow>
                );
              })}
              {/* Score row */}
              <TableRow sx={{ bgcolor: '#f8faf9', borderTop: '2px solid #e5e7eb' }}>
                <TableCell sx={{ fontWeight: 700, fontSize: { xs: '0.65rem', md: '0.8rem' }, color: '#374151', px: { xs: 1, md: 2 } }}>
                  Totaal
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 800, fontSize: { xs: '0.75rem', md: '0.95rem' }, color: '#5E8B7E', bgcolor: 'rgba(127,165,148,0.08)' }}>
                  16/16
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 600, fontSize: { xs: '0.7rem', md: '0.85rem' }, color: '#6B7280' }}>
                  5/16
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 600, fontSize: { xs: '0.7rem', md: '0.85rem' }, color: '#6B7280' }}>
                  5/16
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>

        {/* Legend — mobile: compact below header abbreviations, desktop: below table */}
        <Box sx={{ display: 'flex', gap: { xs: 2, md: 3 }, mt: 1.5, justifyContent: 'center', flexWrap: 'wrap' }}>
          {/* Mobile: spell out abbreviated headers */}
          <Box sx={{ display: { xs: 'flex', md: 'none' }, gap: 2, width: '100%', justifyContent: 'center', mb: 0.5 }}>
            <Typography sx={{ fontSize: '0.6rem', color: '#5E8B7E', fontWeight: 700 }}>ACS = AI Content Studio</Typography>
            <Typography sx={{ fontSize: '0.6rem', color: '#6B7280' }}>HT = Hootsuite</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <CheckCircleIcon sx={{ fontSize: 14, color: '#22c55e' }} />
            <Typography sx={{ fontSize: '0.7rem', color: '#6B7280' }}>Volledig</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <RemoveCircleOutlineIcon sx={{ fontSize: 14, color: '#f59e0b' }} />
            <Typography sx={{ fontSize: '0.7rem', color: '#6B7280' }}>Beperkt</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <CancelIcon sx={{ fontSize: 14, color: '#d1d5db' }} />
            <Typography sx={{ fontSize: '0.7rem', color: '#6B7280' }}>Niet beschikbaar</Typography>
          </Box>
        </Box>
      </Box>

      {/* Security note */}
      <Box sx={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 1, mt: 5, mb: 2, px: 3,
      }}>
        <SecurityIcon sx={{ fontSize: 16, color: '#6B7280' }} />
        <Typography sx={{ fontSize: '0.75rem', color: '#6B7280' }}>
          {t('auth.studioSecurityNote', '100% Europese infrastructuur. Uw data blijft in de EU (Hetzner DE, Mistral FR, DeepL DE).')}
        </Typography>
      </Box>

      {/* ── FOOTER ── */}
      <Box sx={{
        borderTop: '1px solid rgba(0,0,0,0.06)',
        mt: 4, py: 3, px: 3,
        textAlign: 'center',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 1 }}>
          <Box
            component="img"
            src="/hb-logo.png"
            alt="HolidaiButler"
            sx={{ width: 24, height: 'auto', opacity: 0.6 }}
          />
          <Typography sx={{ fontSize: '0.8rem', color: '#9CA3AF', fontWeight: 500 }}>
            Powered by{' '}
            <Link
              href="https://holidaibutler.com"
              target="_blank"
              rel="noopener noreferrer"
              sx={{ color: '#5E8B7E', textDecoration: 'none', fontWeight: 600, '&:hover': { textDecoration: 'underline' } }}
            >
              HolidaiButler
            </Link>
          </Typography>
        </Box>
        <Typography sx={{ fontSize: '0.7rem', color: '#D1D5DB' }}>
          AI-Powered Tourism & Content Platform
        </Typography>
      </Box>
    </Box>
  );
}
