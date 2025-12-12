# HolidaiButler Ticketing Frontend

Enterprise-grade ticket booking system frontend built with React, Material-UI, and Adyen Web Drop-in.

## Features

- 🎫 **Complete Booking Flow**
  - Event browsing and selection
  - Ticket type selection with real-time availability
  - Visitor information collection
  - Secure payment processing with Adyen
  - Booking confirmation and ticket delivery

- 💳 **Adyen Payment Integration**
  - Drop-in UI component for seamless checkout
  - Multiple payment methods (iDEAL, Credit Card, PayPal, etc.)
  - 3D Secure support
  - Real-time payment status updates

- 🎨 **Modern UI/UX**
  - Responsive Material-UI design
  - Multi-language support (NL/EN)
  - Smooth animations and transitions
  - Mobile-first approach

- 🔐 **Security & Reliability**
  - Secure payment sessions
  - Input validation
  - Error handling and recovery
  - Session persistence with Zustand

## Tech Stack

- **Framework**: React 18
- **UI Library**: Material-UI (MUI) v5
- **Routing**: React Router v6
- **State Management**: Zustand
- **API Client**: Axios + React Query
- **Payments**: Adyen Web Drop-in v5
- **Forms**: React Hook Form
- **i18n**: react-i18next
- **Build Tool**: Vite
- **QR Codes**: qrcode.react

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm or yarn
- Backend services running (ticketing and payment modules)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Create environment file:
```bash
cp .env.example .env
```

3. Configure environment variables:
```env
VITE_API_URL=http://localhost:5001
VITE_ADYEN_CLIENT_KEY=your_adyen_client_key
VITE_ADYEN_ENVIRONMENT=test
```

### Development

Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:3001`

### Build

Create a production build:
```bash
npm run build
```

Preview the production build:
```bash
npm run preview
```

## Project Structure

```
src/
├── components/         # Reusable components
│   ├── AdyenCheckout.jsx
│   ├── LoadingSpinner.jsx
│   └── ErrorMessage.jsx
├── screens/           # Page components
│   ├── EventSelection.jsx
│   ├── TicketSelection.jsx
│   ├── VisitorInfo.jsx
│   ├── Payment.jsx
│   ├── BookingConfirmation.jsx
│   ├── BookingLookup.jsx
│   └── TicketView.jsx
├── services/          # API services
│   ├── api.js
│   ├── ticketingService.js
│   └── paymentService.js
├── hooks/             # Custom React hooks
│   └── useCountdown.js
├── utils/             # Utilities
│   ├── bookingStore.js
│   └── formatters.js
├── i18n.js           # Internationalization
├── App.jsx           # Main app component
└── main.jsx          # Entry point
```

## Booking Flow

1. **Event Selection** (`/`)
   - Browse available events
   - Search and filter
   - View event details

2. **Ticket Selection** (`/events/:eventId/tickets`)
   - Select ticket types and quantities
   - View real-time availability
   - See price breakdown

3. **Visitor Information** (`/booking/visitor-info`)
   - Collect customer details
   - Validate input

4. **Payment** (`/booking/payment`)
   - Initialize Adyen checkout
   - Select payment method
   - Complete secure payment

5. **Confirmation** (`/booking/confirmation/:bookingId`)
   - Display booking details
   - Show QR code tickets
   - Download tickets as PDF

## Adyen Integration

The payment flow uses Adyen's Web Drop-in component for a seamless checkout experience:

```javascript
// Payment session creation
const session = await paymentService.createPaymentSession({
  amount: amountInCents,
  currency: 'EUR',
  reference: bookingReference,
  // ... other data
});

// Initialize Adyen checkout
const checkout = await AdyenCheckout({
  environment: 'test',
  clientKey: sessionData.clientKey,
  session: {
    id: sessionData.id,
    sessionData: sessionData.sessionData,
  },
  onPaymentCompleted: handlePaymentComplete,
  onError: handlePaymentError,
});

// Mount Drop-in
checkout.create('dropin').mount('#payment-container');
```

## State Management

The booking state is managed with Zustand and persisted to localStorage:

```javascript
const {
  currentEvent,
  selectedTickets,
  addTicket,
  removeTicket,
  setVisitorInfo,
  getTotalPrice,
  resetBooking,
} = useBookingStore();
```

## API Integration

All API calls go through the centralized API client with automatic token handling and error interceptors:

```javascript
// Example: Fetch events
const events = await ticketingService.getEvents({ status: 'active' });

// Example: Create booking
const booking = await ticketingService.createBooking({
  eventId,
  tickets,
  customerInfo,
});
```

## Internationalization

The app supports multiple languages (Dutch and English):

```javascript
import { useTranslation } from 'react-i18next';

const { t } = useTranslation();
console.log(t('common.loading')); // "Laden..." or "Loading..."
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API base URL | - |
| `VITE_ADYEN_CLIENT_KEY` | Adyen client key | - |
| `VITE_ADYEN_ENVIRONMENT` | Adyen environment (test/live) | test |
| `VITE_APP_NAME` | Application name | HolidaiButler Ticketing |
| `VITE_DEFAULT_LOCALE` | Default language | nl |

## Development Notes

- The proxy configuration in `vite.config.js` forwards API requests to backend services
- Payment methods are automatically configured based on Adyen account settings
- Seat selection can be added for seated events (structure already in place)
- Ticket PDFs are generated server-side and downloaded via blob

## Testing

The application can be tested with Adyen's test cards:

- **Successful payment**: 4111 1111 1111 1111
- **3D Secure**: 4212 3456 7891 0006
- **Failed payment**: 4000 3000 0000 0003

See [Adyen Test Cards](https://docs.adyen.com/development-resources/testing/test-card-numbers) for more options.

## Security Considerations

- Payment details never touch our servers (handled by Adyen)
- All API calls include CSRF protection
- Input validation on both client and server
- Secure session handling
- HTTPS required in production

## Performance

- Code splitting with React Router
- Image lazy loading
- React Query caching
- Optimistic UI updates
- Minimal bundle size with Vite

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

Proprietary - HolidaiButler Platform

## Support

For issues or questions, contact the development team.
