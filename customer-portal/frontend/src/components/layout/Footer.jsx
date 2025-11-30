import React from 'react';
import { Link } from 'react-router-dom';
import { Box, Container, Grid, Typography, IconButton, Divider, useTheme } from '@mui/material';
import {
  Facebook as FacebookIcon,
  Instagram as InstagramIcon,
  Twitter as TwitterIcon,
  LinkedIn as LinkedInIcon,
} from '@mui/icons-material';

const Footer = () => {
  const theme = useTheme();
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    platform: [
      { label: 'Over ons', path: '/about' },
      { label: 'Hoe het werkt', path: '/how-it-works' },
      { label: 'Prijzen', path: '/pricing' },
      { label: 'Careers', path: '/careers' },
    ],
    support: [
      { label: 'Help Center', path: '/help' },
      { label: 'Contact', path: '/contact' },
      { label: 'FAQ', path: '/faq' },
      { label: 'Annuleringsbeleid', path: '/cancellation-policy' },
    ],
    legal: [
      { label: 'Privacybeleid', path: '/privacy' },
      { label: 'Algemene voorwaarden', path: '/terms' },
      { label: 'Cookiebeleid', path: '/cookies' },
      { label: 'GDPR', path: '/gdpr' },
    ],
    partners: [
      { label: 'Word partner', path: '/become-partner' },
      { label: 'Affiliate programma', path: '/affiliate' },
      { label: 'API Documentatie', path: '/api-docs' },
    ],
  };

  return (
    <Box
      component="footer"
      sx={{
        bgcolor: 'grey.900',
        color: 'grey.300',
        pt: 8,
        pb: 4,
        mt: 'auto',
      }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={4}>
          {/* Brand */}
          <Grid item xs={12} md={4}>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 800,
                mb: 2,
                background: `linear-gradient(135deg, ${theme.palette.primary.light}, ${theme.palette.secondary.light})`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              HolidaiButler
            </Typography>
            <Typography variant="body2" sx={{ mb: 3, color: 'grey.400', maxWidth: 280 }}>
              Jouw persoonlijke butler voor de perfecte Costa Blanca ervaring.
              Boek tickets, restaurants en activiteiten op één plek.
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <IconButton
                component="a"
                href="https://facebook.com"
                target="_blank"
                rel="noopener"
                sx={{ color: 'grey.400', '&:hover': { color: '#1877F2' } }}
                aria-label="Facebook"
              >
                <FacebookIcon />
              </IconButton>
              <IconButton
                component="a"
                href="https://instagram.com"
                target="_blank"
                rel="noopener"
                sx={{ color: 'grey.400', '&:hover': { color: '#E4405F' } }}
                aria-label="Instagram"
              >
                <InstagramIcon />
              </IconButton>
              <IconButton
                component="a"
                href="https://twitter.com"
                target="_blank"
                rel="noopener"
                sx={{ color: 'grey.400', '&:hover': { color: '#1DA1F2' } }}
                aria-label="Twitter"
              >
                <TwitterIcon />
              </IconButton>
              <IconButton
                component="a"
                href="https://linkedin.com"
                target="_blank"
                rel="noopener"
                sx={{ color: 'grey.400', '&:hover': { color: '#0A66C2' } }}
                aria-label="LinkedIn"
              >
                <LinkedInIcon />
              </IconButton>
            </Box>
          </Grid>

          {/* Links */}
          <Grid item xs={6} sm={3} md={2}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'white', mb: 2 }}>
              Platform
            </Typography>
            <Box component="ul" sx={{ listStyle: 'none', p: 0, m: 0 }}>
              {footerLinks.platform.map((link) => (
                <li key={link.path}>
                  <Typography
                    component={Link}
                    to={link.path}
                    sx={{
                      color: 'grey.400',
                      textDecoration: 'none',
                      display: 'block',
                      py: 0.5,
                      '&:hover': { color: 'primary.light' },
                    }}
                  >
                    {link.label}
                  </Typography>
                </li>
              ))}
            </Box>
          </Grid>

          <Grid item xs={6} sm={3} md={2}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'white', mb: 2 }}>
              Ondersteuning
            </Typography>
            <Box component="ul" sx={{ listStyle: 'none', p: 0, m: 0 }}>
              {footerLinks.support.map((link) => (
                <li key={link.path}>
                  <Typography
                    component={Link}
                    to={link.path}
                    sx={{
                      color: 'grey.400',
                      textDecoration: 'none',
                      display: 'block',
                      py: 0.5,
                      '&:hover': { color: 'primary.light' },
                    }}
                  >
                    {link.label}
                  </Typography>
                </li>
              ))}
            </Box>
          </Grid>

          <Grid item xs={6} sm={3} md={2}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'white', mb: 2 }}>
              Juridisch
            </Typography>
            <Box component="ul" sx={{ listStyle: 'none', p: 0, m: 0 }}>
              {footerLinks.legal.map((link) => (
                <li key={link.path}>
                  <Typography
                    component={Link}
                    to={link.path}
                    sx={{
                      color: 'grey.400',
                      textDecoration: 'none',
                      display: 'block',
                      py: 0.5,
                      '&:hover': { color: 'primary.light' },
                    }}
                  >
                    {link.label}
                  </Typography>
                </li>
              ))}
            </Box>
          </Grid>

          <Grid item xs={6} sm={3} md={2}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'white', mb: 2 }}>
              Partners
            </Typography>
            <Box component="ul" sx={{ listStyle: 'none', p: 0, m: 0 }}>
              {footerLinks.partners.map((link) => (
                <li key={link.path}>
                  <Typography
                    component={Link}
                    to={link.path}
                    sx={{
                      color: 'grey.400',
                      textDecoration: 'none',
                      display: 'block',
                      py: 0.5,
                      '&:hover': { color: 'primary.light' },
                    }}
                  >
                    {link.label}
                  </Typography>
                </li>
              ))}
            </Box>
          </Grid>
        </Grid>

        <Divider sx={{ my: 4, borderColor: 'grey.800' }} />

        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <Typography variant="body2" sx={{ color: 'grey.500' }}>
            © {currentYear} HolidaiButler B.V. Alle rechten voorbehouden.
          </Typography>
          <Typography variant="body2" sx={{ color: 'grey.500' }}>
            Made with ❤️ for Costa Blanca travelers
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default Footer;
