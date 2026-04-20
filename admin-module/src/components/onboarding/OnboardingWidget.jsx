import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, IconButton, Tooltip, Chip, Button,
  LinearProgress, Collapse, Fade, CircularProgress,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import CloseIcon from '@mui/icons-material/Close';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import PaletteIcon from '@mui/icons-material/Palette';
import ShareIcon from '@mui/icons-material/Share';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import EditNoteIcon from '@mui/icons-material/EditNote';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import PeopleIcon from '@mui/icons-material/People';
import PlaceIcon from '@mui/icons-material/Place';
import ChatIcon from '@mui/icons-material/Chat';
import EventIcon from '@mui/icons-material/Event';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import client from '../../api/client.js';
import { isStudioMode } from '../../utils/studioMode.js';

// ── Step definitions ─────────────────────────────────────────
// Steps tagged with 'content' appear for all users
// Steps tagged with 'platform' appear only for Admin Portal users with matching feature flags
const ALL_STEPS = [
  {
    id: 'welcome',
    icon: RocketLaunchIcon,
    titleKey: 'onboarding.steps.welcome',
    titleFallback: 'Welkom!',
    descKey: 'onboarding.steps.welcomeDesc',
    descFallback: 'Ontdek de mogelijkheden van uw werkruimte.',
    path: null, // No navigation, just acknowledge
    mode: 'all',
    autoComplete: true, // Completes when widget is first opened
  },
  {
    id: 'brand_profile',
    icon: PaletteIcon,
    titleKey: 'onboarding.steps.brandProfile',
    titleFallback: 'Stel uw merkprofiel in',
    descKey: 'onboarding.steps.brandProfileDesc',
    descFallback: 'Voeg bedrijfsnaam, branche, USPs en tone of voice toe zodat AI on-brand content genereert.',
    path: '/branding',
    mode: 'all',
  },
  {
    id: 'connect_social',
    icon: ShareIcon,
    titleKey: 'onboarding.steps.connectSocial',
    titleFallback: 'Koppel social media',
    descKey: 'onboarding.steps.connectSocialDesc',
    descFallback: 'Verbind Facebook, Instagram of LinkedIn zodat content direct gepubliceerd kan worden.',
    path: '/content-studio?tab=social',
    mode: 'all',
  },
  {
    id: 'first_suggestion',
    icon: AutoAwesomeIcon,
    titleKey: 'onboarding.steps.firstSuggestion',
    titleFallback: 'Genereer AI content',
    descKey: 'onboarding.steps.firstSuggestionDesc',
    descFallback: 'Laat de AI uw eerste content suggesties genereren op basis van uw merkprofiel.',
    path: '/content-studio?tab=suggesties',
    mode: 'all',
  },
  {
    id: 'plan_item',
    icon: EditNoteIcon,
    titleKey: 'onboarding.steps.planItem',
    titleFallback: 'Plan uw eerste item',
    descKey: 'onboarding.steps.planItemDesc',
    descFallback: 'Kies een content item en plan het in op de kalender.',
    path: '/content-studio?tab=items',
    mode: 'all',
  },
  {
    id: 'view_calendar',
    icon: CalendarMonthIcon,
    titleKey: 'onboarding.steps.viewCalendar',
    titleFallback: 'Bekijk de kalender',
    descKey: 'onboarding.steps.viewCalendarDesc',
    descFallback: 'Overzicht van geplande en gepubliceerde content per dag, week of maand.',
    path: '/content-studio?tab=kalender',
    mode: 'all',
  },
  // ── Platform-only steps (Admin Portal with feature flags) ──
  {
    id: 'explore_pois',
    icon: PlaceIcon,
    titleKey: 'onboarding.steps.explorePois',
    titleFallback: 'Verken uw POIs',
    descKey: 'onboarding.steps.explorePoisDesc',
    descFallback: 'Bekijk en beheer de Points of Interest in uw bestemming.',
    path: '/pois',
    mode: 'platform',
    featureFlag: 'hasPOI',
  },
  {
    id: 'test_chatbot',
    icon: ChatIcon,
    titleKey: 'onboarding.steps.testChatbot',
    titleFallback: 'Test de chatbot',
    descKey: 'onboarding.steps.testChatbotDesc',
    descFallback: 'Stel een vraag aan de AI-chatbot en ervaar hoe bezoekers uw bestemming ontdekken.',
    path: '/analytics?tab=chatbot',
    mode: 'platform',
    featureFlag: 'hasChatbot',
  },
  {
    id: 'check_events',
    icon: EventIcon,
    titleKey: 'onboarding.steps.checkEvents',
    titleFallback: 'Bekijk evenementen',
    descKey: 'onboarding.steps.checkEventsDesc',
    descFallback: 'Ontdek de agenda-module met lokale evenementen.',
    path: '/content-studio',
    mode: 'platform',
    featureFlag: 'hasAgenda',
  },
  // ── Optional for all ──
  {
    id: 'invite_team',
    icon: PeopleIcon,
    titleKey: 'onboarding.steps.inviteTeam',
    titleFallback: 'Nodig teamleden uit',
    descKey: 'onboarding.steps.inviteTeamDesc',
    descFallback: 'Voeg collega\'s toe zodat zij content kunnen bijdragen en reviewen.',
    path: '/users',
    mode: 'admin_only', // Only for platform_admin
    optional: true,
  },
];

