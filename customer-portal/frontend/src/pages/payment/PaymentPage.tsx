/**
 * PaymentPage (Fase III — Blok A)
 *
 * Mounts the Adyen Drop-in component for checkout.
 * Route: /checkout/:orderType/:orderId
 *
 * Flow:
 * 1. Extract orderType + orderId from URL params
 * 2. Call backend POST /payments/session to create Adyen session
 * 3. Pass session data to AdyenCheckout component
 * 4. On completion → redirect to PaymentResultPage
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useDestination } from '../../shared/contexts/DestinationContext';
import { usePageMeta } from '../../shared/hooks/usePageMeta';
import { paymentApi } from '../../shared/services/payment.api';
import type { AdyenSessionData } from '../../shared/services/payment.api';
import { AdyenCheckoutComponent } from '../../features/ticketing/components/Payment/AdyenCheckout';

export function PaymentPage() {
  const { orderType, orderId } = useParams<{ orderType: string; orderId: string }>();
  const navigate = useNavigate();
  const destination = useDestination();
  const [sessionData, setSessionData] = useState<AdyenSessionData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  usePageMeta({
    title: 'Checkout',
    description: 'Complete your payment',
    path: `/checkout/${orderType}/${orderId}`,
  });

  useEffect(() => {
    async function initSession() {
      if (!orderType || !orderId) {
        setError('Invalid checkout URL');
        setLoading(false);
        return;
      }

      const validTypes = ['ticket', 'reservation', 'booking'];
      if (!validTypes.includes(orderType)) {
        setError('Invalid order type');
        setLoading(false);
        return;
      }

      // TODO: In Blok B/C, fetch the order details to get the amount
      // For now, this page expects the amount to be passed via state or fetched
      const amountCents = 1500; // Placeholder — will be replaced when Blok B integrates

      const returnUrl = `${window.location.origin}/payment/result`;

      const result = await paymentApi.createPaymentSession({
        amountCents,
        currency: 'EUR',
        orderType: orderType as 'ticket' | 'reservation' | 'booking',
        orderId: parseInt(orderId),
        returnUrl,
      });

      if (result.success && result.data) {
        setSessionData(result.data);
      } else {
        setError(result.error || 'Failed to create payment session');
      }

      setLoading(false);
    }

    initSession();
  }, [orderType, orderId]);

  const handlePaymentComplete = (resultCode: string) => {
    if (sessionData) {
      navigate(`/payment/result/${sessionData.transactionUuid}?status=${resultCode}`);
    }
  };

  if (loading) {
    return (
      <div className="max-w-lg mx-auto py-16 px-4 text-center">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mx-auto mb-4" />
          <div className="h-64 bg-gray-100 rounded" />
        </div>
        <p className="mt-4 text-gray-500">Preparing checkout...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-lg mx-auto py-16 px-4 text-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-red-800 mb-2">Payment Error</h2>
          <p className="text-red-600">{error}</p>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!sessionData) return null;

  return (
    <div className="max-w-lg mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Checkout</h1>

      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Total</span>
          <span className="text-xl font-bold">
            {(sessionData.amount.value / 100).toFixed(2)} {sessionData.amount.currency}
          </span>
        </div>
      </div>

      <AdyenCheckoutComponent
        sessionData={sessionData}
        onPaymentComplete={(result) => handlePaymentComplete(result.resultCode)}
        onPaymentError={(error) => setError(error.message || 'Payment failed')}
      />
    </div>
  );
}

export default PaymentPage;
