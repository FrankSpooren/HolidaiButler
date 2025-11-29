# HolidaiButler Admin Module - Complete Integration Documentation

## Overview

This document provides comprehensive information about the integration of 4 additional HolidaiButler modules into the admin platform:

1. **Events/Agenda Module** - Event management and publishing
2. **Reservations Module** - Restaurant table reservations
3. **Ticketing Module** - Event and attraction ticket sales
4. **Bookings Module** - Unified booking system
5. **Transactions/Payments Module** - Payment processing and financial management

## Architecture

### Backend Structure

```
admin-module/backend/
├── models/
│   ├── Event.js           # Event/agenda data model (400+ lines)
│   ├── Reservation.js     # Restaurant reservation model (400+ lines)
│   ├── Ticket.js          # Ticketing system model (450+ lines)
│   ├── Booking.js         # Unified bookings model (500+ lines)
│   └── Transaction.js     # Payment transactions model (550+ lines)
├── routes/
│   ├── adminEvents.js         # Event management endpoints (700+ lines)
│   ├── adminReservations.js   # Reservation management (600+ lines)
│   ├── adminTickets.js        # Ticket management (750+ lines)
│   ├── adminBookings.js       # Booking management (550+ lines)
│   └── adminTransactions.js   # Transaction management (850+ lines)
└── server.js              # Updated with new route mounts
```

### Frontend Structure

```
admin-module/frontend/src/
└── services/
    └── api.js             # Extended with 5 new API modules
```

## Database Models

### 1. Event Model

**Purpose**: Manage events, activities, and agenda items for the HolidaiButler platform.

**Key Features**:
- Multi-language support (EN, ES, DE, FR, NL)
- 16 event categories (music, arts_culture, sports, food_drink, etc.)
- Temporal information (start/end dates, time of day)
- Quality scoring system
- Ticketing integration
- Location and POI references
- SEO optimization

**Statuses**: `draft`, `published`, `cancelled`, `completed`

**Key Methods**:
```javascript
event.calculateQualityScore()
event.incrementViews()
event.incrementBookings()
event.softDelete(adminUserId)
```

### 2. Reservation Model

**Purpose**: Handle restaurant table reservations and guest management.

**Key Features**:
- Guest information tracking
- Party size and duration management
- Table assignment
- Special requests (dietary, occasion, accessibility)
- Deposit/prepayment tracking
- No-show tracking
- Revenue recording

**Statuses**: `pending`, `confirmed`, `seated`, `completed`, `cancelled`, `no_show`

**Key Methods**:
```javascript
reservation.generateReservationNumber()
reservation.confirm(adminUserId)
reservation.seat(tableInfo, adminUserId)
reservation.complete(revenueData, adminUserId)
reservation.cancel(reason, cancelledBy, adminUserId)
reservation.softDelete(adminUserId)
```

**Static Methods**:
```javascript
Reservation.getTodayReservations(poiId)
Reservation.getUpcoming(poiId, days)
```

### 3. Ticket Model

**Purpose**: Comprehensive ticketing system for events and attractions.

**Key Features**:
- Unique ticket numbers and QR codes
- Multiple ticket types (general, VIP, earlybird, student, etc.)
- Validity period management
- Usage tracking and scanning
- Transfer capability
- Add-ons and special features
- Digital delivery (email, SMS, wallet)

**Statuses**: `pending`, `active`, `used`, `expired`, `cancelled`, `transferred`

**Key Methods**:
```javascript
ticket.generateTicketNumber()
ticket.generateQRCode()
ticket.use(adminUserId, scanInfo)
ticket.cancel(reason, cancelledBy, refund, adminUserId)
ticket.transfer(newHolder, transferredBy, reason, adminUserId)
ticket.softDelete(adminUserId)
```

### 4. Booking Model

**Purpose**: Unified booking system for all service types.

**Key Features**:
- Support for multiple types (event_ticket, attraction_ticket, tour, reservation, package)
- Multi-item bookings
- Complex pricing (subtotal, tax, fees, discounts)
- Payment status tracking
- Visit details scheduling
- Multiple fulfillment methods
- Communication tracking
- Review/feedback collection
- Cancellation policy enforcement

**Statuses**: `pending`, `confirmed`, `completed`, `cancelled`, `refunded`, `no_show`, `expired`

**Key Methods**:
```javascript
booking.generateBookingNumber()
booking.generateConfirmationCode()
booking.calculateTotal()
booking.confirm(transactionId, adminUserId)
booking.complete(adminUserId)
booking.cancel(reason, cancelledBy, refundAmount, adminUserId)
booking.addNote(note, adminUserId)
```

