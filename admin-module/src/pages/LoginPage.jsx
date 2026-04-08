import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Paper, Typography, TextField, Button,
  Alert, InputAdornment, IconButton, CircularProgress, Link,
  Menu, MenuItem
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useTranslation } from 'react-i18next';
import useAuthStore from '../stores/authStore.js';
import { isStudioMode } from '../utils/studioMode.js';
import LoginDialog from '../components/studio/LoginDialog.jsx';
import DemoRequestDialog from '../components/studio/DemoRequestDialog.jsx';
import ConceptMockup from '../components/studio/ConceptMockup.jsx';

const STUDIO_LANGUAGES = [
  { code: 'nl', label: 'Nederlands', short: 'NL' },
  { code: 'en', label: 'English', short: 'EN' },
  { code: 'de', label: 'Deutsch', short: 'DE' },
  { code: 'es', label: 'Español', short: 'ES' },
  { code: 'fr', label: 'Français', short: 'FR' },
];

// USP cards — keys resolve to auth.studio.usps.{key}.{title,desc}
const USP_ITEMS = [
  { emoji: '🎯', key: 'concept'   },
  { emoji: '🚀', key: 'campaign'  },
  { emoji: '🧠', key: 'learning'  },
  { emoji: '📊', key: 'analytics' },
  { emoji: '🎨', key: 'personal'  },
  { emoji: '📅', key: 'calendar'  },
];

// Comparison table 1 — keys resolve to auth.studio.compare.features.{key}
const COMPARE_FEATURES = [
  { key: 'aiContent',        studio: 'yes', hootsuite: 'no',      jasper: 'yes'     },
  { key: 'conceptDialog',    studio: 'yes', hootsuite: 'no',      jasper: 'no'      },
  { key: 'socialScore',      studio: 'yes', hootsuite: 'no',      jasper: 'no'      },
  { key: 'selfLearning',     studio: 'yes', hootsuite: 'no',      jasper: 'no'      },
  { key: 'oneClickCampaign', studio: 'yes', hootsuite: 'no',      jasper: 'partial' },
  { key: 'calendarAutoFill', studio: 'yes', hootsuite: 'no',      jasper: 'no'      },
  { key: 'brandKb',          studio: 'yes', hootsuite: 'no',      jasper: 'yes'     },
  { key: 'personas',         studio: 'yes', hootsuite: 'no',      jasper: 'yes'     },
  { key: 'trending',         studio: 'yes', hootsuite: 'partial', jasper: 'no'      },
  { key: 'blogSeo',          studio: 'yes', hootsuite: 'no',      jasper: 'yes'     },
  { key: 'deepl',            studio: 'yes', hootsuite: 'no',      jasper: 'partial' },
  { key: 'compliance',       studio: 'yes', hootsuite: 'no',      jasper: 'no'      },
  { key: 'poiSource',        studio: 'yes', hootsuite: 'no',      jasper: 'no'      },
  { key: 'imageKeywords',    studio: 'yes', hootsuite: 'no',      jasper: 'no'      },
  { key: 'multiTenant',      studio: 'yes', hootsuite: 'no',      jasper: 'partial' },
  { key: 'approval',         studio: 'yes', hootsuite: 'yes',     jasper: 'partial' },
];

function FeatureIcon({ value }) {
  if (value === 'yes') return <Box component="span" sx={{ color: '#27AE60', fontWeight: 800, fontSize: '1rem' }}>✓</Box>;
  if (value === 'partial') return <Box component="span" sx={{ color: '#F39C12', fontWeight: 800, fontSize: '1rem' }}>⚠</Box>;
  return <Box component="span" sx={{ color: '#E74C3C', fontWeight: 800, fontSize: '1rem' }}>✗</Box>;
}

