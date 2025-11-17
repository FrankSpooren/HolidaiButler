import { Routes, Route, Navigate } from 'react-router-dom';
import { Box } from '@mui/material';
import EventSelection from './screens/EventSelection';
import TicketSelection from './screens/TicketSelection';
import VisitorInfo from './screens/VisitorInfo';
import Payment from './screens/Payment';
import BookingConfirmation from './screens/BookingConfirmation';
import BookingLookup from './screens/BookingLookup';
import TicketView from './screens/TicketView';

function App() {
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
    </Box>
  );
}

export default App;
