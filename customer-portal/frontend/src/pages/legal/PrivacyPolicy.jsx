import React from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Link,
} from '@mui/material';
import {
  Security as SecurityIcon,
  Storage as StorageIcon,
  Share as ShareIcon,
  Delete as DeleteIcon,
  Email as EmailIcon,
  Gavel as GavelIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink } from 'react-router-dom';

/**
 * Privacy Policy Page
 * GDPR Compliant Privacy Policy
 */
const PrivacyPolicy = () => {
  const { t } = useTranslation();
  const lastUpdated = '1 december 2025';

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper sx={{ p: { xs: 3, md: 5 } }}>
        <Typography variant="h3" component="h1" gutterBottom fontWeight={700}>
          {t('legal.privacyPolicy', 'Privacy Policy')}
        </Typography>

        <Typography variant="body2" color="text.secondary" gutterBottom>
          {t('legal.lastUpdated', 'Last updated')}: {lastUpdated}
        </Typography>

        <Divider sx={{ my: 3 }} />

        {/* Introduction */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" gutterBottom fontWeight={600}>
            1. {t('legal.introduction', 'Introduction')}
          </Typography>
          <Typography paragraph>
            HolidaiButler B.V. ("we", "us", "our") is committed to protecting your privacy.
            This Privacy Policy explains how we collect, use, disclose, and safeguard your
            information when you use our platform and services.
          </Typography>
          <Typography paragraph>
            We comply with the General Data Protection Regulation (GDPR) and other applicable
            data protection laws. By using HolidaiButler, you agree to the collection and use
            of information in accordance with this policy.
          </Typography>
        </Box>

        {/* Data We Collect */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" gutterBottom fontWeight={600}>
            <StorageIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            2. {t('legal.dataWeCollect', 'Data We Collect')}
          </Typography>
          <Typography paragraph>We collect the following types of information:</Typography>
          <List>
            <ListItem>
              <ListItemIcon><SecurityIcon color="primary" /></ListItemIcon>
              <ListItemText
                primary="Account Information"
                secondary="Name, email address, password (encrypted), profile picture"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon><SecurityIcon color="primary" /></ListItemIcon>
              <ListItemText
                primary="Booking Data"
                secondary="Reservations, tickets purchased, payment history"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon><SecurityIcon color="primary" /></ListItemIcon>
              <ListItemText
                primary="Usage Data"
                secondary="Pages visited, features used, search queries (anonymized)"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon><SecurityIcon color="primary" /></ListItemIcon>
              <ListItemText
                primary="Device Information"
                secondary="Browser type, IP address, device type"
              />
            </ListItem>
          </List>
        </Box>

        {/* How We Use Your Data */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" gutterBottom fontWeight={600}>
            3. {t('legal.howWeUseData', 'How We Use Your Data')}
          </Typography>
          <Typography paragraph>We use your data to:</Typography>
          <List dense>
            <ListItem>
              <ListItemText primary="• Provide and maintain our services" />
            </ListItem>
            <ListItem>
              <ListItemText primary="• Process your bookings and reservations" />
            </ListItem>
            <ListItem>
              <ListItemText primary="• Send booking confirmations and updates" />
            </ListItem>
            <ListItem>
              <ListItemText primary="• Personalize your experience (with consent)" />
            </ListItem>
            <ListItem>
              <ListItemText primary="• Improve our platform based on usage patterns" />
            </ListItem>
            <ListItem>
              <ListItemText primary="• Comply with legal obligations" />
            </ListItem>
          </List>
        </Box>

        {/* Data Sharing */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" gutterBottom fontWeight={600}>
            <ShareIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            4. {t('legal.dataSharing', 'Data Sharing')}
          </Typography>
          <Typography paragraph>
            We may share your data with:
          </Typography>
          <List dense>
            <ListItem>
              <ListItemText
                primary="• Service Providers"
                secondary="Partners who help us deliver bookings (restaurants, activity providers)"
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="• Payment Processors"
                secondary="Adyen for secure payment processing"
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="• Analytics Services"
                secondary="To improve our platform (with your consent)"
              />
            </ListItem>
          </List>
          <Typography paragraph sx={{ mt: 2 }}>
            We never sell your personal data to third parties.
          </Typography>
        </Box>

        {/* Your Rights */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" gutterBottom fontWeight={600}>
            <GavelIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            5. {t('legal.yourRights', 'Your Rights (GDPR)')}
          </Typography>
          <Typography paragraph>Under GDPR, you have the right to:</Typography>
          <List>
            <ListItem>
              <ListItemIcon><SecurityIcon color="primary" /></ListItemIcon>
              <ListItemText
                primary="Access"
                secondary="Request a copy of your personal data"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon><SecurityIcon color="primary" /></ListItemIcon>
              <ListItemText
                primary="Rectification"
                secondary="Correct inaccurate or incomplete data"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon><DeleteIcon color="error" /></ListItemIcon>
              <ListItemText
                primary="Erasure (Right to be Forgotten)"
                secondary="Request deletion of your data"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon><SecurityIcon color="primary" /></ListItemIcon>
              <ListItemText
                primary="Data Portability"
                secondary="Receive your data in a portable format"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon><SecurityIcon color="primary" /></ListItemIcon>
              <ListItemText
                primary="Withdraw Consent"
                secondary="Opt-out of data processing at any time"
              />
            </ListItem>
          </List>
        </Box>

        {/* Data Retention */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" gutterBottom fontWeight={600}>
            6. {t('legal.dataRetention', 'Data Retention')}
          </Typography>
          <Typography paragraph>
            We retain your personal data for as long as necessary to provide our services
            and comply with legal obligations:
          </Typography>
          <List dense>
            <ListItem>
              <ListItemText primary="• Account data: Until account deletion requested" />
            </ListItem>
            <ListItem>
              <ListItemText primary="• Booking history: 7 years (tax compliance)" />
            </ListItem>
            <ListItem>
              <ListItemText primary="• Analytics data: 26 months (anonymized)" />
            </ListItem>
          </List>
        </Box>

        {/* Cookies */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" gutterBottom fontWeight={600}>
            7. {t('legal.cookies', 'Cookies')}
          </Typography>
          <Typography paragraph>
            We use cookies to enhance your experience. For detailed information about the
            cookies we use, please see our{' '}
            <Link component={RouterLink} to="/cookies">
              Cookie Policy
            </Link>
            .
          </Typography>
        </Box>

        {/* Contact */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" gutterBottom fontWeight={600}>
            <EmailIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            8. {t('legal.contact', 'Contact Us')}
          </Typography>
          <Typography paragraph>
            For privacy-related questions or to exercise your rights, contact our
            Data Protection Officer:
          </Typography>
          <Box sx={{ bgcolor: 'grey.100', p: 2, borderRadius: 1 }}>
            <Typography>
              <strong>HolidaiButler B.V.</strong>
            </Typography>
            <Typography>Email: privacy@holidaibutler.com</Typography>
            <Typography>Address: [Company Address]</Typography>
          </Box>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Typography variant="body2" color="text.secondary">
          This privacy policy is effective as of {lastUpdated} and will remain in effect
          except with respect to any changes in its provisions in the future.
        </Typography>
      </Paper>
    </Container>
  );
};

export default PrivacyPolicy;