// Comparison table 2 — keys resolve to auth.studio.alternatives.criteria.{key}.{label,studio,internal,agency}
const COMPARE_ALTERNATIVES = [
  { key: 'availability',  studioIcon: 'yes', internIcon: 'no',      agencyIcon: 'no' },
  { key: 'vacation',      studioIcon: 'yes', internIcon: 'no',      agencyIcon: 'no' },
  { key: 'training',      studioIcon: 'yes', internIcon: 'no',      agencyIcon: 'partial' },
  { key: 'turnover',      studioIcon: 'yes', internIcon: 'no',      agencyIcon: 'no' },
  { key: 'expertise',     studioIcon: 'yes', internIcon: 'partial', agencyIcon: 'partial' },
  { key: 'response',      studioIcon: 'yes', internIcon: 'no',      agencyIcon: 'no' },
  { key: 'scalability',   studioIcon: 'yes', internIcon: 'no',      agencyIcon: 'partial' },
  { key: 'approach',      studioIcon: 'yes', internIcon: 'partial', agencyIcon: 'partial' },
  { key: 'multilingual',  studioIcon: 'yes', internIcon: 'no',      agencyIcon: 'partial' },
  { key: 'cost',          studioIcon: 'yes', internIcon: 'no',      agencyIcon: 'no' },
  { key: 'brand',         studioIcon: 'yes', internIcon: 'partial', agencyIcon: 'partial' },
];

