import { Calendar, MapPin, Clock, User, Ticket as TicketIcon, ChevronRight } from 'lucide-react';

export interface TicketData {
  id: number;
  ticketNumber: string;
  status: 'active' | 'used' | 'expired' | 'cancelled';
  holderName: string;
  holderEmail: string;
  validFrom: string;
  validUntil: string;
  usedAt?: string;
  qrCodeImageUrl?: string;
  poi: {
    id: number;
    name: string;
    location: string;
  };
  booking?: {
    id: number;
    bookingReference: string;
    timeslot?: string;
  };
}

interface TicketCardProps {
  ticket: TicketData;
  onClick?: () => void;
  variant?: 'compact' | 'detailed';
  showQRCode?: boolean;
}

export default function TicketCard({
  ticket,
  onClick,
  variant = 'detailed',
  showQRCode = true,
}: TicketCardProps) {
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string): string => {
    const colors = {
      active: 'bg-green-100 text-green-800 border-green-300',
      used: 'bg-gray-100 text-gray-800 border-gray-300',
      expired: 'bg-red-100 text-red-800 border-red-300',
      cancelled: 'bg-orange-100 text-orange-800 border-orange-300',
    };
    return colors[status as keyof typeof colors] || colors.active;
  };

  const getStatusIcon = (status: string): string => {
    const icons = {
      active: '✓',
      used: '✓',
      expired: '×',
      cancelled: '×',
    };
    return icons[status as keyof typeof icons] || '?';
  };

  // Determine if ticket is valid for use today
  const isValidToday = () => {
    const now = new Date();
    const validFrom = new Date(ticket.validFrom);
    const validUntil = new Date(ticket.validUntil);
    return now >= validFrom && now <= validUntil && ticket.status === 'active';
  };

  if (variant === 'compact') {
    return (
      <div
        onClick={onClick}
        className="bg-white rounded-lg shadow-md hover:shadow-lg transition-all cursor-pointer border border-gray-200 overflow-hidden"
      >
        <div className="flex items-center p-4">
          {/* QR Code Thumbnail */}
          {showQRCode && (
            <div className="w-20 h-20 flex-shrink-0 mr-4">
              {ticket.qrCodeImageUrl ? (
                <img
                  src={ticket.qrCodeImageUrl}
                  alt="QR Code"
                  className="w-full h-full object-contain rounded"
                />
              ) : (
                <div className="w-full h-full bg-gray-100 rounded flex items-center justify-center">
                  <TicketIcon className="h-8 w-8 text-gray-300" />
                </div>
              )}
            </div>
          )}

          {/* Ticket Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-semibold text-gray-900 truncate">{ticket.poi.name}</h3>
              <span
                className={`ml-2 px-2 py-1 text-xs font-semibold rounded-full border whitespace-nowrap ${getStatusColor(
                  ticket.status
                )}`}
              >
                {ticket.status.toUpperCase()}
              </span>
            </div>
            <p className="text-sm text-gray-600 truncate mb-1">{ticket.poi.location}</p>
            <div className="flex items-center text-xs text-gray-500">
              <Calendar className="h-3 w-3 mr-1" />
              <span>{formatDate(ticket.validFrom)}</span>
            </div>
          </div>

          {/* Arrow */}
          <ChevronRight className="h-5 w-5 text-gray-400 ml-2 flex-shrink-0" />
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-lg shadow-md hover:shadow-xl transition-all border-2 overflow-hidden ${
        isValidToday() ? 'border-green-500' : 'border-gray-200'
      } ${onClick ? 'cursor-pointer' : ''}`}
    >
      {/* Status Banner */}
      <div className={`px-4 py-2 ${getStatusColor(ticket.status)} border-b`}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">
            {getStatusIcon(ticket.status)} {ticket.status.toUpperCase()}
          </span>
          {isValidToday() && (
            <span className="text-xs font-medium">Valid Today</span>
          )}
        </div>
      </div>

      {/* QR Code Section */}
      {showQRCode && (
        <div className="p-4 bg-gray-50">
          {ticket.qrCodeImageUrl ? (
            <div className="aspect-square bg-white rounded-lg shadow-inner flex items-center justify-center overflow-hidden">
              <img
                src={ticket.qrCodeImageUrl}
                alt={`QR Code for ${ticket.ticketNumber}`}
                className="w-full h-full object-contain p-4"
              />
            </div>
          ) : (
            <div className="aspect-square bg-white rounded-lg shadow-inner flex items-center justify-center">
              <div className="text-center text-gray-400">
                <TicketIcon className="h-16 w-16 mx-auto mb-2" />
                <p className="text-xs">QR Code Unavailable</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Ticket Details */}
      <div className="p-4 space-y-3">
        {/* POI Name and Location */}
        <div>
          <h3 className="font-bold text-lg text-gray-900 mb-1">{ticket.poi.name}</h3>
          <div className="flex items-start text-sm text-gray-600">
            <MapPin className="h-4 w-4 mr-1 mt-0.5 flex-shrink-0" />
            <span>{ticket.poi.location}</span>
          </div>
        </div>

        {/* Valid Date */}
        <div className="flex items-start text-sm">
          <Calendar className="h-4 w-4 mr-2 mt-0.5 text-blue-600 flex-shrink-0" />
          <div>
            <p className="font-medium text-gray-700">Valid Date</p>
            <p className="text-gray-600">
              {formatDate(ticket.validFrom)}
              {ticket.validFrom !== ticket.validUntil && ` - ${formatDate(ticket.validUntil)}`}
            </p>
          </div>
        </div>

        {/* Timeslot (if available) */}
        {ticket.booking?.timeslot && (
          <div className="flex items-start text-sm">
            <Clock className="h-4 w-4 mr-2 mt-0.5 text-blue-600 flex-shrink-0" />
            <div>
              <p className="font-medium text-gray-700">Time Slot</p>
              <p className="text-gray-600">{ticket.booking.timeslot}</p>
            </div>
          </div>
        )}

        {/* Holder Name */}
        <div className="flex items-start text-sm">
          <User className="h-4 w-4 mr-2 mt-0.5 text-blue-600 flex-shrink-0" />
          <div>
            <p className="font-medium text-gray-700">Ticket Holder</p>
            <p className="text-gray-600">{ticket.holderName}</p>
          </div>
        </div>

        {/* Used At (if used) */}
        {ticket.usedAt && (
          <div className="pt-3 border-t">
            <p className="text-sm text-gray-600">
              Used on {formatDate(ticket.usedAt)} at {formatTime(ticket.usedAt)}
            </p>
          </div>
        )}

        {/* Ticket Number */}
        <div className="pt-3 border-t">
          <p className="text-xs text-gray-500 font-mono">{ticket.ticketNumber}</p>
          {ticket.booking?.bookingReference && (
            <p className="text-xs text-gray-500 mt-1">
              Booking: {ticket.booking.bookingReference}
            </p>
          )}
        </div>
      </div>

      {/* Action Footer */}
      {onClick && (
        <div className="px-4 py-3 bg-gray-50 border-t flex items-center justify-between">
          <span className="text-sm text-gray-600">Tap to view details</span>
          <ChevronRight className="h-5 w-5 text-gray-400" />
        </div>
      )}
    </div>
  );
}
