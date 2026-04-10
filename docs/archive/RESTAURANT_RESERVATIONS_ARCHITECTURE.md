# Restaurant Reservations Module - Technical Architecture Report

**Date:** November 17, 2025
**Author:** HolidaiButler Development Team
**Version:** 1.0

---

## Executive Summary

This document outlines the architecture for a comprehensive restaurant reservation system, designed as a **separate but integrated module** alongside the existing ticketing system. The design is based on industry-leading platforms (TheFork, OpenTable, Resy) while leveraging shared infrastructure for payments, notifications, and availability management.

---

## 1. Strategic Decision: Separate Module with Shared Core

### Why a Separate Module?

#### **Different Business Logic**
- **Ticketing:** Capacity-based inventory, prepayment mandatory, QR validation, one-time transactions
- **Reservations:** Table-based inventory, deposits/guarantees, host greeting, recurring guest relationships

#### **Different Data Models**
- **Reservations Need:** Tables, floor plans, seating zones, guest profiles, dietary preferences, special occasions, waitlists
- **Ticketing Needs:** QR codes, entry validation, timeslots, ticket types, group management

#### **Different User Experiences**
- **Ticketing:** Self-service, instant confirmation, digital ticket delivery
- **Reservations:** Relationship-driven, preference management, two-way communication, walk-in handling

### Shared Core Components

The following components are shared between both modules to maximize code reuse:

```
┌─────────────────────────────────────────────────────────────┐
│                    SHARED CORE LIBRARY                      │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Availability Engine (Redis + MySQL)                 │  │
│  │  - Real-time inventory management                     │  │
│  │  - Reservation locking (15-minute holds)             │  │
│  │  - Capacity tracking                                  │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Payment Integration (Adyen)                          │  │
│  │  - Payment session creation                           │  │
│  │  - Transaction verification                           │  │
│  │  - Refund processing                                  │  │
│  │  - Deposit/guarantee handling                         │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Notification System (MailerLite)                     │  │
│  │  - Email confirmations                                │  │
│  │  - SMS reminders                                      │  │
│  │  - Two-way communication                              │  │
│  │  - Template management (multi-language)               │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Authentication & Authorization (JWT)                 │  │
│  │  - User authentication                                │  │
│  │  - Role-based access control                          │  │
│  │  - API key management for partners                    │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
           │                                    │
           ▼                                    ▼
┌────────────────────────┐          ┌────────────────────────┐
│  TICKETING MODULE      │          │  RESERVATIONS MODULE   │
│  - QR codes            │          │  - Table management    │
│  - Entry validation    │          │  - Floor plans         │
│  - Timeslots           │          │  - Guest CRM           │
│  - Ticket delivery     │          │  - Waitlist            │
│  - Group bookings      │          │  - Walk-ins            │
└────────────────────────┘          │  - Dietary prefs       │
                                    │  - Special occasions   │
                                    └────────────────────────┘
```

---

## 2. Industry Analysis: Best Practices

### TheFork (Europe Leader)

**Key Features:**
- Multi-channel booking aggregation (website, Instagram, Facebook, Google, TripAdvisor)
- Mobile-optimized management interface
- No-show prevention: re-confirmation emails/SMS, credit card guarantees, prepayment
- Cross-sell: suggest other restaurants when one is full
- Revenue Management Hub: real-time analytics
- 10-language support
- POS/CRM integrations (Oracle, Lightspeed, Cheerfy)

**Integration Model:** REST API with webhooks for real-time updates

### OpenTable (Global Standard)

**Key Features:**
- Automated table assignments to maximize seatings
- 24/7 bookability through 600+ affiliate partners
- Detailed guest insights and profiles
- POS integration for revenue tracking and auto-table statusing
- AI-powered guest tagging
- Integration with 200+ restaurant tools

**Business Model:** Flat monthly fee + per-reservation charges

### Resy (Premium Experience)

**Key Features:**
- Dynamic table optimization by seating zone/prominence
- Two-way texting for reservations and waitlist
- Automated waitlist management
- Setup in <24 hours
- No per-cover fees (flat monthly pricing)
- Round-the-clock support
- Mobile management from remote locations

**Differentiator:** Focus on guest experience and flexible table allocation

---

## 3. Database Schema Design

### Core Tables

