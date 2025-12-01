/**
 * Ticketing Demo Page
 *
 * Demonstrates the ticketing features with the AvailabilityChecker component
 */

import { useState } from 'react';
import { AvailabilityChecker } from '@/features/ticketing';
import { Ticket } from 'lucide-react';

export const TicketingDemo = () => {
  const [bookingData, setBookingData] = useState<{
    date: string;
    quantity: number;
  } | null>(null);

  const handleBook = (date: string, quantity: number) => {
    setBookingData({ date, quantity });
    alert(`Booking ${quantity} tickets for ${date}\nNext: Proceed to payment...`);
    // In a real app, this would navigate to the booking flow
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Ticket className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">
              Ticketing System Demo
            </h1>
          </div>
          <p className="text-gray-600">
            This page demonstrates the ticketing integration. The AvailabilityChecker component
            connects to the backend API at <code className="px-2 py-1 bg-gray-100 rounded">localhost:5000</code>
          </p>
        </div>

        {/* Integration Status */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
          <h2 className="text-lg font-semibold text-blue-900 mb-2">
            ✅ Integration Status
          </h2>
          <ul className="space-y-1 text-sm text-blue-800">
            <li>• TypeScript API Client: Generated from OpenAPI spec</li>
            <li>• React Query Hooks: useAvailability, useBooking, useTickets</li>
            <li>• Components: AvailabilityChecker, LoadingSpinner, ErrorDisplay</li>
            <li>• Backend API: http://localhost:5000/api/v1/ticketing</li>
          </ul>
        </div>

        {/* POI Card - Terra Mitica Example */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
          <div className="aspect-video bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center">
            <div className="text-center text-white">
              <h2 className="text-4xl font-bold mb-2">Terra Mitica</h2>
              <p className="text-lg">Theme Park • Benidorm, Spain</p>
            </div>
          </div>

          <div className="p-6">
            <p className="text-gray-700 mb-4">
              Experience the magic of ancient civilizations at Terra Mitica!
              Book your tickets now for an unforgettable adventure.
            </p>

            {/* Availability Checker Component */}
            <AvailabilityChecker
              poiId={123}
              poiName="Terra Mitica"
              onBook={handleBook}
            />
          </div>
        </div>

        {/* Booking Summary (if user clicked Book Now) */}
        {bookingData && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-green-900 mb-2">
              Booking Initiated
            </h3>
            <p className="text-green-800">
              Date: <strong>{bookingData.date}</strong><br />
              Quantity: <strong>{bookingData.quantity} tickets</strong>
            </p>
            <p className="text-sm text-green-700 mt-2">
              In production, this would navigate to the booking flow with guest info and payment.
            </p>
          </div>
        )}

        {/* Developer Info */}
        <div className="bg-gray-50 border border-gray-300 rounded-lg p-6 mt-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            🛠️ For Developers
          </h3>
          <div className="space-y-2 text-sm text-gray-700">
            <p><strong>Component Location:</strong> <code>src/features/ticketing/components/AvailabilityChecker/</code></p>
            <p><strong>Hook Used:</strong> <code>useCheckAvailability()</code> from React Query</p>
            <p><strong>API Endpoint:</strong> <code>POST /api/v1/ticketing/availability/check</code></p>
            <p><strong>Backend Running:</strong> Make sure backend is running on port 5000</p>
          </div>

          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
            <p className="text-sm text-yellow-800">
              <strong>⚠️ Note:</strong> For the API to work, ensure:
            </p>
            <ol className="list-decimal list-inside text-sm text-yellow-800 mt-2 space-y-1">
              <li>Backend server is running: <code>cd backend && npm start</code></li>
              <li>Database has POI with id=123</li>
              <li>Availability records exist for future dates</li>
              <li>CORS is enabled for localhost:5173 (Vite dev server)</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TicketingDemo;
