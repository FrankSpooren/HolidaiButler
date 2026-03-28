import { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography,
  Stepper, Step, StepLabel, StepContent, Box, Alert
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import PaletteIcon from '@mui/icons-material/Palette';
import ShareIcon from '@mui/icons-material/Share';
import EditIcon from '@mui/icons-material/Edit';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import client from '../../api/client.js';

const STEPS = [
  {
    icon: PaletteIcon,
    titleKey: 'onboardingGuide.step1Title',
    titleFallback: 'Vul uw Merk Profiel in',
    descKey: 'onboardingGuide.step1Desc',
    descFallback: 'Voeg uw bedrijfsnaam, branche, USPs en missie toe. Dit helpt de AI om on-brand content te genereren.',
    path: '/branding',
  },
  {
    icon: ShareIcon,
    titleKey: 'onboardingGuide.step2Title',
    titleFallback: 'Koppel uw social media accounts',
    descKey: 'onboardingGuide.step2Desc',
    descFallback: 'Verbind Facebook, Instagram of LinkedIn zodat content direct gepubliceerd kan worden.',
    path: '/content-studio',
  },
  {
    icon: AutoAwesomeIcon,
    titleKey: 'onboardingGuide.step3Title',
    titleFallback: 'Genereer uw eerste content',
    descKey: 'onboardingGuide.step3Desc',
    descFallback: 'Voeg trending keywords toe en laat de AI content suggesties genereren.',
    path: '/content-studio',
  },
  {
    icon: EditIcon,
    titleKey: 'onboardingGuide.step4Title',
    titleFallback: 'Review en publiceer',
    descKey: 'onboardingGuide.step4Desc',
    descFallback: 'Bekijk de gegenereerde content, pas aan waar nodig, en plan publicatie in.',
    path: '/content-studio',
  },
];

export default function AdminOnboardingGuide({ open, onClose }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);

  const handleNext = () => {
    if (activeStep < STEPS.length - 1) {
      setActiveStep(s => s + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = async () => {
    try {
      await client.post('/auth/onboarding-complete');
    } catch { /* non-blocking */ }
    onClose();
  };

  const handleGoTo = (path) => {
    handleComplete();
    navigate(path);
  };

  return (
    <Dialog open={open} onClose={handleComplete} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <AutoAwesomeIcon color="primary" />
        <Typography variant="h6" fontWeight={700}>
          {t('onboardingGuide.title', 'Welkom bij de Content Studio!')}
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Alert severity="info" sx={{ mb: 2 }}>
          {t('onboardingGuide.intro', 'In 4 stappen helpen we u om de Content Studio in te richten. U kunt deze gids op elk moment sluiten en later terugkomen.')}
        </Alert>

        <Stepper activeStep={activeStep} orientation="vertical">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            return (
              <Step key={index}>
                <StepLabel
                  icon={<Icon sx={{ fontSize: 20, color: index <= activeStep ? 'primary.main' : 'text.disabled' }} />}
                >
                  <Typography fontWeight={600}>
                    {t(step.titleKey, step.titleFallback)}
                  </Typography>
                </StepLabel>
                <StepContent>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {t(step.descKey, step.descFallback)}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button size="small" variant="contained" onClick={() => handleGoTo(step.path)}>
                      {t('onboardingGuide.goTo', 'Ga naar')} →
                    </Button>
                    <Button size="small" onClick={handleNext}>
                      {index < STEPS.length - 1
                        ? t('onboardingGuide.skip', 'Overslaan')
                        : t('onboardingGuide.finish', 'Afronden')}
                    </Button>
                  </Box>
                </StepContent>
              </Step>
            );
          })}
        </Stepper>

        {activeStep >= STEPS.length && (
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <CheckCircleIcon sx={{ fontSize: 48, color: 'success.main', mb: 1 }} />
            <Typography variant="h6">{t('onboardingGuide.complete', 'Klaar!')}</Typography>
            <Typography variant="body2" color="text.secondary">
              {t('onboardingGuide.completeDesc', 'Uw Content Studio is klaar voor gebruik.')}
            </Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleComplete} color="inherit">
          {t('onboardingGuide.close', 'Sluiten')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
