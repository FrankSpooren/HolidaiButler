/**
 * AvailabilityChecker Component
 *
 * Allows users to check ticket availability for a POI on a specific date
 */

import { useState } from 'react';
import { format } from 'date-fns';
import { Calendar, Users, CheckCircle, XCircle, Euro } from 'lucide-react';
import { useCheckAvailability } from '../../hooks/useAvailability';
import { LoadingSpinner } from '../shared/LoadingSpinner';
import { ErrorDisplay } from '../shared/ErrorDisplay';

interface AvailabilityCheckerProps {
  poiId: number;
  poiName: string;
  onBook?: (date: string, quantity: number) => void;
}

export const AvailabilityChecker: React.FC<AvailabilityCheckerProps> = ({
  poiId,
  poiName,
  onBook,
}) => {
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(2);

  const { mutate: checkAvailability, data, isPending, error } = useCheckAvailability();

  const handleCheck = () => {
    if (!selectedDate) {
      alert('Please select a date');
      return;
    }

    checkAvailability({
      poiId: String(poiId),
      date: selectedDate,
      quantity,
    });
  };

  const handleBookNow = () => {
    if (onBook && selectedDate) {
      onBook(selectedDate, quantity);
    }
  };

  // Get minimum date (today)
  const minDate = format(new Date(), 'yyyy-MM-dd');

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">
        Check Availability
      </h2>
      <p className="text-gray-600 mb-6">
        Select your preferred date and number of tickets for {poiName}
      </p>

      <div className="space-y-4">
        {/* Date Selector */}
        <div>
          <label htmlFor="date" className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <Calendar className="w-4 h-4" />
            Select Date
          </label>
          <input
            type="date"
            id="date"
            min={minDate}
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Quantity Selector */}
        <div>
          <label htmlFor="quantity" className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <Users className="w-4 h-4" />
            Number of Tickets
          </label>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
              disabled={quantity <= 1}
            >
              −
            </button>
            <span className="text-xl font-semibold min-w-[3rem] text-center">
              {quantity}
            </span>
            <button
              onClick={() => setQuantity(Math.min(20, quantity + 1))}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
              disabled={quantity >= 20}
            >
              +
            </button>
          </div>
        </div>

        {/* Check Availability Button */}
        <button
          onClick={handleCheck}
          disabled={isPending || !selectedDate}
          className="w-full px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? 'Checking...' : 'Check Availability'}
        </button>
      </div>

      {/* Loading State */}
      {isPending && <LoadingSpinner message="Checking availability..." />}

      {/* Error State */}
      {error && (
        <div className="mt-6">
          <ErrorDisplay
            error={error}
            onRetry={handleCheck}
            title="Couldn't check availability"
          />
        </div>
      )}

      {/* Success State - Show Results */}
      {data && data.success && data.data && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          {data.data.available ? (
            <div className="space-y-4">
              {/* Available */}
              <div className="flex items-start gap-3">
                <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    Tickets Available!
                  </h3>
                  <p className="text-sm text-gray-600">
                    {data.data.capacity?.available || 0} tickets available for {format(new Date(selectedDate), 'MMMM dd, yyyy')}
                  </p>
                </div>
              </div>

              {/* Pricing Info */}
              {data.data.pricing && (
                <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                  <div className="flex items-center gap-2">
                    <Euro className="w-5 h-5 text-gray-600" />
                    <div>
                      <p className="text-sm text-gray-600">Price per ticket</p>
                      <p className="text-2xl font-bold text-gray-900">
                        €{data.data.pricing.finalPrice?.toFixed(2) || '0.00'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Total for {quantity} tickets</p>
                    <p className="text-xl font-bold text-blue-600">
                      €{((data.data.pricing.finalPrice || 0) * quantity).toFixed(2)}
                    </p>
                  </div>
                </div>
              )}

              {/* Book Now Button */}
              {data.data.canBook && onBook && (
                <button
                  onClick={handleBookNow}
                  className="w-full px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
                >
                  Book Now
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-start gap-3">
              <XCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  Sorry, Not Available
                </h3>
                <p className="text-sm text-gray-600">
                  There are not enough tickets available for your requested date and quantity.
                  Please try a different date or reduce the number of tickets.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
