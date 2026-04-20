import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Box, Typography, Paper, IconButton, Tooltip, Chip, Button,
  LinearProgress, Collapse, CircularProgress,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import CloseIcon from '@mui/icons-material/Close';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
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

const ALL_STEPS = [
  { id: 'welcome', icon: RocketLaunchIcon, titleKey: 'onboarding.steps.welcome', titleFallback: 'Welkom!', descKey: 'onboarding.steps.welcomeDesc', descFallback: 'Ontdek de mogelijkheden van uw werkruimte.', path: null, mode: 'all', autoComplete: true },
  { id: 'brand_profile', icon: PaletteIcon, titleKey: 'onboarding.steps.brandProfile', titleFallback: 'Stel uw merkprofiel in', descKey: 'onboarding.steps.brandProfileDesc', descFallback: 'Voeg bedrijfsnaam, branche, USPs en tone of voice toe.', path: '/branding', mode: 'all' },
  { id: 'connect_social', icon: ShareIcon, titleKey: 'onboarding.steps.connectSocial', titleFallback: 'Koppel social media', descKey: 'onboarding.steps.connectSocialDesc', descFallback: 'Verbind Facebook, Instagram of LinkedIn.', path: '/content-studio?tab=social', mode: 'all' },
  { id: 'first_suggestion', icon: AutoAwesomeIcon, titleKey: 'onboarding.steps.firstSuggestion', titleFallback: 'Genereer AI content', descKey: 'onboarding.steps.firstSuggestionDesc', descFallback: 'Laat de AI content suggesties genereren.', path: '/content-studio?tab=suggesties', mode: 'all' },
  { id: 'plan_item', icon: EditNoteIcon, titleKey: 'onboarding.steps.planItem', titleFallback: 'Plan uw eerste item', descKey: 'onboarding.steps.planItemDesc', descFallback: 'Kies een item en plan het in.', path: '/content-studio?tab=items', mode: 'all' },
  { id: 'view_calendar', icon: CalendarMonthIcon, titleKey: 'onboarding.steps.viewCalendar', titleFallback: 'Bekijk de kalender', descKey: 'onboarding.steps.viewCalendarDesc', descFallback: 'Overzicht van geplande content.', path: '/content-studio?tab=kalender', mode: 'all' },
  { id: 'explore_pois', icon: PlaceIcon, titleKey: 'onboarding.steps.explorePois', titleFallback: 'Verken uw POIs', descKey: 'onboarding.steps.explorePoisDesc', descFallback: 'Beheer de Points of Interest.', path: '/pois', mode: 'platform', featureFlag: 'hasPOI' },
  { id: 'test_chatbot', icon: ChatIcon, titleKey: 'onboarding.steps.testChatbot', titleFallback: 'Test de chatbot', descKey: 'onboarding.steps.testChatbotDesc', descFallback: 'Ervaar de AI-chatbot.', path: '/analytics?tab=chatbot', mode: 'platform', featureFlag: 'hasChatbot' },
  { id: 'check_events', icon: EventIcon, titleKey: 'onboarding.steps.checkEvents', titleFallback: 'Bekijk evenementen', descKey: 'onboarding.steps.checkEventsDesc', descFallback: 'Ontdek de agenda-module.', path: '/content-studio', mode: 'platform', featureFlag: 'hasAgenda' },
  { id: 'invite_team', icon: PeopleIcon, titleKey: 'onboarding.steps.inviteTeam', titleFallback: 'Nodig teamleden uit', descKey: 'onboarding.steps.inviteTeamDesc', descFallback: 'Voeg collega\'s toe.', path: '/users', mode: 'admin_only', optional: true },
];

/*
 * INLINE STYLE for the outer container — NOT MUI sx.
 * MUI sx converts numeric values to theme spacing (24 → 192px).
 * Native CSS style bypasses this entirely.
 */
// Inject CSS rule once — bulletproof fixed positioning
// Positioning via inline style on the container div

