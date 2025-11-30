import { Calendar, MapPin, Clock, Users, Mail, Phone, CreditCard, Tag } from 'lucide-react';
import type { GuestInfo } from './GuestInfoForm';

export interface BookingSummaryData {
  poi: {
    id: number;
    name: string;
    location: string;
    imageUrl?: string;
  };
  date: string;
  timeslot?: string;
  ticketType: string;
  quantity: number;
  guestInfo: GuestInfo;
  pricing: {
    basePrice: number;
    discount?: number;
    totalAmount: number;
    currency: string;
  };
}

interface BookingSummaryProps {
  booking: BookingSummaryData;
  onEdit?: () => void;
  onConfirm?: () => void;
  isLoading?: boolean;
  showActions?: boolean;
}

export default function BookingSummary({
  booking,
  onEdit,
  onConfirm,
  isLoading = false,
  showActions = true,
}: BookingSummaryProps) {
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

  const totalGuests = booking.guestInfo.adults + booking.guestInfo.children + booking.guestInfo.infants;
  const pricePerTicket = booking.pricing.basePrice;
  const discount = booking.pricing.discount || 0;
  const finalAmount = booking.pricing.totalAmount;

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Booking Summary</h2>

      {/* POI Information */}
      <div className="mb-6 border-b pb-6">
        {booking.poi.imageUrl && (
          <img
            src={booking.poi.imageUrl}
            alt={booking.poi.name}
            className="w-full h-48 object-cover rounded-lg mb-4"
          />
        )}
        <h3 className="text-xl font-semibold text-gray-900 mb-2">{booking.poi.name}</h3>
        <div className="flex items-center text-gray-600">
          <MapPin className="h-4 w-4 mr-2" />
          <span className="text-sm">{booking.poi.location}</span>
        </div>
      </div>

      {/* Booking Details */}
      <div className="space-y-4 mb-6 border-b pb-6">
        <h3 className="text-lg font-semibold text-gray-700">Booking Details</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Date */}
          <div className="flex items-start">
            <Calendar className="h-5 w-5 text-blue-600 mt-0.5 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-700">Visit Date</p>
              <p className="text-sm text-gray-600">{formatDate(booking.date)}</p>
            </div>
          </div>

          {/* Timeslot */}
          {booking.timeslot && (
            <div className="flex items-start">
              <Clock className="h-5 w-5 text-blue-600 mt-0.5 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-700">Time Slot</p>
                <p className="text-sm text-gray-600">{booking.timeslot}</p>
              </div>
            </div>
          )}

          {/* Ticket Type */}
          <div className="flex items-start">
            <Tag className="h-5 w-5 text-blue-600 mt-0.5 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-700">Ticket Type</p>
              <p className="text-sm text-gray-600 capitalize">{booking.ticketType}</p>
            </div>
          </div>

          {/* Quantity */}
          <div className="flex items-start">
            <Users className="h-5 w-5 text-blue-600 mt-0.5 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-700">Total Guests</p>
              <p className="text-sm text-gray-600">
                {totalGuests} {totalGuests === 1 ? 'guest' : 'guests'} ({booking.guestInfo.adults} adult
                {booking.guestInfo.adults !== 1 ? 's' : ''}
                {booking.guestInfo.children > 0 && `, ${booking.guestInfo.children} child${booking.guestInfo.children !== 1 ? 'ren' : ''}`}
                {booking.guestInfo.infants > 0 && `, ${booking.guestInfo.infants} infant${booking.guestInfo.infants !== 1 ? 's' : ''}`})
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Guest Information */}
      <div className="space-y-4 mb-6 border-b pb-6">
        <h3 className="text-lg font-semibold text-gray-700">Guest Information</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Name */}
          <div className="flex items-start">
            <Users className="h-5 w-5 text-blue-600 mt-0.5 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-700">Name</p>
              <p className="text-sm text-gray-600">{booking.guestInfo.name}</p>
            </div>
          </div>

          {/* Email */}
          <div className="flex items-start">
            <Mail className="h-5 w-5 text-blue-600 mt-0.5 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-700">Email</p>
              <p className="text-sm text-gray-600">{booking.guestInfo.email}</p>
            </div>
          </div>

          {/* Phone */}
          {booking.guestInfo.phone && (
            <div className="flex items-start">
              <Phone className="h-5 w-5 text-blue-600 mt-0.5 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-700">Phone</p>
                <p className="text-sm text-gray-600">{booking.guestInfo.phone}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Price Breakdown */}
      <div className="space-y-3 mb-6 border-b pb-6">
        <h3 className="text-lg font-semibold text-gray-700">Price Breakdown</h3>

        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
          {/* Base Price */}
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">
              Tickets ({booking.quantity} x {formatCurrency(pricePerTicket, booking.pricing.currency)})
            </span>
            <span className="text-sm font-medium text-gray-900">
              {formatCurrency(pricePerTicket * booking.quantity, booking.pricing.currency)}
            </span>
          </div>

          {/* Discount */}
          {discount > 0 && (
            <div className="flex justify-between items-center text-green-600">
              <span className="text-sm">Discount</span>
              <span className="text-sm font-medium">
                -{formatCurrency(discount, booking.pricing.currency)}
              </span>
            </div>
          )}

          {/* Total */}
          <div className="flex justify-between items-center pt-3 border-t border-gray-200">
            <span className="text-base font-semibold text-gray-900">Total Amount</span>
            <span className="text-xl font-bold text-blue-600">
              {formatCurrency(finalAmount, booking.pricing.currency)}
            </span>
          </div>
        </div>

        {/* Payment Info */}
        <div className="flex items-start bg-blue-50 p-3 rounded-md">
          <CreditCard className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
          <div className="text-sm text-blue-800">
            <p className="font-medium">Secure Payment</p>
            <p className="text-xs text-blue-600">Your payment information is encrypted and secure</p>
          </div>
        </div>
      </div>

      {/* Important Information */}
      <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-yellow-900 mb-2">Important Information</h4>
        <ul className="text-xs text-yellow-800 space-y-1 list-disc list-inside">
          <li>Your tickets will be sent to {booking.guestInfo.email} after payment</li>
          <li>Please arrive 15 minutes before your scheduled time slot</li>
          <li>Tickets are non-transferable and non-refundable</li>
          <li>Show your QR code at the entrance for validation</li>
        </ul>
      </div>

      {/* Actions */}
      {showActions && (
        <div className="flex justify-between pt-6">
          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              Edit Details
            </button>
          )}
          {onConfirm && (
            <button
              type="button"
              onClick={onConfirm}
              className={`px-8 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                !onEdit ? 'ml-auto' : ''
              }`}
              disabled={isLoading}
            >
              {isLoading ? 'Processing...' : 'Proceed to Payment'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