// ═══════════════════════════════════════════════════════════════
// MAIN WIDGET
// ═══════════════════════════════════════════════════════════════
export default function OnboardingWidget({ user, featureFlags = {} }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const studioMode = isStudioMode();

  const [expanded, setExpanded] = useState(false);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [dismissed, setDismissed] = useState(true); // Start hidden until loaded
  const [loaded, setLoaded] = useState(false);

  // Determine applicable steps based on mode + feature flags
  const applicableSteps = ALL_STEPS.filter(step => {
    if (step.mode === 'all') return true;
    if (step.mode === 'platform' && !studioMode) {
      // Check feature flag if specified
      if (step.featureFlag) {
        return featureFlags[step.featureFlag] !== false;
      }
      return true;
    }
    if (step.mode === 'admin_only') {
      return user?.role === 'platform_admin';
    }
    return false;
  });

  const totalSteps = applicableSteps.filter(s => !s.optional).length;
  const completedCount = applicableSteps.filter(s => !s.optional && completedSteps.includes(s.id)).length;
  const progress = totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0;
  const allDone = completedCount >= totalSteps;

  // Find next uncompleted step
  const nextStep = applicableSteps.find(s => !s.optional && !completedSteps.includes(s.id));

  // Load progress from backend
  useEffect(() => {
    if (!user?.id) return;
    client.get('/onboarding/progress')
      .then(res => {
        const data = res.data?.data;
        if (data) {
          setCompletedSteps(data.completed_steps || []);
          setDismissed(!!data.dismissed);
          // Auto-complete welcome step
          if (!data.completed_steps?.includes('welcome') && !data.dismissed) {
            client.post('/onboarding/step/welcome').catch(() => {});
            setCompletedSteps(prev => [...prev, 'welcome']);
          }
        }
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [user?.id]);

  // Listen for reopen event (from Header help menu)
  useEffect(() => {
    const handler = async () => {
      setDismissed(false);
      setExpanded(true);
      try { await client.post('/onboarding/reopen'); } catch { /* non-blocking */ }
    };
    window.addEventListener('hb:onboarding-reopen', handler);
    return () => window.removeEventListener('hb:onboarding-reopen', handler);
  }, []);

  const handleCompleteStep = useCallback(async (stepId, path) => {
    if (!completedSteps.includes(stepId)) {
      setCompletedSteps(prev => [...prev, stepId]);
      try { await client.post(`/onboarding/step/${stepId}`); } catch { /* non-blocking */ }
    }
    if (path) {
      navigate(path);
      setExpanded(false);
    }
  }, [completedSteps, navigate]);

  const handleDismiss = useCallback(async () => {
    setDismissed(true);
    setExpanded(false);
    try { await client.post('/onboarding/dismiss'); } catch { /* non-blocking */ }
  }, []);

  // Don't render if not loaded, dismissed, or platform_admin on first visit (they use OnboardingPage)
  if (!loaded || dismissed) return null;

  return (
    <Fade in>
      <Box sx={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 1250,
        maxWidth: expanded ? 360 : 'auto',
        '@media print': { display: 'none' },
      }}>
        {/* ── Expanded: Checklist ── */}
        <Collapse in={expanded}>
          <Paper
            elevation={8}
            sx={{
              borderRadius: 3,
              overflow: 'hidden',
              mb: 1,
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            {/* Header */}
            <Box sx={{
              p: 2,
              background: 'linear-gradient(135deg, #5E8B7E 0%, #2C3E50 100%)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  {studioMode
                    ? t('onboarding.widget.titleStudio', 'Content Studio Setup')
                    : t('onboarding.widget.titlePlatform', 'Platform Setup')}
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.85 }}>
                  {completedCount}/{totalSteps} {t('onboarding.widget.stepsComplete', 'stappen voltooid')}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                <IconButton size="small" onClick={() => setExpanded(false)} sx={{ color: '#fff' }}>
                  <ExpandMoreIcon fontSize="small" />
                </IconButton>
                <IconButton size="small" onClick={handleDismiss} sx={{ color: 'rgba(255,255,255,0.7)' }}>
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Box>
            </Box>

            {/* Progress bar */}
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{
                height: 4,
                bgcolor: 'action.hover',
                '& .MuiLinearProgress-bar': { bgcolor: '#02C39A' },
              }}
            />

            {/* Steps list */}
            <Box sx={{ maxHeight: 400, overflowY: 'auto', p: 1 }}>
              {applicableSteps.map(step => {
                const isCompleted = completedSteps.includes(step.id);
                const Icon = step.icon;
                return (
                  <Box
                    key={step.id}
                    onClick={() => !isCompleted && handleCompleteStep(step.id, step.path)}
                    sx={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 1.5,
                      p: 1.5,
                      borderRadius: 1.5,
                      cursor: isCompleted ? 'default' : 'pointer',
                      opacity: isCompleted ? 0.6 : 1,
                      transition: 'background-color 150ms',
                      '&:hover': !isCompleted ? { bgcolor: 'action.hover' } : {},
                    }}
                  >
                    {/* Status icon */}
                    {isCompleted
                      ? <CheckCircleIcon sx={{ fontSize: 20, color: '#02C39A', mt: 0.25 }} />
                      : <RadioButtonUncheckedIcon sx={{ fontSize: 20, color: 'text.disabled', mt: 0.25 }} />
                    }
                    {/* Content */}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        <Icon sx={{ fontSize: 16, color: isCompleted ? 'text.disabled' : 'primary.main' }} />
                        <Typography variant="body2" sx={{
                          fontWeight: isCompleted ? 400 : 600,
                          textDecoration: isCompleted ? 'line-through' : 'none',
                          color: isCompleted ? 'text.secondary' : 'text.primary',
                        }}>
                          {t(step.titleKey, step.titleFallback)}
                        </Typography>
                        {step.optional && (
                          <Chip label={t('onboarding.widget.optional', 'optioneel')} size="small"
                            sx={{ height: 16, fontSize: 9, bgcolor: 'action.hover' }} />
                        )}
                      </Box>
                      {!isCompleted && (
                        <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.4, mt: 0.25, display: 'block' }}>
                          {t(step.descKey, step.descFallback)}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                );
              })}
            </Box>

            {/* Footer */}
            {allDone ? (
              <Box sx={{ p: 2, textAlign: 'center', bgcolor: 'rgba(2,195,154,0.08)' }}>
                <CheckCircleIcon sx={{ fontSize: 32, color: '#02C39A', mb: 0.5 }} />
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {t('onboarding.widget.allDone', 'Setup voltooid!')}
                </Typography>
                <Button size="small" onClick={handleDismiss} sx={{ mt: 1, textTransform: 'none' }}>
                  {t('onboarding.widget.dismiss', 'Widget sluiten')}
                </Button>
              </Box>
            ) : nextStep && (
              <Box sx={{ p: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
                <Button
                  fullWidth variant="contained" size="small"
                  startIcon={<nextStep.icon sx={{ fontSize: 16 }} />}
                  onClick={() => handleCompleteStep(nextStep.id, nextStep.path)}
                  sx={{ textTransform: 'none', fontWeight: 600, bgcolor: '#02C39A', '&:hover': { bgcolor: '#02a883' } }}
                >
                  {t('onboarding.widget.next', 'Volgende')}: {t(nextStep.titleKey, nextStep.titleFallback)}
                </Button>
              </Box>
            )}
          </Paper>
        </Collapse>

        {/* ── Collapsed: Progress Circle ── */}
        {!expanded && (
          <Tooltip title={t('onboarding.widget.openChecklist', 'Setup checklist openen')} placement="left">
            <Paper
              elevation={6}
              onClick={() => setExpanded(true)}
              sx={{
                width: 56, height: 56, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
                background: allDone ? '#02C39A' : 'linear-gradient(135deg, #5E8B7E 0%, #2C3E50 100%)',
                color: '#fff',
                transition: 'transform 200ms ease, box-shadow 200ms ease',
                '&:hover': { transform: 'scale(1.1)', boxShadow: 8 },
                position: 'relative',
              }}
            >
              {allDone ? (
                <CheckCircleIcon sx={{ fontSize: 28 }} />
              ) : (
                <>
                  <CircularProgress
                    variant="determinate"
                    value={progress}
                    size={48}
                    thickness={3}
                    sx={{
                      position: 'absolute',
                      color: '#02C39A',
                      '& .MuiCircularProgress-circle': { strokeLinecap: 'round' },
                    }}
                  />
                  <Typography variant="caption" sx={{ fontWeight: 700, fontSize: 13 }}>
                    {progress}%
                  </Typography>
                </>
              )}
            </Paper>
          </Tooltip>
        )}
      </Box>
    </Fade>
  );
}