#### **restaurants**
```sql
CREATE TABLE restaurants (
  id UUID PRIMARY KEY,

  -- Basic Info
  name VARCHAR(200) NOT NULL,
  slug VARCHAR(200) UNIQUE,
  description TEXT,
  cuisine_type VARCHAR(100),  -- Italian, French, Asian, etc.
  price_range ENUM('€', '€€', '€€€', '€€€€'),

  -- Location
  address_line1 VARCHAR(200),
  address_line2 VARCHAR(200),
  city VARCHAR(100),
  postal_code VARCHAR(20),
  country VARCHAR(2),
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),

  -- Contact
  phone VARCHAR(50),
  email VARCHAR(200),
  website VARCHAR(500),

  -- Media
  logo_url VARCHAR(500),
  cover_image_url VARCHAR(500),
  gallery_images JSON,  -- Array of image URLs

  -- Operating Hours (JSON structure)
  opening_hours JSON,
  /* Example:
  {
    "monday": {"open": "17:00", "close": "23:00", "closed": false},
    "tuesday": {"open": "17:00", "close": "23:00", "closed": false},
    ...
  }
  */

  -- Reservation Settings
  advance_booking_days INTEGER DEFAULT 90,
  min_party_size INTEGER DEFAULT 1,
  max_party_size INTEGER DEFAULT 12,
  default_seating_duration INTEGER DEFAULT 90,  -- minutes
  time_slot_interval INTEGER DEFAULT 15,  -- minutes

  -- Cancellation Policy
  cancellation_deadline_hours INTEGER DEFAULT 24,
  no_show_fee DECIMAL(10,2) DEFAULT 0,
  deposit_required BOOLEAN DEFAULT false,
  deposit_amount DECIMAL(10,2),
  deposit_percentage INTEGER,

  -- Features
  features JSON,
  /* Example:
  ["outdoor_seating", "wheelchair_accessible", "parking", "wifi", "live_music", "private_dining"]
  */

  -- Integrations
  pos_system VARCHAR(50),  -- toast, square, lightspeed, etc.
  pos_integration_enabled BOOLEAN DEFAULT false,
  thefork_restaurant_id VARCHAR(100),
  google_place_id VARCHAR(100),

  -- Status
  is_active BOOLEAN DEFAULT true,
  is_accepting_reservations BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,

  -- Analytics
  average_rating DECIMAL(3,2),
  total_reviews INTEGER DEFAULT 0,
  total_reservations INTEGER DEFAULT 0,

  -- Metadata
  created_by UUID,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_location (city, cuisine_type),
  INDEX idx_active (is_active, is_accepting_reservations),
  INDEX idx_featured (is_featured, average_rating),
  FULLTEXT INDEX idx_search (name, description, cuisine_type)
);
```

#### **tables**
```sql
CREATE TABLE tables (
  id UUID PRIMARY KEY,
  restaurant_id UUID NOT NULL,

  -- Table Identity
  table_number VARCHAR(50) NOT NULL,
  table_name VARCHAR(100),  -- "Window Table 1", "Patio Corner", etc.

  -- Capacity
  min_capacity INTEGER NOT NULL,
  max_capacity INTEGER NOT NULL,

  -- Location in Restaurant
  seating_area VARCHAR(100),  -- "Main Dining", "Patio", "Bar", "Private Room"
  floor_plan_x INTEGER,  -- X coordinate on floor plan
  floor_plan_y INTEGER,  -- Y coordinate on floor plan

  -- Attributes
  table_type ENUM('standard', 'bar', 'high_top', 'booth', 'outdoor', 'private') DEFAULT 'standard',
  features JSON,
  /* Example:
  ["window_view", "quiet", "round", "wheelchair_accessible", "power_outlet"]
  */

  -- Priority & Status
  priority INTEGER DEFAULT 0,  -- Higher priority tables assigned first
  is_active BOOLEAN DEFAULT true,
  is_available_for_online BOOLEAN DEFAULT true,

  -- Combination Rules
  can_combine_with JSON,  -- Array of table IDs that can be combined
  combined_capacity INTEGER,

  -- Metadata
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
  UNIQUE KEY unique_table (restaurant_id, table_number),
  INDEX idx_capacity (restaurant_id, min_capacity, max_capacity),
  INDEX idx_area (restaurant_id, seating_area),
  INDEX idx_availability (restaurant_id, is_active, is_available_for_online)
);
```

