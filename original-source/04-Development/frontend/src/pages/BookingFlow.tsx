import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, CheckCircle } from 'lucide-react';
import GuestInfoForm, {
  type GuestInfo,
} from '../features/ticketing/components/BookingFlow/GuestInfoForm';
import BookingSummary, {
  type BookingSummaryData,
} from '../features/ticketing/components/BookingFlow/BookingSummary';
import PaymentButton, {
  type PaymentConfig,
  type PaymentResult,
  type PaymentError,
} from '../features/ticketing/components/BookingFlow/PaymentButton';
import BookingConfirmation, {
  type ConfirmationData,
} from '../features/ticketing/components/BookingFlow/BookingConfirmation';
import { useCreateBooking, useConfirmBooking } from '../features/ticketing/hooks/useBooking';
import LoadingSpinner from '../features/ticketing/components/shared/LoadingSpinner';
import ErrorDisplay from '../features/ticketing/components/shared/ErrorDisplay';

type BookingStep = 'guest-info' | 'summary' | 'payment' | 'confirmation';

export default function BookingFlow() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // URL parameters
  const poiId = parseInt(searchParams.get('poiId') || '0');
  const date = searchParams.get('date') || '';
  const quantity = parseInt(searchParams.get('quantity') || '1');
  const timeslot = searchParams.get('timeslot') || undefined;

  // State management
  const [currentStep, setCurrentStep] = useState<BookingStep>('guest-info');
  const [guestInfo, setGuestInfo] = useState<GuestInfo | null>(null);
  const [bookingData, setBookingData] = useState<any>(null);
  const [confirmationData, setConfirmationData] = useState<ConfirmationData | null>(null);

  // API hooks
  const createBookingMutation = useCreateBooking();
  const confirmBookingMutation = useConfirmBooking();

  // Validate required parameters
  useEffect(() => {
    if (!poiId || !date || !quantity) {
      navigate('/', { replace: true });
    }
  }, [poiId, date, quantity, navigate]);

  // Mock POI data (in production, fetch from API)
  const poiData = {
    id: poiId,
    name: 'Terra Mitica',
    location: 'Benidorm, Spain',
    imageUrl: undefined,
  };

  // Step 1: Handle guest info submission
  const handleGuestInfoSubmit = (info: GuestInfo) => {
    setGuestInfo(info);

    // Create booking
    createBookingMutation.mutate(
      {
        poiId,
        date,
        timeslot,
        quantity,
        ticketType: 'single',
        guestInfo: {
          name: info.name,
          email: info.email,
          phone: info.phone,
        },
        guests: {
          adults: info.adults,
          children: info.children,
          infants: info.infants,
        },
      },
      {
        onSuccess: (response) => {
          setBookingData(response.data);
          setCurrentStep('summary');
        },
        onError: (error) => {
          console.error('Booking creation error:', error);
        },
      }
    );
  };

  // Step 2: Proceed to payment
  const handleProceedToPayment = () => {
    setCurrentStep('payment');
  };

  // Step 3: Handle payment completion
  const handlePaymentComplete = (paymentResult: PaymentResult) => {
    // Confirm booking with payment details
    confirmBookingMutation.mutate(
      {
        bookingId: bookingData.id,
        paymentTransactionId: paymentResult.transactionId,
      },
      {
        onSuccess: (response) => {
          // Prepare confirmation data
          const confirmation: ConfirmationData = {
            bookingReference: response.data.booking.bookingReference,
            bookingId: response.data.booking.id,
            poi: poiData,
            date: date,
            quantity: quantity,
            guestEmail: guestInfo?.email || '',
            totalAmount: response.data.booking.totalAmount,
            currency: response.data.booking.currency || 'EUR',
            tickets: response.data.tickets || [],
            paymentTransactionId: paymentResult.transactionId,
          };

          setConfirmationData(confirmation);
          setCurrentStep('confirmation');
        },
        onError: (error) => {
          console.error('Booking confirmation error:', error);
        },
      }
    );
  };

  // Handle payment error
  const handlePaymentError = (error: PaymentError) => {
    console.error('Payment error:', error);
    // You could show an error message or stay on payment step
    alert(`Payment failed: ${error.message}`);
  };

  // Back navigation
  const handleBack = () => {
    if (currentStep === 'summary') {
      setCurrentStep('guest-info');
    } else if (currentStep === 'payment') {
      setCurrentStep('summary');
    }
  };

  // Progress indicator
  const steps = [
    { id: 'guest-info', label: 'Guest Info', completed: currentStep !== 'guest-info' },
    {
      id: 'summary',
      label: 'Summary',
      completed: currentStep === 'payment' || currentStep === 'confirmation',
    },
    { id: 'payment', label: 'Payment', completed: currentStep === 'confirmation' },
    { id: 'confirmation', label: 'Confirmation', completed: false },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ChevronLeft className="h-5 w-5 mr-1" />
              Back
            </button>
            <h1 className="text-xl font-bold text-gray-900">Book Your Tickets</h1>
            <div className="w-16"></div> {/* Spacer for centering */}
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      {currentStep !== 'confirmation' && (
        <div className="bg-white border-b">
          <div className="max-w-4xl mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${
                        step.completed
                          ? 'bg-green-600 border-green-600 text-white'
                          : step.id === currentStep
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'bg-white border-gray-300 text-gray-400'
                      }`}
                    >
                      {step.completed ? (
                        <CheckCircle className="h-6 w-6" />
                      ) : (
                        <span className="font-semibold">{index + 1}</span>
                      )}
                    </div>
                    <span
                      className={`text-xs mt-2 font-medium ${
                        step.id === currentStep ? 'text-blue-600' : 'text-gray-600'
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`h-0.5 flex-1 mx-2 transition-colors ${
                        step.completed ? 'bg-green-600' : 'bg-gray-300'
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
      <div className="py-8">
        {/* Step 1: Guest Information */}
        {currentStep === 'guest-info' && (
          <GuestInfoForm
            initialData={guestInfo || undefined}
            onSubmit={handleGuestInfoSubmit}
            isLoading={createBookingMutation.isLoading}
          />
        )}

        {/* Loading State */}
        {createBookingMutation.isLoading && (
          <div className="flex justify-center items-center min-h-[400px]">
            <LoadingSpinner message="Creating your booking..." />
          </div>
        )}

        {/* Error State */}
        {createBookingMutation.isError && (
          <div className="max-w-2xl mx-auto p-6">
            <ErrorDisplay
              title="Booking Failed"
              message={
                createBookingMutation.error instanceof Error
                  ? createBookingMutation.error.message
                  : 'Failed to create booking'
              }
              onRetry={() => {
                if (guestInfo) {
                  handleGuestInfoSubmit(guestInfo);
                }
              }}
            />
          </div>
        )}

        {/* Step 2: Booking Summary */}
        {currentStep === 'summary' && bookingData && guestInfo && (
          <BookingSummary
            booking={{
              poi: poiData,
              date: date,
              timeslot: timeslot,
              ticketType: 'single',
              quantity: quantity,
              guestInfo: guestInfo,
              pricing: {
                basePrice: bookingData.totalAmount / quantity,
                totalAmount: bookingData.totalAmount,
                currency: bookingData.currency || 'EUR',
              },
            }}
            onEdit={handleBack}
            onConfirm={handleProceedToPayment}
          />
        )}

        {/* Step 3: Payment */}
        {currentStep === 'payment' && bookingData && (
          <div className="max-w-2xl mx-auto p-6">
            <PaymentButton
              config={{
                amount: bookingData.totalAmount,
                currency: bookingData.currency || 'EUR',
                bookingId: bookingData.id,
                bookingReference: bookingData.bookingReference,
              }}
              onPaymentComplete={handlePaymentComplete}
              onPaymentError={handlePaymentError}
            />
            <button
              onClick={handleBack}
              className="mt-6 w-full px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Back to Summary
            </button>
          </div>
        )}

        {/* Confirmation Loading */}
        {confirmBookingMutation.isLoading && (
          <div className="flex justify-center items-center min-h-[400px]">
            <LoadingSpinner message="Confirming your booking..." />
          </div>
        )}

        {/* Step 4: Confirmation */}
        {currentStep === 'confirmation' && confirmationData && (
          <BookingConfirmation
            confirmation={confirmationData}
            onViewTickets={() => navigate('/my-tickets')}
            onDownloadTickets={() => console.log('Download tickets')}
            onAddToWallet={() => console.log('Add to wallet')}
          />
        )}
      </div>
    </div>
  );
}