export default function OnboardingWidget({ user, featureFlags = {} }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const studioMode = isStudioMode();

  const [expanded, setExpanded] = useState(false);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [backendDismissed, setBackendDismissed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [hiddenThisSession, setHiddenThisSession] = useState(false);

  const applicableSteps = ALL_STEPS.filter(step => {
    if (step.mode === 'all') return true;
    if (step.mode === 'platform' && !studioMode) {
      return step.featureFlag ? featureFlags[step.featureFlag] !== false : true;
    }
    if (step.mode === 'admin_only') return user?.role === 'platform_admin';
    return false;
  });

  const requiredSteps = applicableSteps.filter(s => !s.optional);
  const totalSteps = requiredSteps.length;
  const completedCount = requiredSteps.filter(s => completedSteps.includes(s.id)).length;
  const progress = totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0;
  const allDone = completedCount >= totalSteps;
  const nextStep = requiredSteps.find(s => !completedSteps.includes(s.id));

  useEffect(() => {
    if (!user?.id) return;
    client.get('/onboarding/progress')
      .then(res => {
        const data = res.data?.data;
        if (data) {
          setCompletedSteps(data.completed_steps || []);
          setBackendDismissed(!!data.dismissed);
          if (!data.completed_steps?.includes('welcome') && !data.dismissed) {
            client.post('/onboarding/step/welcome').catch(() => {});
            setCompletedSteps(prev => [...prev, 'welcome']);
          }
        }
        setLoaded(true);
        window.dispatchEvent(new CustomEvent('hb:onboarding-state', {
          detail: { completedSteps: data?.completed_steps || [], dismissed: !!data?.dismissed }
        }));
      })
      .catch(() => setLoaded(true));
  }, [user?.id]);

  useEffect(() => {
    const handler = () => {
      setHiddenThisSession(false);
      setBackendDismissed(false);
      setExpanded(true);
      client.post('/onboarding/reopen').catch(() => {});
    };
    window.addEventListener('hb:onboarding-reopen', handler);
    return () => window.removeEventListener('hb:onboarding-reopen', handler);
  }, []);

  const handleHideCircle = useCallback(() => {
    setHiddenThisSession(true);
    setExpanded(false);
  }, []);

  const handleFullDismiss = useCallback(async () => {
    setBackendDismissed(true);
    setExpanded(false);
    try { await client.post('/onboarding/dismiss'); } catch {}
  }, []);

  const handleCompleteStep = useCallback(async (stepId, path) => {
    if (!completedSteps.includes(stepId)) {
      setCompletedSteps(prev => [...prev, stepId]);
      try { await client.post(`/onboarding/step/${stepId}`); } catch {}
    }
    if (path) { navigate(path); setExpanded(false); }
  }, [completedSteps, navigate]);

  const handleToggleStep = useCallback(async (stepId) => {
    if (completedSteps.includes(stepId)) {
      setCompletedSteps(prev => prev.filter(s => s !== stepId));
      try { await client.post(`/onboarding/step/${stepId}`, { toggle: true }); } catch {}
    } else {
      setCompletedSteps(prev => [...prev, stepId]);
      try { await client.post(`/onboarding/step/${stepId}`); } catch {}
    }
  }, [completedSteps]);

  if (!loaded) return null;
  if (backendDismissed && allDone) return null;
  if (hiddenThisSession) return null;

  return createPortal(
    <div style={{position:"fixed",bottom:"24px",right:"24px",zIndex:1250,left:"auto",top:"auto",transform:"none"}}>
      {/* ── Expanded panel ── */}
      <Collapse in={expanded}>
        <Paper elevation={8} sx={{ borderRadius: 3, overflow: 'hidden', mb: 1, border: '1px solid', borderColor: 'divider', maxWidth: 360 }}>
          <Box sx={{ p: 2, background: 'linear-gradient(135deg, #5E8B7E 0%, #2C3E50 100%)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                {studioMode ? t('onboarding.widget.titleStudio', 'Content Studio Setup') : t('onboarding.widget.titlePlatform', 'Platform Setup')}
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.85 }}>
                {completedCount}/{totalSteps} {t('onboarding.widget.stepsComplete', 'stappen voltooid')}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <IconButton size="small" onClick={() => setExpanded(false)} sx={{ color: '#fff' }}><ExpandMoreIcon fontSize="small" /></IconButton>
              <IconButton size="small" onClick={handleHideCircle} sx={{ color: 'rgba(255,255,255,0.7)' }}><CloseIcon fontSize="small" /></IconButton>
            </Box>
          </Box>
          <LinearProgress variant="determinate" value={progress} sx={{ height: 4, bgcolor: 'action.hover', '& .MuiLinearProgress-bar': { bgcolor: '#02C39A' } }} />
          <Box sx={{ maxHeight: 400, overflowY: 'auto', p: 1 }}>
            {applicableSteps.map(step => {
              const isCompleted = completedSteps.includes(step.id);
              const Icon = step.icon;
              return (
                <Box key={step.id}
                  onClick={() => isCompleted ? handleToggleStep(step.id) : handleCompleteStep(step.id, step.path)}
                  sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, p: 1.5, borderRadius: 1.5, cursor: 'pointer', opacity: isCompleted ? 0.6 : 1, '&:hover': { bgcolor: 'action.hover' } }}>
                  {isCompleted ? <CheckCircleIcon sx={{ fontSize: 20, color: '#02C39A', mt: 0.25 }} /> : <RadioButtonUncheckedIcon sx={{ fontSize: 20, color: 'text.disabled', mt: 0.25 }} />}
                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      <Icon sx={{ fontSize: 16, color: isCompleted ? 'text.disabled' : 'primary.main' }} />
                      <Typography variant="body2" sx={{ fontWeight: isCompleted ? 400 : 600, textDecoration: isCompleted ? 'line-through' : 'none', color: isCompleted ? 'text.secondary' : 'text.primary' }}>
                        {t(step.titleKey, step.titleFallback)}
                      </Typography>
                      {step.optional && <Chip label="optioneel" size="small" sx={{ height: 16, fontSize: 9, bgcolor: 'action.hover' }} />}
                    </Box>
                    {!isCompleted && <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.4, mt: 0.25, display: 'block' }}>{t(step.descKey, step.descFallback)}</Typography>}
                  </Box>
                </Box>
              );
            })}
          </Box>
          {allDone ? (
            <Box sx={{ p: 2, textAlign: 'center', bgcolor: 'rgba(2,195,154,0.08)' }}>
              <CheckCircleIcon sx={{ fontSize: 32, color: '#02C39A', mb: 0.5 }} />
              <Typography variant="body2" sx={{ fontWeight: 600 }}>Setup voltooid!</Typography>
              <Button size="small" onClick={handleFullDismiss} sx={{ mt: 1, textTransform: 'none' }}>Widget sluiten</Button>
            </Box>
          ) : nextStep && (
            <Box sx={{ p: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
              <Button fullWidth variant="contained" size="small" startIcon={<nextStep.icon sx={{ fontSize: 16 }} />}
                onClick={() => handleCompleteStep(nextStep.id, nextStep.path)}
                sx={{ textTransform: 'none', fontWeight: 600, bgcolor: '#02C39A', '&:hover': { bgcolor: '#02a883' } }}>
                Volgende: {t(nextStep.titleKey, nextStep.titleFallback)}
              </Button>
            </Box>
          )}
        </Paper>
      </Collapse>

      {/* ── Collapsed: circle with X button ── */}
      {!expanded && (
        <div style={{ position: 'relative', display: 'inline-block' }}>
          {/* X dismiss button */}
          <div
            onClick={(e) => { e.stopPropagation(); handleHideCircle(); }}
            style={{
              position: 'absolute', top: -6, right: -6, zIndex: 2,
              width: 20, height: 20, borderRadius: '50%',
              backgroundColor: '#374151', border: '2px solid #1f2937',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: '#fff', fontSize: 12, lineHeight: 1,
            }}
            title="Verbergen"
          >
            ✕
          </div>
          {/* Progress circle */}
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
            }}
          >
            {allDone ? <CheckCircleIcon sx={{ fontSize: 28 }} /> : (
              <>
                <CircularProgress variant="determinate" value={progress} size={48} thickness={3}
                  sx={{ position: 'absolute', color: '#02C39A', '& .MuiCircularProgress-circle': { strokeLinecap: 'round' } }} />
                <Typography variant="caption" sx={{ fontWeight: 700, fontSize: 13, zIndex: 1 }}>{progress}%</Typography>
              </>
            )}
          </Paper>
        </div>
      )}
    </div>,
    document.body
  );
}