#### **reservations**
```sql
CREATE TABLE reservations (
  id UUID PRIMARY KEY,
  reservation_reference VARCHAR(50) UNIQUE NOT NULL,  -- RES-YYYY-NNNNNN

  -- Restaurant & Guest
  restaurant_id UUID NOT NULL,
  guest_id UUID,  -- NULL for guests without account

  -- Reservation Details
  reservation_date DATE NOT NULL,
  reservation_time TIME NOT NULL,
  party_size INTEGER NOT NULL,
  seating_duration INTEGER DEFAULT 90,  -- minutes
  expected_departure_time TIME,  -- Calculated: reservation_time + duration

  -- Table Assignment
  table_ids JSON,  -- Array of assigned table IDs (can be multiple for large parties)
  seating_area_preference VARCHAR(100),  -- "Patio", "Window", "Quiet Corner", etc.

  -- Guest Information
  guest_name VARCHAR(200) NOT NULL,
  guest_email VARCHAR(200) NOT NULL,
  guest_phone VARCHAR(50) NOT NULL,
  guest_language VARCHAR(5) DEFAULT 'en',

  -- Special Requests
  special_occasion ENUM('birthday', 'anniversary', 'business', 'date_night', 'celebration', 'none') DEFAULT 'none',
  special_requests TEXT,
  dietary_restrictions JSON,  -- ["vegetarian", "gluten_free", "nut_allergy", etc.]

  -- Status & Lifecycle
  status ENUM(
    'pending_confirmation',  -- Awaiting restaurant approval (manual mode)
    'confirmed',             -- Confirmed by restaurant or auto-confirmed
    'seated',                -- Guest has been seated
    'completed',             -- Meal finished, guest departed
    'no_show',              -- Guest didn't arrive
    'cancelled_by_guest',   -- Guest cancelled
    'cancelled_by_restaurant', -- Restaurant cancelled
    'waitlist'              -- On waitlist
  ) DEFAULT 'pending_confirmation',

  -- Confirmation
  confirmation_method ENUM('instant', 'manual', 'partner_api') DEFAULT 'instant',
  confirmed_at TIMESTAMP,
  confirmed_by UUID,  -- Restaurant staff user ID

  -- Check-in
  checked_in_at TIMESTAMP,
  seated_at TIMESTAMP,
  departed_at TIMESTAMP,
  actual_party_size INTEGER,  -- May differ from booked party_size

  -- Cancellation
  cancelled_at TIMESTAMP,
  cancellation_reason TEXT,
  cancellation_within_deadline BOOLEAN,

  -- Payment & Deposits
  deposit_required BOOLEAN DEFAULT false,
  deposit_amount DECIMAL(10,2) DEFAULT 0,
  deposit_status ENUM('not_required', 'pending', 'paid', 'refunded', 'forfeited') DEFAULT 'not_required',
  payment_transaction_id VARCHAR(100),
  paid_at TIMESTAMP,

  -- No-Show Prevention
  confirmation_sent_at TIMESTAMP,
  confirmation_method_used ENUM('email', 'sms', 'both'),
  guest_confirmed_at TIMESTAMP,  -- Guest clicked "Confirm" in email/SMS

  reminder_sent_at TIMESTAMP,
  sms_reminder_sent BOOLEAN DEFAULT false,
  email_reminder_sent BOOLEAN DEFAULT false,

  -- Source & Attribution
  source ENUM('web', 'mobile', 'phone', 'walk_in', 'thefork', 'google', 'instagram', 'facebook', 'partner_api') DEFAULT 'web',
  partner_reference_id VARCHAR(100),  -- Reference from TheFork, Google, etc.

  -- AI Context
  ai_message_id UUID,
  ai_recommendation_score DECIMAL(3,2),

  -- Guest History Context
  is_repeat_guest BOOLEAN DEFAULT false,
  previous_visits_count INTEGER DEFAULT 0,

  -- Internal Notes
  internal_notes TEXT,  -- For restaurant staff only
  vip_status BOOLEAN DEFAULT false,

  -- Metadata
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
  FOREIGN KEY (guest_id) REFERENCES users(id) ON DELETE SET NULL,

  INDEX idx_restaurant_date (restaurant_id, reservation_date, reservation_time),
  INDEX idx_guest (guest_id, status),
  INDEX idx_status (status, reservation_date),
  INDEX idx_reference (reservation_reference),
  INDEX idx_guest_email (guest_email, reservation_date),
  INDEX idx_source (restaurant_id, source, created_at)
);
```

#### **restaurant_availability**
```sql
CREATE TABLE restaurant_availability (
  id UUID PRIMARY KEY,
  restaurant_id UUID NOT NULL,

  -- Date & Time Slot
  date DATE NOT NULL,
  time_slot TIME NOT NULL,  -- E.g., "17:00", "17:15", "17:30", etc.

  -- Capacity Management
  total_covers INTEGER NOT NULL,  -- Total seats available
  reserved_covers INTEGER DEFAULT 0,  -- Confirmed reservations
  pending_covers INTEGER DEFAULT 0,  -- Pending (payment holds, 15-min locks)
  available_covers INTEGER,  -- Calculated: total - reserved - pending

  -- Table Allocation
  available_tables JSON,  -- Array of available table IDs

  -- Status
  is_available BOOLEAN DEFAULT true,
  is_sold_out BOOLEAN DEFAULT false,
  override_status ENUM('normal', 'private_event', 'closed', 'maintenance', 'weather') DEFAULT 'normal',

  -- Booking Restrictions
  min_party_size INTEGER,  -- Override restaurant default for this slot
  max_party_size INTEGER,

  -- Last Updated
  last_calculated_at TIMESTAMP,
  last_reservation_at TIMESTAMP,

  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
  UNIQUE KEY unique_slot (restaurant_id, date, time_slot),
  INDEX idx_date_available (restaurant_id, date, is_available),
  INDEX idx_covers (restaurant_id, date, available_covers)
);
```

#### **guests**
```sql
CREATE TABLE guests (
  id UUID PRIMARY KEY,
  user_id UUID,  -- Link to users table if registered, NULL for guest checkouts

  -- Identity
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(200) UNIQUE NOT NULL,
  phone VARCHAR(50),

  -- Preferences
  default_party_size INTEGER DEFAULT 2,
  preferred_seating_areas JSON,  -- ["patio", "window", "quiet"]
  dietary_restrictions JSON,  -- ["vegetarian", "gluten_free", etc.]

  -- Statistics
  total_reservations INTEGER DEFAULT 0,
  completed_reservations INTEGER DEFAULT 0,
  no_show_count INTEGER DEFAULT 0,
  cancellation_count INTEGER DEFAULT 0,

  -- Status
  is_vip BOOLEAN DEFAULT false,
  is_blacklisted BOOLEAN DEFAULT false,
  blacklist_reason TEXT,

  -- Communication Preferences
  marketing_consent BOOLEAN DEFAULT false,
  sms_notifications BOOLEAN DEFAULT true,
  email_notifications BOOLEAN DEFAULT true,

  -- Metadata
  language VARCHAR(5) DEFAULT 'en',
  timezone VARCHAR(50) DEFAULT 'Europe/Amsterdam',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_email (email),
  INDEX idx_stats (total_reservations, no_show_count),
  INDEX idx_vip (is_vip, is_blacklisted)
);
```

