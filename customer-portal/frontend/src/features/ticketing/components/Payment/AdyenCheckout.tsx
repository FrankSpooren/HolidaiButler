/**
 * AdyenCheckout Component
 *
 * Enterprise-level payment integration using Adyen Web Drop-in
 * Supports multiple payment methods: iDEAL, Cards, PayPal, etc.
 *
 * @see https://docs.adyen.com/online-payments/web-drop-in
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { AdyenCheckout } from '@adyen/adyen-web';
import type { CoreConfiguration } from '@adyen/adyen-web';
import '@adyen/adyen-web/styles/adyen.css';
import { AlertCircle, Loader2, Lock, CheckCircle } from 'lucide-react';

export interface AdyenSessionData {
  id: string;
  sessionData: string;
  clientKey: string;
  environment: 'test' | 'live';
  amount: {
    value: number;
    currency: string;
  };
  merchantAccount?: string;
}

export interface PaymentResult {
  resultCode: string;
  pspReference?: string;
  refusalReason?: string;
  merchantReference?: string;
}

interface AdyenCheckoutProps {
  sessionData: AdyenSessionData;
  onPaymentComplete: (result: PaymentResult) => void;
  onPaymentError: (error: Error) => void;
  locale?: string;
  countryCode?: string;
}

/**
 * AdyenCheckout - Real Adyen Web Drop-in Integration
 *
 * This component initializes the Adyen Drop-in payment UI with all
 * supported payment methods (iDEAL, Credit Cards, PayPal, etc.)
 */
export const AdyenCheckoutComponent: React.FC<AdyenCheckoutProps> = ({
  sessionData,
  onPaymentComplete,
  onPaymentError,
  locale = 'nl-NL',
  countryCode = 'NL',
}) => {
  const paymentContainerRef = useRef<HTMLDivElement>(null);
  const checkoutInstanceRef = useRef<InstanceType<typeof AdyenCheckout> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');

  const handlePaymentCompleted = useCallback((result: PaymentResult) => {
    console.log('Adyen Payment completed:', result);

    if (result.resultCode === 'Authorised' || result.resultCode === 'Received') {
      setPaymentStatus('success');
      onPaymentComplete(result);
    } else if (result.resultCode === 'Pending' || result.resultCode === 'PresentToShopper') {
      // Handle pending payments (bank transfers, etc.)
      setPaymentStatus('processing');
      onPaymentComplete(result);
    } else {
      // Payment refused or cancelled
      setPaymentStatus('error');
      const errorMessage = result.refusalReason || 'Payment was not successful';
      setError(errorMessage);
      onPaymentError(new Error(errorMessage));
    }
  }, [onPaymentComplete, onPaymentError]);

  const handlePaymentError = useCallback((err: Error) => {
    console.error('Adyen Payment error:', err);
    setPaymentStatus('error');
    setError(err.message || 'Payment failed');
    onPaymentError(err);
  }, [onPaymentError]);

  useEffect(() => {
    if (!sessionData || !paymentContainerRef.current) {
      return;
    }

    const initializeAdyenCheckout = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Adyen Web Drop-in Configuration
        const configuration = {
          environment: sessionData.environment,
          clientKey: sessionData.clientKey,
          session: {
            id: sessionData.id,
            sessionData: sessionData.sessionData,
          },
          analytics: {
            enabled: true,
          },
          // Payment lifecycle callbacks
          onPaymentCompleted: (result: PaymentResult) => {
            handlePaymentCompleted(result);
          },
          onError: (error: Error) => {
            handlePaymentError(error);
          },
          // Payment method configuration
          paymentMethodsConfiguration: {
            card: {
              hasHolderName: true,
              holderNameRequired: true,
              billingAddressRequired: false,
              showBrandIcon: true,
              styles: {
                base: {
                  fontSize: '14px',
                  fontFamily: 'Inter, sans-serif',
                },
              },
            },
            ideal: {
              showImage: true,
            },
            paypal: {
              environment: sessionData.environment,
              countryCode: countryCode,
              intent: 'capture',
            },
            applepay: {
              buttonType: 'plain',
              buttonColor: 'black',
            },
            googlepay: {
              environment: sessionData.environment === 'live' ? 'PRODUCTION' : 'TEST',
              buttonType: 'plain',
              buttonColor: 'default',
            },
          },
          locale: locale,
          showPayButton: true,
          // Amount for display
          amount: sessionData.amount,
        };

        // Create Adyen Checkout instance
        const checkout = await AdyenCheckout(configuration);
        checkoutInstanceRef.current = checkout;

        // Mount Drop-in component
        if (paymentContainerRef.current) {
          checkout.create('dropin').mount(paymentContainerRef.current);
        }

        setIsLoading(false);
      } catch (err) {
        console.error('Error initializing Adyen Checkout:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize payment');
        setIsLoading(false);
      }
    };

    initializeAdyenCheckout();

    // Cleanup on unmount
    return () => {
      if (checkoutInstanceRef.current) {
        try {
          checkoutInstanceRef.current = null;
        } catch (err) {
          console.error('Error cleaning up Adyen checkout:', err);
        }
      }
    };
  }, [sessionData, locale, countryCode, handlePaymentCompleted, handlePaymentError]);

  // Success state
  if (paymentStatus === 'success') {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-green-50 border border-green-200 rounded-lg">
        <CheckCircle className="w-16 h-16 text-green-600 mb-4" />
        <h3 className="text-xl font-semibold text-green-800 mb-2">Payment Successful</h3>
        <p className="text-green-700 text-center">
          Your payment has been processed successfully.
        </p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Loading State */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center p-8 min-h-[300px]">
          <Loader2 className="w-10 h-10 text-[#7FA594] animate-spin mb-4" />
          <p className="text-gray-600">Loading payment methods...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-red-800">Payment Error</h4>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Adyen Drop-in Container */}
      <div
        ref={paymentContainerRef}
        className={`adyen-checkout-container ${isLoading ? 'hidden' : 'block'}`}
      />

      {/* Security Notice */}
      <div className="mt-4 flex items-center justify-center text-xs text-gray-500">
        <Lock className="w-3 h-3 mr-1" />
        <span>Secure payment powered by Adyen</span>
      </div>

      {/* Supported Payment Methods */}
      <div className="mt-4 flex items-center justify-center gap-3 opacity-60">
        <span className="text-xs text-gray-500">We accept:</span>
        <div className="flex gap-2">
          <div className="w-10 h-6 bg-white border border-gray-200 rounded flex items-center justify-center">
            <span className="text-[10px] font-bold text-blue-600">iDEAL</span>
          </div>
          <div className="w-10 h-6 bg-white border border-gray-200 rounded flex items-center justify-center">
            <span className="text-[10px] font-bold text-gray-700">VISA</span>
          </div>
          <div className="w-10 h-6 bg-white border border-gray-200 rounded flex items-center justify-center">
            <span className="text-[10px] font-bold text-gray-700">MC</span>
          </div>
          <div className="w-10 h-6 bg-white border border-gray-200 rounded flex items-center justify-center">
            <span className="text-[10px] font-bold text-blue-800">PayPal</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdyenCheckoutComponent;
