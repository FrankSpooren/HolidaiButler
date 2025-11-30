import { CheckCircle, Calendar, MapPin, Mail, Download, Wallet, Home, Ticket } from 'lucide-react';
import { Link } from 'react-router-dom';

export interface ConfirmationData {
  bookingReference: string;
  bookingId: number;
  poi: {
    name: string;
    location: string;
  };
  date: string;
  quantity: number;
  guestEmail: string;
  totalAmount: number;
  currency: string;
  tickets: Array<{
    id: number;
    ticketNumber: string;
    qrCodeImageUrl: string;
  }>;
  paymentTransactionId?: string;
}

interface BookingConfirmationProps {
  confirmation: ConfirmationData;
  onViewTickets?: () => void;
  onDownloadTickets?: () => void;
  onAddToWallet?: () => void;
}

export default function BookingConfirmation({
  confirmation,
  onViewTickets,
  onDownloadTickets,
  onAddToWallet,
}: BookingConfirmationProps) {
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: number, currency: string): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      {/* Success Message */}
      <div className="bg-green-50 border-2 border-green-500 rounded-lg p-8 mb-6 text-center">
        <div className="flex justify-center mb-4">
          <CheckCircle className="h-16 w-16 text-green-600" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Booking Confirmed!</h1>
        <p className="text-lg text-gray-600 mb-4">
          Your tickets have been successfully booked and sent to your email.
        </p>
        <div className="bg-white rounded-md p-4 inline-block">
          <p className="text-sm text-gray-600 mb-1">Booking Reference</p>
          <p className="text-2xl font-mono font-bold text-blue-600">
            {confirmation.bookingReference}
          </p>
        </div>
      </div>

      {/* Booking Details Card */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Booking Details</h2>

        <div className="space-y-4">
          {/* POI Information */}
          <div className="flex items-start pb-4 border-b">
            <MapPin className="h-5 w-5 text-blue-600 mt-1 mr-3 flex-shrink-0" />
            <div>
              <p className="font-semibold text-gray-900">{confirmation.poi.name}</p>
              <p className="text-sm text-gray-600">{confirmation.poi.location}</p>
            </div>
          </div>

          {/* Visit Date */}
          <div className="flex items-start pb-4 border-b">
            <Calendar className="h-5 w-5 text-blue-600 mt-1 mr-3 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-gray-700">Visit Date</p>
              <p className="text-sm text-gray-900">{formatDate(confirmation.date)}</p>
            </div>
          </div>

          {/* Tickets */}
          <div className="flex items-start pb-4 border-b">
            <Ticket className="h-5 w-5 text-blue-600 mt-1 mr-3 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-gray-700">Number of Tickets</p>
              <p className="text-sm text-gray-900">
                {confirmation.quantity} {confirmation.quantity === 1 ? 'ticket' : 'tickets'}
              </p>
            </div>
          </div>

          {/* Email Confirmation */}
          <div className="flex items-start">
            <Mail className="h-5 w-5 text-blue-600 mt-1 mr-3 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-gray-700">Confirmation Sent To</p>
              <p className="text-sm text-gray-900">{confirmation.guestEmail}</p>
            </div>
          </div>
        </div>

        {/* Payment Summary */}
        <div className="mt-6 pt-6 border-t bg-gray-50 -mx-6 -mb-6 px-6 py-4 rounded-b-lg">
          <div className="flex justify-between items-center">
            <span className="text-gray-700 font-medium">Total Paid</span>
            <span className="text-xl font-bold text-gray-900">
              {formatCurrency(confirmation.totalAmount, confirmation.currency)}
            </span>
          </div>
          {confirmation.paymentTransactionId && (
            <p className="text-xs text-gray-500 mt-2">
              Transaction ID: {confirmation.paymentTransactionId}
            </p>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Tickets</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* View Tickets Button */}
          <button
            onClick={onViewTickets}
            className="flex flex-col items-center justify-center p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all group"
          >
            <Ticket className="h-8 w-8 text-gray-400 group-hover:text-blue-600 mb-2" />
            <span className="text-sm font-medium text-gray-700 group-hover:text-blue-600">
              View Tickets
            </span>
          </button>

          {/* Download Button */}
          {onDownloadTickets && (
            <button
              onClick={onDownloadTickets}
              className="flex flex-col items-center justify-center p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all group"
            >
              <Download className="h-8 w-8 text-gray-400 group-hover:text-blue-600 mb-2" />
              <span className="text-sm font-medium text-gray-700 group-hover:text-blue-600">
                Download PDF
              </span>
            </button>
          )}

          {/* Add to Wallet Button */}
          {onAddToWallet && (
            <button
              onClick={onAddToWallet}
              className="flex flex-col items-center justify-center p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all group"
            >
              <Wallet className="h-8 w-8 text-gray-400 group-hover:text-blue-600 mb-2" />
              <span className="text-sm font-medium text-gray-700 group-hover:text-blue-600">
                Add to Wallet
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Important Information */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">What's Next?</h3>
        <ul className="space-y-2 text-sm text-blue-800">
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>
              Check your email <strong>({confirmation.guestEmail})</strong> for your tickets with QR
              codes
            </span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>
              Show the QR code on your phone or printed ticket at the entrance on{' '}
              <strong>{formatDate(confirmation.date)}</strong>
            </span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>Arrive 15 minutes before your scheduled time for smooth entry</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>Each guest must have their own ticket for validation</span>
          </li>
        </ul>
      </div>

      {/* Ticket Preview Section */}
      {confirmation.tickets && confirmation.tickets.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Tickets</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {confirmation.tickets.map((ticket) => (
              <div
                key={ticket.id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow"
              >
                <div className="aspect-square bg-gray-100 rounded-md mb-3 flex items-center justify-center overflow-hidden">
                  {ticket.qrCodeImageUrl ? (
                    <img
                      src={ticket.qrCodeImageUrl}
                      alt={`QR Code for ${ticket.ticketNumber}`}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="text-gray-400 text-center">
                      <Ticket className="h-12 w-12 mx-auto mb-2" />
                      <p className="text-xs">QR Code</p>
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-600 text-center font-mono">
                  {ticket.ticketNumber}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Link
          to="/my-tickets"
          className="flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          <Ticket className="h-5 w-5 mr-2" />
          View All My Tickets
        </Link>
        <Link
          to="/"
          className="flex items-center justify-center px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
        >
          <Home className="h-5 w-5 mr-2" />
          Back to Home
        </Link>
      </div>

      {/* Support Information */}
      <div className="mt-8 text-center text-sm text-gray-600">
        <p>
          Need help?{' '}
          <a href="/support" className="text-blue-600 hover:underline">
            Contact Support
          </a>{' '}
          or email us at{' '}
          <a href="mailto:support@holidaibutler.com" className="text-blue-600 hover:underline">
            support@holidaibutler.com
          </a>
        </p>
      </div>
    </div>
  );
}
