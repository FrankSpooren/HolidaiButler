import { useState } from 'react';
import {
  X,
  Calendar,
  MapPin,
  Clock,
  User,
  Mail,
  Download,
  Share2,
  RotateCw,
  Maximize,
  AlertCircle,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import type { TicketData } from './TicketCard';

interface TicketDetailProps {
  ticket: TicketData;
  onClose?: () => void;
  onDownload?: (ticketId: number) => void;
  onResend?: (ticketId: number) => Promise<void>;
  onShare?: (ticketId: number) => void;
  renderWalletButtons?: (ticketId: number) => React.ReactNode;
}

export default function TicketDetail({
  ticket,
  onClose,
  onDownload,
  onResend,
  onShare,
  renderWalletButtons,
}: TicketDetailProps) {
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);
  const [qrFullscreen, setQrFullscreen] = useState(false);

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusDetails = (status: string) => {
    const details = {
      active: {
        color: 'bg-green-100 text-green-800 border-green-300',
        icon: <CheckCircle className="h-6 w-6 text-green-600" />,
        message: 'This ticket is ready to use',
      },
      used: {
        color: 'bg-gray-100 text-gray-800 border-gray-300',
        icon: <CheckCircle className="h-6 w-6 text-gray-600" />,
        message: 'This ticket has been used',
      },
      expired: {
        color: 'bg-red-100 text-red-800 border-red-300',
        icon: <XCircle className="h-6 w-6 text-red-600" />,
        message: 'This ticket has expired',
      },
      cancelled: {
        color: 'bg-orange-100 text-orange-800 border-orange-300',
        icon: <XCircle className="h-6 w-6 text-orange-600" />,
        message: 'This ticket has been cancelled',
      },
    };
    return details[status as keyof typeof details] || details.active;
  };

  const handleResend = async () => {
    if (!onResend) return;

    setIsResending(true);
    setResendSuccess(false);
    setResendError(null);

    try {
      await onResend(ticket.id);
      setResendSuccess(true);
      setTimeout(() => setResendSuccess(false), 5000);
    } catch (error) {
      setResendError(error instanceof Error ? error.message : 'Failed to resend ticket');
      setTimeout(() => setResendError(null), 5000);
    } finally {
      setIsResending(false);
    }
  };

  const statusDetails = getStatusDetails(ticket.status);

  return (
    <>
      {/* Main Detail View */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto">
        <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full my-8">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <h2 className="text-2xl font-bold text-gray-900">Ticket Details</h2>
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="h-6 w-6 text-gray-600" />
              </button>
            )}
          </div>

          {/* Status Banner */}
          <div className={`px-6 py-4 border-b ${statusDetails.color}`}>
            <div className="flex items-center">
              {statusDetails.icon}
              <div className="ml-3">
                <p className="font-semibold text-sm uppercase">{ticket.status}</p>
                <p className="text-sm">{statusDetails.message}</p>
              </div>
            </div>
          </div>

          {/* QR Code Display */}
          <div className="p-6 bg-gray-50 border-b">
            <div className="bg-white rounded-lg shadow-md p-6">
              {ticket.qrCodeImageUrl ? (
                <div className="relative">
                  <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                    <img
                      src={ticket.qrCodeImageUrl}
                      alt={`QR Code for ${ticket.ticketNumber}`}
                      className="w-full h-full object-contain p-4"
                    />
                  </div>
                  <button
                    onClick={() => setQrFullscreen(true)}
                    className="absolute top-2 right-2 p-2 bg-white rounded-full shadow-md hover:bg-gray-100 transition-colors"
                    title="View fullscreen"
                  >
                    <Maximize className="h-5 w-5 text-gray-600" />
                  </button>
                </div>
              ) : (
                <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
                  <div className="text-center text-gray-400">
                    <AlertCircle className="h-16 w-16 mx-auto mb-2" />
                    <p className="text-sm">QR Code Not Available</p>
                  </div>
                </div>
              )}
              <p className="text-center text-xs text-gray-500 mt-4 font-mono">
                {ticket.ticketNumber}
              </p>
              {ticket.status === 'active' && (
                <p className="text-center text-xs text-gray-600 mt-2">
                  Show this QR code at the entrance for validation
                </p>
              )}
            </div>
          </div>

          {/* Ticket Information */}
          <div className="p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
              Visit Information
            </h3>

            {/* POI Details */}
            <div className="flex items-start">
              <MapPin className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <p className="font-semibold text-gray-900">{ticket.poi.name}</p>
                <p className="text-sm text-gray-600">{ticket.poi.location}</p>
              </div>
            </div>

            {/* Visit Date */}
            <div className="flex items-start">
              <Calendar className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-700">Visit Date</p>
                <p className="text-sm text-gray-900">{formatDate(ticket.validFrom)}</p>
                {ticket.validFrom !== ticket.validUntil && (
                  <p className="text-xs text-gray-500">
                    Valid until {formatDate(ticket.validUntil)}
                  </p>
                )}
              </div>
            </div>

            {/* Timeslot */}
            {ticket.booking?.timeslot && (
              <div className="flex items-start">
                <Clock className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-700">Time Slot</p>
                  <p className="text-sm text-gray-900">{ticket.booking.timeslot}</p>
                </div>
              </div>
            )}

            {/* Holder Information */}
            <div className="pt-4 border-t space-y-3">
              <h3 className="text-lg font-semibold text-gray-900">Guest Information</h3>

              <div className="flex items-start">
                <User className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-700">Ticket Holder</p>
                  <p className="text-sm text-gray-900">{ticket.holderName}</p>
                </div>
              </div>

              <div className="flex items-start">
                <Mail className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-700">Email</p>
                  <p className="text-sm text-gray-900">{ticket.holderEmail}</p>
                </div>
              </div>
            </div>

            {/* Usage Information */}
            {ticket.usedAt && (
              <div className="pt-4 border-t">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Usage Information</h3>
                <p className="text-sm text-gray-600">
                  This ticket was used on <strong>{formatDate(ticket.usedAt)}</strong> at{' '}
                  <strong>{formatTime(ticket.usedAt)}</strong>
                </p>
              </div>
            )}

            {/* Booking Reference */}
            {ticket.booking?.bookingReference && (
              <div className="pt-4 border-t">
                <p className="text-xs text-gray-500">
                  Booking Reference: <span className="font-mono">{ticket.booking.bookingReference}</span>
                </p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="p-6 bg-gray-50 border-t space-y-3">
            {/* Wallet Buttons */}
            {renderWalletButtons && ticket.status === 'active' && (
              <div className="mb-3">{renderWalletButtons(ticket.id)}</div>
            )}

            {/* Action Buttons Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Download Button */}
              {onDownload && (
                <button
                  onClick={() => onDownload(ticket.id)}
                  className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </button>
              )}

              {/* Resend Button */}
              {onResend && (
                <button
                  onClick={handleResend}
                  disabled={isResending}
                  className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RotateCw className={`h-4 w-4 mr-2 ${isResending ? 'animate-spin' : ''}`} />
                  {isResending ? 'Sending...' : 'Resend Email'}
                </button>
              )}

              {/* Share Button */}
              {onShare && (
                <button
                  onClick={() => onShare(ticket.id)}
                  className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </button>
              )}
            </div>

            {/* Resend Feedback */}
            {resendSuccess && (
              <div className="bg-green-50 border border-green-200 rounded-md p-3 flex items-center">
                <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                <p className="text-sm text-green-800">Ticket sent to {ticket.holderEmail}</p>
              </div>
            )}
            {resendError && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3 flex items-center">
                <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                <p className="text-sm text-red-800">{resendError}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Fullscreen QR Code Modal */}
      {qrFullscreen && ticket.qrCodeImageUrl && (
        <div
          className="fixed inset-0 bg-black z-[60] flex items-center justify-center p-4"
          onClick={() => setQrFullscreen(false)}
        >
          <div className="relative max-w-2xl w-full">
            <button
              onClick={() => setQrFullscreen(false)}
              className="absolute top-4 right-4 p-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full transition-colors"
            >
              <X className="h-8 w-8 text-white" />
            </button>
            <div className="bg-white rounded-lg p-8">
              <img
                src={ticket.qrCodeImageUrl}
                alt={`QR Code for ${ticket.ticketNumber}`}
                className="w-full h-full object-contain"
              />
              <p className="text-center text-sm text-gray-600 mt-4 font-mono">
                {ticket.ticketNumber}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