#### **guest_notes**
```sql
CREATE TABLE guest_notes (
  id UUID PRIMARY KEY,
  guest_id UUID NOT NULL,
  restaurant_id UUID NOT NULL,

  -- Note Content
  note TEXT NOT NULL,
  note_type ENUM('preference', 'allergy', 'incident', 'vip', 'general') DEFAULT 'general',

  -- Context
  created_by UUID,  -- Staff member who created the note
  is_alert BOOLEAN DEFAULT false,  -- Show as alert when guest books

  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (guest_id) REFERENCES guests(id) ON DELETE CASCADE,
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,

  INDEX idx_guest_restaurant (guest_id, restaurant_id),
  INDEX idx_alerts (restaurant_id, is_alert)
);
```

#### **waitlist**
```sql
CREATE TABLE waitlist (
  id UUID PRIMARY KEY,
  restaurant_id UUID NOT NULL,

  -- Guest Info
  guest_id UUID,
  guest_name VARCHAR(200) NOT NULL,
  guest_email VARCHAR(200) NOT NULL,
  guest_phone VARCHAR(50) NOT NULL,

  -- Waitlist Details
  desired_date DATE NOT NULL,
  desired_time_start TIME NOT NULL,  -- Flexible time range
  desired_time_end TIME NOT NULL,
  party_size INTEGER NOT NULL,

  -- Special Requests
  special_occasion VARCHAR(100),
  special_requests TEXT,

  -- Status
  status ENUM('active', 'notified', 'converted', 'expired', 'cancelled') DEFAULT 'active',

  -- Notifications
  notification_sent_at TIMESTAMP,
  notification_method ENUM('email', 'sms', 'both'),
  guest_responded_at TIMESTAMP,

  -- Conversion
  converted_to_reservation_id UUID,
  converted_at TIMESTAMP,

  -- Expiry
  expires_at TIMESTAMP,  -- Auto-expire after 7 days

  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
  FOREIGN KEY (guest_id) REFERENCES guests(id) ON DELETE SET NULL,
  FOREIGN KEY (converted_to_reservation_id) REFERENCES reservations(id) ON DELETE SET NULL,

  INDEX idx_restaurant_date (restaurant_id, desired_date, status),
  INDEX idx_guest (guest_id, status),
  INDEX idx_status_expiry (status, expires_at)
);
```

#### **floor_plans**
```sql
CREATE TABLE floor_plans (
  id UUID PRIMARY KEY,
  restaurant_id UUID NOT NULL,

  -- Floor Plan Identity
  name VARCHAR(100) NOT NULL,  -- "Main Floor", "Patio", "Private Room"
  description TEXT,

  -- Visual Layout
  layout_image_url VARCHAR(500),  -- Floor plan image
  layout_width INTEGER,  -- Image/canvas width in pixels
  layout_height INTEGER,  -- Image/canvas height in pixels

  -- Capacity
  total_tables INTEGER DEFAULT 0,
  total_capacity INTEGER DEFAULT 0,

  -- Status
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
  INDEX idx_restaurant (restaurant_id, is_active)
);
```

---

## 4. Backend Services Architecture

### Service Layer Structure

```
reservations-module/
├── backend/
│   ├── models/
│   │   ├── Restaurant.js
│   │   ├── Table.js
│   │   ├── Reservation.js
│   │   ├── Guest.js
│   │   ├── Waitlist.js
│   │   ├── FloorPlan.js
│   │   └── index.js
│   ├── services/
│   │   ├── RestaurantService.js      # Restaurant CRUD
│   │   ├── ReservationService.js     # Booking lifecycle
│   │   ├── TableManagementService.js # Table allocation
│   │   ├── GuestCRMService.js        # Guest profiles & history
│   │   ├── WaitlistService.js        # Waitlist management
│   │   ├── AvailabilityService.js    # (SHARED) Inventory management
│   │   ├── PaymentService.js         # (SHARED) Deposits & guarantees
│   │   ├── NotificationService.js    # (SHARED) Email/SMS
│   │   └── IntegrationService.js     # TheFork, Google, POS sync
│   ├── routes/
│   │   ├── restaurants.js
│   │   ├── reservations.js
│   │   ├── tables.js
│   │   ├── guests.js
│   │   ├── waitlist.js
│   │   └── webhooks.js
│   ├── middleware/
│   │   ├── auth.js                   # (SHARED) JWT validation
│   │   ├── validators.js
│   │   └── roleCheck.js
│   └── server.js
```

### Key Service Responsibilities

