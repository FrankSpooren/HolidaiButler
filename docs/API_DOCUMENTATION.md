# HolidaiButler API Documentation

**Version:** 2.0.0
**Last Updated:** 1 December 2025

---

## Overview

The HolidaiButler platform provides a comprehensive API for tourism services including POI discovery, bookings, ticketing, payments, and AI-powered recommendations.

### Base URLs

| Environment | URL |
|-------------|-----|
| Production | `https://api.holidaibutler.com` |
| Staging | `https://staging-api.holidaibutler.com` |
| Development | `http://localhost:3001` |

### Authentication

Most endpoints require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

---

## Platform Core API (Port 3001)

### Health Check

#### GET /health

Check platform health status.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-12-01T12:00:00.000Z",
  "services": {
    "database": "connected",
    "redis": "connected",
    "eventBus": "active"
  }
}
```

---

### Public POI Endpoints

#### GET /api/v1/pois

Get paginated list of POIs.

**Query Parameters:**
| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| page | number | Page number | 1 |
| limit | number | Items per page | 20 |
| category | string | Filter by category | - |
| city | string | Filter by city | - |
| verified | boolean | Filter verified only | - |
| featured | boolean | Filter featured only | - |
| search | string | Search name/description | - |

**Response:**
```json
{
  "success": true,
  "data": {
    "pois": [
      {
        "id": "uuid",
        "name": "Restaurant Name",
        "slug": "restaurant-name",
        "category": "food_drinks",
        "subcategory": "restaurant",
        "description": "...",
        "latitude": 38.6446,
        "longitude": 0.0647,
        "address": "Street 123, Calpe",
        "city": "Calpe",
        "country": "Spain",
        "rating": 4.5,
        "review_count": 100,
        "price_level": 2,
        "verified": true,
        "active": true,
        "featured": false,
        "thumbnail_url": "https://..."
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8
    }
  }
}
```

#### GET /api/v1/pois/:id

Get single POI by ID.

**Response:**
```json
{
  "success": true,
  "data": {
    "poi": { ... }
  }
}
```

#### GET /api/v1/pois/categories

Get available categories.

**Response:**
```json
{
  "success": true,
  "data": {
    "categories": [
      { "id": "food_drinks", "name": "Restaurants & Bars", "count": 45 },
      { "id": "beach", "name": "Beaches", "count": 12 },
      { "id": "museum", "name": "Museums", "count": 8 }
    ]
  }
}
```

---

### HoliBot Chat API

#### POST /api/v1/chat/session

Create new chat session.

**Response:**
```json
{
  "success": true,
  "data": {
    "sessionId": "session-uuid"
  }
}
```

#### POST /api/v1/chat/message

Send message to chatbot.

**Request Body:**
```json
{
  "sessionId": "session-uuid",
  "message": "Can you recommend a restaurant?"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "response": "I found some great restaurants...",
    "pois": [ ... ],
    "intent": "search",
    "sessionId": "session-uuid"
  }
}
```

#### GET /api/v1/chat/session/:sessionId

Get chat session history.

#### DELETE /api/v1/chat/session/:sessionId

Delete chat session.

---

### HoliBot Widget API

#### GET /api/v1/holibot/categories

Get categories for widget display.

#### GET /api/v1/holibot/pois

Get POIs for widget.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| category | string | Filter by category |
| limit | number | Max results (default: 10) |

#### GET /api/v1/holibot/daily-tip

Get daily recommendation tip.

**Response:**
```json
{
  "success": true,
  "data": {
    "tip": "Try the local paella at La Bodega!",
    "poi": { ... }
  }
}
```

#### POST /api/v1/holibot/recommendations

Get personalized recommendations.

**Request Body:**
```json
{
  "preferences": {
    "categories": ["food_drinks", "beach"],
    "priceLevel": 3
  }
}
```

---

## Admin Module API (Port 3003)

### Authentication

#### POST /api/admin/auth/login

Admin login.

**Request Body:**
```json
{
  "email": "admin@holidaibutler.com",
  "password": "securepassword"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": { ... },
    "accessToken": "jwt-token",
    "refreshToken": "refresh-token",
    "expiresIn": "24h"
  }
}
```

#### POST /api/admin/auth/refresh

Refresh access token.

#### GET /api/admin/auth/me

Get current admin user.

#### POST /api/admin/auth/logout

Logout admin user.

---

### Admin POI Management

#### GET /api/admin/pois

Get all POIs (admin view with pagination).

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| page | number | Page number |
| limit | number | Items per page |
| category | string | Filter by category |
| verified | boolean | Filter by verification status |
| active | boolean | Filter by active status |
| search | string | Search query |

#### POST /api/admin/pois

Create new POI.

**Request Body:**
```json
{
  "name": "New Restaurant",
  "category": "food_drinks",
  "latitude": 38.6446,
  "longitude": 0.0647,
  "address": "Street 123",
  "city": "Calpe",
  "description": "..."
}
```

#### PUT /api/admin/pois/:id

Update POI.

#### DELETE /api/admin/pois/:id

Delete POI.

#### POST /api/admin/pois/:id/verify

Verify POI.

#### POST /api/admin/pois/:id/feature

Toggle featured status.

#### GET /api/admin/pois/stats

Get POI statistics.

#### POST /api/admin/pois/bulk

Bulk operations on POIs.

**Request Body:**
```json
{
  "action": "verify|unverify|activate|deactivate|delete",
  "ids": ["id1", "id2"]
}
```

---

### Admin Bookings

#### GET /api/admin/bookings

Get all bookings.

#### GET /api/admin/bookings/:id

Get single booking.

#### PUT /api/admin/bookings/:id/status

Update booking status.

#### POST /api/admin/bookings/:id/cancel

Cancel booking.

---

## Ticketing Module API (Port 3004)

### Tickets

#### GET /api/v1/tickets

Get user's tickets.

#### GET /api/v1/tickets/:id

Get single ticket.

#### POST /api/v1/tickets/:id/validate

Validate ticket (for entry).

#### POST /api/v1/tickets/:id/transfer

Transfer ticket to another person.

**Request Body:**
```json
{
  "recipientEmail": "newowner@example.com",
  "recipientName": "New Owner"
}
```

### Availability

#### GET /api/v1/availability/:poiId

Check availability for POI.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| date | string | Date (YYYY-MM-DD) |
| timeSlot | string | Time slot (optional) |

---

## Payment Module API (Port 3005)

### Payments

#### POST /api/v1/payments

Create payment session.

**Request Body:**
```json
{
  "bookingId": "booking-uuid",
  "amount": 99.99,
  "currency": "EUR",
  "returnUrl": "https://...",
  "metadata": { ... }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sessionId": "payment-session-id",
    "checkoutUrl": "https://checkout.adyen.com/..."
  }
}
```

#### GET /api/v1/payments/:id

Get payment status.

#### POST /api/v1/payments/:id/refund

Request refund.

**Request Body:**
```json
{
  "amount": 99.99,
  "reason": "Customer request"
}
```

### Webhooks

#### POST /api/webhooks/adyen

Adyen payment webhooks (internal use).

---

## Error Responses

All errors follow this format:

```json
{
  "success": false,
  "message": "Error description",
  "error": {
    "code": "ERROR_CODE",
    "details": { ... }
  }
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| UNAUTHORIZED | 401 | Missing or invalid token |
| FORBIDDEN | 403 | Insufficient permissions |
| NOT_FOUND | 404 | Resource not found |
| VALIDATION_ERROR | 400 | Invalid request data |
| RATE_LIMITED | 429 | Too many requests |
| SERVER_ERROR | 500 | Internal server error |

---

## Rate Limiting

| Endpoint Type | Limit | Window |
|---------------|-------|--------|
| Authentication | 5 requests | 15 minutes |
| Password Reset | 3 requests | 1 hour |
| General API | 100 requests | 15 minutes |
| Admin API | 200 requests | 15 minutes |
| Payment | 10 requests | 1 hour |

---

## Webhooks

Configure webhook URLs in your integration settings. All webhooks include:

```json
{
  "event": "event.type",
  "timestamp": "2025-12-01T12:00:00.000Z",
  "data": { ... },
  "signature": "hmac-sha256-signature"
}
```

### Available Events

| Event | Description |
|-------|-------------|
| booking.created | New booking created |
| booking.confirmed | Booking confirmed |
| booking.cancelled | Booking cancelled |
| payment.completed | Payment successful |
| payment.failed | Payment failed |
| payment.refunded | Refund processed |
| ticket.created | Ticket generated |
| ticket.validated | Ticket validated |
| ticket.transferred | Ticket transferred |

---

## SDK Support

Coming soon:
- JavaScript/TypeScript SDK
- React Native SDK
- Flutter SDK

---

## Support

- Documentation: https://docs.holidaibutler.com
- API Status: https://status.holidaibutler.com
- Support Email: api-support@holidaibutler.com
