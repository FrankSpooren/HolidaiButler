import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box } from '@mui/material';
import EventSelection from './screens/EventSelection';
import TicketSelection from './screens/TicketSelection';
import VisitorInfo from './screens/VisitorInfo';
import Payment from './screens/Payment';
import BookingConfirmation from './screens/BookingConfirmation';
import BookingLookup from './screens/BookingLookup';
import TicketView from './screens/TicketView';
import OfflineIndicator from './components/OfflineIndicator';

function App() {
  // Register Service Worker on mount
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('SW registered:', registration.scope);
        })
        .catch((error) => {
          console.log('SW registration failed:', error);
        });
    }
  }, []);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Routes>
        <Route path="/" element={<EventSelection />} />
        <Route path="/events/:eventId/tickets" element={<TicketSelection />} />
        <Route path="/booking/visitor-info" element={<VisitorInfo />} />
        <Route path="/booking/payment" element={<Payment />} />
        <Route path="/booking/confirmation/:bookingId" element={<BookingConfirmation />} />
        <Route path="/booking/lookup" element={<BookingLookup />} />
        <Route path="/tickets/:ticketId" element={<TicketView />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <OfflineIndicator />
    </Box>
  );
}

export default App;