**Static Methods**:
```javascript
Booking.getTodayBookings(filters)
Booking.getUpcoming(days, filters)
```

### 5. Transaction Model

**Purpose**: Complete payment and transaction management.

**Key Features**:
- Support for multiple payment methods (credit card, PayPal, bank transfer, etc.)
- Multiple payment providers (Stripe, Adyen, PayPal)
- Comprehensive amount breakdown
- Refund management
- Dispute/chargeback handling
- Fraud detection and risk scoring
- Reconciliation workflow
- Receipt and invoice generation

**Statuses**: `pending`, `processing`, `authorized`, `completed`, `failed`, `cancelled`, `refunded`, `partially_refunded`, `disputed`, `expired`

**Key Methods**:
```javascript
transaction.generateTransactionNumber()
transaction.authorize(authData, adminUserId)
transaction.capture(adminUserId)
transaction.complete(completionData, adminUserId)
transaction.fail(errorInfo, adminUserId)
transaction.refundTransaction(refundData, adminUserId)
transaction.initiateDispute(disputeData, adminUserId)
transaction.resolveDispute(resolution, won, adminUserId)
transaction.flagForReview(reason, adminUserId)
transaction.approveAfterReview(notes, adminUserId)
transaction.reconcile(reconciliationData, adminUserId)
transaction.addNote(note, adminUserId, isInternal)
```

**Static Methods**:
```javascript
Transaction.getTodayTransactions(filters)
Transaction.getRevenueByDateRange(startDate, endDate, filters)
Transaction.getPendingReviews()
Transaction.getUnreconciledTransactions(beforeDate)
```

## API Endpoints

### Events API (`/api/admin/events`)

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/` | List all events with filters | events:view |
| GET | `/stats` | Get event statistics | events:view |
| GET | `/:id` | Get single event | events:view |
| POST | `/` | Create new event | events:create |
| PUT | `/:id` | Update event | events:edit |
| PATCH | `/:id/status` | Update event status | events:edit |
| POST | `/:id/publish` | Publish event | events:edit |
| POST | `/:id/duplicate` | Duplicate event | events:create |
| DELETE | `/:id` | Delete event (soft) | events:delete |
| POST | `/bulk-delete` | Bulk delete events | events:delete |
| POST | `/bulk-update-status` | Bulk update status | events:edit |

### Reservations API (`/api/admin/reservations`)

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/` | List all reservations | reservations:view |
| GET | `/stats` | Get reservation statistics | reservations:view |
| GET | `/today` | Get today's reservations | reservations:view |
| GET | `/:id` | Get single reservation | reservations:view |
| POST | `/` | Create new reservation | reservations:create |
| PUT | `/:id` | Update reservation | reservations:edit |
| POST | `/:id/confirm` | Confirm reservation | reservations:edit |
| POST | `/:id/seat` | Mark as seated | reservations:edit |
| POST | `/:id/complete` | Mark as completed | reservations:edit |
| POST | `/:id/cancel` | Cancel reservation | reservations:edit |
| POST | `/:id/no-show` | Mark as no-show | reservations:edit |
| POST | `/:id/notes` | Add admin note | reservations:edit |
| DELETE | `/:id` | Delete reservation (soft) | reservations:delete |

### Tickets API (`/api/admin/tickets`)

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/` | List all tickets | tickets:view |
| GET | `/stats` | Get ticket statistics | tickets:view |
| GET | `/:id` | Get single ticket | tickets:view |
| GET | `/validate/:ticketNumber` | Validate ticket | tickets:view |
| POST | `/` | Create new ticket | tickets:create |
| PUT | `/:id` | Update ticket | tickets:edit |
| POST | `/:id/use` | Mark ticket as used (scan) | tickets:edit |
| POST | `/:id/cancel` | Cancel ticket | tickets:edit |
| POST | `/:id/transfer` | Transfer to new holder | tickets:edit |
| POST | `/:id/resend` | Resend ticket delivery | tickets:edit |
| POST | `/:id/notes` | Add admin note | tickets:edit |
| DELETE | `/:id` | Delete ticket (soft) | tickets:delete |
| POST | `/bulk-cancel` | Bulk cancel tickets | tickets:delete |

### Bookings API (`/api/admin/bookings`)

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/` | List all bookings | bookings:view |
| GET | `/stats` | Get booking statistics | bookings:view |
| GET | `/today` | Get today's bookings | bookings:view |
| GET | `/:id` | Get single booking | bookings:view |
| GET | `/customer/:customerId` | Get customer's bookings | bookings:view |
| POST | `/` | Create new booking | bookings:create |
| PUT | `/:id` | Update booking | bookings:edit |
| POST | `/:id/confirm` | Confirm booking | bookings:edit |
| POST | `/:id/complete` | Mark as completed | bookings:edit |
| POST | `/:id/cancel` | Cancel booking | bookings:edit |
| POST | `/:id/notes` | Add admin note | bookings:edit |
| POST | `/:id/resend-confirmation` | Resend confirmation | bookings:edit |
| POST | `/bulk-update-status` | Bulk update status | bookings:delete |

