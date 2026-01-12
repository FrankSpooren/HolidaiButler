---
version: 1.0.0
last_updated: 2026-01-12
author: Claude AI
status: active
---

# API Standards Skill

> Standaarden en conventies voor HolidaiButler API development

---

## 🎯 Doel

Deze skill beschrijft de API standaarden voor alle HolidaiButler endpoints, zodat agents en developers consistent werken.

---

## 🌐 Base URLs

| Omgeving | Base URL |
|----------|----------|
| Production | `https://api.holidaibutler.com` |
| Test | `https://api.test.holidaibutler.com` |
| Development | `https://api.dev.holidaibutler.com` |

---

## 📋 REST Conventions

### HTTP Methods

| Method | Gebruik | Voorbeeld |
|--------|---------|-----------|
| GET | Data ophalen | `GET /api/v1/pois` |
| POST | Nieuwe resource aanmaken | `POST /api/v1/pois` |
| PUT | Resource volledig updaten | `PUT /api/v1/pois/123` |
| PATCH | Resource deels updaten | `PATCH /api/v1/pois/123` |
| DELETE | Resource verwijderen | `DELETE /api/v1/pois/123` |

### URL Structure

```
/api/v{version}/{resource}/{id?}/{sub-resource?}
```

Voorbeelden:
- `GET /api/v1/pois` - Alle POIs
- `GET /api/v1/pois/123` - Specifieke POI
- `GET /api/v1/pois/123/reviews` - Reviews van POI
- `POST /api/v1/users/123/favorites` - Favoriet toevoegen

### Naming Conventions

- **Resources**: meervoud, lowercase, kebab-case
  - ✅ `/api/v1/pois`
  - ✅ `/api/v1/admin-users`
  - ❌ `/api/v1/POI`
  - ❌ `/api/v1/adminUsers`

- **Query parameters**: camelCase
  - ✅ `?pageSize=10&sortBy=name`
  - ❌ `?page_size=10&sort_by=name`

---

## 📨 Request Format

### Headers

```http
Content-Type: application/json
Accept: application/json
Authorization: Bearer <token>
Accept-Language: nl-NL  # of de-DE, en-GB
X-Request-ID: <uuid>    # voor tracing
```

### Request Body (POST/PUT/PATCH)

```json
{
  "name": "Restaurant Example",
  "categoryId": 5,
  "location": {
    "lat": 38.6447,
    "lng": 0.0453
  },
  "tags": ["seafood", "terrace"]
}
```

---

## 📤 Response Format

### Success Response

```json
{
  "success": true,
  "data": {
    "id": 123,
    "name": "Restaurant Example",
    "createdAt": "2026-01-12T10:30:00Z"
  },
  "meta": {
    "requestId": "abc-123-def"
  }
}
```

### List Response (with pagination)

```json
{
  "success": true,
  "data": [
    { "id": 1, "name": "POI 1" },
    { "id": 2, "name": "POI 2" }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "totalItems": 150,
    "totalPages": 8
  },
  "meta": {
    "requestId": "abc-123-def"
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "email",
        "message": "Must be a valid email address"
      }
    ]
  },
  "meta": {
    "requestId": "abc-123-def"
  }
}
```

---

## 🔢 HTTP Status Codes

### Success Codes

| Code | Meaning | Usage |
|------|---------|-------|
| 200 | OK | GET, PUT, PATCH success |
| 201 | Created | POST success |
| 204 | No Content | DELETE success |

### Client Error Codes

| Code | Meaning | Usage |
|------|---------|-------|
| 400 | Bad Request | Validation errors |
| 401 | Unauthorized | Missing/invalid token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate resource |
| 422 | Unprocessable Entity | Business logic error |
| 429 | Too Many Requests | Rate limit exceeded |

### Server Error Codes

| Code | Meaning | Usage |
|------|---------|-------|
| 500 | Internal Server Error | Unexpected error |
| 502 | Bad Gateway | Upstream service down |
| 503 | Service Unavailable | Maintenance mode |

---

## 🔐 Authentication

### JWT Token Structure

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

### Token Payload

