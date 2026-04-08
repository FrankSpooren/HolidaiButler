import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Paper, Typography, TextField, Button,
  Alert, InputAdornment, IconButton, CircularProgress, Link,
  Table, TableHead, TableBody, TableRow, TableCell, TableContainer,
  Menu, MenuItem
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import SecurityIcon from '@mui/icons-material/Security';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
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
];

const USP_ITEMS = [
  {
    emoji: '🎯',
    titleKey: 'auth.usp.conceptTitle',
    titleFallback: 'ConceptDialog',
    descKey: 'auth.usp.conceptDesc',
    descFallback: 'Eén concept, meerdere platformen. Platform tabs met live preview, score en karakterteller.',
  },
  {
    emoji: '🚀',
    titleKey: 'auth.usp.campaignTitle',
    titleFallback: '1-Click Campagne',
    descKey: 'auth.usp.campaignDesc',
    descFallback: 'Blog + 5 social posts in één keer. AI genereert, jij reviewt. Van idee naar publicatie in minuten.',
  },
  {
    emoji: '🧠',
    titleKey: 'auth.usp.learningTitle',
    titleFallback: 'Zelflerende AI',
    descKey: 'auth.usp.learningDesc',
    descFallback: 'Leert van jouw resultaten. Score-calibratie op basis van werkelijke engagement. Wordt elke week slimmer.',
  },
  {
    emoji: '📊',
    titleKey: 'auth.usp.analyticsTitle',
    titleFallback: 'Smart Analytics',
    descKey: 'auth.usp.analyticsDesc',
    descFallback: 'Sparklines, pillar-verdeling, gat-detectie, score-correlatie en top-performer tracking. Weet wat werkt.',
  },
  {
    emoji: '🎨',
    titleKey: 'auth.usp.personalTitle',
    titleFallback: 'Hyper-Gepersonaliseerd',
    descKey: 'auth.usp.personalDesc',
    descFallback: 'Merk Profiel, Knowledge Base, Audience Personas, Tone of Voice. Content die klinkt als jouw merk.',
  },
  {
    emoji: '📅',
    titleKey: 'auth.usp.calendarTitle',
    titleFallback: 'Slimme Kalender',
    descKey: 'auth.usp.calendarDesc',
    descFallback: 'AI vult je kalender. Trending topics, seizoenen, content pillars — automatisch verdeeld en ingepland.',
  },
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
              by HolidaiButler
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
              {t('auth.studioTagline', 'Europees AI Content Platform')}
            </Box>

            <Typography sx={{
              fontSize: { xs: '2rem', sm: '2.5rem', md: '3.1rem' },
              fontWeight: 800,
              lineHeight: 1.15,
              mb: 2.5,
              color: '#fff',
              letterSpacing: '-0.025em',
            }}>
              {t('auth.studioHeroTitle', 'De slimste')}{' '}
              <Box component="span" sx={{ color: '#02C39A' }}>
                {t('auth.studioHeroTitleAccent', 'AI Content Studio')}
              </Box>{' '}
              {t('auth.studioHeroTitleSuffix', 'van Europa')}
            </Typography>

            <Typography sx={{
              fontSize: { xs: '1rem', md: '1.15rem' },
              maxWidth: 560,
              mx: { xs: 'auto', md: 0 },
              color: '#8B9DAF',
              lineHeight: 1.65,
              mb: 3.5,
            }}>
              {t('auth.studioHeroSubtitle', 'Genereer, plan en publiceer content op 7 platformen vanuit één intelligent werkstation. Eén concept, meerdere platformen — de AI doet het werk, jij reviewt en keurt goed.')}
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
                {t('auth.studioCtaDemo', 'Gratis Demo Aanvragen')}
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
        background: 'linear-gradient(180deg, rgba(2,128,144,0.08) 0%, transparent 100%)',
        borderTop: '1px solid rgba(2,192,154,0.1)',
        borderBottom: '1px solid rgba(2,192,154,0.1)',
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
            { type: 'img', src: '/studio/eu-ai-act.png', strong: 'EU AI Act', suffix: 'Compliant', alt: 'EU AI Act' },
            { type: 'img', src: '/studio/gdpr.jpg', strong: 'GDPR-proof', suffix: '100% EU Data', alt: 'GDPR' },
            { type: 'flag', flag: '🇫🇷', strong: 'Mistral AI', suffix: 'Parijs' },
            { type: 'flag', flag: '🇩🇪', strong: 'DeepL Pro', suffix: 'Keulen' },
            { type: 'flag', flag: '🇩🇪', strong: 'Hetzner Cloud', suffix: 'Duitsland' },
          ].map((b, i) => (
            <Box key={i} sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.25,
              fontSize: { xs: '0.78rem', md: '0.82rem' },
              color: '#8B9DAF',
            }}>
              {b.type === 'img' ? (
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
                    width: '100%', height: '100%', objectFit: 'cover', display: 'block',
                  }} />
                </Box>
              ) : (
                <Box sx={{
                  width: 32, height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.6rem',
                  lineHeight: 1,
                  flexShrink: 0,
                }}>
                  {b.flag}
                </Box>
              )}
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
          {t('auth.uspSectionTitle', 'Waarom AI Content Studio?')}
        </Typography>
        <Typography sx={{
          fontSize: '0.95rem',
          color: '#8B9DAF',
          textAlign: 'center',
          mb: { xs: 3, md: 5 },
          px: 3,
        }}>
          {t('auth.uspSectionSubtitle', '6 redenen waarom marketeers overstappen')}
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
          {USP_ITEMS.map(({ emoji, titleKey, titleFallback, descKey, descFallback }) => (
            <Box key={titleKey} sx={{
              bgcolor: '#1A2332',
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
                {t(titleKey, titleFallback)}
              </Typography>
              <Typography sx={{
                fontSize: '0.82rem',
                color: '#8B9DAF',
                lineHeight: 1.6,
              }}>
                {t(descKey, descFallback)}
              </Typography>
            </Box>
          ))}
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
        borderTop: '1px solid #1A2332',
        mt: 4, py: 3, px: 3,
        textAlign: 'center',
        bgcolor: '#0D1B2A',
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

      {/* ── Dialogs ── */}
      <LoginDialog open={loginDialogOpen} onClose={() => setLoginDialogOpen(false)} />
      <DemoRequestDialog open={demoDialogOpen} onClose={() => setDemoDialogOpen(false)} />
    </Box>
  );
}