#### **ReservationService**
```javascript
class ReservationService {
  // Reservation Lifecycle
  async createReservation(reservationData)
    // 1. Check availability
    // 2. Optional: Assign tables automatically
    // 3. Create reservation record
    // 4. Reserve capacity (15-min lock for deposit payment)
    // 5. Optional: Create payment session for deposit
    // 6. Send confirmation email/SMS
    // Returns: reservationReference, status, paymentUrl (if deposit)

  async confirmReservation(reservationId, staffId)
    // Manual confirmation by restaurant staff
    // Updates status to 'confirmed'
    // Sends confirmation to guest

  async checkInGuest(reservationId, staffId)
    // Marks guest as 'seated'
    // Records actual party size
    // Updates table status in TableManagementService

  async completeReservation(reservationId, staffId)
    // Marks as 'completed'
    // Releases table capacity
    // Triggers post-visit email (review request)

  async cancelReservation(reservationId, cancelledBy, reason)
    // Checks cancellation deadline
    // Processes refund if applicable (or forfeit deposit)
    // Releases capacity
    // Updates guest statistics

  async markNoShow(reservationId, staffId)
    // Marks as 'no_show'
    // Charges no-show fee if applicable
    // Updates guest reputation (no_show_count++)
    // Releases capacity

  async modifyReservation(reservationId, updates)
    // Change date, time, party size
    // Re-check availability
    // Update table assignments
    // Send modification confirmation

  async getReservationsByRestaurant(restaurantId, filters)
    // Date range, status, seating area filters
    // Populated with guest and table details

  async getReservationsByGuest(guestId, filters)
    // Status, date range filters

  async sendReminders(date)
    // Automated job: send reminders 24h before
    // Email + SMS based on guest preferences
}
```

#### **TableManagementService**
```javascript
class TableManagementService {
  // Table Allocation
  async findAvailableTables(restaurantId, date, time, partySize, preferences)
    // Smart table matching algorithm
    // Considers: capacity, seating area, features, priority
    // Returns: single table or combination of tables

  async assignTables(reservationId, tableIds, staffId)
    // Manual table assignment by staff
    // Validates capacity
    // Updates reservation record

  async autoAssignTables(reservationId)
    // Automatic table assignment
    // Uses findAvailableTables() with optimization

  async optimizeTableAssignments(restaurantId, date, serviceTime)
    // Re-optimize all table assignments for a service
    // Maximizes covers per service
    // Suggests better table combinations

  async getFloorPlan(restaurantId, floorPlanId)
    // Returns floor plan with table positions
    // Includes current status (available, occupied, reserved)

  async updateTableStatus(tableId, status, reservationId)
    // Real-time status updates: available → reserved → occupied → cleaning → available

  async getTableTurnoverStats(restaurantId, dateRange)
    // Analytics: average seating duration, turnover rate per table
}
```

#### **GuestCRMService**
```javascript
class GuestCRMService {
  // Guest Profile Management
  async createOrUpdateGuest(guestData)
    // Upsert guest profile
    // De-duplicate by email

  async getGuestProfile(guestId)
    // Full profile with preferences, statistics, notes

  async getGuestHistory(guestId, restaurantId)
    // Reservation history for specific restaurant
    // Includes: total visits, favorite dishes (if POS integrated), spending

  async addGuestNote(guestId, restaurantId, note, createdBy)
    // Staff notes about guest preferences, incidents

  async markGuestAsVIP(guestId, restaurantId, reason)
    // VIP status management

  async flagGuestIssue(guestId, restaurantId, issueType, description)
    // Track problematic behavior: no-shows, late cancellations

  async getGuestInsights(guestId)
    // AI-powered insights: favorite cuisine, booking patterns, spending

  async sendMarketingCampaign(restaurantId, guestSegment, campaignData)
    // Targeted marketing to guest segments
    // Integrated with MailerLite
}
```

#### **WaitlistService**
```javascript
class WaitlistService {
  // Waitlist Management
  async addToWaitlist(waitlistData)
    // Add guest to waitlist for desired date/time
    // Set expiry (7 days default)

  async notifyWaitlistGuests(restaurantId, date, time, partySize)
    // When cancellation occurs, notify matching waitlist guests
    // Sends email/SMS with time-limited booking link

  async convertWaitlistToReservation(waitlistId, reservationData)
    // Guest responded to notification
    // Create reservation and mark waitlist as 'converted'

  async getWaitlistByRestaurant(restaurantId, filters)
    // View active waitlist
    // Sorted by priority (date, time, party size match)

  async expireOldWaitlistEntries()
    // Automated job: expire entries >7 days old
}
```

#### **IntegrationService**
```javascript
class IntegrationService {
  // Multi-Channel Booking Integration
  async syncTheForkReservations(restaurantId)
    // Poll TheFork API for new reservations
    // Create local reservation records
    // Two-way sync: push availability updates

  async handleGoogleBookingWebhook(webhookData)
    // Receive Google Reservations webhook
    // Create/update reservation

  async pushToInstagram(restaurantId, availabilityData)
    // Update Instagram booking link with availability

  async syncPOSData(restaurantId)
    // Pull guest spending data from POS (Toast, Square, etc.)
    // Enrich guest profiles with order history

  async pushAvailabilityToPartners(restaurantId, date)
    // Push real-time availability to TheFork, Google, etc.
}
```

---

## 5. API Endpoints

