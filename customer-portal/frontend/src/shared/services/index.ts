/**
 * HolidaiButler API Services
 * Central export for all API service clients
 */

// Chat / HoliBot
export { chatApi } from './chat.api';
export type { ChatRequest, ChatResponse, ChatMessage } from '../types/chat.types';

// Categories
export { categoriesApi } from './categories.api';

// Ticketing
export { ticketingApi } from './ticketing.api';
export type {
  TicketType,
  Availability,
  BookingRequest,
  Ticket,
  Booking,
  BookingResponse,
  AvailabilityResponse,
} from './ticketing.api';

// Payment
export { paymentApi } from './payment.api';
export type {
  PaymentRequest,
  PaymentResponse,
  RefundRequest,
} from './payment.api';

// Reservations
export { reservationsApi } from './reservations.api';
export type {
  Restaurant,
  TimeSlot,
  AvailabilityResponse as ReservationAvailabilityResponse,
  ReservationRequest,
  Reservation,
  ReservationResponse,
} from './reservations.api';

// Agenda / Events
export { agendaApi } from './agenda.api';
export type {
  AgendaEvent,
  EventsResponse,
  EventFilters,
} from './agenda.api';

// Admin
export { adminApi } from './admin.api';
export type {
  AdminPOI,
  AdminUser,
  AnalyticsSummary,
} from './admin.api';
