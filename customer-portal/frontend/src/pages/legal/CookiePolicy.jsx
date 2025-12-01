import React from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Link,
  Button,
} from '@mui/material';
import { Cookie as CookieIcon, Settings as SettingsIcon } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink } from 'react-router-dom';
import { clearConsent } from '../../components/privacy/CookieConsent';

/**
 * Cookie Policy Page
 * GDPR Compliant Cookie Policy with detailed cookie information
 */
const CookiePolicy = () => {
  const { t } = useTranslation();
  const lastUpdated = '1 december 2025';

  const handleManagePreferences = () => {
    // Clear existing consent to show the banner again
    clearConsent();
    window.location.reload();
  };

  const cookieCategories = [
    {
      name: t('privacy.necessary', 'Necessary'),
      description: 'Essential for the website to function properly',
      required: true,
      cookies: [
        { name: 'session_id', purpose: 'User session management', duration: 'Session', provider: 'HolidaiButler' },
        { name: 'csrf_token', purpose: 'Security - prevent CSRF attacks', duration: 'Session', provider: 'HolidaiButler' },
        { name: 'holidai_cookie_consent', purpose: 'Store cookie preferences', duration: '12 months', provider: 'HolidaiButler' },
      ],
    },
    {
      name: t('privacy.functional', 'Functional'),
      description: 'Remember your preferences and settings',
      required: false,
      cookies: [
        { name: 'language', purpose: 'Store language preference', duration: '12 months', provider: 'HolidaiButler' },
        { name: 'wcag-preferences', purpose: 'Accessibility settings', duration: '12 months', provider: 'HolidaiButler' },
        { name: 'recent_searches', purpose: 'Recent search history', duration: '30 days', provider: 'HolidaiButler' },
      ],
    },
    {
      name: t('privacy.analytics', 'Analytics'),
      description: 'Help us understand how visitors use our website',
      required: false,
      cookies: [
        { name: '_ga', purpose: 'Google Analytics - distinguish users', duration: '2 years', provider: 'Google' },
        { name: '_gid', purpose: 'Google Analytics - distinguish users', duration: '24 hours', provider: 'Google' },
        { name: '_clck', purpose: 'Microsoft Clarity - user tracking', duration: '1 year', provider: 'Microsoft' },
      ],
    },
    {
      name: t('privacy.marketing', 'Marketing'),
      description: 'Show relevant advertisements and measure ad effectiveness',
      required: false,
      cookies: [
        { name: '_fbp', purpose: 'Facebook Pixel - ad targeting', duration: '3 months', provider: 'Meta' },
        { name: 'ads/ga-audiences', purpose: 'Google Ads remarketing', duration: 'Session', provider: 'Google' },
      ],
    },
  ];

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper sx={{ p: { xs: 3, md: 5 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <CookieIcon sx={{ fontSize: 40, color: 'primary.main' }} />
          <Typography variant="h3" component="h1" fontWeight={700}>
            {t('legal.cookiePolicy', 'Cookie Policy')}
          </Typography>
        </Box>

        <Typography variant="body2" color="text.secondary" gutterBottom>
          {t('legal.lastUpdated', 'Last updated')}: {lastUpdated}
        </Typography>

        <Button
          variant="outlined"
          startIcon={<SettingsIcon />}
          onClick={handleManagePreferences}
          sx={{ mt: 2, mb: 3 }}
        >
          {t('privacy.managePreferences', 'Manage Cookie Preferences')}
        </Button>

        <Divider sx={{ my: 3 }} />

        {/* Introduction */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" gutterBottom fontWeight={600}>
            {t('legal.whatAreCookies', 'What are Cookies?')}
          </Typography>
          <Typography paragraph>
            Cookies are small text files that are placed on your device when you visit our website.
            They are widely used to make websites work more efficiently and provide information to
            website owners.
          </Typography>
          <Typography paragraph>
            This Cookie Policy explains what cookies we use, why we use them, and how you can
            manage your cookie preferences.
          </Typography>
        </Box>

        {/* Cookie Categories */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" gutterBottom fontWeight={600}>
            {t('legal.cookieCategories', 'Cookie Categories')}
          </Typography>

          {cookieCategories.map((category, index) => (
            <Box key={category.name} sx={{ mb: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Typography variant="h6" fontWeight={600}>
                  {category.name}
                </Typography>
                {category.required && (
                  <Chip
                    label={t('privacy.alwaysActive', 'Always Active')}
                    size="small"
                    color="primary"
                  />
                )}
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {category.description}
              </Typography>

              <TableContainer sx={{ bgcolor: 'grey.50', borderRadius: 1 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Cookie Name</strong></TableCell>
                      <TableCell><strong>Purpose</strong></TableCell>
                      <TableCell><strong>Duration</strong></TableCell>
                      <TableCell><strong>Provider</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {category.cookies.map((cookie) => (
                      <TableRow key={cookie.name}>
                        <TableCell>
                          <code style={{ fontSize: '12px' }}>{cookie.name}</code>
                        </TableCell>
                        <TableCell>{cookie.purpose}</TableCell>
                        <TableCell>{cookie.duration}</TableCell>
                        <TableCell>{cookie.provider}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          ))}
        </Box>

        {/* How to Manage Cookies */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" gutterBottom fontWeight={600}>
            {t('legal.howToManageCookies', 'How to Manage Cookies')}
          </Typography>
          <Typography paragraph>
            You can manage your cookie preferences at any time by clicking the
            "Manage Cookie Preferences" button at the top of this page.
          </Typography>
          <Typography paragraph>
            You can also control cookies through your browser settings. Most browsers allow you to:
          </Typography>
          <ul>
            <li>View cookies stored on your device</li>
            <li>Delete all or specific cookies</li>
            <li>Block third-party cookies</li>
            <li>Block cookies from specific websites</li>
            <li>Block all cookies</li>
          </ul>
          <Typography paragraph sx={{ mt: 2 }}>
            Please note that blocking certain cookies may affect the functionality of our website.
          </Typography>
        </Box>

        {/* Third-Party Cookies */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" gutterBottom fontWeight={600}>
            {t('legal.thirdPartyCookies', 'Third-Party Cookies')}
          </Typography>
          <Typography paragraph>
            Some cookies on our website are set by third-party services. These include:
          </Typography>
          <ul>
            <li>
              <strong>Google Analytics</strong> - For website analytics.{' '}
              <Link href="https://policies.google.com/privacy" target="_blank" rel="noopener">
                Google Privacy Policy
              </Link>
            </li>
            <li>
              <strong>Microsoft Clarity</strong> - For understanding user behavior.{' '}
              <Link href="https://privacy.microsoft.com/" target="_blank" rel="noopener">
                Microsoft Privacy Policy
              </Link>
            </li>
            <li>
              <strong>Meta (Facebook)</strong> - For advertising purposes.{' '}
              <Link href="https://www.facebook.com/privacy/policy/" target="_blank" rel="noopener">
                Meta Privacy Policy
              </Link>
            </li>
          </ul>
        </Box>

        {/* Updates */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" gutterBottom fontWeight={600}>
            {t('legal.policyUpdates', 'Policy Updates')}
          </Typography>
          <Typography paragraph>
            We may update this Cookie Policy from time to time. Any changes will be posted on this
            page with an updated revision date. We encourage you to review this policy periodically.
          </Typography>
        </Box>

        {/* Contact */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" gutterBottom fontWeight={600}>
            {t('legal.contact', 'Contact Us')}
          </Typography>
          <Typography paragraph>
            If you have questions about our use of cookies, please contact us at:{' '}
            <Link href="mailto:privacy@holidaibutler.com">privacy@holidaibutler.com</Link>
          </Typography>
          <Typography paragraph>
            For more information about how we handle your personal data, please see our{' '}
            <Link component={RouterLink} to="/privacy">Privacy Policy</Link>.
          </Typography>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Typography variant="body2" color="text.secondary">
          This cookie policy is effective as of {lastUpdated}.
        </Typography>
      </Paper>
    </Container>
  );
};

export default CookiePolicy;
