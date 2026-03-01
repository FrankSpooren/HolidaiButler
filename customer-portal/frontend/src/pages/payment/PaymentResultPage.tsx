/**
 * PaymentResultPage (Fase III — Blok A)
 *
 * Shows payment result after Adyen redirect (3DS, iDEAL bank).
 * Route: /payment/result/:transactionUuid
 *
 * Also handles /payment/result?status=Authorised (direct redirect from Drop-in)
 */

import { useEffect, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router';
import { usePageMeta } from '../../shared/hooks/usePageMeta';
import { paymentApi } from '../../shared/services/payment.api';

type PaymentStatus = 'loading' | 'success' | 'pending' | 'failed';

export function PaymentResultPage() {
  const { transactionUuid } = useParams<{ transactionUuid: string }>();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<PaymentStatus>('loading');
  const [transaction, setTransaction] = useState<any>(null);

  const statusFromUrl = searchParams.get('status');

  usePageMeta({
    title: status === 'success' ? 'Payment Successful' : status === 'failed' ? 'Payment Failed' : 'Payment Result',
    path: `/payment/result/${transactionUuid || ''}`,
  });

  useEffect(() => {
    async function checkStatus() {
      // If we have a direct status from the Drop-in
      if (statusFromUrl) {
        const successCodes = ['Authorised', 'Received', 'Pending'];
        if (successCodes.includes(statusFromUrl)) {
          setStatus(statusFromUrl === 'Pending' || statusFromUrl === 'Received' ? 'pending' : 'success');
        } else {
          setStatus('failed');
        }
      }

      // If we have a transaction UUID, poll the backend for status
      if (transactionUuid) {
        const result = await paymentApi.getTransactionStatus(transactionUuid);
        if (result.success && result.data) {
          setTransaction(result.data);
          const dbStatus = result.data.status;
          if (['captured', 'authorized'].includes(dbStatus)) {
            setStatus('success');
          } else if (dbStatus === 'pending') {
            setStatus('pending');
          } else {
            setStatus('failed');
          }
        }
      }

      if (!statusFromUrl && !transactionUuid) {
        setStatus('failed');
      }
    }

    checkStatus();
  }, [transactionUuid, statusFromUrl]);

  return (
    <div className="max-w-lg mx-auto py-16 px-4 text-center">
      {status === 'loading' && (
        <div className="animate-pulse">
          <div className="h-16 w-16 bg-gray-200 rounded-full mx-auto mb-4" />
          <div className="h-6 bg-gray-200 rounded w-48 mx-auto" />
          <p className="mt-4 text-gray-500">Checking payment status...</p>
        </div>
      )}

      {status === 'success' && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-8">
          <div className="text-5xl mb-4">&#10003;</div>
          <h1 className="text-2xl font-bold text-green-800 mb-2">Payment Successful!</h1>
          <p className="text-green-600 mb-6">
            Your payment has been processed. You will receive a confirmation email shortly.
          </p>
          {transaction && (
            <div className="text-sm text-gray-600 mb-4">
              <p>Amount: {(transaction.amount_cents / 100).toFixed(2)} {transaction.currency}</p>
              <p>Reference: {transaction.transaction_uuid?.substring(0, 8)}...</p>
            </div>
          )}
          <Link
            to="/"
            className="inline-block px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Back to Home
          </Link>
        </div>
      )}

      {status === 'pending' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8">
          <div className="text-5xl mb-4">&#9203;</div>
          <h1 className="text-2xl font-bold text-yellow-800 mb-2">Payment Pending</h1>
          <p className="text-yellow-600 mb-6">
            Your payment is being processed. This may take a few moments.
            You will receive a confirmation email once the payment is complete.
          </p>
          <Link
            to="/"
            className="inline-block px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
          >
            Back to Home
          </Link>
        </div>
      )}

      {status === 'failed' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-8">
          <div className="text-5xl mb-4">&#10007;</div>
          <h1 className="text-2xl font-bold text-red-800 mb-2">Payment Failed</h1>
          <p className="text-red-600 mb-6">
            Unfortunately your payment could not be processed.
            Please try again or choose a different payment method.
          </p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => window.history.back()}
              className="px-6 py-3 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors"
            >
              Try Again
            </button>
            <Link
              to="/"
              className="inline-block px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Back to Home
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default PaymentResultPage;
