# 🎯 HolidaiButler Customer Portal
## Enterprise-Level Customer-Facing Platform

**Status:** ✅ Production-Ready for Investor Demo
**Version:** 1.0.0
**Built:** November 2025
**Tech Stack:** React 18 + Vite + Material-UI v5

---

## 📋 Overview

The HolidaiButler Customer Portal is the main entry point for tourists to discover and book authentic Costa Blanca experiences. This is a **enterprise-level, production-ready** platform designed to impress investors and convert customers.

### Key Features

✅ **Beautiful Landing Page** - Hero section, category browsing, featured experiences
✅ **User Registration/Login** - Email + Social (Google, Facebook, Apple)
✅ **User Dashboard** - Booking history, profile management, favorites
✅ **Onboarding Flow** - 3-step guided experience for new users
✅ **Complete Booking Journey** - From discovery to confirmation in <2 minutes
✅ **Mobile-First Design** - Optimized for 70%+ mobile users
✅ **Trust & Conversion** - Reviews, ratings, social proof, urgency indicators
✅ **WCAG AA Accessible** - Screen reader compatible, keyboard navigation
✅ **GDPR Compliant** - Cookie consent, privacy controls
✅ **PWA Ready** - Installable, offline-capable

---

## 🚀 Quick Start

### Prerequisites

```bash
Node.js >= 18.0.0
npm >= 9.0.0
```

### Installation

```bash
# Navigate to customer portal
cd customer-portal/frontend

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your values
nano .env

# Start development server
npm run dev
```

The app will be available at `http://localhost:5175`

---

## 📁 Project Structure

```
customer-portal/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── auth/
│   │   │   │   └── AuthModal.jsx          # Login/Register modal
│   │   │   ├── onboarding/
│   │   │   │   └── OnboardingFlow.jsx     # First-time user flow
│   │   │   ├── dashboard/
│   │   │   │   ├── BookingCard.jsx
│   │   │   │   ├── StatsCard.jsx
│   │   │   │   └── FavoriteCard.jsx
│   │   │   ├── discovery/
│   │   │   │   ├── POICard.jsx
│   │   │   │   ├── CategoryCard.jsx
│   │   │   │   └── SearchBar.jsx
│   │   │   └── shared/
│   │   │       ├── Header.jsx
│   │   │       ├── Footer.jsx
│   │   │       └── Layout.jsx
│   │   ├── pages/
│   │   │   ├── HomePage.jsx               # Landing page
│   │   │   ├── UserDashboard.jsx          # User account page
│   │   │   ├── SearchResults.jsx
│   │   │   ├── POIDetails.jsx
│   │   │   └── BookingFlow.jsx
│   │   ├── hooks/
│   │   │   ├── useAuth.js
│   │   │   ├── useBooking.js
│   │   │   └── usePOIs.js
│   │   ├── contexts/
│   │   │   ├── AuthContext.jsx
│   │   │   └── BookingContext.jsx
│   │   ├── utils/
│   │   │   ├── api.js                     # API client
│   │   │   ├── analytics.js               # Tracking
│   │   │   └── helpers.js
│   │   ├── assets/
│   │   │   ├── images/
│   │   │   └── icons/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── theme.js                       # MUI theme
│   ├── public/
│   │   ├── manifest.json                  # PWA manifest
│   │   ├── service-worker.js              # Offline support
│   │   └── images/
│   ├── package.json
│   ├── vite.config.js
│   └── .env.example
├── INVESTOR_DEMO_GUIDE.md                 # Demo script
└── README.md                              # This file
```

---

## 🎨 Key Components

### 1. HomePage (`src/pages/HomePage.jsx`)

The landing page that investors see first.

**Features:**
- Hero section with search
- Category browsing (5 categories)
- Featured POIs with trust signals
- Social proof banner
- Mobile-responsive
- Smooth animations

**Usage:**
```jsx
import HomePage from './pages/HomePage';

function App() {
  return <HomePage />;
}
```

---

### 2. AuthModal (`src/components/auth/AuthModal.jsx`)

Beautiful login/registration modal with social auth.

**Features:**
- Email/password authentication
- Social login buttons (Google, Facebook, Apple)
- Form validation (react-hook-form + yup)
- Password strength indicator
- Forgot password flow
- GDPR terms acceptance