### Transactions API (`/api/admin/transactions`)

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/` | List all transactions | transactions:view |
| GET | `/stats` | Get transaction statistics | transactions:view |
| GET | `/today` | Get today's transactions | transactions:view |
| GET | `/pending-reviews` | Get pending fraud reviews | transactions:view |
| GET | `/unreconciled` | Get unreconciled transactions | transactions:view |
| GET | `/:id` | Get single transaction | transactions:view |
| GET | `/export` | Export to CSV | transactions:view |
| POST | `/` | Create transaction (manual) | transactions:create |
| POST | `/:id/refund` | Refund transaction | transactions:edit |
| POST | `/:id/dispute` | Initiate dispute | transactions:edit |
| POST | `/:id/dispute/resolve` | Resolve dispute | transactions:edit |
| POST | `/:id/flag-review` | Flag for fraud review | transactions:edit |
| POST | `/:id/approve-review` | Approve after review | transactions:edit |
| POST | `/:id/reconcile` | Reconcile transaction | transactions:edit |
| POST | `/:id/notes` | Add admin note | transactions:edit |
| POST | `/bulk-reconcile` | Bulk reconcile | transactions:edit |

## Permissions System

All new modules have been integrated with the role-based permission system:

### Platform Admin
- **Full access** to all modules (view, create, edit, delete)
- Can manage events, reservations, tickets, bookings, and transactions
- Can reconcile payments and handle disputes

### POI Owner
- **View, create, edit** events, reservations, tickets, and bookings for owned POIs
- **View only** for transactions
- Cannot delete or reconcile

### Editor
- **View, create, edit** all content modules
- **View only** for transactions
- Cannot delete or manage payments

### Reviewer
- **View only** for all new modules
- Cannot create, edit, or delete

## Frontend API Services

All API services have been added to `/frontend/src/services/api.js`:

```javascript
import { eventsAPI } from './services/api';
import { reservationsAPI } from './services/api';
import { ticketsAPI } from './services/api';
import { bookingsAPI } from './services/api';
import { transactionsAPI } from './services/api';
```

### Example Usage

```javascript
// Fetch all events
const eventsResponse = await eventsAPI.getAll({
  page: 1,
  limit: 20,
  category: 'music',
  status: 'published'
});

// Get event statistics
const statsResponse = await eventsAPI.getStats();

// Create new reservation
const reservation = await reservationsAPI.create({
  poi: poiId,
  guest: { firstName, lastName, email, phone },
  date: '2025-12-25',
  time: '19:00',
  partySize: 4
});

// Validate ticket
const validation = await ticketsAPI.validate(ticketNumber);

// Process refund
const refund = await transactionsAPI.refund(transactionId, amount, reason);
```

## Server Configuration

Routes have been mounted in `/backend/server.js`:

```javascript
app.use('/api/admin/events', adminEventsRoutes);
app.use('/api/admin/reservations', adminReservationsRoutes);
app.use('/api/admin/tickets', adminTicketsRoutes);
app.use('/api/admin/bookings', adminBookingsRoutes);
app.use('/api/admin/transactions', adminTransactionsRoutes);
```

## Data Relationships

### Event → Ticket → Booking → Transaction
```
Event
  ├─→ Tickets (many)
  │     └─→ Booking (one)
  │           └─→ Transaction (one)
  └─→ POI (one)
```

### Reservation → Booking → Transaction
```
Reservation
  ├─→ Booking (optional)
  │     └─→ Transaction (one)
  └─→ POI (one)
```

### Transaction Relationships
```
Transaction
  ├─→ Booking (optional)
  ├─→ Ticket (optional)
  ├─→ Reservation (optional)
  └─→ Customer (User)
