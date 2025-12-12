import api from './api';

export const ticketingService = {
  // Events
  async getEvents(params = {}) {
    const response = await api.get('/api/ticketing/events', { params });
    return response.data;
  },

  async getEvent(eventId) {
    const response = await api.get(`/api/ticketing/events/${eventId}`);
    return response.data;
  },

  async getEventAvailability(eventId) {
    const response = await api.get(`/api/ticketing/events/${eventId}/availability`);
    return response.data;
  },

  // Ticket types
  async getTicketTypes(eventId) {
    const response = await api.get(`/api/ticketing/events/${eventId}/ticket-types`);
    return response.data;
  },

  // Bookings
  async createBooking(bookingData) {
    const response = await api.post('/api/ticketing/bookings', bookingData);
    return response.data;
  },

  async getBooking(bookingId) {
    const response = await api.get(`/api/ticketing/bookings/${bookingId}`);
    return response.data;
  },

  async getBookingByReference(reference, email) {
    const response = await api.get('/api/ticketing/bookings/lookup', {
      params: { reference, email },
    });
    return response.data;
  },

  async confirmBooking(bookingId) {
    const response = await api.post(`/api/ticketing/bookings/${bookingId}/confirm`);
    return response.data;
  },

  async cancelBooking(bookingId, data = {}) {
    const response = await api.post(`/api/ticketing/bookings/${bookingId}/cancel`, data);
    return response.data;
  },

  // Ticket Transfer
  async transferTicket(ticketId, transferData) {
    const response = await api.post(`/api/ticketing/tickets/${ticketId}/transfer`, transferData);
    return response.data;
  },

  async getTransferHistory(ticketId) {
    const response = await api.get(`/api/ticketing/tickets/${ticketId}/transfers`);
    return response.data;
  },

  // Refund Status
  async getRefundStatus(bookingId) {
    const response = await api.get(`/api/ticketing/bookings/${bookingId}/refund`);
    return response.data;
  },

  // Wallet
  async addToWallet(ticketId, walletType) {
    const response = await api.post(`/api/ticketing/tickets/${ticketId}/wallet`, { walletType });
    return response.data;
  },

  // Offline sync
  async syncOfflineTickets(tickets) {
    const response = await api.post('/api/ticketing/tickets/sync', { tickets });
    return response.data;
  },

  // Tickets
  async getTicket(ticketId) {
    const response = await api.get(`/api/ticketing/tickets/${ticketId}`);
    return response.data;
  },

  async validateTicket(ticketId, validationCode) {
    const response = await api.post(`/api/ticketing/tickets/${ticketId}/validate`, {
      validationCode,
    });
    return response.data;
  },

  async downloadTicket(ticketId) {
    const response = await api.get(`/api/ticketing/tickets/${ticketId}/download`, {
      responseType: 'blob',
    });
    return response.data;
  },

  // Seating (if applicable)
  async getSeatingChart(eventId) {
    const response = await api.get(`/api/ticketing/events/${eventId}/seating`);
    return response.data;
  },

  async reserveSeats(eventId, seatIds) {
    const response = await api.post(`/api/ticketing/events/${eventId}/seats/reserve`, {
      seatIds,
    });
    return response.data;
  },

  async releaseSeats(reservationId) {
    const response = await api.delete(`/api/ticketing/seats/reservations/${reservationId}`);
    return response.data;
  },
};

export default ticketingService;
