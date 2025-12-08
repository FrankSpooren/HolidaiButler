/* eslint-disable */
/* tslint:disable */
/*
 * ---------------------------------------------------------------
 * ## THIS FILE WAS GENERATED VIA SWAGGER-TYPESCRIPT-API        ##
 * ##                                                           ##
 * ## AUTHOR: acacode                                           ##
 * ## SOURCE: https://github.com/acacode/swagger-typescript-api ##
 * ---------------------------------------------------------------
 */

export interface AvailabilityResponse {
  success?: boolean;
  data?: {
    available?: boolean;
    capacity?: CapacityInfo;
    pricing?: PricingInfo;
    requestedQuantity?: number;
    canBook?: boolean;
  };
}

export interface AvailabilityData {
  success?: boolean;
  data?: {
    id?: number;
    poiId?: number;
    /** @format date */
    date?: string;
    timeslot?: string;
    totalCapacity?: number;
    availableCapacity?: number;
    bookedCapacity?: number;
    reservedCapacity?: number;
    /** @format double */
    basePrice?: number;
    /** @format double */
    finalPrice?: number;
    /** @example "EUR" */
    currency?: string;
    isSoldOut?: boolean;
  };
}

export interface CapacityInfo {
  total?: number;
  available?: number;
  booked?: number;
  reserved?: number;
}

export interface PricingInfo {
  /** @format double */
  basePrice?: number;
  /** @format double */
  finalPrice?: number;
  /** @example "EUR" */
  currency?: string;
  /** @format double */
  discount?: number;
}

export interface CreateBookingRequest {
  /** @example 123 */
  poiId: number;
  /**
   * @format date
   * @example "2025-12-25"
   */
  date: string;
  /** @example "10:00-12:00" */
  timeslot?: string;
  /**
   * @min 1
   * @example 2
   */
  quantity: number;
  /** @example "single" */
  ticketType: "single" | "group" | "family" | "vip";
  guestInfo: GuestInfo;
  guests?: GuestCount;
}

export interface GuestInfo {
  /** @example "John Doe" */
  name: string;
  /**
   * @format email
   * @example "john@example.com"
   */
  email: string;
  /** @example "+31612345678" */
  phone?: string;
}

export interface GuestCount {
  /**
   * @min 0
   * @example 2
   */
  adults?: number;
  /**
   * @min 0
   * @example 0
   */
  children?: number;
  /**
   * @min 0
   * @example 0
   */
  infants?: number;
}

export interface BookingResponse {
  id?: number;
  /** @example "BK-2025-001234" */
  bookingReference?: string;
  status?: "pending" | "confirmed" | "cancelled" | "completed";
  reservation?: {
    /** @format date-time */
    expiresAt?: string;
  };
  /** @format uri */
  paymentUrl?: string;
}

export interface BookingDetails {
  id?: number;
  bookingReference?: string;
  userId?: number;
  poiId?: number;
  status?: "pending" | "confirmed" | "cancelled" | "completed";
  paymentStatus?: "pending" | "paid" | "failed" | "refunded";
  /** @format date */
  bookingDate?: string;
  timeslot?: string;
  ticketType?: string;
  quantity?: number;
  /** @format double */
  totalAmount?: number;
  currency?: string;
  guestName?: string;
  guestEmail?: string;
  guestPhone?: string;
  adultsCount?: number;
  childrenCount?: number;
  infantsCount?: number;
  poi?: {
    id?: number;
    name?: string;
    location?: string;
  };
  /** @format date-time */
  createdAt?: string;
  /** @format date-time */
  updatedAt?: string;
}

export interface Ticket {
  id?: number;
  /** @example "HB-2025-001234" */
  ticketNumber?: string;
  bookingId?: number;
  userId?: number;
  poiId?: number;
  status?: "active" | "used" | "expired" | "cancelled";
  ticketType?: string;
  holderName?: string;
  holderEmail?: string;
  /** Encrypted QR code payload */
  qrCodeData?: string;
  /** @format uri */
  qrCodeImageUrl?: string;
  /** @format date-time */
  validFrom?: string;
  /** @format date-time */
  validUntil?: string;
  /** @format date-time */
  usedAt?: string;
  poi?: {
    name?: string;
    location?: string;
  };
  /** @format date-time */
  createdAt?: string;
}

export interface RefundInfo {
  /** @format double */
  amount?: number;
  currency?: string;
  refundId?: string;
  status?: "pending" | "completed" | "failed";
  /** @format date-time */
  processedAt?: string;
}

export interface ErrorResponse {
  /** @example false */
  success?: boolean;
  /** Human-readable error message */
  error?: string;
  /** Technical error details (optional) */
  message?: string;
}

// Event Types for NEW Ticketing Module
export interface Event {
  id: number;
  name: string;
  description?: string;
  imageUrl?: string;
  location?: string;
  venue?: string;
  category?: EventCategory;
  /** @format date-time */
  startDate: string;
  /** @format date-time */
  endDate?: string;
  status: 'draft' | 'active' | 'cancelled' | 'completed';
  availableTickets?: number;
  totalCapacity?: number;
  ticketTypes?: TicketType[];
  /** @format date-time */
  createdAt?: string;
  /** @format date-time */
  updatedAt?: string;
}

export type EventCategory = 'festival' | 'music' | 'gastronomy' | 'market' | 'wellness' | 'adventure' | 'sports' | 'culture' | 'other';

export interface TicketType {
  id: number;
  eventId?: number;
  name: string;
  description?: string;
  /** @format double */
  price: number;
  currency: string;
  maxPerOrder?: number;
  availableQuantity?: number;
  available?: number;
  isActive?: boolean;
}

export interface EventsResponse {
  success: boolean;
  data: Event[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export interface EventResponse {
  success: boolean;
  data: Event;
}

// Payment Session Types for Adyen Integration
export interface CreatePaymentSessionRequest {
  amount: number;
  currency: string;
  bookingReference: string;
  resourceType: 'ticket' | 'restaurant' | 'activity';
  resourceId: string;
  customerInfo: {
    name: string;
    email: string;
    phone?: string;
  };
  returnUrl: string;
}

export interface PaymentSessionResponse {
  success: boolean;
  data: {
    id: string;
    sessionData: string;
    clientKey: string;
    environment: 'test' | 'live';
    amount: {
      value: number;
      currency: string;
    };
    expiresAt?: string;
  };
}

export interface PaymentStatusResponse {
  success: boolean;
  data: {
    transactionId: string;
    status: 'pending' | 'authorized' | 'captured' | 'cancelled' | 'failed' | 'refunded';
    amount: number;
    currency: string;
    pspReference?: string;
    resultCode?: string;
    refusalReason?: string;
  };
}
