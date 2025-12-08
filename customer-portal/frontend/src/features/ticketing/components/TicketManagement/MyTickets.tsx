import { useState } from 'react';
import { Filter, Search, Calendar, Ticket, AlertCircle } from 'lucide-react';
import { useGetUserTickets } from '../../hooks/useTickets';
import { LoadingSpinner } from '../shared/LoadingSpinner';
import { ErrorDisplay } from '../shared/ErrorDisplay';

export type TicketStatus = 'active' | 'used' | 'expired' | 'cancelled';

interface MyTicketsProps {
  userId: number;
  onTicketClick?: (ticketId: number) => void;
  renderTicketCard?: (ticket: any) => React.ReactNode;
}

export default function MyTickets({
  userId,
  onTicketClick,
  renderTicketCard,
}: MyTicketsProps) {
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'name'>('date');

  // Fetch tickets using the custom hook
  const {
    data: ticketsData,
    isLoading,
    isError,
    error,
    refetch,
  } = useGetUserTickets(userId, statusFilter !== 'all' ? { status: statusFilter } : undefined);

  const tickets = ticketsData?.data || [];

  // Filter and sort tickets
  const filteredAndSortedTickets = tickets
    .filter((ticket: any) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          ticket.ticketNumber?.toLowerCase().includes(query) ||
          ticket.poi?.name?.toLowerCase().includes(query) ||
          ticket.holderName?.toLowerCase().includes(query)
        );
      }
      return true;
    })
    .sort((a: any, b: any) => {
      if (sortBy === 'date') {
        return new Date(b.validFrom).getTime() - new Date(a.validFrom).getTime();
      } else {
        return (a.poi?.name || '').localeCompare(b.poi?.name || '');
      }
    });

  // Group tickets by status
  const groupedTickets = filteredAndSortedTickets.reduce((acc: Record<string, any[]>, ticket: any) => {
    const status = ticket.status || 'active';
    if (!acc[status]) acc[status] = [];
    acc[status].push(ticket);
    return acc;
  }, {});

  const statusCounts = {
    all: tickets.length,
    active: groupedTickets.active?.length || 0,
    used: groupedTickets.used?.length || 0,
    expired: groupedTickets.expired?.length || 0,
    cancelled: groupedTickets.cancelled?.length || 0,
  };

  const statusColors: Record<TicketStatus, string> = {
    active: 'bg-green-100 text-green-800 border-green-300',
    used: 'bg-gray-100 text-gray-800 border-gray-300',
    expired: 'bg-red-100 text-red-800 border-red-300',
    cancelled: 'bg-orange-100 text-orange-800 border-orange-300',
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <LoadingSpinner message="Loading your tickets..." />
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorDisplay
        title="Failed to Load Tickets"
        error={error instanceof Error ? error.message : 'An unexpected error occurred'}
        onRetry={refetch}
      />
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">My Tickets</h1>
        <p className="text-gray-600">Manage and view all your tickets in one place</p>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Status Filter Pills */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                statusFilter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All ({statusCounts.all})
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                statusFilter === 'active'
                  ? 'bg-green-600 text-white'
                  : 'bg-green-100 text-green-700 hover:bg-green-200'
              }`}
            >
              Active ({statusCounts.active})
            </button>
            <button
              onClick={() => setStatusFilter('used')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                statusFilter === 'used'
                  ? 'bg-gray-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Used ({statusCounts.used})
            </button>
            <button
              onClick={() => setStatusFilter('expired')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                statusFilter === 'expired'
                  ? 'bg-red-600 text-white'
                  : 'bg-red-100 text-red-700 hover:bg-red-200'
              }`}
            >
              Expired ({statusCounts.expired})
            </button>
            <button
              onClick={() => setStatusFilter('cancelled')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                statusFilter === 'cancelled'
                  ? 'bg-orange-600 text-white'
                  : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
              }`}
            >
              Cancelled ({statusCounts.cancelled})
            </button>
          </div>

          {/* Search Bar */}
          <div className="flex-1 lg:max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by ticket number, location, or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'date' | 'name')}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="date">Sort by Date</option>
              <option value="name">Sort by Location</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tickets List */}
      {filteredAndSortedTickets.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <div className="flex justify-center mb-4">
            {searchQuery ? (
              <Search className="h-16 w-16 text-gray-300" />
            ) : (
              <Ticket className="h-16 w-16 text-gray-300" />
            )}
          </div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">
            {searchQuery ? 'No tickets found' : 'No tickets yet'}
          </h3>
          <p className="text-gray-500 mb-6">
            {searchQuery
              ? 'Try adjusting your search or filter criteria'
              : 'Start booking tickets to see them here'}
          </p>
          {!searchQuery && (
            <a
              href="/"
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Calendar className="h-5 w-5 mr-2" />
              Browse Attractions
            </a>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAndSortedTickets.map((ticket: any) => (
            <div
              key={ticket.id}
              onClick={() => onTicketClick?.(ticket.id)}
              className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow cursor-pointer overflow-hidden"
            >
              {renderTicketCard ? (
                renderTicketCard(ticket)
              ) : (
                <DefaultTicketCard ticket={ticket} statusColors={statusColors} />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Results Count */}
      {filteredAndSortedTickets.length > 0 && (
        <div className="mt-6 text-center text-sm text-gray-600">
          Showing {filteredAndSortedTickets.length} of {tickets.length} tickets
        </div>
      )}
    </div>
  );
}

// Default Ticket Card Component (will be replaced by TicketCard component)
function DefaultTicketCard({ ticket, statusColors }: any) {
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <>
      {/* Status Badge */}
      <div className="p-4 pb-0">
        <span
          className={`inline-block px-3 py-1 text-xs font-semibold rounded-full border ${
            statusColors[ticket.status as TicketStatus] || statusColors.active
          }`}
        >
          {ticket.status?.toUpperCase() || 'ACTIVE'}
        </span>
      </div>

      {/* QR Code Preview */}
      <div className="p-4">
        {ticket.qrCodeImageUrl ? (
          <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
            <img
              src={ticket.qrCodeImageUrl}
              alt="QR Code"
              className="w-full h-full object-contain"
            />
          </div>
        ) : (
          <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
            <Ticket className="h-16 w-16 text-gray-300" />
          </div>
        )}
      </div>

      {/* Ticket Info */}
      <div className="px-4 pb-4">
        <h3 className="font-semibold text-gray-900 mb-1 truncate">
          {ticket.poi?.name || 'Unknown Location'}
        </h3>
        <p className="text-sm text-gray-600 mb-2">{ticket.poi?.location || ''}</p>
        <div className="flex items-center text-xs text-gray-500 mb-2">
          <Calendar className="h-3 w-3 mr-1" />
          <span>Valid: {formatDate(ticket.validFrom)}</span>
        </div>
        <p className="text-xs font-mono text-gray-500">{ticket.ticketNumber}</p>
      </div>
    </>
  );
}