### Restaurant Management

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/v1/reservations/restaurants` | GET | Public | List all restaurants (with filters) |
| `/api/v1/reservations/restaurants/:id` | GET | Public | Get restaurant details |
| `/api/v1/reservations/restaurants/:id/availability` | GET | Public | Check availability for date/time |
| `/api/v1/reservations/restaurants/:id/opening-hours` | GET | Public | Get opening hours |
| `/api/v1/reservations/restaurants` | POST | Admin | Create restaurant |
| `/api/v1/reservations/restaurants/:id` | PUT | Admin | Update restaurant |
| `/api/v1/reservations/restaurants/:id/settings` | PUT | Restaurant | Update reservation settings |

### Reservation Booking (Guest)

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/v1/reservations/search` | POST | Optional | Search available restaurants |
| `/api/v1/reservations` | POST | Optional | Create new reservation |
| `/api/v1/reservations/:id` | GET | Required | Get reservation details |
| `/api/v1/reservations/:id/modify` | PUT | Required | Modify reservation |
| `/api/v1/reservations/:id/cancel` | DELETE | Required | Cancel reservation |
| `/api/v1/reservations/:id/confirm` | POST | Optional | Guest re-confirms (via email link) |
| `/api/v1/reservations/guest/:guestId` | GET | Required | Get guest's reservations |
| `/api/v1/reservations/lookup` | POST | Public | Find reservation by reference + email |

### Reservation Management (Restaurant Staff)

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/v1/reservations/restaurant/:restaurantId` | GET | Restaurant | Get all reservations (filtered) |
| `/api/v1/reservations/:id/check-in` | POST | Restaurant | Check in guest (mark as seated) |
| `/api/v1/reservations/:id/complete` | POST | Restaurant | Mark reservation as completed |
| `/api/v1/reservations/:id/no-show` | POST | Restaurant | Mark as no-show |
| `/api/v1/reservations/:id/assign-tables` | PUT | Restaurant | Assign tables manually |

### Table Management

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/v1/reservations/tables/restaurant/:restaurantId` | GET | Restaurant | Get all tables |
| `/api/v1/reservations/tables` | POST | Restaurant | Create table |
| `/api/v1/reservations/tables/:id` | PUT | Restaurant | Update table |
| `/api/v1/reservations/tables/:id` | DELETE | Restaurant | Delete table |
| `/api/v1/reservations/tables/restaurant/:restaurantId/floor-plan` | GET | Restaurant | Get floor plan with table status |
| `/api/v1/reservations/tables/:id/status` | PUT | Restaurant | Update table status (real-time) |

### Guest CRM

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/v1/reservations/guests/:id` | GET | Restaurant | Get guest profile |
| `/api/v1/reservations/guests/:id/history` | GET | Restaurant | Get guest reservation history |
| `/api/v1/reservations/guests/:id/notes` | POST | Restaurant | Add guest note |
| `/api/v1/reservations/guests/:id/vip` | PUT | Restaurant | Toggle VIP status |

### Waitlist

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/v1/reservations/waitlist` | POST | Optional | Add to waitlist |
| `/api/v1/reservations/waitlist/:id` | DELETE | Optional | Remove from waitlist |
| `/api/v1/reservations/waitlist/restaurant/:restaurantId` | GET | Restaurant | Get waitlist |
| `/api/v1/reservations/waitlist/:id/notify` | POST | Restaurant | Manually notify waitlist guest |

### Analytics & Reports

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/v1/reservations/analytics/restaurant/:restaurantId/dashboard` | GET | Restaurant | Dashboard metrics |
| `/api/v1/reservations/analytics/restaurant/:restaurantId/revenue` | GET | Restaurant | Revenue analytics |
| `/api/v1/reservations/analytics/restaurant/:restaurantId/no-shows` | GET | Restaurant | No-show trends |

### Webhooks (Partner Integrations)

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/v1/reservations/webhooks/thefork` | POST | API Key | Receive TheFork webhooks |
| `/api/v1/reservations/webhooks/google` | POST | API Key | Receive Google Reservations webhooks |
| `/api/v1/reservations/webhooks/pos/:system` | POST | API Key | Receive POS system webhooks |

---

## 6. Frontend Components

### Guest Booking Flow

```
1. RestaurantSearch.jsx
   - Search by location, cuisine, date, party size
   - Filters: price range, features, rating

2. RestaurantDetails.jsx
   - Restaurant info, gallery, menu
   - Reviews & ratings
   - Real-time availability calendar

3. TimeSlotSelection.jsx
   - Available time slots for selected date
   - Party size selection
   - Seating preferences

4. ReservationForm.jsx
   - Guest information (name, email, phone)
   - Special occasion, dietary restrictions
   - Special requests

5. ReservationPayment.jsx (if deposit required)
   - Adyen Drop-in for deposit payment
   - Clear pricing breakdown

6. ReservationConfirmation.jsx
   - Reservation details & reference number
   - Add to calendar (iCal)
   - Map & directions

7. MyReservations.jsx
   - View upcoming/past reservations
   - Modify or cancel reservations
```

### Restaurant Management Dashboard

```
1. ReservationsDashboard.jsx
   - Today's reservations (timeline view)
   - Quick actions: check-in, no-show, complete
   - Real-time table status

2. FloorPlanView.jsx
   - Visual floor plan with table status
   - Drag-and-drop table assignments
   - Capacity heatmap

3. GuestManagement.jsx
   - Guest search & profiles
   - Reservation history
   - Add notes, manage VIP status

4. WaitlistManagement.jsx
   - Active waitlist
   - Notify guests when availability opens

5. Analytics.jsx
   - Covers per service, revenue trends
   - No-show rates, cancellation trends
   - Popular time slots

6. Settings.jsx
   - Restaurant details
   - Table management
   - Reservation policies
   - Integration settings (TheFork, POS)
```

