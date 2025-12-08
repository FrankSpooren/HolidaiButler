import { useState } from 'react';
import { CreditCard, Lock, Loader2 } from 'lucide-react';

export interface PaymentConfig {
  amount: number;
  currency: string;
  bookingId: number;
  bookingReference: string;
}

interface PaymentButtonProps {
  config: PaymentConfig;
  onPaymentComplete: (paymentResult: PaymentResult) => void;
  onPaymentError: (error: PaymentError) => void;
  disabled?: boolean;
}

export interface PaymentResult {
  success: boolean;
  transactionId: string;
  bookingId: number;
  amount: number;
  currency: string;
  timestamp: string;
}

export interface PaymentError {
  code: string;
  message: string;
  details?: string;
}

/**
 * PaymentButton Component
 *
 * This component integrates with Adyen payment gateway for secure payment processing.
 * It handles the payment initialization, redirect, and callback flow.
 *
 * @see https://docs.adyen.com/online-payments/web-drop-in
 */
export default function PaymentButton({
  config,
  onPaymentComplete,
  onPaymentError,
  disabled = false,
}: PaymentButtonProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');

  /**
   * Initialize Adyen payment session
   * This will be replaced with actual Adyen Drop-in integration
   */
  const initializePayment = async () => {
    setIsProcessing(true);
    setPaymentStatus('processing');

    try {
      // TODO: Replace with actual Adyen payment session initialization
      // Step 1: Request payment session from backend
      const paymentSessionResponse = await fetch(
        `${import.meta.env.VITE_TICKETING_API_URL}/payments/session`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
          },
          body: JSON.stringify({
            bookingId: config.bookingId,
            amount: {
              value: Math.round(config.amount * 100), // Adyen expects amount in cents
              currency: config.currency,
            },
            reference: config.bookingReference,
            returnUrl: `${window.location.origin}/booking/confirmation`,
          }),
        }
      );

      if (!paymentSessionResponse.ok) {
        throw new Error('Failed to initialize payment session');
      }

      const paymentSession = await paymentSessionResponse.json();

      // Step 2: Mount Adyen Drop-in component
      // This is a placeholder for actual Adyen Drop-in implementation
      // @see https://docs.adyen.com/online-payments/web-drop-in/drop-in-integration-guide

      /*
      Example Adyen Drop-in integration (to be implemented):

      const AdyenCheckout = await import('@adyen/adyen-web');
      const checkout = await AdyenCheckout.default({
        environment: import.meta.env.VITE_ADYEN_ENVIRONMENT, // 'test' or 'live'
        clientKey: import.meta.env.VITE_ADYEN_CLIENT_KEY,
        session: paymentSession,
        onPaymentCompleted: (result, component) => {
          handlePaymentResult(result);
        },
        onError: (error, component) => {
          handlePaymentError(error);
        },
      });

      checkout.create('dropin').mount('#payment-container');
      */

      // For now, simulate payment redirect (testing mode)
      console.log('Payment session initialized:', paymentSession);

      // Simulate payment processing (remove this in production)
      await simulatePaymentFlow();
    } catch (error) {
      console.error('Payment initialization error:', error);
      handlePaymentError({
        code: 'INIT_ERROR',
        message: 'Failed to initialize payment',
        details: error instanceof Error ? error.message : String(error),
      });
    }
  };

  /**
   * Handle payment result callback from Adyen
   */
  const handlePaymentResult = (result: any) => {
    setIsProcessing(false);

    if (result.resultCode === 'Authorised') {
      setPaymentStatus('success');

      const paymentResult: PaymentResult = {
        success: true,
        transactionId: result.pspReference || 'txn_' + Date.now(),
        bookingId: config.bookingId,
        amount: config.amount,
        currency: config.currency,
        timestamp: new Date().toISOString(),
      };

      onPaymentComplete(paymentResult);
    } else {
      setPaymentStatus('error');
      handlePaymentError({
        code: result.resultCode || 'PAYMENT_FAILED',
        message: 'Payment was not authorized',
        details: result.refusalReason,
      });
    }
  };

  /**
   * Handle payment errors
   */
  const handlePaymentError = (error: PaymentError) => {
    setIsProcessing(false);
    setPaymentStatus('error');
    onPaymentError(error);
  };

  /**
   * TEMPORARY: Simulate payment flow for development/testing
   * Remove this function when integrating real Adyen payment
   */
  const simulatePaymentFlow = async () => {
    // Simulate payment processing delay
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Simulate successful payment (90% success rate for testing)
    const isSuccess = Math.random() > 0.1;

    if (isSuccess) {
      handlePaymentResult({
        resultCode: 'Authorised',
        pspReference: 'TEST_' + Math.random().toString(36).substring(7).toUpperCase(),
      });
    } else {
      handlePaymentError({
        code: 'REFUSED',
        message: 'Payment refused by issuer',
        details: 'Insufficient funds (simulated error)',
      });
    }
  };

  const formatCurrency = (amount: number, currency: string): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  return (
    <div className="max-w-md mx-auto">
      {/* Payment Container - Adyen Drop-in will be mounted here */}
      <div id="payment-container" className="mb-6">
        {/* Adyen Drop-in component will replace this */}
      </div>

      {/* Payment Button */}
      <button
        onClick={initializePayment}
        disabled={disabled || isProcessing}
        className={`w-full flex items-center justify-center px-6 py-4 rounded-lg font-semibold text-white transition-all ${
          paymentStatus === 'success'
            ? 'bg-green-600 hover:bg-green-700'
            : paymentStatus === 'error'
            ? 'bg-red-600 hover:bg-red-700'
            : 'bg-blue-600 hover:bg-blue-700'
        } disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 ${
          paymentStatus === 'success'
            ? 'focus:ring-green-500'
            : paymentStatus === 'error'
            ? 'focus:ring-red-500'
            : 'focus:ring-blue-500'
        }`}
      >
        {isProcessing ? (
          <>
            <Loader2 className="animate-spin h-5 w-5 mr-2" />
            Processing Payment...
          </>
        ) : paymentStatus === 'success' ? (
          <>Payment Successful</>
        ) : paymentStatus === 'error' ? (
          <>Payment Failed - Try Again</>
        ) : (
          <>
            <CreditCard className="h-5 w-5 mr-2" />
            Pay {formatCurrency(config.amount, config.currency)}
          </>
        )}
      </button>

      {/* Security Notice */}
      <div className="mt-4 flex items-center justify-center text-xs text-gray-500">
        <Lock className="h-3 w-3 mr-1" />
        <span>Secure payment powered by Adyen</span>
      </div>

      {/* Development Mode Notice */}
      {import.meta.env.DEV && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-xs text-yellow-800">
            <strong>Development Mode:</strong> Payment simulation is active. Real Adyen integration
            required for production.
          </p>
        </div>
      )}

      {/* Payment Method Logos */}
      <div className="mt-6 flex items-center justify-center space-x-4 opacity-60">
        <span className="text-xs text-gray-500">We accept:</span>
        <div className="flex space-x-2">
          <div className="w-8 h-5 bg-gray-200 rounded flex items-center justify-center text-xs font-bold text-gray-600">
            VISA
          </div>
          <div className="w-8 h-5 bg-gray-200 rounded flex items-center justify-center text-xs font-bold text-gray-600">
            MC
          </div>
          <div className="w-8 h-5 bg-gray-200 rounded flex items-center justify-center text-xs font-bold text-gray-600">
            AMEX
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Integration Guide for Adyen Drop-in:
 *
 * 1. Install Adyen Web SDK:
 *    npm install @adyen/adyen-web
 *
 * 2. Add Adyen CSS to your main CSS file or import in component:
 *    import '@adyen/adyen-web/dist/adyen.css';
 *
 * 3. Set environment variables in .env:
 *    VITE_ADYEN_ENVIRONMENT=test
 *    VITE_ADYEN_CLIENT_KEY=your_client_key
 *    VITE_ADYEN_MERCHANT_ACCOUNT=your_merchant_account
 *
 * 4. Backend Requirements:
 *    - POST /api/v1/ticketing/payments/session - Create payment session
 *    - POST /api/v1/ticketing/payments/webhook - Handle payment webhooks
 *    - GET  /api/v1/ticketing/payments/:id - Check payment status
 *
 * 5. Update initializePayment() function to use actual Adyen Drop-in
 *
 * 6. Configure webhooks in Adyen Customer Area:
 *    Webhook URL: https://your-domain.com/api/v1/ticketing/payments/webhook
 *
 * @see https://docs.adyen.com/online-payments/web-drop-in
 * @see https://docs.adyen.com/online-payments/build-your-integration
 */