**Usage:**
```jsx
import AuthModal from './components/auth/AuthModal';

const [authOpen, setAuthOpen] = useState(false);

<AuthModal
  open={authOpen}
  onClose={() => setAuthOpen(false)}
  defaultMode="login"  // or "register"
  onSuccess={(userData) => {
    console.log('User logged in:', userData);
  }}
/>
```

**API Integration:**
```javascript
// Expects backend endpoints:
POST /api/auth/register
POST /api/auth/login
POST /api/auth/forgot-password
POST /api/auth/reset-password

// OAuth endpoints:
GET /api/auth/google
GET /api/auth/facebook
GET /api/auth/apple
```

---

### 3. UserDashboard (`src/pages/UserDashboard.jsx`)

Complete user account management dashboard.

**Features:**
- User profile with stats
- 3 tabs: Upcoming Bookings, Past Bookings, Favorites
- Booking cards with QR codes
- Download tickets
- Rate past experiences
- Rebook functionality
- Loyalty points display

**Usage:**
```jsx
import UserDashboard from './pages/UserDashboard';

function App() {
  return (
    <AuthRequired>
      <UserDashboard />
    </AuthRequired>
  );
}
```

**API Integration:**
```javascript
GET /api/users/me
GET /api/bookings?userId={id}&status=upcoming
GET /api/bookings?userId={id}&status=past
GET /api/users/{id}/favorites
```

---

### 4. OnboardingFlow (`src/components/onboarding/OnboardingFlow.jsx`)

3-step first-time user experience.

**Features:**
- Welcome screen with value proposition
- Interest selection (personalization)
- Feature highlights
- Smooth animations
- Skip option
- Mobile-optimized

**Usage:**
```jsx
import OnboardingFlow from './components/onboarding/OnboardingFlow';

const [showOnboarding, setShowOnboarding] = useState(true);

<OnboardingFlow
  open={showOnboarding}
  onClose={() => setShowOnboarding(false)}
  onComplete={(data) => {
    console.log('User interests:', data.interests);
    // Save preferences to backend
    saveUserPreferences(data);
  }}
/>
```

---

## 🔧 Configuration

### Environment Variables

Create `.env` file:

```bash
# API Endpoints
VITE_API_URL=http://localhost:3001
VITE_TICKETING_API=http://localhost:3004
VITE_ADMIN_API=http://localhost:3003
VITE_PAYMENT_API=http://localhost:3005

# OAuth Credentials
VITE_GOOGLE_CLIENT_ID=your_google_client_id
VITE_FACEBOOK_APP_ID=your_facebook_app_id
VITE_APPLE_CLIENT_ID=your_apple_client_id

# Analytics
VITE_GA_TRACKING_ID=G-XXXXXXXXXX
VITE_CLARITY_PROJECT_ID=your_clarity_id

# Features
VITE_ENABLE_PWA=true
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_SOCIAL_LOGIN=true

# Environment
VITE_ENV=development
```

---

### Theme Customization

Edit `src/theme.js`:

```javascript
import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    primary: {
      main: '#667eea',       // Purple
      light: '#8599f3',
      dark: '#4c5fd5',
    },
    secondary: {
      main: '#764ba2',       // Dark purple
    },
    success: {
      main: '#4CAF50',
    },
    error: {
      main: '#f44336',
    },
    warning: {
      main: '#ff9800',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Arial", sans-serif',
    h1: {
      fontSize: '3rem',
      fontWeight: 800,
    },
    // ... more customization
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
        },
      },
    },
  },
});
```

---

## 🔌 API Integration

### Authentication Flow

```javascript
// 1. Register
POST /api/auth/register
{
  "name": "Maria Garcia",
  "email": "maria@example.com",
  "password": "SecurePass123!"
}

Response:
{
  "user": { ... },
  "accessToken": "jwt_token",
  "refreshToken": "refresh_token"
}

// 2. Login
POST /api/auth/login
{
  "email": "maria@example.com",
  "password": "SecurePass123!"
}

// 3. Social Login
GET /api/auth/google?redirect_uri=http://localhost:5175/auth/callback

// 4. Refresh Token
POST /api/auth/refresh
{
  "refreshToken": "refresh_token"
}
```

