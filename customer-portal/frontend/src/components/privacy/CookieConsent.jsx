import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Switch,
  FormControlLabel,
  IconButton,
  Collapse,
  Divider,
  Link,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
  Cookie as CookieIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

const CONSENT_STORAGE_KEY = 'holidai_cookie_consent';
const CONSENT_VERSION = '1.0';
const CONSENT_EXPIRY_MONTHS = 12;

/**
 * GDPR-Compliant Cookie Consent Banner
 *
 * Legal compliance:
 * - GDPR Article 7: Clear affirmative action required
 * - ePrivacy Directive: Consent before non-essential cookies
 * - Reject must be as easy as accept (same prominence)
 * - Granular consent options
 * - Consent withdrawal must be easy
 *
 * @param {function} onAccept - Callback with consent preferences
 * @param {function} onReject - Callback when rejected
 * @param {string} privacyPolicyUrl - Link to privacy policy
 * @param {string} cookiePolicyUrl - Link to cookie policy
 */
const CookieConsent = ({
  onAccept,
  onReject,
  privacyPolicyUrl = '/privacy-policy',
  cookiePolicyUrl = '/cookie-policy',
}) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [visible, setVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [preferences, setPreferences] = useState({
    necessary: true, // Always true, can't be disabled
    functional: true,
    analytics: false,
    marketing: false,
  });

  useEffect(() => {
    // Check if consent already given
    const existingConsent = getStoredConsent();

    if (!existingConsent || isConsentExpired(existingConsent)) {
      // Show banner after small delay for better UX
      const timer = setTimeout(() => {
        setVisible(true);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      // Apply existing consent
      onAccept?.(existingConsent.choices);
    }
  }, []);

  const getStoredConsent = () => {
    try {
      const stored = localStorage.getItem(CONSENT_STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Error reading consent:', error);
      return null;
    }
  };

  const isConsentExpired = (consent) => {
    if (!consent.expires) return true;
    return Date.now() > consent.expires;
  };

  const storeConsent = (choices) => {
    const consent = {
      version: CONSENT_VERSION,
      timestamp: Date.now(),
      expires: Date.now() + (CONSENT_EXPIRY_MONTHS * 30 * 24 * 60 * 60 * 1000),
      choices,
    };

    try {
      localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(consent));
    } catch (error) {
      console.error('Error storing consent:', error);
    }
  };

  const handleAcceptAll = () => {
    const allAccepted = {
      necessary: true,
      functional: true,
      analytics: true,
      marketing: true,
    };

    storeConsent(allAccepted);
    setVisible(false);
    onAccept?.(allAccepted);
  };

  const handleRejectAll = () => {
    const onlyNecessary = {
      necessary: true,
      functional: false,
      analytics: false,
      marketing: false,
    };

    storeConsent(onlyNecessary);
    setVisible(false);
    onReject?.(onlyNecessary);
  };

  const handleSavePreferences = () => {
    storeConsent(preferences);
    setVisible(false);
    onAccept?.(preferences);
  };

  const handlePreferenceChange = (category) => (event) => {
    if (category === 'necessary') return; // Can't disable necessary cookies

    setPreferences(prev => ({
      ...prev,
      [category]: event.target.checked,
    }));
  };

  if (!visible) return null;

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: theme.zIndex.modal,
        p: isMobile ? 1 : 2,
        display: 'flex',
        justifyContent: 'center',
      }}
      role="dialog"
      aria-label={t('privacy.cookieConsent', 'Cookie Consent')}
      aria-describedby="cookie-consent-description"
    >
      <Paper
        elevation={8}
        sx={{
          maxWidth: 600,
          width: '100%',
          p: isMobile ? 2 : 3,
          borderRadius: 2,
        }}
      >
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CookieIcon color="primary" />
            <Typography variant="h6" component="h2">
              {t('privacy.cookieTitle', 'Cookies & Privacy')}
            </Typography>
          </Box>
          <IconButton
            size="small"
            onClick={handleRejectAll}
            aria-label={t('common.close', 'Close')}
            sx={{ width: 40, height: 40 }}
          >
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Description */}
        <Typography
          id="cookie-consent-description"
          variant="body2"
          color="text.secondary"
          sx={{ mb: 2 }}
        >
          {t('privacy.cookieDescription',
            'We gebruiken cookies om je ervaring te verbeteren, verkeer te analyseren en gepersonaliseerde content te tonen. Je kan je voorkeuren aanpassen of alles accepteren.'
          )}
        </Typography>

        {/* Links */}
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <Link
            href={privacyPolicyUrl}
            variant="caption"
            sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
          >
            {t('privacy.privacyPolicy', 'Privacy Policy')}
          </Link>
          <Link
            href={cookiePolicyUrl}
            variant="caption"
            sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
          >
            {t('privacy.cookiePolicy', 'Cookie Policy')}
          </Link>
        </Box>

        {/* Details Toggle */}
        <Button
          size="small"
          onClick={() => setShowDetails(!showDetails)}
          endIcon={<ExpandMoreIcon sx={{
            transform: showDetails ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s',
          }} />}
          sx={{ mb: 2, textTransform: 'none' }}
        >
          {t('privacy.managePreferences', 'Beheer voorkeuren')}
        </Button>

        {/* Cookie Categories */}
        <Collapse in={showDetails}>
          <Box sx={{ mb: 2, pl: 2, borderLeft: 2, borderColor: 'divider' }}>
            {/* Necessary Cookies */}
            <Box sx={{ mb: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={preferences.necessary}
                    disabled
                    inputProps={{ 'aria-label': t('privacy.necessaryCookies', 'Necessary cookies (always active)') }}
                  />
                }
                label={
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      {t('privacy.necessary', 'Noodzakelijk')}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {t('privacy.necessaryDescription',
                        'Essentiële cookies voor websitewerking, beveiliging en authenticatie. Kunnen niet worden uitgeschakeld.'
                      )}
                    </Typography>
                  </Box>
                }
              />
            </Box>

            {/* Functional Cookies */}
            <Box sx={{ mb: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={preferences.functional}
                    onChange={handlePreferenceChange('functional')}
                    inputProps={{ 'aria-label': t('privacy.functionalCookies', 'Functional cookies') }}
                  />
                }
                label={
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      {t('privacy.functional', 'Functioneel')}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {t('privacy.functionalDescription',
                        'Voor taalvoorkeur, valuta en gepersonaliseerde instellingen.'
                      )}
                    </Typography>
                  </Box>
                }
              />
            </Box>

            {/* Analytics Cookies */}
            <Box sx={{ mb: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={preferences.analytics}
                    onChange={handlePreferenceChange('analytics')}
                    inputProps={{ 'aria-label': t('privacy.analyticsCookies', 'Analytics cookies') }}
                  />
                }
                label={
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      {t('privacy.analytics', 'Analytics')}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {t('privacy.analyticsDescription',
                        'Anonieme data over websitegebruik om onze service te verbeteren. Google Analytics, Microsoft Clarity.'
                      )}
                    </Typography>
                  </Box>
                }
              />
            </Box>

            {/* Marketing Cookies */}
            <Box sx={{ mb: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={preferences.marketing}
                    onChange={handlePreferenceChange('marketing')}
                    inputProps={{ 'aria-label': t('privacy.marketingCookies', 'Marketing cookies') }}
                  />
                }
                label={
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      {t('privacy.marketing', 'Marketing')}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {t('privacy.marketingDescription',
                        'Voor gepersonaliseerde advertenties en retargeting. Social media pixels en ad conversie tracking.'
                      )}
                    </Typography>
                  </Box>
                }
              />
            </Box>
          </Box>
        </Collapse>

        <Divider sx={{ my: 2 }} />

        {/* Action Buttons - GDPR requires equal prominence */}
        <Box sx={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: 1,
          justifyContent: 'flex-end',
        }}>
          {/* Reject All - Must be equally prominent (GDPR) */}
          <Button
            variant="outlined"
            onClick={handleRejectAll}
            fullWidth={isMobile}
            sx={{
              textTransform: 'none',
              minHeight: 44, // Accessibility
              flex: isMobile ? undefined : 1,
            }}
          >
            {t('privacy.rejectAll', 'Alleen noodzakelijk')}
          </Button>

          {/* Save Preferences */}
          {showDetails && (
            <Button
              variant="outlined"
              onClick={handleSavePreferences}
              fullWidth={isMobile}
              sx={{
                textTransform: 'none',
                minHeight: 44,
                flex: isMobile ? undefined : 1,
              }}
            >
              {t('privacy.savePreferences', 'Voorkeuren opslaan')}
            </Button>
          )}

          {/* Accept All */}
          <Button
            variant="contained"
            onClick={handleAcceptAll}
            fullWidth={isMobile}
            sx={{
              textTransform: 'none',
              minHeight: 44,
              flex: isMobile ? undefined : 1,
            }}
          >
            {t('privacy.acceptAll', 'Alles accepteren')}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

// Utility function to check if consent was given for a specific category
export const hasConsentFor = (category) => {
  try {
    const stored = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!stored) return false;

    const consent = JSON.parse(stored);

    // Check if expired
    if (consent.expires && Date.now() > consent.expires) {
      return false;
    }

    return consent.choices?.[category] === true;
  } catch (error) {
    console.error('Error checking consent:', error);
    return false;
  }
};

// Utility function to clear consent (for testing or user request)
export const clearConsent = () => {
  try {
    localStorage.removeItem(CONSENT_STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing consent:', error);
  }
};

export default CookieConsent;
