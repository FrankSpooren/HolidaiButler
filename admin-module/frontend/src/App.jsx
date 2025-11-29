import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Store
import useAuthStore from './store/authStore';

// Layout
import DashboardLayout from './components/layout/DashboardLayout';

// Auth Pages
import Login from './pages/auth/Login';

// Dashboard Pages
import Dashboard from './pages/dashboard/Dashboard';
import POIList from './pages/pois/POIList';
import POIForm from './pages/pois/POIForm';
import UserList from './pages/users/UserList';
import UserForm from './pages/users/UserForm';
import Analytics from './pages/analytics/Analytics';

// Event Pages
import EventList from './pages/events/EventList';
import EventForm from './pages/events/EventForm';
import EventDetail from './pages/events/EventDetail';
import EventAnalytics from './pages/events/EventAnalytics';
import EventImportExport from './pages/events/EventImportExport';

// Reservation Pages
import ReservationList from './pages/reservations/ReservationList';
import ReservationForm from './pages/reservations/ReservationForm';
import ReservationDetail from './pages/reservations/ReservationDetail';

// Ticket Pages
import TicketList from './pages/tickets/TicketList';
import TicketForm from './pages/tickets/TicketForm';
import TicketDetail from './pages/tickets/TicketDetail';

// Booking Pages
import BookingList from './pages/bookings/BookingList';
import BookingDetail from './pages/bookings/BookingDetail';

// Transaction Pages
import TransactionList from './pages/transactions/TransactionList';
import TransactionDetail from './pages/transactions/TransactionDetail';

// Agenda Pages
import AgendaList from './pages/agenda/AgendaList';

// Reservations Module Pages
import RestaurantList from './pages/reservations/RestaurantList';
import RestaurantForm from './pages/reservations/RestaurantForm';
import GuestList from './pages/reservations/GuestList';
import WaitlistPage from './pages/reservations/WaitlistPage';
import FloorPlanEditor from './pages/reservations/FloorPlanEditor';

// Theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#667eea',
    },
    secondary: {
      main: '#764ba2',
    },
  },
  typography: {
    fontFamily: [
      'Inter',
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
  },
});

// Protected Route Component
function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

// Public Route Component (redirect if authenticated)
function PublicRoute({ children }) {
  const { isAuthenticated } = useAuthStore();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function App() {
  const { loadUser } = useAuthStore();

  // Load user on mount
  useEffect(() => {
    loadUser();
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />

          {/* Protected Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />

            {/* POI Routes */}
            <Route path="pois" element={<POIList />} />
            <Route path="pois/create" element={<POIForm />} />
            <Route path="pois/edit/:id" element={<POIForm />} />

            {/* User Routes */}
            <Route path="users" element={<UserList />} />
            <Route path="users/create" element={<UserForm />} />
            <Route path="users/edit/:id" element={<UserForm />} />

            {/* Event Routes */}
            <Route path="events" element={<EventList />} />
            <Route path="events/new" element={<EventForm />} />
            <Route path="events/edit/:id" element={<EventForm />} />
            <Route path="events/analytics" element={<EventAnalytics />} />
            <Route path="events/import-export" element={<EventImportExport />} />
            <Route path="events/:id" element={<EventDetail />} />

            {/* Reservation Routes */}
            <Route path="reservations" element={<ReservationList />} />
            <Route path="reservations/new" element={<ReservationForm />} />
            <Route path="reservations/edit/:id" element={<ReservationForm />} />
            <Route path="reservations/:id" element={<ReservationDetail />} />

            {/* Reservations Module Routes */}
            <Route path="reservations/restaurants" element={<RestaurantList />} />
            <Route path="reservations/restaurants/create" element={<RestaurantForm />} />
            <Route path="reservations/restaurants/edit/:id" element={<RestaurantForm />} />
            <Route path="reservations/bookings" element={<ReservationList />} />
            <Route path="reservations/guests" element={<GuestList />} />
            <Route path="reservations/waitlist" element={<WaitlistPage />} />
            <Route path="reservations/floor-plans" element={<FloorPlanEditor />} />

            {/* Ticket Routes */}
            <Route path="tickets" element={<TicketList />} />
            <Route path="tickets/new" element={<TicketForm />} />
            <Route path="tickets/edit/:id" element={<TicketForm />} />
            <Route path="tickets/:id" element={<TicketDetail />} />

            {/* Booking Routes */}
            <Route path="bookings" element={<BookingList />} />
            <Route path="bookings/:id" element={<BookingDetail />} />

            {/* Transaction Routes */}
            <Route path="transactions" element={<TransactionList />} />
            <Route path="transactions/:id" element={<TransactionDetail />} />

            {/* Agenda Routes */}
            <Route path="agenda" element={<AgendaList />} />

            {/* Analytics */}
            <Route path="analytics" element={<Analytics />} />

            {/* Catch all */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>

      {/* Toast Notifications */}
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
    </ThemeProvider>
  );
}

export default App;
