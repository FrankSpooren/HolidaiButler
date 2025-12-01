import { useState } from 'react';
import { Wallet, Smartphone, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { useAddToWallet } from '../../hooks/useTickets';

export type WalletType = 'apple' | 'google';

interface WalletButtonsProps {
  ticketId: number;
  layout?: 'horizontal' | 'vertical';
  size?: 'small' | 'medium' | 'large';
  showLabels?: boolean;
}

export default function WalletButtons({
  ticketId,
  layout = 'horizontal',
  size = 'medium',
  showLabels = true,
}: WalletButtonsProps) {
  const [activeWallet, setActiveWallet] = useState<WalletType | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { mutate: addToWallet, isLoading } = useAddToWallet();

  // Detect user's platform
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);

  const handleAddToWallet = (walletType: WalletType) => {
    setActiveWallet(walletType);
    setSuccessMessage(null);
    setErrorMessage(null);

    addToWallet(
      { ticketId, walletType },
      {
        onSuccess: (response) => {
          const walletPassUrl = response.data?.walletPassUrl;

          if (walletPassUrl) {
            // Open wallet pass URL
            window.open(walletPassUrl, '_blank');
            setSuccessMessage(
              `Opening ${walletType === 'apple' ? 'Apple Wallet' : 'Google Pay'}...`
            );

            setTimeout(() => {
              setSuccessMessage(null);
              setActiveWallet(null);
            }, 3000);
          } else {
            setErrorMessage('Wallet pass URL not available');
            setActiveWallet(null);
          }
        },
        onError: (error) => {
          console.error('Error adding to wallet:', error);
          setErrorMessage(
            error instanceof Error
              ? error.message
              : `Failed to add to ${walletType === 'apple' ? 'Apple Wallet' : 'Google Pay'}`
          );
          setTimeout(() => {
            setErrorMessage(null);
            setActiveWallet(null);
          }, 5000);
        },
      }
    );
  };

  const getSizeClasses = () => {
    const sizes = {
      small: 'px-3 py-1.5 text-sm',
      medium: 'px-4 py-2 text-base',
      large: 'px-6 py-3 text-lg',
    };
    return sizes[size];
  };

  const containerClasses =
    layout === 'horizontal'
      ? 'flex flex-row gap-3'
      : 'flex flex-col gap-3';

  return (
    <div className="space-y-3">
      {/* Wallet Buttons Container */}
      <div className={containerClasses}>
        {/* Apple Wallet Button */}
        <button
          onClick={() => handleAddToWallet('apple')}
          disabled={isLoading || !isIOS}
          className={`flex-1 flex items-center justify-center gap-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${getSizeClasses()} ${
            activeWallet === 'apple' && isLoading ? 'animate-pulse' : ''
          }`}
          title={!isIOS ? 'Apple Wallet is only available on iOS devices' : undefined}
        >
          {activeWallet === 'apple' && isLoading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              {showLabels && <span>Adding...</span>}
            </>
          ) : (
            <>
              {/* Apple Wallet Icon */}
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="currentColor"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
              </svg>
              {showLabels && <span>Add to Apple Wallet</span>}
            </>
          )}
        </button>

        {/* Google Pay Button */}
        <button
          onClick={() => handleAddToWallet('google')}
          disabled={isLoading || !isAndroid}
          className={`flex-1 flex items-center justify-center gap-2 bg-white text-gray-900 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${getSizeClasses()} ${
            activeWallet === 'google' && isLoading ? 'animate-pulse' : ''
          }`}
          title={!isAndroid ? 'Google Pay is only available on Android devices' : undefined}
        >
          {activeWallet === 'google' && isLoading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
              {showLabels && <span>Adding...</span>}
            </>
          ) : (
            <>
              {/* Google Pay Icon */}
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="currentColor"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fill="#5F6368"
                  d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                />
              </svg>
              {showLabels && <span>Add to Google Pay</span>}
            </>
          )}
        </button>
      </div>

      {/* Universal Wallet Button (for desktop/unsupported devices) */}
      {!isIOS && !isAndroid && (
        <button
          onClick={() => handleAddToWallet('apple')} // Default to Apple format
          disabled={isLoading}
          className={`w-full flex items-center justify-center gap-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${getSizeClasses()}`}
        >
          <Wallet className="h-5 w-5" />
          {showLabels && <span>Add to Mobile Wallet</span>}
        </button>
      )}

      {/* Platform Hints */}
      {!isIOS && !isAndroid && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3 flex items-start">
          <Smartphone className="h-5 w-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
          <p className="text-xs text-blue-800">
            For best experience, open this page on your mobile device to add to Apple Wallet or
            Google Pay
          </p>
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-md p-3 flex items-center animate-fade-in">
          <CheckCircle className="h-5 w-5 text-green-600 mr-2 flex-shrink-0" />
          <p className="text-sm text-green-800">{successMessage}</p>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3 flex items-center animate-fade-in">
          <AlertCircle className="h-5 w-5 text-red-600 mr-2 flex-shrink-0" />
          <p className="text-sm text-red-800">{errorMessage}</p>
        </div>
      )}

      {/* Information Footer */}
      {showLabels && (
        <div className="text-xs text-gray-500 text-center">
          <p>
            Your ticket will be added to your mobile wallet for easy access at the venue entrance
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Wallet Integration Notes:
 *
 * Apple Wallet (.pkpass):
 * - Requires server-side generation of .pkpass files
 * - Backend endpoint: POST /api/v1/ticketing/{ticketId}/wallet
 * - Response should include signed .pkpass file URL
 * - File served with Content-Type: application/vnd.apple.pkpass
 *
 * Google Pay (JWT):
 * - Requires Google Pay API configuration
 * - Backend endpoint: Same as above, but returns JWT token
 * - Opens Google Pay save URL with JWT parameter
 *
 * Server Implementation Required:
 * 1. Apple Wallet: Implement PassKit library for .pkpass generation
 * 2. Google Pay: Implement Google Wallet API for JWT generation
 * 3. Both: Store pass/wallet IDs for future updates
 *
 * @see https://developer.apple.com/documentation/passkit
 * @see https://developers.google.com/wallet
 */