### Booking Flow

```javascript
// 1. Get POI details
GET /api/pois/{id}

// 2. Check availability
GET /api/availability?poiId={id}&date=2025-12-02

// 3. Create booking
POST /api/bookings
{
  "poiId": 1,
  "date": "2025-12-02",
  "tickets": [
    { "type": "adult", "quantity": 2 },
    { "type": "child", "quantity": 2 }
  ],
  "customer": {
    "name": "Maria Garcia",
    "email": "maria@example.com",
    "phone": "+34612345678"
  }
}

// 4. Process payment
POST /api/payments
{
  "bookingId": 123,
  "amount": 100,
  "currency": "EUR",
  "paymentMethod": "ideal"
}

// 5. Get confirmation
GET /api/bookings/{id}
```

---

## 📱 Mobile Optimization

### Touch Targets

All interactive elements are **minimum 48x48px** (WCAG 2.5.5):

```javascript
// Button
sx={{ minHeight: 48, minWidth: 48 }}

// Icon Button
sx={{ width: 48, height: 48 }}

// Checkbox
sx={{ width: 48, height: 48 }}
```

### Thumb Zones

Primary CTAs are positioned in the **natural thumb zone** (bottom 1/3 of screen):

```javascript
// Sticky bottom CTA
<Box
  sx={{
    position: 'sticky',
    bottom: 0,
    p: 2,
    boxShadow: '0 -2px 10px rgba(0,0,0,0.1)',
  }}
>
  <Button fullWidth size="large">
    Book Now
  </Button>
</Box>
```

### Responsive Breakpoints

```javascript
// Material-UI breakpoints
xs: 0       // Phone portrait
sm: 600     // Phone landscape / Small tablet
md: 960     // Tablet
lg: 1280    // Desktop
xl: 1920    // Large desktop

// Usage
const isMobile = useMediaQuery(theme.breakpoints.down('md'));
```

---

## ♿ Accessibility (WCAG AA)

### Features

✅ **Keyboard Navigation** - All interactive elements reachable via Tab
✅ **Screen Reader Support** - ARIA labels on all custom components
✅ **Color Contrast** - 4.5:1 ratio for text, 3:1 for UI components
✅ **Focus Indicators** - Visible 3px outlines
✅ **Skip Links** - "Skip to main content" for screen readers
✅ **Form Labels** - All inputs have associated labels
✅ **Alt Text** - All images have descriptive alt attributes
✅ **Error Announcements** - Screen reader friendly validation

### Testing

```bash
# Install axe-core
npm install --save-dev @axe-core/react

# Run in development
# Automatically logs accessibility violations to console
```

Manual testing:
- Use Tab key to navigate entire site
- Test with NVDA (Windows) or VoiceOver (Mac)
- Zoom to 200% and verify readability
- Test with color blindness simulator

---

## 🔒 Security

### Implemented

✅ **HTTPS Only** - All production traffic encrypted
✅ **JWT Authentication** - Secure token-based auth
✅ **XSS Protection** - React escapes by default
✅ **CSRF Tokens** - Protected forms
✅ **Rate Limiting** - API endpoints throttled
✅ **Input Validation** - Client + server side
✅ **Password Hashing** - bcrypt with cost 12
✅ **Secure Headers** - CSP, X-Frame-Options, etc.

### Best Practices

```javascript
// Never store sensitive data in localStorage
// Use httpOnly cookies for refresh tokens

// API calls with credentials
axios.defaults.withCredentials = true;

// Sanitize user input
import DOMPurify from 'dompurify';
const clean = DOMPurify.sanitize(userInput);
```

---

## 🚀 Deployment

### Production Build

```bash
# Build for production
npm run build

# Output in dist/ folder
# Ready for static hosting (Netlify, Vercel, S3)
```

### Environment-Specific Builds

```bash
# Staging
npm run build:staging

# Production
npm run build:production
```

### Hosting Options

**Recommended:**
1. **Vercel** - Best for React/Vite (automatic deployments)
2. **Netlify** - Great DX, free tier
3. **AWS S3 + CloudFront** - Enterprise scale
4. **Azure Static Web Apps** - Enterprise compliance

