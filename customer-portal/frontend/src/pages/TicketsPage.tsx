/**
 * TicketsPage - NEW Ticketing Module Integration
 *
 * Enterprise-level ticket purchasing page with Adyen payment integration.
 * Features:
 * - Event listing and search
 * - Ticket type selection
 * - Guest information form
 * - Adyen Drop-in payment
 * - Booking confirmation
 *
 * Template: HolidaiButler design system (white hero, #7FA594 accents)
 */

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, type Locale } from 'date-fns';
import { nl, enUS, de, es } from 'date-fns/locale';
import {
  Search,
  Calendar,
  MapPin,
  Users,
  Ticket,
  CreditCard,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  CheckCircle,
  Loader2,
  X,
  Mail,
  Phone,
  User,
  ShoppingCart,
} from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { paymentsApi, bookingsApi } from '@/lib/api';
import { eventsService } from '@/lib/api/eventsService';
import type { Event, TicketType, CreateBookingRequest } from '@/lib/api';
import { AdyenCheckoutComponent } from '@/features/ticketing/components/Payment/AdyenCheckout';
import type { AdyenSessionData, PaymentResult } from '@/features/ticketing/components/Payment/AdyenCheckout';

// Date locale mapping
const dateLocales: Record<string, Locale> = {
  nl: nl,
  en: enUS,
  de: de,
  es: es,
};

// Booking flow steps
type BookingStep = 'events' | 'tickets' | 'guest-info' | 'payment' | 'confirmation';

interface SelectedTicket {
  ticketType: TicketType;
  quantity: number;
}

interface GuestInfo {
  name: string;
  email: string;
  phone: string;
}

