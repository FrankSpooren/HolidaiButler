# API Reference - HolidaiButler Admin Module

**Base URL:** `http://localhost:3003/api/admin` (development)
**Production URL:** `https://your-domain.com/api/admin`

**Authenticatie:** JWT Bearer Token in `Authorization` header

---

## 📋 Endpoint Overzicht

| Category | Endpoints | Count |
|----------|-----------|-------|
| Auth | Login, refresh, profile, password | 7 |
| POI Management | CRUD, search, stats, bulk | 9 |
| File Upload | Single, multiple, list, delete | 4 |
| Platform Config | Get, update sections | 7 |

**Totaal:** 27 endpoints

---

## 🔐 Authenticatie

### POST /auth/login
**Beschrijving:** Admin gebruiker inloggen

**Body:**
```json
{
  "email": "admin@holidaibutler.com",
  "password": "Admin123!@#"
}
```

**Response:** 200 OK
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": 1,
      "email": "admin@holidaibutler.com",
      "profile": {
        "firstName": "Platform",
        "lastName": "Administrator",
        "avatar": null,
        "phoneNumber": null,
        "language": "en"
      },
      "role": "platform_admin",
      "status": "active",
      "permissions": {
        "pois": { "create": true, "read": true, "update": true, "delete": true, "approve": true },
        "platform": { "branding": true, "content": true, "settings": true },
        "users": { "view": true, "manage": true },
        "media": { "upload": true, "delete": true }
      }
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Errors:**
- 400: Invalid credentials
- 401: Account locked (5 failed attempts)
- 401: Email not verified

---

### POST /auth/refresh
**Beschrijving:** Refresh access token

**Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:** 200 OK
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### GET /auth/me
**Beschrijving:** Get current user info

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response:** 200 OK
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "email": "admin@holidaibutler.com",
      "profile": { ... },
      "role": "platform_admin",
      "permissions": { ... }
    }
  }
}
```

---

### PUT /auth/profile
**Beschrijving:** Update user profile

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Body:**
```json
{
  "firstName": "New",
  "lastName": "Name",
  "phoneNumber": "+31612345678",
  "language": "nl",
  "avatar": "https://..."
}
```

**Response:** 200 OK

---

### POST /auth/change-password
**Beschrijving:** Change password

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Body:**
```json
{
  "currentPassword": "Admin123!@#",
  "newPassword": "NewSecurePass123!@#"
}
```

**Response:** 200 OK

**Errors:**
- 400: Current password incorrect
- 400: Password requirements not met (min 8 chars)

---

### POST /auth/forgot-password
**Beschrijving:** Request password reset email

**Body:**
```json
{
  "email": "admin@holidaibutler.com"
}
```

**Response:** 200 OK
```json
{
  "success": true,
  "message": "Password reset email sent"
}
```

---

### POST /auth/reset-password
**Beschrijving:** Reset password with token

**Body:**
```json
{
  "token": "reset-token-from-email",
  "newPassword": "NewSecurePass123!@#"
}
```

**Response:** 200 OK

**Errors:**
- 400: Invalid or expired token

---

## 📍 POI Management

### GET /pois
**Beschrijving:** List POIs with filters and pagination

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Query Parameters:**
```
?page=1
&limit=20
&search=restaurant
&status=active
&category=Restaurants
&city=Valencia
&country=Spain
```

**Response:** 200 OK
```json
{
  "success": true,
  "data": {
    "pois": [
      {
        "id": 1,
        "name": "Restaurant Name",
        "category": "Restaurants",
        "city": "Valencia",
        "country": "Spain",
        "latitude": 39.4699,
        "longitude": -0.3763,
        "description": "...",
        "verified": true,
        "rating": 4.5,
        "images": [...],
        "created_at": "2024-01-15T10:30:00Z"
      },
      ...
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 156,
      "totalPages": 8
    }
  }
}
```

---

### GET /pois/stats
**Beschrijving:** Get POI statistics

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response:** 200 OK
```json
{
  "success": true,
  "data": {
    "total": 1593,
    "active": 1450,
    "pending": 120,
    "inactive": 23,
    "byCategory": {
      "Restaurants": 450,
      "Hotels": 230,
      "Attractions": 340,
      ...
    }
  }
}
```

---

### GET /pois/:id
**Beschrijving:** Get single POI by ID

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response:** 200 OK
```json
{
  "success": true,
  "data": {
    "poi": {
      "id": 1,
      "name": "...",
      "category": "...",
      "description": "...",
      "latitude": 39.4699,
      "longitude": -0.3763,
      "images": [...],
      "opening_hours": {...},
      "contact_info": {...},
      "verified": true,
      "rating": 4.5,
      "created_at": "...",
      "updated_at": "..."
    }
  }
}
```

**Errors:**
- 404: POI not found
- 403: No permission to view this POI (POI Owner)

---

### POST /pois
**Beschrijving:** Create new POI

**Permission:** `pois.create`

**Headers:**
```
Authorization: Bearer <accessToken>
Content-Type: application/json
```

**Body:**
```json
{
  "name": "New Restaurant",
  "category": "Restaurants",
  "city": "Valencia",
  "country": "Spain",
  "latitude": 39.4699,
  "longitude": -0.3763,
  "description": "Great food and atmosphere",
  "images": ["url1", "url2"],
  "opening_hours": {
    "monday": "09:00-22:00",
    "tuesday": "09:00-22:00",
    ...
  },
  "contact_info": {
    "phone": "+34123456789",
    "email": "info@restaurant.com",
    "website": "https://restaurant.com"
  }
}
```

**Response:** 201 Created
```json
{
  "success": true,
  "message": "POI created successfully",
  "data": {
    "poi": {
      "id": 1594,
      ...
    }
  }
}
```

**Notes:**
- POI Owners: nieuwe POI krijgt `verified=0` (pending)
- Platform Admin/Editor: nieuwe POI krijgt `verified=1` (active)

---

### PUT /pois/:id
**Beschrijving:** Update POI

**Permission:** `pois.update` + ownership check (voor POI Owners)

**Headers:**
```
Authorization: Bearer <accessToken>
Content-Type: application/json
```

**Body:** (any fields to update)
```json
{
  "name": "Updated Name",
  "description": "Updated description",
  "images": ["new-url1", "new-url2"]
}
```

**Response:** 200 OK

**Errors:**
- 403: No permission to update this POI
- 404: POI not found

---

### PATCH /pois/:id/status
**Beschrijving:** Update POI status

**Permission:** `pois.update` or `pois.approve`

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Body:**
```json
{
  "status": "active"
}
```

**Valid statuses:** active, pending, inactive, closed_temporarily, closed_permanently

**Response:** 200 OK

---

### PATCH /pois/:id/verify
**Beschrijving:** Verify POI (DMO verification)

**Permission:** `pois.approve`

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response:** 200 OK
```json
{
  "success": true,
  "message": "POI verified successfully",
  "data": {
    "poi": {
      "id": 1,
      "verified": true,
      ...
    }
  }
}
```

---

### DELETE /pois/:id
**Beschrijving:** Delete POI

**Permission:** `pois.delete`

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response:** 200 OK
```json
{
  "success": true,
  "message": "POI deleted successfully"
}
```

**Errors:**
- 403: No permission to delete (only Platform Admin)
- 404: POI not found

---

### POST /pois/bulk/action
**Beschrijving:** Bulk actions on multiple POIs

**Permission:** varies by action

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Body:**
```json
{
  "poiIds": [1, 2, 3, 4, 5],
  "action": "activate"
}
```

**Valid actions:**
- `activate` - Set status to active
- `deactivate` - Set status to inactive
- `delete` - Delete POIs
- `mark_reviewed` - Mark as reviewed

**Response:** 200 OK
```json
{
  "success": true,
  "message": "Bulk action completed",
  "data": {
    "processed": 5,
    "failed": 0
  }
}
```

---

## 📤 File Upload

### POST /upload/:type
**Beschrijving:** Upload single file

**Permission:** `media.upload`

**Path Parameters:**
- `type`: pois, platform, avatars, documents

**Headers:**
```
Authorization: Bearer <accessToken>
Content-Type: multipart/form-data
```

**Form Data:**
```
file: [binary file data]
```

**Response:** 200 OK
```json
{
  "success": true,
  "message": "File uploaded successfully",
  "data": {
    "filename": "1705408920-abc123def456.jpg",
    "originalName": "restaurant-photo.jpg",
    "size": 245678,
    "mimetype": "image/jpeg",
    "url": "http://localhost:3003/uploads/pois/1705408920-abc123def456.jpg",
    "path": "uploads/pois/1705408920-abc123def456.jpg"
  }
}
```

**File Restrictions:**
- **Images:** JPEG, PNG, GIF, WebP, SVG
- **Documents:** PDF, DOC, DOCX, TXT
- **Max size:** 10MB per file

---

### POST /upload/:type/multiple
**Beschrijving:** Upload multiple files (max 10)

**Permission:** `media.upload`

**Form Data:**
```
files: [array of binary file data]
```

**Response:** 200 OK
```json
{
  "success": true,
  "message": "5 files uploaded successfully",
  "data": {
    "files": [
      {
        "filename": "...",
        "originalName": "...",
        "url": "...",
        ...
      },
      ...
    ]
  }
}
```

---

### GET /upload/:type
**Beschrijving:** List uploaded files

**Permission:** `media.upload`

**Response:** 200 OK
```json
{
  "success": true,
  "data": {
    "files": [
      {
        "filename": "1705408920-abc123def456.jpg",
        "size": 245678,
        "url": "http://localhost:3003/uploads/pois/1705408920-abc123def456.jpg",
        "createdAt": "2024-01-16T10:22:00Z",
        "modifiedAt": "2024-01-16T10:22:00Z"
      },
      ...
    ]
  }
}
```

---

### DELETE /upload/:type/:filename
**Beschrijving:** Delete uploaded file

**Permission:** `media.delete`

**Response:** 200 OK
```json
{
  "success": true,
  "message": "File deleted successfully",
  "data": {
    "filename": "1705408920-abc123def456.jpg"
  }
}
```

**Errors:**
- 400: Invalid filename (directory traversal attempt)
- 404: File not found

---

## ⚙️ Platform Configuration

### GET /platform
**Beschrijving:** Get complete platform configuration

**Permission:** `platform` (any)

**Response:** 200 OK
```json
{
  "success": true,
  "data": {
    "config": {
      "branding": {
        "logo": { "url": "...", "filename": "...", "uploadedAt": "..." },
        "colors": { "primary": "#1976d2", ... },
        "fonts": { "primary": "Roboto", ... }
      },
      "content": {
        "about": { "en": {...}, "es": {...}, "de": {...}, "fr": {...} },
        "faq": { "en": [...], ... }
      },
      "contact": {
        "email": {...},
        "phone": {...},
        "address": {...},
        "social": {...}
      },
      "legal": {
        "privacy": {...},
        "terms": {...},
        "cookies": {...},
        "gdpr": {...}
      },
      "settings": {
        "languages": {...},
        "currency": {...},
        "timezone": "Europe/Amsterdam",
        "maintenance": {...}
      },
      "features": {
        "chat": {...},
        "booking": {...},
        "reviews": {...}
      }
    }
  }
}
```

---

### PUT /platform/branding
**Beschrijving:** Update branding configuration

**Permission:** `platform.branding`

**Body:**
```json
{
  "colors": {
    "primary": "#1976d2",
    "secondary": "#dc004e"
  },
  "fonts": {
    "primary": "Roboto"
  },
  "logo_url": "https://..."
}
```

**Response:** 200 OK

---

### PUT /platform/content
**Beschrijving:** Update content configuration

**Permission:** `platform.content`

**Body:**
```json
{
  "about": {
    "en": {
      "title": "About Us",
      "description": "...",
      "content": "..."
    }
  },
  "faq": {
    "en": [
      {
        "question": "How does it work?",
        "answer": "...",
        "order": 1
      }
    ]
  }
}
```

**Response:** 200 OK

---

### PUT /platform/contact
**Beschrijving:** Update contact information

**Permission:** `platform.branding`

**Body:**
```json
{
  "email": {
    "general": "info@holidaibutler.com",
    "support": "support@holidaibutler.com"
  },
  "phone": {
    "main": "+31 20 123 4567"
  },
  "address": {
    "street": "Example Street 123",
    "city": "Amsterdam",
    "country": "Netherlands"
  }
}
```

**Response:** 200 OK

---

### PUT /platform/legal
**Beschrijving:** Update legal documents

**Permission:** `platform.settings`

**Body:**
```json
{
  "privacy": {
    "en": {
      "title": "Privacy Policy",
      "content": "...",
      "lastUpdated": "2024-01-16T00:00:00Z"
    }
  }
}
```

**Response:** 200 OK

---

### PUT /platform/settings
**Beschrijving:** Update platform settings

**Permission:** `platform.settings`

**Body:**
```json
{
  "languages": {
    "default": "en",
    "available": [
      {"code": "en", "name": "English", "enabled": true},
      {"code": "nl", "name": "Nederlands", "enabled": true}
    ]
  },
  "timezone": "Europe/Amsterdam",
  "maintenance": {
    "enabled": false
  }
}
```

**Response:** 200 OK

---

### PUT /platform/features
**Beschrijving:** Update feature toggles

**Permission:** `platform.settings`

**Body:**
```json
{
  "chat": {
    "enabled": true,
    "maxMessagesPerDay": 100
  },
  "booking": {
    "enabled": true,
    "requiresApproval": false
  },
  "reviews": {
    "enabled": true,
    "moderationRequired": true
  }
}
```

**Response:** 200 OK

---

## 🏥 Health Check

### GET /health
**Beschrijving:** API health check

**No authentication required**

**Response:** 200 OK
```json
{
  "success": true,
  "message": "Admin API is running",
  "timestamp": "2024-01-16T13:24:00.000Z",
  "environment": "development"
}
```

---

## ❌ Error Responses

Alle endpoints kunnen deze errors returnen:

### 400 Bad Request
```json
{
  "success": false,
  "message": "Validation error",
  "errors": ["Email is required", "Password must be at least 8 characters"]
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Invalid token"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "message": "Insufficient permissions"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Resource not found"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Internal server error",
  "stack": "..." // Only in development
}
```

---

## 🔒 Permission Requirements

| Endpoint | Required Permission |
|----------|-------------------|
| POST /pois | pois.create |
| PUT /pois/:id | pois.update + ownership |
| DELETE /pois/:id | pois.delete |
| PATCH /pois/:id/verify | pois.approve |
| POST /upload/* | media.upload |
| DELETE /upload/* | media.delete |
| PUT /platform/branding | platform.branding |
| PUT /platform/content | platform.content |
| PUT /platform/* | platform.settings |

**Platform Admin** heeft automatisch alle permissions.

---

**API Reference v1.0 - MySQL Edition**
