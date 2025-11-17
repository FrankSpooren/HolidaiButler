import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useBookingStore = create(
  persist(
    (set, get) => ({
      // Current booking state
      currentEvent: null,
      selectedTickets: [],
      visitorInfo: null,
      paymentSession: null,
      bookingId: null,

      // Seat reservation (optional for seated events)
      seatReservation: null,
      reservationExpiry: null,

      // Actions
      setCurrentEvent: (event) => set({ currentEvent: event }),

      addTicket: (ticketType) => {
        const { selectedTickets } = get();
        const existing = selectedTickets.find((t) => t.ticketTypeId === ticketType.id);

        if (existing) {
          set({
            selectedTickets: selectedTickets.map((t) =>
              t.ticketTypeId === ticketType.id
                ? { ...t, quantity: t.quantity + 1 }
                : t
            ),
          });
        } else {
          set({
            selectedTickets: [
              ...selectedTickets,
              {
                ticketTypeId: ticketType.id,
                name: ticketType.name,
                price: ticketType.price,
                quantity: 1,
              },
            ],
          });
        }
      },

      removeTicket: (ticketTypeId) => {
        const { selectedTickets } = get();
        const existing = selectedTickets.find((t) => t.ticketTypeId === ticketTypeId);

        if (existing && existing.quantity > 1) {
          set({
            selectedTickets: selectedTickets.map((t) =>
              t.ticketTypeId === ticketTypeId
                ? { ...t, quantity: t.quantity - 1 }
                : t
            ),
          });
        } else {
          set({
            selectedTickets: selectedTickets.filter((t) => t.ticketTypeId !== ticketTypeId),
          });
        }
      },

      setTicketQuantity: (ticketTypeId, quantity) => {
        const { selectedTickets } = get();

        if (quantity === 0) {
          set({
            selectedTickets: selectedTickets.filter((t) => t.ticketTypeId !== ticketTypeId),
          });
        } else {
          set({
            selectedTickets: selectedTickets.map((t) =>
              t.ticketTypeId === ticketTypeId ? { ...t, quantity } : t
            ),
          });
        }
      },

      clearTickets: () => set({ selectedTickets: [] }),

      setVisitorInfo: (info) => set({ visitorInfo: info }),

      setPaymentSession: (session) => set({ paymentSession: session }),

      setBookingId: (id) => set({ bookingId: id }),

      setSeatReservation: (reservation, expiryTime) =>
        set({ seatReservation: reservation, reservationExpiry: expiryTime }),

      clearSeatReservation: () =>
        set({ seatReservation: null, reservationExpiry: null }),

      // Computed values
      getTotalPrice: () => {
        const { selectedTickets } = get();
        return selectedTickets.reduce(
          (total, ticket) => total + ticket.price * ticket.quantity,
          0
        );
      },

      getTotalTickets: () => {
        const { selectedTickets } = get();
        return selectedTickets.reduce((total, ticket) => total + ticket.quantity, 0);
      },

      getServiceFee: () => {
        const total = get().getTotalPrice();
        // 2.5% service fee + €0.50 per ticket
        const percentageFee = total * 0.025;
        const perTicketFee = get().getTotalTickets() * 0.5;
        return percentageFee + perTicketFee;
      },

      getVAT: () => {
        const subtotal = get().getTotalPrice();
        const serviceFee = get().getServiceFee();
        const total = subtotal + serviceFee;
        // 21% VAT
        return total * 0.21;
      },

      getGrandTotal: () => {
        const subtotal = get().getTotalPrice();
        const serviceFee = get().getServiceFee();
        const vat = get().getVAT();
        return subtotal + serviceFee + vat;
      },

      // Reset entire booking
      resetBooking: () =>
        set({
          currentEvent: null,
          selectedTickets: [],
          visitorInfo: null,
          paymentSession: null,
          bookingId: null,
          seatReservation: null,
          reservationExpiry: null,
        }),
    }),
    {
      name: 'booking-storage',
      partialize: (state) => ({
        currentEvent: state.currentEvent,
        selectedTickets: state.selectedTickets,
        visitorInfo: state.visitorInfo,
        bookingId: state.bookingId,
      }),
    }
  )
);

export default useBookingStore;
