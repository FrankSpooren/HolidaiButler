import React, { useState } from 'react';
import {
  Dialog,
  Box,
  Typography,
  Button,
  IconButton,
  Checkbox,
  FormControlLabel,
  Chip,
  Container,
  useTheme,
  useMediaQuery,
  alpha,
  MobileStepper,
} from '@mui/material';
import {
  Close as CloseIcon,
  ArrowForward as ArrowForwardIcon,
  ArrowBack as ArrowBackIcon,
  Explore as ExploreIcon,
  LocalActivity as ActivityIcon,
  Favorite as FavoriteIcon,
  Security as SecurityIcon,
  EmojiEvents as RewardsIcon,
  Restaurant as RestaurantIcon,
  BeachAccess as BeachIcon,
  Museum as MuseumIcon,
  FamilyRestroom as FamilyIcon,
  SportsBasketball as SportsIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * OnboardingFlow - Beautiful Multi-Step Onboarding
 *
 * Enterprise onboarding that impresses investors by showing:
 * - Welcome screen with value proposition
 * - Interest selection for personalization
 * - Quick feature tour
 * - Encourages account creation
 *
 * Improves user activation and retention
 */

const OnboardingFlow = ({ open, onClose, onComplete }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [activeStep, setActiveStep] = useState(0);
  const [selectedInterests, setSelectedInterests] = useState([]);

  const interests = [
    { id: 'nature', label: 'Natuur & Outdoor', icon: <BeachIcon />, color: '#4CAF50' },
    { id: 'culture', label: 'Cultuur & Musea', icon: <MuseumIcon />, color: '#FF9800' },
    { id: 'family', label: 'Familie & Kinderen', icon: <FamilyIcon />, color: '#E91E63' },
    { id: 'food', label: 'Eten & Drinken', icon: <RestaurantIcon />, color: '#FF5722' },
    { id: 'sports', label: 'Sport & Avontuur', icon: <SportsIcon />, color: '#2196F3' },
  ];

  const steps = [
    {
      title: 'Welkom bij HolidaiButler',
      subtitle: 'Je persoonlijke gids voor de Costa Blanca',
      description:
        'Ontdek en boek authentieke ervaringen, restaurants en activiteiten in Spanje\'s mooiste kuststreek. Alles wat je nodig hebt op één plek.',
      icon: <ExploreIcon sx={{ fontSize: 80 }} />,
      color: theme.palette.primary.main,
      features: [
        { icon: <ActivityIcon />, text: 'Meer dan 100+ geverifieerde ervaringen' },
        { icon: <SecurityIcon />, text: 'Veilig betalen & directe bevestiging' },
        { icon: <RewardsIcon />, text: 'Spaar punten en ontvang kortingen' },
      ],
    },
    {
      title: 'Wat zijn je interesses?',
      subtitle: 'Personaliseer je ervaring',
      description:
        'Help ons je de beste aanbevelingen te geven door je interesses te selecteren. Je kunt dit later altijd aanpassen.',
      component: 'interests',
      color: theme.palette.secondary.main,
    },
    {
      title: 'Alles binnen handbereik',
      subtitle: 'Jouw persoonlijke reisassistent',
      description:
        'Bewaar je favorieten, bekijk je boekingen en ontvang gepersonaliseerde aanbevelingen. Alles synchroon op al je apparaten.',
      icon: <FavoriteIcon sx={{ fontSize: 80 }} />,
      color: theme.palette.error.main,
      features: [
        { icon: <FavoriteIcon />, text: 'Bewaar je favoriete plekken' },
        { icon: <ActivityIcon />, text: 'Beheer al je boekingen' },
        { icon: <RewardsIcon />, text: 'Krijg exclusieve aanbiedingen' },
      ],
    },
  ];

  const currentStep = steps[activeStep];

  const handleNext = () => {
    if (activeStep === steps.length - 1) {
      // Last step - complete onboarding
      onComplete?.({
        interests: selectedInterests,
        completed: true,
      });
      onClose();
    } else {
      setActiveStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleSkip = () => {
    onComplete?.({
      interests: [],
      completed: false,
      skipped: true,
    });
    onClose();
  };

  const toggleInterest = (interestId) => {
    setSelectedInterests((prev) =>
      prev.includes(interestId)
        ? prev.filter((id) => id !== interestId)
        : [...prev, interestId]
    );
  };

  const canProceed = () => {
    if (currentStep.component === 'interests') {
      return selectedInterests.length > 0;
    }
    return true;
  };

  return (
    <Dialog
      open={open}
      onClose={handleSkip}
      maxWidth="md"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          borderRadius: isMobile ? 0 : 3,
          overflow: 'hidden',
        },
      }}
    >
      {/* Close Button */}
      <IconButton
        onClick={handleSkip}
        sx={{
          position: 'absolute',
          right: 16,
          top: 16,
          zIndex: 1,
          bgcolor: 'background.paper',
          '&:hover': {
            bgcolor: 'action.hover',
          },
        }}
        aria-label="Skip onboarding"
      >
        <CloseIcon />
      </IconButton>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeStep}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.3 }}
        >
          <Box
            sx={{
              minHeight: isMobile ? '100vh' : 500,
              display: 'flex',
              flexDirection: 'column',
              background: `linear-gradient(135deg,
                ${alpha(currentStep.color, 0.1)} 0%,
                ${alpha(currentStep.color, 0.05)} 100%)`,
            }}
          >
            <Container maxWidth="sm" sx={{ flex: 1, display: 'flex', flexDirection: 'column', py: 8 }}>
              {/* Icon */}
              {currentStep.icon && (
                <Box
                  sx={{
                    width: 120,
                    height: 120,
                    borderRadius: '50%',
                    bgcolor: alpha(currentStep.color, 0.15),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mx: 'auto',
                    mb: 4,
                    color: currentStep.color,
                  }}
                >
                  {currentStep.icon}
                </Box>
              )}

              {/* Title & Subtitle */}
              <Typography
                variant={isMobile ? 'h4' : 'h3'}
                sx={{
                  fontWeight: 800,
                  textAlign: 'center',
                  mb: 1,
                }}
              >
                {currentStep.title}
              </Typography>
              <Typography
                variant="h6"
                color="text.secondary"
                sx={{
                  textAlign: 'center',
                  mb: 3,
                  fontWeight: 500,
                }}
              >
                {currentStep.subtitle}
              </Typography>

              {/* Description */}
              <Typography
                variant="body1"
                color="text.secondary"
                sx={{
                  textAlign: 'center',
                  mb: 4,
                  lineHeight: 1.7,
                }}
              >
                {currentStep.description}
              </Typography>

              {/* Features List */}
              {currentStep.features && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 4 }}>
                  {currentStep.features.map((feature, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 + index * 0.1 }}
                    >
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 2,
                          p: 2,
                          borderRadius: 2,
                          bgcolor: 'background.paper',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                        }}
                      >
                        <Box
                          sx={{
                            width: 48,
                            height: 48,
                            borderRadius: '50%',
                            bgcolor: alpha(currentStep.color, 0.1),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: currentStep.color,
                          }}
                        >
                          {feature.icon}
                        </Box>
                        <Typography variant="body1" sx={{ fontWeight: 500, flex: 1 }}>
                          {feature.text}
                        </Typography>
                      </Box>
                    </motion.div>
                  ))}
                </Box>
              )}

              {/* Interest Selection */}
              {currentStep.component === 'interests' && (
                <Box sx={{ mb: 4 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 2,
                      justifyContent: 'center',
                    }}
                  >
                    {interests.map((interest, index) => (
                      <motion.div
                        key={interest.id}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.1 + index * 0.05 }}
                      >
                        <Box
                          onClick={() => toggleInterest(interest.id)}
                          sx={{
                            width: isMobile ? 'calc(50% - 8px)' : 140,
                            p: 2,
                            textAlign: 'center',
                            borderRadius: 2,
                            border: 2,
                            borderColor: selectedInterests.includes(interest.id)
                              ? interest.color
                              : 'divider',
                            bgcolor: selectedInterests.includes(interest.id)
                              ? alpha(interest.color, 0.1)
                              : 'background.paper',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            '&:hover': {
                              transform: 'translateY(-4px)',
                              boxShadow: `0 8px 16px ${alpha(interest.color, 0.2)}`,
                            },
                          }}
                        >
                          <Box
                            sx={{
                              width: 56,
                              height: 56,
                              borderRadius: '50%',
                              bgcolor: alpha(interest.color, 0.15),
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              mx: 'auto',
                              mb: 1,
                              color: interest.color,
                            }}
                          >
                            {interest.icon}
                          </Box>
                          <Typography
                            variant="caption"
                            sx={{
                              fontWeight: selectedInterests.includes(interest.id) ? 600 : 500,
                              display: 'block',
                            }}
                          >
                            {interest.label}
                          </Typography>
                        </Box>
                      </motion.div>
                    ))}
                  </Box>
                  {selectedInterests.length === 0 && (
                    <Typography
                      variant="caption"
                      color="error"
                      sx={{ display: 'block', textAlign: 'center', mt: 2 }}
                    >
                      Selecteer minimaal één interesse om door te gaan
                    </Typography>
                  )}
                </Box>
              )}

              {/* Spacer */}
              <Box sx={{ flex: 1 }} />

              {/* Actions */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Button
                  variant="contained"
                  size="large"
                  fullWidth
                  endIcon={<ArrowForwardIcon />}
                  onClick={handleNext}
                  disabled={!canProceed()}
                  sx={{
                    height: 56,
                    fontSize: '1.1rem',
                    fontWeight: 600,
                  }}
                >
                  {activeStep === steps.length - 1 ? 'Aan de slag!' : 'Volgende'}
                </Button>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  {activeStep > 0 ? (
                    <Button
                      startIcon={<ArrowBackIcon />}
                      onClick={handleBack}
                      sx={{ textTransform: 'none' }}
                    >
                      Vorige
                    </Button>
                  ) : (
                    <Box />
                  )}

                  <MobileStepper
                    variant="dots"
                    steps={steps.length}
                    position="static"
                    activeStep={activeStep}
                    sx={{
                      bgcolor: 'transparent',
                      flexGrow: 0,
                      '& .MuiMobileStepper-dot': {
                        bgcolor: alpha(currentStep.color, 0.3),
                      },
                      '& .MuiMobileStepper-dotActive': {
                        bgcolor: currentStep.color,
                      },
                    }}
                    backButton={null}
                    nextButton={null}
                  />

                  <Button
                    onClick={handleSkip}
                    sx={{ textTransform: 'none', color: 'text.secondary' }}
                  >
                    Overslaan
                  </Button>
                </Box>
              </Box>
            </Container>
          </Box>
        </motion.div>
      </AnimatePresence>
    </Dialog>
  );
};

export default OnboardingFlow;