```

## Search & Filtering

All modules support comprehensive filtering:

### Events
- Search: title, description (multi-language)
- Filters: category, status, city, date range, isFree, poiId
- Sort: startDate, createdAt, title, popularity

### Reservations
- Search: guest name, email, phone, reservation number
- Filters: status, poiId, date, date range
- Sort: createdAt, date, time

### Tickets
- Search: ticket number, holder name/email
- Filters: status, type, eventId, poiId, validity dates
- Sort: createdAt, purchaseDate, validity

### Bookings
- Search: booking number, confirmation code, customer name/email
- Filters: type, status, paymentStatus, visit date range
- Sort: createdAt, visitDate, total amount

### Transactions
- Search: transaction number, customer email, external ID
- Filters: type, status, payment method, provider, amount range, date range
- Sort: createdAt, amount, status

## Statistics & Analytics

All modules provide comprehensive statistics endpoints:

### Event Stats
- Total events by status
- Events by category
- Events by city
- Upcoming events
- Trending events (by views)
- Total views, bookings, revenue
- Average quality score

### Reservation Stats
- Total reservations by status
- Reservations by POI
- Average party size
- Total revenue
- Today's reservations count
- Upcoming reservations

### Ticket Stats
- Total tickets by status and type
- Revenue by ticket type
- Sales by event
- Average ticket price
- Recent sales
- Validation statistics

### Booking Stats
- Total bookings by type and status
- Revenue metrics
- Bookings by source channel
- Payment status distribution
- Average booking value
- Recent bookings
- Upcoming visits

### Transaction Stats
- Total revenue
- Transactions by status, type, method, provider
- Revenue by date (time series)
- Average transaction value
- Total refunds and fees
- Pending fraud reviews
- Unreconciled count

## Next Steps

### Frontend Integration
To complete the integration, you need to create React components for:

1. **Event Management UI**
   - Event list page
   - Event form (create/edit)
   - Event calendar view
   - Event analytics dashboard

2. **Reservation Management UI**
   - Reservation list page
   - Reservation form
   - Table management view
   - Today's reservations dashboard

3. **Ticket Management UI**
   - Ticket list page
   - Ticket scanner interface
   - Ticket validation UI
   - Sales analytics

4. **Booking Management UI**
   - Booking list page
   - Booking detail view
   - Customer booking history
   - Booking analytics

5. **Transaction Management UI**
   - Transaction list page
   - Transaction detail view
   - Refund interface
   - Reconciliation dashboard
   - Fraud review queue

### Navigation Updates
Add menu items to `/frontend/src/components/layout/DashboardLayout.jsx`:

```javascript
// Add to navigation menu
{
  title: 'Events',
  icon: <CalendarIcon />,
  path: '/events',
  permission: 'events:view'
},
{
  title: 'Reservations',
  icon: <RestaurantIcon />,
  path: '/reservations',
  permission: 'reservations:view'
},
{
  title: 'Tickets',
  icon: <ConfirmationNumberIcon />,
  path: '/tickets',
  permission: 'tickets:view'
},
{
  title: 'Bookings',
  icon: <BookOnlineIcon />,
  path: '/bookings',
  permission: 'bookings:view'
},
{
  title: 'Transactions',
  icon: <PaymentIcon />,
  path: '/transactions',
  permission: 'transactions:view'
}
```

## Testing

### Backend Testing
```bash
cd admin-module/backend

# Test server startup
npm start

# Test API endpoints
curl http://localhost:3003/api/admin/health

# Test authentication
curl -X POST http://localhost:3003/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}'
```

### API Testing Examples

```bash
# Get events
curl http://localhost:3003/api/admin/events \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get reservations for today
curl http://localhost:3003/api/admin/reservations/today \
  -H "Authorization: Bearer YOUR_TOKEN"

# Validate ticket
curl http://localhost:3003/api/admin/tickets/validate/TICKET_NUMBER \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Summary

This integration adds **5 complete modules** to the HolidaiButler Admin platform:

- **5 comprehensive database models** (2,300+ lines total)
- **5 complete API route files** (3,450+ lines total)
- **5 frontend API services** (350+ lines total)
- **Full permission integration** for 4 user roles
- **Complete CRUD operations** for all modules
- **Advanced features**: search, filtering, pagination, bulk operations
- **Analytics & statistics** for all modules
- **Professional error handling** and validation

All backend code is complete and ready to use. Frontend UI components need to be built to provide user interfaces for these powerful backend systems.