```json
{
  "userId": 123,
  "email": "user@example.com",
  "role": "user",
  "iat": 1704970200,
  "exp": 1705056600
}
```

### Token Expiry
- Access token: 24 uur
- Refresh token: 30 dagen

### Public Endpoints (no auth required)
- `GET /api/v1/pois` (public POI data)
- `GET /api/v1/destinations`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/register`
- `GET /api/v1/health`

---

## 📄 Pagination

### Query Parameters

| Parameter | Default | Max | Description |
|-----------|---------|-----|-------------|
| page | 1 | - | Page number |
| pageSize | 20 | 100 | Items per page |
| sortBy | createdAt | - | Sort field |
| sortOrder | desc | - | asc or desc |

### Example

```
GET /api/v1/pois?page=2&pageSize=50&sortBy=name&sortOrder=asc
```

---

## 🔍 Filtering

### Query Parameter Filtering

```
GET /api/v1/pois?categoryId=5&destination=calpe&isActive=true
```

### Advanced Filtering

```
GET /api/v1/pois?rating[gte]=4&createdAt[gte]=2026-01-01
```

Operators:
- `[eq]` - Equal (default)
- `[ne]` - Not equal
- `[gt]` - Greater than
- `[gte]` - Greater than or equal
- `[lt]` - Less than
- `[lte]` - Less than or equal
- `[in]` - In array
- `[contains]` - String contains

---

## 🔎 Search

### Full-text Search

```
GET /api/v1/pois?search=restaurant+terrace
```

### Semantic Search (HoliBot)

```
POST /api/v1/holibot/query
{
  "query": "Where can I find the best paella in Calpe?",
  "language": "en",
  "limit": 5
}
```

---

## 📊 Rate Limiting

### Limits

| Endpoint Type | Limit | Window |
|---------------|-------|--------|
| Public | 100 requests | 1 minute |
| Authenticated | 300 requests | 1 minute |
| Admin | 1000 requests | 1 minute |
| HoliBot | 20 requests | 1 minute |

### Rate Limit Headers

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1704970260
```

### Rate Limit Exceeded Response

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later.",
    "retryAfter": 45
  }
}
```

---

## 🌍 Internationalization

### Accept-Language Header

```http
Accept-Language: nl-NL, de-DE;q=0.9, en-GB;q=0.8
```

### Response Language

POI data wordt geretourneerd in de gevraagde taal:

```json
{
  "id": 123,
  "name": "Peñón de Ifach",
  "description": {
    "nl": "De iconische rots van Calpe...",
    "de": "Der ikonische Felsen von Calpe...",
    "en": "The iconic rock of Calpe..."
  }
}
```

---

## 🏥 Health Endpoints

### Basic Health Check

```
GET /api/v1/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2026-01-12T10:30:00Z"
}
```

### Detailed Health Check (authenticated)

```
GET /api/v1/health/detailed
```

Response:
```json
{
  "status": "healthy",
  "services": {
    "database": "healthy",
    "redis": "healthy",
    "chromadb": "healthy",
    "mistral": "healthy"
  },
  "version": "2.1.0",
  "uptime": 86400
}
```

---

## 📝 Versioning

### URL Versioning

```
/api/v1/pois
/api/v2/pois
```

### Deprecation

Bij nieuwe versie:
1. Oude versie blijft 6 maanden werken
2. Deprecation header toevoegen:
   ```http
   Deprecation: true
   Sunset: Sat, 12 Jul 2026 00:00:00 GMT
   Link: </api/v2/pois>; rel="successor-version"
   ```

---

## ✅ API Checklist

Bij elke nieuwe endpoint:

- [ ] RESTful naming conventions?
- [ ] Correcte HTTP methods?
- [ ] Input validation met Zod?
- [ ] Juiste status codes?
- [ ] Error handling geïmplementeerd?
- [ ] Rate limiting geconfigureerd?
- [ ] Authentication waar nodig?
- [ ] Pagination voor lijsten?
- [ ] API documentatie bijgewerkt?
- [ ] Tests geschreven?

---

*Deze skill wordt beheerd door de Code Reviewer Agent.*