export const TicketsPage = () => {
  const { t, language } = useLanguage();
  const queryClient = useQueryClient();
  const dateLocale = dateLocales[language] || enUS;

  // Booking flow state
  const [currentStep, setCurrentStep] = useState<BookingStep>('events');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [selectedTickets, setSelectedTickets] = useState<SelectedTicket[]>([]);
  const [guestInfo, setGuestInfo] = useState<GuestInfo>({ name: '', email: '', phone: '' });
  const [bookingId, setBookingId] = useState<number | null>(null);
  const [bookingReference, setBookingReference] = useState<string | null>(null);
  const [paymentSession, setPaymentSession] = useState<AdyenSessionData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch events with fallback data
  const {
    data: eventsResponse,
    isLoading: eventsLoading,
    error: eventsError,
  } = useQuery({
    queryKey: ['events', { status: 'active' }],
    queryFn: async () => {
      const response = await eventsService.getEvents({ status: 'active' });
      return response.data;
    },
  });

  // Fetch ticket types for selected event
  const {
    data: ticketTypesResponse,
    isLoading: ticketTypesLoading,
  } = useQuery({
    queryKey: ['ticketTypes', selectedEvent?.id],
    queryFn: async () => {
      if (!selectedEvent?.id) return null;
      const response = await eventsService.getTicketTypes(selectedEvent.id);
      return response.data;
    },
    enabled: !!selectedEvent?.id,
  });

  // Create booking mutation
  const createBookingMutation = useMutation({
    mutationFn: async (bookingData: CreateBookingRequest) => {
      const response = await bookingsApi.createBooking(bookingData);
      return response.data;
    },
    onSuccess: (data) => {
      setBookingId(data.id || null);
      setBookingReference(data.bookingReference || null);
      // Create payment session after booking
      createPaymentSession(data);
    },
    onError: (err: Error) => {
      setError(err.message || 'Failed to create booking');
    },
  });

  // Create payment session
  const createPaymentSession = async (bookingData: { id?: number; bookingReference?: string }) => {
    try {
      const totalAmount = calculateTotal();
      const response = await paymentsApi.createSession({
        amount: totalAmount,
        currency: 'EUR',
        bookingReference: bookingData.bookingReference || `BK-${Date.now()}`,
        resourceType: 'ticket',
        resourceId: String(selectedEvent?.id || 0),
        customerInfo: {
          name: guestInfo.name,
          email: guestInfo.email,
          phone: guestInfo.phone,
        },
        returnUrl: `${window.location.origin}/tickets?status=complete`,
      });

      if (response.data.success) {
        setPaymentSession(response.data.data);
        setCurrentStep('payment');
      } else {
        setError('Failed to create payment session');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create payment session');
    }
  };

  // Filter events by search query
  const filteredEvents = eventsResponse?.data?.filter((event: Event) =>
    event.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    event.location?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  // Calculate total price
  const calculateTotal = (): number => {
    return selectedTickets.reduce((total, item) => {
      return total + item.ticketType.price * item.quantity;
    }, 0);
  };

  // Format currency
  const formatPrice = (amount: number, currency: string = 'EUR'): string => {
    return new Intl.NumberFormat(language === 'nl' ? 'nl-NL' : 'en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  // Handle event selection
  const handleSelectEvent = (event: Event) => {
    setSelectedEvent(event);
    setSelectedTickets([]);
    setCurrentStep('tickets');
  };

  // Handle ticket quantity change
  const handleTicketQuantityChange = (ticketType: TicketType, quantity: number) => {
    setSelectedTickets((prev) => {
      const existing = prev.find((t) => t.ticketType.id === ticketType.id);
      if (quantity === 0) {
        return prev.filter((t) => t.ticketType.id !== ticketType.id);
      }
      if (existing) {
        return prev.map((t) =>
          t.ticketType.id === ticketType.id ? { ...t, quantity } : t
        );
      }
      return [...prev, { ticketType, quantity }];
    });
  };

  // Proceed to guest info
  const handleProceedToGuestInfo = () => {
    if (selectedTickets.length === 0) {
      setError('Please select at least one ticket');
      return;
    }
    setError(null);
    setCurrentStep('guest-info');
  };

  // Handle guest info submit
  const handleGuestInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!guestInfo.name || !guestInfo.email) {
      setError('Please fill in all required fields');
      return;
    }

    // Create booking
    const totalQuantity = selectedTickets.reduce((sum, t) => sum + t.quantity, 0);
    const bookingData: CreateBookingRequest = {
      poiId: selectedEvent?.id || 0,
      date: selectedEvent?.startDate?.split('T')[0] || new Date().toISOString().split('T')[0],
      quantity: totalQuantity,
      ticketType: selectedTickets[0]?.ticketType.name as 'single' | 'group' | 'family' | 'vip' || 'single',
      guestInfo: {
        name: guestInfo.name,
        email: guestInfo.email,
        phone: guestInfo.phone,
      },
    };

    createBookingMutation.mutate(bookingData);
  };

  // Handle payment completion
  const handlePaymentComplete = (result: PaymentResult) => {
    console.log('Payment completed:', result);
    setCurrentStep('confirmation');
    queryClient.invalidateQueries({ queryKey: ['events'] });
  };

  // Handle payment error
  const handlePaymentError = (err: Error) => {
    setError(err.message || 'Payment failed');
  };

  // Go back
  const handleGoBack = () => {
    switch (currentStep) {
      case 'tickets':
        setCurrentStep('events');
        setSelectedEvent(null);
        break;
      case 'guest-info':
        setCurrentStep('tickets');
        break;
      case 'payment':
        setCurrentStep('guest-info');
        break;
      default:
        break;
    }
    setError(null);
  };

  // Render event card
  const renderEventCard = (event: Event) => (
    <div
      key={event.id}
      className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
      onClick={() => handleSelectEvent(event)}
    >
      {/* Event Image */}
      <div className="h-48 bg-gradient-to-r from-[#5E8B7E] to-[#7FA594] flex items-center justify-center">
        {event.imageUrl ? (
          <img src={event.imageUrl} alt={event.name} className="w-full h-full object-cover" />
        ) : (
          <Ticket className="w-16 h-16 text-white/50" />
        )}
      </div>

      {/* Event Info */}
      <div className="p-5">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{event.name}</h3>

        <div className="flex items-center gap-2 text-gray-600 text-sm mb-2">
          <Calendar className="w-4 h-4" />
          <span>
            {format(new Date(event.startDate), 'PPP', { locale: dateLocale })}
          </span>
        </div>

        {event.location && (
          <div className="flex items-center gap-2 text-gray-600 text-sm mb-3">
            <MapPin className="w-4 h-4" />
            <span>{event.location}</span>
          </div>
        )}

        <p className="text-gray-500 text-sm line-clamp-2 mb-4">
          {event.description}
        </p>

        <div className="flex items-center justify-between">
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
            event.availableTickets && event.availableTickets > 50
              ? 'bg-green-100 text-green-700'
              : event.availableTickets && event.availableTickets > 0
              ? 'bg-yellow-100 text-yellow-700'
              : 'bg-red-100 text-red-700'
          }`}>
            {event.availableTickets || 0} {t.tickets?.available || 'available'}
          </span>

          <button className="flex items-center gap-1 text-[#7FA594] font-medium text-sm hover:underline">
            {t.tickets?.buyTickets || 'Buy tickets'}
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  // Render events step
  const renderEventsStep = () => (
    <>
      {/* Search Bar */}
      <div className="max-w-xl mx-auto mb-8">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder={t.tickets?.searchPlaceholder || 'Search events...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-[#7FA594] focus:border-transparent"
          />
        </div>
      </div>

      {/* Events Grid */}
      {eventsLoading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="w-10 h-10 text-[#7FA594] animate-spin mb-4" />
          <p className="text-gray-600">Loading events...</p>
        </div>
      ) : eventsError ? (
        <div className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
          <p className="text-gray-600">Failed to load events</p>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="text-center py-12">
          <Ticket className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No events found</h3>
          <p className="text-gray-500">Try a different search term</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map(renderEventCard)}
        </div>
      )}
    </>
  );

  // Render ticket selection step
  const renderTicketsStep = () => (
    <div className="max-w-3xl mx-auto">
      {/* Back Button */}
      <button
        onClick={handleGoBack}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <ChevronLeft className="w-5 h-5" />
        {t.common?.back || 'Back'}
      </button>

      {/* Event Header */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{selectedEvent?.name}</h2>
        <div className="flex flex-wrap gap-4 text-gray-600">
          <span className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            {selectedEvent?.startDate && format(new Date(selectedEvent.startDate), 'PPP', { locale: dateLocale })}
          </span>
          {selectedEvent?.location && (
            <span className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              {selectedEvent.location}
            </span>
          )}
        </div>
      </div>

      {/* Ticket Types */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {t.tickets?.selectTickets || 'Select Tickets'}
        </h3>

        {ticketTypesLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 text-[#7FA594] animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            {(ticketTypesResponse?.data || selectedEvent?.ticketTypes || []).map((ticketType: TicketType) => {
              const selected = selectedTickets.find((t) => t.ticketType.id === ticketType.id);
              const quantity = selected?.quantity || 0;

              return (
                <div
                  key={ticketType.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                >
                  <div>
                    <h4 className="font-medium text-gray-900">{ticketType.name}</h4>
                    {ticketType.description && (
                      <p className="text-sm text-gray-500">{ticketType.description}</p>
                    )}
                    <p className="text-[#7FA594] font-semibold mt-1">
                      {formatPrice(ticketType.price, ticketType.currency)}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleTicketQuantityChange(ticketType, Math.max(0, quantity - 1))}
                      className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100"
                      disabled={quantity === 0}
                    >
                      -
                    </button>
                    <span className="w-8 text-center font-medium">{quantity}</span>
                    <button
                      onClick={() => handleTicketQuantityChange(ticketType, Math.min(ticketType.maxPerOrder || 10, quantity + 1))}
                      className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100"
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Order Summary */}
      {selectedTickets.length > 0 && (
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            {t.tickets?.orderSummary || 'Order Summary'}
          </h3>

          <div className="space-y-2 mb-4">
            {selectedTickets.map((item) => (
              <div key={item.ticketType.id} className="flex justify-between text-gray-600">
                <span>{item.quantity}x {item.ticketType.name}</span>
                <span>{formatPrice(item.ticketType.price * item.quantity)}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-gray-200 pt-4 flex justify-between">
            <span className="font-semibold text-gray-900">{t.tickets?.total || 'Total'}</span>
            <span className="font-bold text-xl text-[#7FA594]">{formatPrice(calculateTotal())}</span>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Continue Button */}
      <button
        onClick={handleProceedToGuestInfo}
        disabled={selectedTickets.length === 0}
        className="w-full py-4 bg-[#7FA594] text-white font-semibold rounded-lg hover:bg-[#5E8B7E] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {t.tickets?.continueToCheckout || 'Continue to Checkout'}
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );

  // Render guest info step
  const renderGuestInfoStep = () => (
    <div className="max-w-xl mx-auto">
      {/* Back Button */}
      <button
        onClick={handleGoBack}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <ChevronLeft className="w-5 h-5" />
        {t.common?.back || 'Back'}
      </button>

      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
          <User className="w-6 h-6" />
          {t.tickets?.guestInformation || 'Guest Information'}
        </h3>

        <form onSubmit={handleGuestInfoSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t.tickets?.name || 'Full Name'} *
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={guestInfo.name}
                onChange={(e) => setGuestInfo({ ...guestInfo, name: e.target.value })}
                required
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7FA594] focus:border-transparent"
                placeholder="John Doe"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t.tickets?.email || 'Email'} *
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                value={guestInfo.email}
                onChange={(e) => setGuestInfo({ ...guestInfo, email: e.target.value })}
                required
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7FA594] focus:border-transparent"
                placeholder="john@example.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t.tickets?.phone || 'Phone'} ({t.common?.optional || 'optional'})
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="tel"
                value={guestInfo.phone}
                onChange={(e) => setGuestInfo({ ...guestInfo, phone: e.target.value })}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7FA594] focus:border-transparent"
                placeholder="+31 6 12345678"
              />
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {/* Order Summary */}
          <div className="border-t border-gray-200 pt-4 mt-6">
            <div className="flex justify-between text-gray-600 mb-2">
              <span>{t.tickets?.event || 'Event'}</span>
              <span>{selectedEvent?.name}</span>
            </div>
            <div className="flex justify-between text-gray-600 mb-2">
              <span>{t.tickets?.tickets || 'Tickets'}</span>
              <span>{selectedTickets.reduce((sum, t) => sum + t.quantity, 0)}</span>
            </div>
            <div className="flex justify-between font-semibold text-gray-900">
              <span>{t.tickets?.total || 'Total'}</span>
              <span className="text-[#7FA594]">{formatPrice(calculateTotal())}</span>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={createBookingMutation.isPending}
            className="w-full py-4 bg-[#7FA594] text-white font-semibold rounded-lg hover:bg-[#5E8B7E] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {createBookingMutation.isPending ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {t.tickets?.processing || 'Processing...'}
              </>
            ) : (
              <>
                <CreditCard className="w-5 h-5" />
                {t.tickets?.proceedToPayment || 'Proceed to Payment'}
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );

  // Render payment step
  const renderPaymentStep = () => (
    <div className="max-w-xl mx-auto">
      {/* Back Button */}
      <button
        onClick={handleGoBack}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <ChevronLeft className="w-5 h-5" />
        {t.common?.back || 'Back'}
      </button>

      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
          <CreditCard className="w-6 h-6" />
          {t.tickets?.payment || 'Payment'}
        </h3>

        {/* Order Summary */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="flex justify-between text-gray-600 mb-2">
            <span>{selectedEvent?.name}</span>
          </div>
          <div className="flex justify-between text-gray-600 mb-2">
            <span>{selectedTickets.reduce((sum, t) => sum + t.quantity, 0)} {t.tickets?.tickets || 'tickets'}</span>
          </div>
          <div className="flex justify-between font-semibold text-gray-900 border-t border-gray-200 pt-2">
            <span>{t.tickets?.total || 'Total'}</span>
            <span className="text-[#7FA594]">{formatPrice(calculateTotal())}</span>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Adyen Checkout */}
        {paymentSession ? (
          <AdyenCheckoutComponent
            sessionData={paymentSession}
            onPaymentComplete={handlePaymentComplete}
            onPaymentError={handlePaymentError}
            locale={language === 'nl' ? 'nl-NL' : 'en-US'}
          />
        ) : (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="w-10 h-10 text-[#7FA594] animate-spin mb-4" />
            <p className="text-gray-600">{t.tickets?.loadingPayment || 'Loading payment methods...'}</p>
          </div>
        )}
      </div>
    </div>
  );

  // Render confirmation step
  const renderConfirmationStep = () => (
    <div className="max-w-xl mx-auto">
      <div className="bg-white rounded-xl shadow-md p-8 text-center">
        <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-6" />

        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {t.tickets?.bookingConfirmed || 'Booking Confirmed!'}
        </h2>

        <p className="text-gray-600 mb-6">
          {t.tickets?.confirmationMessage || 'Your tickets have been booked successfully.'}
        </p>

        {bookingReference && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-500 mb-1">{t.tickets?.bookingReference || 'Booking Reference'}</p>
            <p className="text-xl font-mono font-bold text-gray-900">{bookingReference}</p>
          </div>
        )}

        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            {t.tickets?.emailSent || 'A confirmation email has been sent to'} <strong>{guestInfo.email}</strong>
          </p>

          <button
            onClick={() => {
              setCurrentStep('events');
              setSelectedEvent(null);
              setSelectedTickets([]);
              setGuestInfo({ name: '', email: '', phone: '' });
              setBookingId(null);
              setBookingReference(null);
              setPaymentSession(null);
              setError(null);
            }}
            className="w-full py-3 bg-[#7FA594] text-white font-semibold rounded-lg hover:bg-[#5E8B7E] transition-colors"
          >
            {t.tickets?.browseMoreEvents || 'Browse More Events'}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section - White background (consistent with HB template) */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-8 text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            {t.tickets?.title || 'Event Tickets'}
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            {t.tickets?.subtitle || 'Book tickets for the best events in Calpe and Costa Blanca'}
          </p>
        </div>
      </div>

      {/* Progress Indicator */}
      {currentStep !== 'events' && currentStep !== 'confirmation' && (
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-3xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              {['events', 'tickets', 'guest-info', 'payment'].map((step, index) => (
                <div
                  key={step}
                  className={`flex items-center ${index < 3 ? 'flex-1' : ''}`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      ['events', 'tickets', 'guest-info', 'payment'].indexOf(currentStep) >= index
                        ? 'bg-[#7FA594] text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {index + 1}
                  </div>
                  {index < 3 && (
                    <div
                      className={`flex-1 h-1 mx-2 ${
                        ['events', 'tickets', 'guest-info', 'payment'].indexOf(currentStep) > index
                          ? 'bg-[#7FA594]'
                          : 'bg-gray-200'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {currentStep === 'events' && renderEventsStep()}
        {currentStep === 'tickets' && renderTicketsStep()}
        {currentStep === 'guest-info' && renderGuestInfoStep()}
        {currentStep === 'payment' && renderPaymentStep()}
        {currentStep === 'confirmation' && renderConfirmationStep()}
      </div>
    </div>
  );
};

export default TicketsPage;