---

## 7. Shared Infrastructure Integration

### Payment Integration (Adyen)

**Deposit Handling:**
```javascript
// Small deposit (€10-20) or percentage (20-50%) to prevent no-shows
const depositAmount = Math.max(
  restaurant.deposit_amount,
  totalEstimatedBill * (restaurant.deposit_percentage / 100)
);

// Create payment session
const paymentSession = await PaymentService.createSession({
  amount: depositAmount * 100,  // cents
  currency: 'EUR',
  resourceType: 'reservation',
  resourceId: reservationId,
  metadata: { restaurantId, guestEmail, reservationDate }
});

// On payment success:
await ReservationService.confirmReservation(reservationId, paymentTransactionId);
```

**No-Show Fee Handling:**
```javascript
// If guest doesn't show up and deadline passed:
if (reservation.status === 'no_show' && !cancellationWithinDeadline) {
  // Charge no-show fee (full deposit or fixed amount)
  await PaymentService.forfeitDeposit(paymentTransactionId);
}
```

### Notification System (MailerLite)

**Automated Emails:**
```javascript
// 1. Reservation Confirmation
await NotificationService.sendEmail({
  to: guestEmail,
  template: 'reservation_confirmation',
  data: {
    restaurantName,
    date,
    time,
    partySize,
    specialRequests,
    mapUrl,
    addToCalendarUrl,
    modifyUrl,
    cancelUrl
  },
  language: guestLanguage
});

// 2. Reminder (24 hours before)
await NotificationService.sendEmail({
  to: guestEmail,
  template: 'reservation_reminder',
  data: { ... },
  language: guestLanguage
});

await NotificationService.sendSMS({
  to: guestPhone,
  message: `Reminder: Your reservation at ${restaurantName} tomorrow at ${time}. See you soon!`,
  language: guestLanguage
});

// 3. Post-Visit Review Request
await NotificationService.sendEmail({
  to: guestEmail,
  template: 'review_request',
  data: {
    restaurantName,
    reviewUrl
  },
  language: guestLanguage
});
```

### Availability Engine (Redis + MySQL)

**Real-Time Capacity Tracking:**
```javascript
// Check availability
const available = await AvailabilityService.checkAvailability({
  restaurantId,
  date,
  timeSlot,
  partySize
});

// Reserve capacity (15-min lock for payment)
await AvailabilityService.reserveSlot({
  reservationId,
  restaurantId,
  date,
  timeSlot,
  partySize,
  expiresIn: 900  // 15 minutes
});

// Confirm reservation (convert reserved → booked)
await AvailabilityService.confirmReservation(reservationId);

// Auto-release expired locks (cron job)
await AvailabilityService.releaseExpiredReservations();
```

---

## 8. Multi-Channel Integration Strategy

### TheFork Integration

```javascript
// Webhook handler for incoming reservations
POST /api/v1/reservations/webhooks/thefork
{
  "event": "reservation.created",
  "restaurant_id": "thefork-restaurant-id",
  "reservation": {
    "reference": "TF-123456",
    "date": "2025-12-25",
    "time": "19:00",
    "party_size": 4,
    "guest": {
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+31612345678"
    },
    "special_requests": "Window table if possible"
  }
}

// Two-way sync: Push availability updates to TheFork
await IntegrationService.pushAvailabilityToTheFork(restaurantId, date);
```

### Google Reservations Integration

```javascript
// Receive Google booking via Action Link
POST /api/v1/reservations/webhooks/google
{
  "reservation": { ... }
}

// Push real-time availability via Google Reservations API
await IntegrationService.updateGoogleAvailability(restaurantId, availabilityData);
```

### POS Integration (Toast, Square, Lightspeed)

```javascript
// Pull guest spending data to enrich CRM
const posData = await IntegrationService.syncPOSData(restaurantId);

// Update guest profile with spending, favorite dishes
await GuestCRMService.enrichProfile(guestId, posData);
```

---

## 9. Deployment Architecture

### Microservices Structure

```
┌─────────────────────────────────────────────────────────────┐
│                    LOAD BALANCER (NGINX)                    │
└────────────┬────────────────────────────────────┬───────────┘
             │                                    │
             ▼                                    ▼
┌────────────────────────┐          ┌────────────────────────┐
│  TICKETING MODULE      │          │  RESERVATIONS MODULE   │
│  Port: 3004            │          │  Port: 3006            │
│  - Events              │          │  - Restaurants         │
│  - Ticket sales        │          │  - Table reservations  │
│  - QR validation       │          │  - Guest CRM           │
└───────────┬────────────┘          └───────────┬────────────┘
            │                                    │
            └────────────────┬───────────────────┘
                             │
                             ▼
              ┌──────────────────────────┐
              │  SHARED SERVICES         │
              │  ┌────────────────────┐  │
              │  │ Payment Engine     │  │
              │  │ Port: 3005         │  │
              │  └────────────────────┘  │
              │  ┌────────────────────┐  │
              │  │ Notification       │  │
              │  │ Service (Queue)    │  │
              │  └────────────────────┘  │
              │  ┌────────────────────┐  │
              │  │ Availability       │  │
              │  │ Engine (Redis)     │  │
              │  └────────────────────┘  │
              └──────────────────────────┘
                             │
                             ▼
              ┌──────────────────────────┐
              │  PERSISTENCE LAYER       │
              │  ┌────────────────────┐  │
              │  │ MySQL (Hetzner)    │  │
              │  │ - Bookings         │  │
              │  │ - Tickets          │  │
              │  │ - Restaurants      │  │
              │  │ - Reservations     │  │
              │  └────────────────────┘  │
              │  ┌────────────────────┐  │
              │  │ Redis (Caching)    │  │
              │  │ - Availability     │  │
              │  │ - Session data     │  │
              │  └────────────────────┘  │
              └──────────────────────────┘
```

