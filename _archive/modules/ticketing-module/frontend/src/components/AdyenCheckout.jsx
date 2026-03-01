import { useEffect, useRef, useState } from 'react';
import AdyenCheckout from '@adyen/adyen-web';
import '@adyen/adyen-web/dist/adyen.css';
import { Box, CircularProgress, Alert } from '@mui/material';
import paymentService from '../services/paymentService';

function AdyenCheckoutComponent({ sessionData, onPaymentComplete, onPaymentError }) {
  const paymentContainer = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const checkoutInstance = useRef(null);

  useEffect(() => {
    if (!sessionData || !paymentContainer.current) {
      return;
    }

    const initializeCheckout = async () => {
      try {
        setLoading(true);
        setError(null);

        // Configuration for Adyen Web Drop-in
        const configuration = {
          environment: sessionData.environment || 'test', // 'test' or 'live'
          clientKey: sessionData.clientKey,
          session: {
            id: sessionData.id,
            sessionData: sessionData.sessionData,
          },
          analytics: {
            enabled: true,
          },
          onPaymentCompleted: (result, component) => {
            console.log('Payment completed:', result);
            handlePaymentResult(result);
          },
          onError: (error, component) => {
            console.error('Payment error:', error);
            setError(error.message || 'Payment failed');
            if (onPaymentError) {
              onPaymentError(error);
            }
          },
          paymentMethodsConfiguration: {
            card: {
              hasHolderName: true,
              holderNameRequired: true,
              billingAddressRequired: false,
            },
            ideal: {
              showImage: true,
            },
            paypal: {
              environment: sessionData.environment || 'test',
              countryCode: 'NL',
            },
          },
          locale: 'nl-NL',
        };

        // Create Adyen Checkout instance
        const checkout = await AdyenCheckout(configuration);
        checkoutInstance.current = checkout;

        // Mount Drop-in component
        const dropin = checkout.create('dropin').mount(paymentContainer.current);

        setLoading(false);
      } catch (err) {
        console.error('Error initializing Adyen Checkout:', err);
        setError(err.message || 'Failed to initialize payment');
        setLoading(false);
      }
    };

    initializeCheckout();

    // Cleanup
    return () => {
      if (checkoutInstance.current) {
        try {
          checkoutInstance.current = null;
        } catch (err) {
          console.error('Error cleaning up checkout:', err);
        }
      }
    };
  }, [sessionData]);

  const handlePaymentResult = async (result) => {
    try {
      console.log('Processing payment result:', result);

      // Check result code
      if (result.resultCode === 'Authorised' || result.resultCode === 'Received') {
        if (onPaymentComplete) {
          onPaymentComplete(result);
        }
      } else if (result.resultCode === 'Pending' || result.resultCode === 'PresentToShopper') {
        // Handle pending payments (e.g., bank transfers)
        if (onPaymentComplete) {
          onPaymentComplete(result);
        }
      } else {
        // Payment failed or cancelled
        const errorMessage = result.refusalReason || 'Payment was not successful';
        setError(errorMessage);
        if (onPaymentError) {
          onPaymentError(new Error(errorMessage));
        }
      }
    } catch (err) {
      console.error('Error processing payment result:', err);
      setError(err.message || 'Failed to process payment');
      if (onPaymentError) {
        onPaymentError(err);
      }
    }
  };

  return (
    <Box sx={{ position: 'relative', minHeight: 400 }}>
      {loading && (
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          sx={{ minHeight: 400 }}
        >
          <CircularProgress />
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <div ref={paymentContainer} style={{ display: loading ? 'none' : 'block' }} />
    </Box>
  );
}

export default AdyenCheckoutComponent;