export default function LoginPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const login = useAuthStore(s => s.login);
  const studioMode = isStudioMode();

  // Studio-mode: login + demo dialog state
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);
  const [demoDialogOpen, setDemoDialogOpen] = useState(false);
  const [langMenuAnchor, setLangMenuAnchor] = useState(null);
  const currentLang = STUDIO_LANGUAGES.find(l => l.code === i18n.language) || STUDIO_LANGUAGES[0];
  const handleLangChange = (code) => {
    i18n.changeLanguage(code);
    setLangMenuAnchor(null);
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
      bgcolor: '#0D1B2A',
      color: '#E8ECF1',
    }}>
      {/* ── STUDIO HEADER (sticky) ── */}
      <Box sx={{
        position: 'sticky', top: 0, zIndex: 20,
        bgcolor: 'rgba(13, 27, 42, 0.92)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(2,192,154,0.15)',
      }}>
        <Box sx={{
          maxWidth: 1200, mx: 'auto',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 2,
          px: { xs: 2, md: 3 }, py: 1.25,
        }}>
          {/* Logo + product name */}
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, minWidth: 0 }}>
            <Typography sx={{
              fontSize: { xs: '0.95rem', md: '1.1rem' },
              fontWeight: 800,
              color: '#02C39A',
              lineHeight: 1.1,
              whiteSpace: 'nowrap',
              letterSpacing: '-0.01em',
            }}>
              AI Content Studio
            </Typography>
            <Typography sx={{
              fontSize: '0.75rem',
              color: '#8B9DAF',
              fontWeight: 400,
              display: { xs: 'none', sm: 'inline' },
            }}>
              {t('auth.studio.productTagline', 'by HolidaiButler')}
            </Typography>
          </Box>

          {/* Right: language + login */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.75, sm: 1.25 } }}>
            <Button
              size="small"
              onClick={(e) => setLangMenuAnchor(e.currentTarget)}
              endIcon={<ExpandMoreIcon sx={{ fontSize: 14 }} />}
              sx={{
                color: '#8B9DAF',
                bgcolor: 'transparent',
                border: '1px solid #2A3A4A',
                textTransform: 'none', fontWeight: 500, fontSize: '0.78rem',
                minWidth: 0, px: { xs: 1, sm: 1.5 }, py: 0.5,
                borderRadius: 0.75,
                '&:hover': { borderColor: '#02C39A', bgcolor: 'rgba(2,195,154,0.06)' },
                '& .MuiButton-endIcon': { ml: 0.25 },
              }}
            >
              {currentLang.short}
            </Button>
            <Menu
              anchorEl={langMenuAnchor}
              open={Boolean(langMenuAnchor)}
              onClose={() => setLangMenuAnchor(null)}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              PaperProps={{ sx: { bgcolor: '#15202B', border: '1px solid #2A3A4A', color: '#E8ECF1' } }}
            >
              {STUDIO_LANGUAGES.map(lang => (
                <MenuItem
                  key={lang.code}
                  selected={lang.code === currentLang.code}
                  onClick={() => handleLangChange(lang.code)}
                  sx={{
                    fontSize: '0.85rem', minWidth: 150,
                    '&:hover': { bgcolor: 'rgba(2,195,154,0.08)' },
                    '&.Mui-selected': { bgcolor: 'rgba(2,195,154,0.12)' },
                    '&.Mui-selected:hover': { bgcolor: 'rgba(2,195,154,0.16)' },
                  }}
                >
                  <Box component="span" sx={{ fontWeight: 700, width: 30, color: '#02C39A' }}>{lang.short}</Box>
                  {lang.label}
                </MenuItem>
              ))}
            </Menu>
            <Button
              variant="outlined"
              size="small"
              onClick={() => setLoginDialogOpen(true)}
              sx={{
                color: '#02C39A',
                borderColor: '#02C39A',
                bgcolor: 'transparent',
                '&:hover': { bgcolor: '#02C39A', color: '#0D1B2A', borderColor: '#02C39A' },
                textTransform: 'none', fontWeight: 600,
                px: { xs: 1.75, sm: 2.25 }, py: 0.6,
                fontSize: { xs: '0.78rem', sm: '0.82rem' },
                borderRadius: 1,
                borderWidth: '1px',
                '&:hover .arrow': { transform: 'translateX(3px)' },
              }}
            >
              {t('auth.login', 'Inloggen')}
              <Box component="span" className="arrow" sx={{ ml: 0.75, display: 'inline-block', transition: 'transform 0.2s' }}>→</Box>
            </Button>
          </Box>
        </Box>
      </Box>

      {/* ── HERO SECTION (2-col) ── */}
      <Box sx={{
        bgcolor: '#0D1B2A',
        color: '#E8ECF1',
        pt: { xs: 5, md: 9 },
        pb: { xs: 8, md: 10 },
        px: 3,
        position: 'relative',
        overflow: 'hidden',
      }}>
        <Box sx={{
          position: 'absolute', inset: 0, opacity: 0.04,
          backgroundImage: 'radial-gradient(circle at 25% 25%, #fff 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }} />

        <Box sx={{
          position: 'relative', maxWidth: 1200, mx: 'auto',
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1.1fr 1fr' },
          gap: { xs: 5, md: 6 },
          alignItems: 'center',
        }}>
          {/* Left: copy + CTA */}
          <Box sx={{ textAlign: { xs: 'center', md: 'left' } }}>
            <Box sx={{
              display: 'inline-block',
              bgcolor: 'rgba(2,195,154,0.08)',
              border: '1px solid rgba(2,195,154,0.3)',
              color: '#02C39A',
              px: 1.5, py: 0.5,
              borderRadius: '24px',
              fontSize: '0.72rem',
              fontWeight: 700,
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
              mb: 2.5,
            }}>
              {t('auth.studio.tagline', 'Europees AI Content Platform')}
            </Box>

            <Typography sx={{
              fontSize: { xs: '2rem', sm: '2.5rem', md: '3.1rem' },
              fontWeight: 800,
              lineHeight: 1.15,
              mb: 2.5,
              color: '#fff',
              letterSpacing: '-0.025em',
            }}>
              {t('auth.studio.heroTitle', 'De slimste')}{' '}
              <Box component="span" sx={{ color: '#02C39A' }}>
                {t('auth.studio.heroTitleAccent', 'AI Content Studio')}
              </Box>{' '}
              {t('auth.studio.heroTitleSuffix', 'van Europa')}
            </Typography>

            <Typography sx={{
              fontSize: { xs: '1rem', md: '1.15rem' },
              maxWidth: 560,
              mx: { xs: 'auto', md: 0 },
              color: '#8B9DAF',
              lineHeight: 1.65,
              mb: 3.5,
            }}>
              {t('auth.studio.heroSubtitle', 'Genereer, plan en publiceer content op 7 platformen vanuit één intelligent werkstation. Eén concept, meerdere platformen — de AI doet het werk, jij reviewt en keurt goed.')}
            </Typography>

            <Box sx={{
              display: 'flex',
              gap: 1.5,
              justifyContent: { xs: 'center', md: 'flex-start' },
              flexWrap: 'wrap',
              mb: 3.5,
            }}>
              <Button
                variant="contained"
                size="large"
                onClick={() => setDemoDialogOpen(true)}
                sx={{
                  bgcolor: '#02C39A', color: '#0D1B2A',
                  '&:hover': {
                    bgcolor: '#02C39A',
                    transform: 'translateY(-2px)',
                    boxShadow: '0 8px 24px rgba(2,195,154,0.35)',
                  },
                  fontWeight: 700, fontSize: '0.95rem',
                  px: 3.5, py: 1.35, borderRadius: '10px',
                  textTransform: 'none', boxShadow: '0 4px 14px rgba(2,195,154,0.25)',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                }}
              >
                {t('auth.studio.ctaDemo', 'Gratis Demo Aanvragen')}
              </Button>
              <Button
                variant="outlined"
                size="large"
                onClick={() => setLoginDialogOpen(true)}
                sx={{
                  color: '#E8ECF1',
                  borderColor: '#2A3A4A',
                  bgcolor: 'transparent',
                  '&:hover': { borderColor: '#02C39A', bgcolor: 'rgba(2,195,154,0.06)' },
                  fontWeight: 500, fontSize: '0.95rem',
                  px: 3, py: 1.35, borderRadius: '10px',
                  textTransform: 'none',
                }}
              >
                {t('auth.login', 'Inloggen')} →
              </Button>
            </Box>

          </Box>

          {/* Right: CSS mockup */}
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <ConceptMockup />
          </Box>
        </Box>
      </Box>

      {/* ── EU-FIRST BADGES BAR ── */}
      <Box sx={{
        bgcolor: '#15293F',
        borderTop: '1px solid rgba(2,192,154,0.18)',
        borderBottom: '1px solid rgba(2,192,154,0.18)',
        py: { xs: 3, md: 4 },
        px: { xs: 2, md: 6 },
      }}>
        <Box sx={{
          maxWidth: 1200,
          mx: 'auto',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: { xs: 2.5, md: 4 },
          flexWrap: 'wrap',
        }}>
          {[
            { src: '/studio/eu-ai-act.png', strong: 'EU AI Act',     suffix: t('auth.studio.badges.aiActSuffix', 'Compliant'),   alt: 'EU AI Act', scale: 1 },
            { src: '/studio/gdpr.jpg',      strong: 'GDPR-proof',    suffix: t('auth.studio.badges.gdprSuffix', '100% EU Data'), alt: 'GDPR',      scale: 1.35 },
            { src: 'https://flagcdn.com/w80/fr.png', strong: 'Mistral AI',    suffix: t('auth.studio.badges.mistralSuffix', 'Parijs'),    alt: 'France',  scale: 1 },
            { src: 'https://flagcdn.com/w80/de.png', strong: 'DeepL Pro',     suffix: t('auth.studio.badges.deeplSuffix', 'Keulen'),      alt: 'Germany', scale: 1 },
            { src: 'https://flagcdn.com/w80/de.png', strong: 'Hetzner Cloud', suffix: t('auth.studio.badges.hetznerSuffix', 'Duitsland'), alt: 'Germany', scale: 1 },
          ].map((b, i) => (
            <Box key={i} sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.25,
              fontSize: { xs: '0.78rem', md: '0.82rem' },
              color: '#8B9DAF',
            }}>
              <Box sx={{
                width: 32, height: 32,
                borderRadius: '50%',
                overflow: 'hidden',
                flexShrink: 0,
                bgcolor: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(2,192,154,0.25)',
              }}>
                <Box component="img" src={b.src} alt={b.alt} sx={{
                  width: '100%', height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                  transform: `scale(${b.scale})`,
                  transformOrigin: 'center',
                }} />
              </Box>
              <Box>
                <Box component="strong" sx={{ color: '#E8ECF1', fontWeight: 700, display: 'block', lineHeight: 1.2 }}>
                  {b.strong}
                </Box>
                <Box component="span" sx={{ color: '#8B9DAF', fontSize: '0.72rem', lineHeight: 1.2 }}>
                  {b.suffix}
                </Box>
              </Box>
            </Box>
          ))}
        </Box>
      </Box>

      {/* ── USP CARDS SECTION ── */}
      <Box sx={{
        maxWidth: 1200,
        mx: 'auto',
        px: { xs: 0, md: 3 },
        pt: { xs: 6, md: 8 },
        pb: { xs: 4, md: 6 },
        position: 'relative',
        zIndex: 1,
      }}>
        <Typography sx={{
          fontSize: { xs: '1.6rem', md: '1.9rem' },
          fontWeight: 800,
          color: '#fff',
          textAlign: 'center',
          mb: 1,
          letterSpacing: '-0.01em',
          px: 3,
        }}>
          {t('auth.studio.uspSectionTitle', 'Waarom AI Content Studio?')}
        </Typography>
        <Typography sx={{
          fontSize: '0.95rem',
          color: '#8B9DAF',
          textAlign: 'center',
          mb: { xs: 3, md: 5 },
          px: 3,
        }}>
          {t('auth.studio.uspSectionSubtitle', '6 redenen waarom marketeers overstappen')}
        </Typography>

        {/* Desktop: 3×2 grid · Mobile: horizontal scroll-snap */}
        <Box sx={{
          display: { xs: 'flex', md: 'grid' },
          gridTemplateColumns: { md: 'repeat(3, 1fr)' },
          gap: { xs: 1.75, md: 2.5 },
          // Mobile scroll-snap
          overflowX: { xs: 'auto', md: 'visible' },
          scrollSnapType: { xs: 'x mandatory', md: 'none' },
          scrollPaddingLeft: { xs: 24, md: 0 },
          px: { xs: 3, md: 0 },
          pb: { xs: 2, md: 0 },
          WebkitOverflowScrolling: 'touch',
          '&::-webkit-scrollbar': { display: 'none' },
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}>
          {USP_ITEMS.map(({ emoji, key }) => (
            <Box key={key} sx={{
              bgcolor: '#15293F',
              border: '1px solid #2A3A4A',
              borderRadius: '12px',
              p: { xs: 3, md: 3.5 },
              transition: 'transform 0.2s, border-color 0.2s, box-shadow 0.2s',
              '&:hover': {
                transform: 'translateY(-4px)',
                borderColor: '#028090',
                boxShadow: '0 12px 32px rgba(2,128,144,0.15)',
              },
              // Mobile: each card takes 85% of viewport, peek of next card visible
              flex: { xs: '0 0 85%', md: '1 1 auto' },
              scrollSnapAlign: { xs: 'start', md: 'none' },
              minWidth: 0,
            }}>
              <Box sx={{ fontSize: '1.8rem', mb: 1.5, lineHeight: 1 }}>
                {emoji}
              </Box>
              <Typography sx={{
                fontWeight: 700,
                fontSize: '1rem',
                color: '#fff',
                mb: 1,
                letterSpacing: '-0.01em',
              }}>
                {t(`auth.studio.usps.${key}.title`)}
              </Typography>
              <Typography sx={{
                fontSize: '0.82rem',
                color: '#8B9DAF',
                lineHeight: 1.6,
              }}>
                {t(`auth.studio.usps.${key}.desc`)}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>

      {/* ── COMPARISON TABLE 1 — vs CONCURRENTIE ── */}
      <Box sx={{ maxWidth: 1200, mx: 'auto', px: { xs: 2, md: 3 }, pt: { xs: 5, md: 8 }, pb: { xs: 3, md: 5 } }}>
        <Typography sx={{
          fontSize: { xs: '1.6rem', md: '1.9rem' },
          fontWeight: 800,
          color: '#fff',
          textAlign: 'center',
          mb: 1,
          letterSpacing: '-0.01em',
        }}>
          {t('auth.studio.compare.title', 'AI Content Studio vs. De Concurrentie')}
        </Typography>
        <Typography sx={{
          fontSize: '0.95rem',
          color: '#8B9DAF',
          textAlign: 'center',
          mb: { xs: 3, md: 4 },
        }}>
          {t('auth.studio.compare.subtitle', 'Vergelijk op wat er werkelijk toe doet')}
        </Typography>

        <Box sx={{
          overflowX: 'auto',
          borderRadius: 2,
          border: '1px solid #2A3A4A',
          bgcolor: '#15293F',
          WebkitOverflowScrolling: 'touch',
          '&::-webkit-scrollbar': { height: 8 },
          '&::-webkit-scrollbar-track': { bgcolor: '#0D1B2A' },
          '&::-webkit-scrollbar-thumb': { bgcolor: '#2A3A4A', borderRadius: 4 },
        }}>
          <Box component="table" sx={{
            width: '100%',
            minWidth: 560,
            borderCollapse: 'collapse',
            fontSize: { xs: '0.78rem', md: '0.85rem' },
          }}>
            <Box component="thead">
              <Box component="tr">
                <Box component="th" sx={{
                  bgcolor: '#0D1B2A', color: '#02C39A',
                  fontWeight: 700, textAlign: 'left',
                  p: { xs: '12px 12px', md: '14px 20px' },
                  borderBottom: '2px solid #028090',
                  whiteSpace: 'nowrap',
                }}>
                  {t('auth.studio.compare.headerFeature', 'Feature')}
                </Box>
                <Box component="th" sx={{
                  bgcolor: 'rgba(2,195,154,0.08)', color: '#02C39A',
                  fontWeight: 700, textAlign: 'center',
                  p: { xs: '12px 8px', md: '14px 16px' },
                  borderBottom: '2px solid #02C39A',
                  whiteSpace: 'nowrap',
                }}>
                  {t('auth.studio.compare.headerStudio', 'AI Content Studio')}
                </Box>
                <Box component="th" sx={{
                  bgcolor: '#0D1B2A', color: '#8B9DAF',
                  fontWeight: 600, textAlign: 'center',
                  p: { xs: '12px 8px', md: '14px 16px' },
                  borderBottom: '2px solid #2A3A4A',
                  whiteSpace: 'nowrap',
                }}>
                  Hootsuite
                </Box>
                <Box component="th" sx={{
                  bgcolor: '#0D1B2A', color: '#8B9DAF',
                  fontWeight: 600, textAlign: 'center',
                  p: { xs: '12px 8px', md: '14px 16px' },
                  borderBottom: '2px solid #2A3A4A',
                  whiteSpace: 'nowrap',
                }}>
                  Jasper AI
                </Box>
              </Box>
            </Box>
            <Box component="tbody">
              {COMPARE_FEATURES.map((row, idx) => (
                <Box component="tr" key={row.key} sx={{
                  bgcolor: idx % 2 === 0 ? 'transparent' : 'rgba(13,27,42,0.4)',
                  transition: 'background-color 0.15s',
                  '&:hover': { bgcolor: 'rgba(2,128,144,0.1)' },
                  '&:hover td.highlight': { bgcolor: 'rgba(2,195,154,0.12)' },
                }}>
                  <Box component="td" sx={{
                    p: { xs: '10px 12px', md: '12px 20px' },
                    borderBottom: '1px solid #1A2332',
                    color: '#C8D4E0',
                  }}>
                    {t(`auth.studio.compare.features.${row.key}`)}
                  </Box>
                  <Box component="td" className="highlight" sx={{
                    bgcolor: 'rgba(2,195,154,0.06)',
                    p: { xs: '10px 8px', md: '12px 16px' },
                    borderBottom: '1px solid #1A2332',
                    textAlign: 'center',
                  }}>
                    <FeatureIcon value={row.studio} />
                  </Box>
                  <Box component="td" sx={{
                    p: { xs: '10px 8px', md: '12px 16px' },
                    borderBottom: '1px solid #1A2332',
                    textAlign: 'center',
                  }}>
                    <FeatureIcon value={row.hootsuite} />
                  </Box>
                  <Box component="td" sx={{
                    p: { xs: '10px 8px', md: '12px 16px' },
                    borderBottom: '1px solid #1A2332',
                    textAlign: 'center',
                  }}>
                    <FeatureIcon value={row.jasper} />
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        </Box>

        <Typography sx={{
          textAlign: 'center',
          mt: 2.5,
          color: '#02C39A',
          fontWeight: 700,
          fontSize: { xs: '0.9rem', md: '1rem' },
        }}>
          16/16 ✓ — {t('auth.studio.compare.total', 'Geen enkel platform biedt deze combinatie')}
        </Typography>

        {/* Legenda */}
        <Box sx={{
          display: 'flex',
          justifyContent: 'center',
          gap: { xs: 2, md: 3 },
          mt: 1.5,
          flexWrap: 'wrap',
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
            <Box component="span" sx={{ color: '#27AE60', fontWeight: 800, fontSize: '0.9rem' }}>✓</Box>
            <Typography sx={{ fontSize: '0.72rem', color: '#8B9DAF' }}>{t('auth.studio.compare.legendFull', 'Volledig aanwezig')}</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
            <Box component="span" sx={{ color: '#F39C12', fontWeight: 800, fontSize: '0.9rem' }}>⚠</Box>
            <Typography sx={{ fontSize: '0.72rem', color: '#8B9DAF' }}>{t('auth.studio.compare.legendPartial', 'Beperkt / deels')}</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
            <Box component="span" sx={{ color: '#E74C3C', fontWeight: 800, fontSize: '0.9rem' }}>✗</Box>
            <Typography sx={{ fontSize: '0.72rem', color: '#8B9DAF' }}>{t('auth.studio.compare.legendNone', 'Niet aanwezig')}</Typography>
          </Box>
        </Box>
      </Box>

      {/* ── COMPARISON TABLE 2 — vs BUREAU/INTERN ── */}
      <Box sx={{ maxWidth: 1200, mx: 'auto', px: { xs: 2, md: 3 }, pt: { xs: 4, md: 6 }, pb: { xs: 3, md: 5 } }}>
        <Typography sx={{
          fontSize: { xs: '1.6rem', md: '1.9rem' },
          fontWeight: 800,
          color: '#fff',
          textAlign: 'center',
          mb: 1,
          letterSpacing: '-0.01em',
        }}>
          {t('auth.studio.alternatives.title', 'AI Content Studio vs. Bureau vs. Intern')}
        </Typography>
        <Typography sx={{
          fontSize: '0.95rem',
          color: '#8B9DAF',
          textAlign: 'center',
          mb: { xs: 3, md: 4 },
        }}>
          {t('auth.studio.alternatives.subtitle', 'Waarom AI de slimste investering is')}
        </Typography>

        <Box sx={{
          overflowX: 'auto',
          borderRadius: 2,
          border: '1px solid #2A3A4A',
          bgcolor: '#15293F',
          WebkitOverflowScrolling: 'touch',
          '&::-webkit-scrollbar': { height: 8 },
          '&::-webkit-scrollbar-track': { bgcolor: '#0D1B2A' },
          '&::-webkit-scrollbar-thumb': { bgcolor: '#2A3A4A', borderRadius: 4 },
        }}>
          <Box component="table" sx={{
            width: '100%',
            minWidth: 760,
            borderCollapse: 'collapse',
            fontSize: { xs: '0.78rem', md: '0.85rem' },
          }}>
            <Box component="thead">
              <Box component="tr">
                <Box component="th" sx={{
                  bgcolor: '#0D1B2A', color: '#02C39A',
                  fontWeight: 700, textAlign: 'left',
                  p: { xs: '12px 12px', md: '14px 20px' },
                  borderBottom: '2px solid #028090',
                  whiteSpace: 'nowrap',
                  width: { xs: '28%', md: '26%' },
                }}>
                  {t('auth.studio.alternatives.headerCriterion', 'Criterium')}
                </Box>
                <Box component="th" sx={{
                  bgcolor: 'rgba(2,195,154,0.08)', color: '#02C39A',
                  fontWeight: 700, textAlign: 'left',
                  p: { xs: '12px 12px', md: '14px 20px' },
                  borderBottom: '2px solid #02C39A',
                  whiteSpace: 'nowrap',
                }}>
                  {t('auth.studio.alternatives.headerStudio', 'AI Content Studio')}
                </Box>
                <Box component="th" sx={{
                  bgcolor: '#0D1B2A', color: '#8B9DAF',
                  fontWeight: 600, textAlign: 'left',
                  p: { xs: '12px 12px', md: '14px 20px' },
                  borderBottom: '2px solid #2A3A4A',
                  whiteSpace: 'nowrap',
                }}>
                  {t('auth.studio.alternatives.headerInternal', 'Intern (eigen medewerker)')}
                </Box>
                <Box component="th" sx={{
                  bgcolor: '#0D1B2A', color: '#8B9DAF',
                  fontWeight: 600, textAlign: 'left',
                  p: { xs: '12px 12px', md: '14px 20px' },
                  borderBottom: '2px solid #2A3A4A',
                  whiteSpace: 'nowrap',
                }}>
                  {t('auth.studio.alternatives.headerAgency', 'Bureau / Agency')}
                </Box>
              </Box>
            </Box>
            <Box component="tbody">
              {COMPARE_ALTERNATIVES.map((row, idx) => (
                <Box component="tr" key={row.key} sx={{
                  bgcolor: idx % 2 === 0 ? 'transparent' : 'rgba(13,27,42,0.4)',
                  transition: 'background-color 0.15s',
                  '&:hover': { bgcolor: 'rgba(2,128,144,0.1)' },
                  '&:hover td.highlight': { bgcolor: 'rgba(2,195,154,0.12)' },
                }}>
                  <Box component="td" sx={{
                    p: { xs: '12px', md: '14px 20px' },
                    borderBottom: '1px solid #1A2332',
                    color: '#E8ECF1',
                    fontWeight: 700,
                  }}>
                    {t(`auth.studio.alternatives.criteria.${row.key}.label`)}
                  </Box>
                  <Box component="td" className="highlight" sx={{
                    bgcolor: 'rgba(2,195,154,0.06)',
                    p: { xs: '12px', md: '14px 20px' },
                    borderBottom: '1px solid #1A2332',
                    color: '#C8D4E0',
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      <FeatureIcon value={row.studioIcon} />
                      <Box component="span">{t(`auth.studio.alternatives.criteria.${row.key}.studio`)}</Box>
                    </Box>
                  </Box>
                  <Box component="td" sx={{
                    p: { xs: '12px', md: '14px 20px' },
                    borderBottom: '1px solid #1A2332',
                    color: '#C8D4E0',
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      <FeatureIcon value={row.internIcon} />
                      <Box component="span">{t(`auth.studio.alternatives.criteria.${row.key}.internal`)}</Box>
                    </Box>
                  </Box>
                  <Box component="td" sx={{
                    p: { xs: '12px', md: '14px 20px' },
                    borderBottom: '1px solid #1A2332',
                    color: '#C8D4E0',
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      <FeatureIcon value={row.agencyIcon} />
                      <Box component="span">{t(`auth.studio.alternatives.criteria.${row.key}.agency`)}</Box>
                    </Box>
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      </Box>

      {/* ── SOCIAL PROOF ── */}
      <Box sx={{ maxWidth: 1200, mx: 'auto', px: { xs: 2, md: 3 }, pt: { xs: 4, md: 6 }, pb: { xs: 4, md: 6 } }}>
        <Box sx={{
          maxWidth: 720,
          mx: 'auto',
          bgcolor: '#15293F',
          border: '1px solid #2A3A4A',
          borderRadius: '16px',
          p: { xs: 4, md: 5 },
          textAlign: 'center',
          position: 'relative',
          boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
        }}>
          {/* Decorative quotation mark */}
          <Box sx={{
            position: 'absolute',
            top: { xs: 12, md: 20 },
            left: { xs: 20, md: 32 },
            fontSize: { xs: '3rem', md: '4rem' },
            lineHeight: 1,
            color: '#02C39A',
            opacity: 0.25,
            fontFamily: 'Georgia, serif',
            pointerEvents: 'none',
          }}>
            &ldquo;
          </Box>
          <Typography component="blockquote" sx={{
            fontSize: { xs: '1rem', md: '1.15rem' },
            fontStyle: 'italic',
            color: '#E8ECF1',
            lineHeight: 1.65,
            mb: 2.5,
            position: 'relative',
          }}>
            {t('auth.studio.socialProofQuote', 'De AI Content Studio heeft onze content-productie met 80% versneld. Wat voorheen een dag kostte, doen we nu in een uur.')}
          </Typography>
          <Typography component="cite" sx={{
            fontSize: '0.85rem',
            color: '#02C39A',
            fontStyle: 'normal',
            fontWeight: 600,
            letterSpacing: '0.02em',
          }}>
            — {t('auth.studio.socialProofCite', 'Early Access Partner, maart 2026')}
          </Typography>
        </Box>
      </Box>

      {/* ── FOOTER ── */}
      <Box sx={{
        borderTop: '1px solid #1A2332',
        mt: 2, py: 3, px: 3,
        textAlign: 'center',
        bgcolor: '#0D1B2A',
      }}>
        <Typography sx={{ fontSize: '0.85rem', color: '#9CA3AF', fontWeight: 500, mb: 0.75 }}>
          {t('auth.studio.footerPoweredBy', 'Powered by')}{' '}
          <Link
            href="https://holidaibutler.com"
            target="_blank"
            rel="noopener noreferrer"
            sx={{ color: '#02C39A', textDecoration: 'none', fontWeight: 700, '&:hover': { textDecoration: 'underline' } }}
          >
            HolidaiButler
          </Link>{' '}
          · {t('auth.studio.footerCopyright', 'EU-First AI Platform · © 2026')}
        </Typography>
        <Typography sx={{ fontSize: '0.72rem', color: '#6B7280' }}>
          {t('auth.studio.footerEuData', '🇪🇺 Alle data wordt verwerkt binnen de Europese Unie')}
        </Typography>
      </Box>

      {/* ── Dialogs ── */}
      <LoginDialog open={loginDialogOpen} onClose={() => setLoginDialogOpen(false)} />
      <DemoRequestDialog open={demoDialogOpen} onClose={() => setDemoDialogOpen(false)} />
    </Box>
  );
}