### Environment Variables (Reservations Module)

```bash
# Server
NODE_ENV=production
PORT=3006

# Database (Shared with Ticketing)
DATABASE_HOST=your-hetzner-mysql-host
DATABASE_PORT=3306
DATABASE_NAME=pxoziy_db1
DATABASE_USER=your-mysql-username
DATABASE_PASSWORD=your-mysql-password

# Redis (Shared)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB_AVAILABILITY=1

# Payment Engine (Shared)
PAYMENT_ENGINE_URL=http://localhost:3005

# Notification System (Shared)
MAILERLITE_API_KEY=your-mailerlite-api-key
MAILERLITE_FROM_EMAIL=reservations@holidaibutler.com

# TheFork Integration
THEFORK_API_KEY=your-thefork-api-key
THEFORK_API_URL=https://api.thefork.com/v1
THEFORK_WEBHOOK_SECRET=your-webhook-secret

# Google Reservations
GOOGLE_RESERVATIONS_API_KEY=your-google-api-key

# POS Integrations
TOAST_API_KEY=your-toast-api-key
SQUARE_ACCESS_TOKEN=your-square-token
LIGHTSPEED_API_KEY=your-lightspeed-key

# SMS Provider (Twilio)
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
TWILIO_PHONE_NUMBER=+31612345678

# URLs
RESERVATIONS_API_URL=http://localhost:3006
FRONTEND_URL=http://localhost:5173

# Security (Shared)
JWT_SECRET=your-jwt-secret
API_KEY_SECRET=your-api-key-secret
```

---

## 10. Migration & Rollout Strategy

### Phase 1: Foundation (Weeks 1-2)
- ✅ Implement database schema
- ✅ Create shared services library
- ✅ Build core reservation lifecycle (no integrations)
- ✅ Basic restaurant and table management

### Phase 2: Guest Experience (Weeks 3-4)
- ✅ Build guest booking flow (frontend)
- ✅ Implement availability checking
- ✅ Add payment integration for deposits
- ✅ Email/SMS notifications

### Phase 3: Restaurant Dashboard (Weeks 5-6)
- ✅ Floor plan management
- ✅ Reservation dashboard (timeline view)
- ✅ Guest CRM basics
- ✅ Check-in / no-show management

### Phase 4: Advanced Features (Weeks 7-8)
- ✅ Waitlist management
- ✅ Automated table optimization
- ✅ Analytics & reporting
- ✅ Guest notes & VIP management

### Phase 5: Integrations (Weeks 9-10)
- ✅ TheFork API integration
- ✅ Google Reservations webhooks
- ✅ POS integration (Toast / Square)
- ✅ Social media booking links

### Phase 6: Testing & Launch (Weeks 11-12)
- ✅ Beta testing with 3-5 pilot restaurants
- ✅ Load testing (concurrent bookings)
- ✅ Documentation & training materials
- ✅ Production deployment

---

## 11. Success Metrics

### Key Performance Indicators (KPIs)

**For Restaurants:**
- Table turnover rate (covers per service)
- No-show rate (target: <5%)
- Average party size
- Booking lead time (days in advance)
- Revenue per available seat hour (RevPASH)

**For Guests:**
- Booking conversion rate
- Repeat reservation rate
- Average time to book (UX metric)
- Modification/cancellation rate

**For Platform:**
- Total reservations processed
- Multi-channel booking distribution
- API uptime (target: 99.9%)
- Notification delivery rate

---

## 12. Conclusion & Next Steps

This architecture provides a **production-ready, enterprise-grade restaurant reservation system** that:

✅ **Leverages existing infrastructure** (payments, notifications, availability)
✅ **Follows industry best practices** (TheFork, OpenTable, Resy)
✅ **Scales independently** from the ticketing module
✅ **Supports multi-channel bookings** (web, mobile, TheFork, Google)
✅ **Includes advanced features** (guest CRM, waitlist, table optimization)

### Immediate Next Steps:

1. **Review & Approve Architecture** - Stakeholder sign-off
2. **Create Database Migration Scripts** - MySQL schema creation
3. **Set Up Development Environment** - Port 3006, separate repo or monorepo
4. **Begin Phase 1 Implementation** - Core reservation services

---

**Document Version:** 1.0
**Last Updated:** November 17, 2025
**Status:** Awaiting Approval for Implementation