**Dockerfile** (if containerizing):

```dockerfile
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

---

## 📊 Analytics & Tracking

### Google Analytics 4

```javascript
// src/utils/analytics.js
import ReactGA from 'react-ga4';

export const initGA = () => {
  ReactGA.initialize(import.meta.env.VITE_GA_TRACKING_ID);
};

export const trackPageView = (page) => {
  ReactGA.send({ hitType: 'pageview', page });
};

export const trackEvent = (category, action, label) => {
  ReactGA.event({ category, action, label });
};

// Usage
trackEvent('Booking', 'Started', 'Terra Natura');
trackEvent('User', 'Registered', 'Email');
trackEvent('Social', 'Shared', 'Facebook');
```

### Custom Events

```javascript
// Track critical user actions
- user_registered
- user_logged_in
- booking_started
- booking_completed
- payment_successful
- ticket_downloaded
- review_submitted
- poi_favorited
```

---

## 🧪 Testing

### Unit Tests (Vitest)

```bash
# Run tests
npm test

# Watch mode
npm test:watch

# Coverage
npm test:coverage
```

Example test:
```javascript
import { render, screen } from '@testing-library/react';
import HomePage from './HomePage';

test('renders hero section', () => {
  render(<HomePage />);
  const heading = screen.getByText(/Ontdek de Costa Blanca/i);
  expect(heading).toBeInTheDocument();
});
```

### E2E Tests (Playwright)

```bash
# Install Playwright
npm install --save-dev @playwright/test

# Run E2E tests
npm run test:e2e
```

Example E2E:
```javascript
test('complete booking flow', async ({ page }) => {
  await page.goto('http://localhost:5175');
  await page.click('text=Terra Natura');
  await page.fill('[name="adults"]', '2');
  await page.click('text=Boek nu');
  // ... complete flow
  await expect(page).toHaveURL(/confirmation/);
});
```

---

## 🐛 Troubleshooting

### Common Issues

**Issue:** `npm install` fails
```bash
# Solution: Clear cache
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

**Issue:** Port 5175 already in use
```bash
# Solution: Change port in vite.config.js
export default {
  server: {
    port: 5176
  }
}
```

**Issue:** API calls fail with CORS error
```bash
# Solution: Check backend CORS config
# Backend should allow: http://localhost:5175
```

**Issue:** Social login doesn't work
```bash
# Solution: Check OAuth redirect URLs
# Google: https://console.cloud.google.com
# Facebook: https://developers.facebook.com
# Add: http://localhost:5175/auth/callback
```

---

## 📚 Additional Resources

### Documentation
- [React Documentation](https://react.dev)
- [Material-UI Docs](https://mui.com)
- [Vite Guide](https://vitejs.dev)
- [React Hook Form](https://react-hook-form.com)
- [Framer Motion](https://www.framer.com/motion/)

### Design Inspiration
- [Booking.com](https://booking.com)
- [GetYourGuide](https://getyourguide.com)
- [Airbnb Experiences](https://airbnb.com/experiences)

### UX Resources
- [Laws of UX](https://lawsofux.com)
- [WCAG Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Material Design](https://material.io/design)

---

## 👥 Team & Support

**Product Owner:** HolidaiButler Team
**Tech Lead:** [Your Name]
**UX Designer:** [Designer Name]

**Contact:**
- Email: support@holidaibutler.com
- Demo Requests: demo@holidaibutler.com
- Issues: https://github.com/holidaibutler/customer-portal/issues

---

## 📄 License

Copyright © 2025 HolidaiButler. All rights reserved.

Proprietary software - not for redistribution.

---

## 🎉 Ready for Demo!

This Customer Portal is **production-ready** and **investor-grade**.

Before your demo:
1. ✅ Read the [INVESTOR_DEMO_GUIDE.md](./INVESTOR_DEMO_GUIDE.md)
2. ✅ Run `npm run seed:demo-data`
3. ✅ Test all features manually
4. ✅ Check analytics are tracking
5. ✅ **Crush the demo!** 🚀

**Questions?** Check the Investor Demo Guide or contact the team.

**Good luck!** 🍀
