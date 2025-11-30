# HolidAIbutler Backend API

**Enterprise-Level Tourism Platform Backend**

RESTful API for the HolidAIbutler platform, providing comprehensive POI (Points of Interest) management, user authentication, Q&A system, and onboarding flow for tourism applications.

---

## 🎯 Features

### Core Functionality
- **JWT Authentication**: Secure user authentication with access tokens (15min) and refresh tokens (7 days)
- **POI Management**: Complete CRUD operations for Points of Interest with geospatial search
- **GeoJSON Export**: Map-ready POI data export for Leaflet.js integration
- **Q&A System**: Knowledge base linked to POIs via Google Place IDs
- **User Preferences**: Comprehensive user profile and preference management
- **Onboarding Flow**: Sequential 5-step onboarding process
- **Category Hierarchy**: 3-level category management with multi-language support
- **GDPR Compliance**: Full data erasure support (Article 17 - Right to be Forgotten)

### Enterprise Features
- **Security**: Helmet.js, CORS, rate limiting, SQL injection prevention
- **Logging**: Winston-based comprehensive logging system
- **Error Handling**: Centralized error handling with detailed error codes
- **Validation**: Input validation on all endpoints with express-validator
- **Transactions**: Database transaction support for data integrity
- **Multi-language**: 5 languages supported (nl, en, de, es, sv)
- **Session Management**: Database-stored refresh tokens with expiration

---

## 🛠 Tech Stack

- **Runtime**: Node.js 20+ LTS
- **Framework**: Express.js 4.18
- **Database**: MySQL/MariaDB (Hetzner Cloud)
- **Authentication**: JWT (jsonwebtoken) + bcrypt
- **Security**: Helmet, CORS, express-rate-limit
- **Validation**: express-validator
- **Logging**: Winston + Morgan
- **Environment**: dotenv

---

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: >= 18.0.0 (recommended 20.x LTS)
- **npm**: >= 9.0.0
- **MySQL/MariaDB**: 8.0+ or MariaDB 10.6+
- **Git**: For version control

---

## 🚀 Installation

### 1. Clone the Repository

```bash
cd "C:\Users\frank\OneDrive\Documenten\AI 2025\HolidAIbutler"
cd backend
```

### 2. Install Dependencies

```bash
npm install
```

This will install all required packages:
- express, mysql2, jsonwebtoken, bcrypt, dotenv
- cors, helmet, express-rate-limit, express-validator
- winston, morgan, cookie-parser, uuid

### 3. Configure Environment Variables

Copy the example environment file:

```bash
copy .env.example .env
```

Edit `.env` with your configuration:

```env
# Server Configuration
NODE_ENV=development
PORT=3000
API_BASE_URL=http://localhost:3000

# Database Configuration (Hetzner)
DB_HOST=your-hetzner-host.com
DB_PORT=3306
DB_NAME=holidaibutler
DB_USER=your_database_user
DB_PASSWORD=your_database_password

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_change_in_production_min_32_chars
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Security
COOKIE_SECRET=your_cookie_secret_min_32_chars
BCRYPT_ROUNDS=12

# CORS Configuration
CORS_ORIGIN=http://localhost:5173
CORS_CREDENTIALS=true

# Logging
LOG_LEVEL=info

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

**Important**: Never commit the `.env` file to version control!

---

## 🗄️ Database Setup

### 1. Deploy Database Schema

The complete database schema is located in:
```
C:\Users\frank\OneDrive\Documenten\AI 2025\HolidAIbutler\03-Architecture\DATABASE_SCHEMA.sql
```

**Deploy to Hetzner**:

```bash
# Connect to Hetzner MySQL
mysql -h your-hetzner-host.com -u your_user -p

# Create database
CREATE DATABASE holidaibutler CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# Select database
USE holidaibutler;

# Execute schema
source C:\Users\frank\OneDrive\Documenten\AI 2025\HolidAIbutler\03-Architecture\DATABASE_SCHEMA.sql
```

### 2. Verify Database Structure

The schema creates 8 tables:

1. **Users**: User accounts with authentication
2. **User_Preferences**: User preferences and settings
3. **Sessions**: Refresh token storage
4. **POI**: Points of Interest (1600+ records to migrate)
5. **QnA**: Questions & Answers linked to POIs
6. **Categories**: 3-level category hierarchy
7. **User_Interactions**: Interaction tracking
8. **GDPR_Logs**: Compliance audit trail

### 3. Run Migrations (Future)

```bash
npm run migrate
```

### 4. Seed Test Data (Future)

```bash
npm run seed
```

---

## ▶️ Running the Application

### Development Mode (with auto-restart)

```bash
npm run dev
```

This starts the server with **nodemon** for automatic restarts on file changes.

### Production Mode

```bash
npm start
```

### Expected Output

```
🚀 HolidAIbutler Backend API
✅ Database connection pool created
✅ Server listening on port 3000
📡 API Base URL: http://localhost:3000
🌍 Environment: development
```

### Health Check

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-10-31T10:30:00.000Z",
  "uptime": 120.5
}
```

---

## 📡 API Documentation

### Base URL

```
http://localhost:3000/api/v1
```

### Authentication

All protected routes require a JWT token in the Authorization header:

```
Authorization: Bearer <access_token>
```

### Response Format

All API responses follow this structure:

**Success**:
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "timestamp": "2025-10-31T10:30:00.000Z"
  }
}
```

**Error**:
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message"
  },
  "meta": {
    "timestamp": "2025-10-31T10:30:00.000Z",
    "path": "/api/v1/endpoint"
  }
}
```

### Endpoints Overview

#### Authentication (`/api/v1/auth`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/signup` | ❌ | Create new user account |
| POST | `/login` | ❌ | Login and get JWT tokens |
| POST | `/logout` | ✅ | Logout and invalidate refresh token |
| POST | `/refresh` | ❌ | Get new access token using refresh token |
| GET | `/me` | ✅ | Get current user info |

#### POIs (`/api/v1/pois`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | Optional | Search POIs with filters |
| GET | `/geojson` | Optional | Get POIs as GeoJSON FeatureCollection |
| GET | `/:id` | Optional | Get POI by database ID |
| GET | `/google/:placeid` | Optional | Get POI by Google Place ID |
| GET | `/:id/qna` | ❌ | Get Q&A for specific POI |

**GeoJSON Format** (for Leaflet.js):
```json
{
  "type": "FeatureCollection",
  "metadata": {
    "generated": "2025-10-31T10:30:00.000Z",
    "count": 150
  },
  "features": [
    {
      "type": "Feature",
      "id": 1,
      "geometry": {
        "type": "Point",
        "coordinates": [4.89, 52.37]
      },
      "properties": {
        "google_placeid": "ChIJ...",
        "name": "Rijksmuseum",
        "category": "Museum",
        "rating": 4.7
      }
    }
  ]
}
```

**Important**: Coordinates are in `[longitude, latitude]` order (GeoJSON standard).

#### Users (`/api/v1/users`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/profile` | ✅ | Get user profile |
| PUT | `/profile` | ✅ | Update user profile |
| DELETE | `/account` | ✅ | Delete account (GDPR) |
| GET | `/preferences` | ✅ | Get user preferences |
| PUT | `/preferences` | ✅ | Update preferences |
| GET | `/saved-pois` | ✅ | Get saved POIs |
| POST | `/saved-pois/:poiId` | ✅ | Save a POI |
| DELETE | `/saved-pois/:poiId` | ✅ | Unsave a POI |
| GET | `/interactions` | ✅ | Get interaction history |

#### Q&A (`/api/v1/qna`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | ❌ | Get Q&As with filters |
| POST | `/` | ✅ | Add new Q&A |

**Q&A ↔ POI Linking**: Q&As are linked to POIs via `google_placeid` (foreign key).

#### Onboarding (`/api/v1/onboarding`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/status` | ✅ | Get onboarding status |
| PUT | `/steps/:stepNumber` | ✅ | Save onboarding step data |
| POST | `/complete` | ✅ | Mark onboarding as complete |

**Onboarding Steps**:
1. Travel companion selection
2. Interest selection
3. Location preferences
4. Stay type preferences
5. Review & confirmation

#### Categories (`/api/v1/categories`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | ❌ | Get category hierarchy |
| GET | `/:id` | ❌ | Get category details |
| GET | `/:id/pois` | ❌ | Get POIs in category |

---

## 📁 Project Structure

```
backend/
├── src/
│   ├── config/
│   │   └── database.js          # MySQL connection pool + transaction support
│   ├── controllers/
│   │   ├── auth.controller.js   # JWT authentication (390 lines)
│   │   ├── poi.controller.js    # POI management + GeoJSON (230 lines)
│   │   ├── user.controller.js   # User management + GDPR (580 lines)
│   │   ├── qna.controller.js    # Q&A system (150 lines)
│   │   ├── onboarding.controller.js  # Onboarding flow (280 lines)
│   │   └── category.controller.js    # Category hierarchy (200 lines)
│   ├── middleware/
│   │   ├── auth.js              # JWT verification + optional auth
│   │   └── errorHandler.js      # Centralized error handling
│   ├── routes/
│   │   ├── index.js             # Route aggregator
│   │   ├── auth.routes.js
│   │   ├── poi.routes.js
│   │   ├── user.routes.js
│   │   ├── qna.routes.js
│   │   ├── onboarding.routes.js
│   │   └── category.routes.js
│   ├── utils/
│   │   └── logger.js            # Winston logger configuration
│   └── server.js                # Express app setup + middleware
├── logs/                        # Winston log files (gitignored)
│   ├── error.log
│   └── combined.log
├── scripts/                     # Database migration & seed scripts
│   ├── migrate-database.js
│   ├── seed-database.js
│   └── export-poi-geojson.js
├── tests/                       # Jest test files (future)
├── .env                         # Environment variables (gitignored)
├── .env.example                 # Environment template
├── .gitignore
├── package.json
└── README.md
```

---

## 🔧 Development Guidelines

### Code Quality Standards

This project follows **enterprise-level quality standards**:

1. **Input Validation**: All endpoints validate inputs before processing
2. **Error Handling**: Try-catch blocks with centralized error handler
3. **Security**: Parameterized queries, helmet, CORS, rate limiting
4. **Logging**: Comprehensive Winston logging for debugging
5. **Transactions**: Use transactions for multi-step operations
6. **Consistency**: Uniform response format across all endpoints
7. **Documentation**: JSDoc comments for all functions

### Code Style

- **ES6+ syntax**: Use modern JavaScript features
- **Async/await**: Prefer over callbacks or raw promises
- **Destructuring**: Use for cleaner code
- **Arrow functions**: For concise function expressions
- **Naming conventions**:
  - Variables/functions: camelCase
  - Constants: UPPER_SNAKE_CASE
  - Files: kebab-case or camelCase

### Database Queries

**Always use parameterized queries** to prevent SQL injection:

```javascript
// ✅ GOOD - Parameterized
const users = await query('SELECT * FROM Users WHERE email = ?', [email]);

// ❌ BAD - String interpolation (vulnerable to SQL injection)
const users = await query(`SELECT * FROM Users WHERE email = '${email}'`);
```

### Error Handling Pattern

```javascript
exports.someEndpoint = async (req, res, next) => {
  try {
    // Validation
    if (!someInput) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Input required'
        }
      });
    }

    // Business logic
    const result = await query('SELECT ...');

    // Success response
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Some endpoint error:', error);
    next(error);  // Pass to centralized error handler
  }
};
```

### Transaction Usage

For operations that modify multiple tables:

```javascript
const { transaction } = require('../config/database');

await transaction(async (connection) => {
  await connection.execute('INSERT INTO Table1 ...');
  await connection.execute('UPDATE Table2 ...');
  // Auto-commit on success, auto-rollback on error
});
```

---

## 🧪 Testing

### Run Tests

```bash
npm test
```

### Run Tests in Watch Mode

```bash
npm run test:watch
```

### Test Coverage

```bash
npm test -- --coverage
```

Coverage reports will be in `coverage/` directory.

### Testing Best Practices

- Write unit tests for all controllers
- Use `supertest` for API endpoint testing
- Mock database calls in unit tests
- Aim for >80% code coverage
- Test error cases, not just happy paths

---

## 🚢 Deployment

### Prerequisites

- Hetzner Cloud VPS (recommended: CX21 or higher)
- MySQL/MariaDB database (already deployed)
- Node.js 20+ installed on server
- PM2 or systemd for process management

### Deployment Steps

1. **Configure Environment**

```bash
# On server
cd /var/www/holidaibutler-backend
nano .env
# Set NODE_ENV=production
# Update DB credentials
# Set strong JWT_SECRET
```

2. **Install Dependencies**

```bash
npm ci --production
```

3. **Run Database Migrations**

```bash
npm run migrate
```

4. **Start with PM2**

```bash
pm2 start src/server.js --name holidaibutler-api
pm2 save
pm2 startup
```

5. **Configure Reverse Proxy (Nginx)**

```nginx
server {
    listen 80;
    server_name api.holidaibutler.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

6. **SSL Certificate (Certbot)**

```bash
certbot --nginx -d api.holidaibutler.com
```

### Monitoring

```bash
# View logs
pm2 logs holidaibutler-api

# Monitor performance
pm2 monit

# Restart
pm2 restart holidaibutler-api
```

---

## 🔒 Security Considerations

### Production Checklist

- [ ] Change `JWT_SECRET` to cryptographically secure random string (min 32 chars)
- [ ] Change `COOKIE_SECRET` to unique secure string
- [ ] Set `NODE_ENV=production`
- [ ] Use strong database passwords
- [ ] Enable SSL/TLS for database connections
- [ ] Configure CORS with specific origins (no wildcards)
- [ ] Set up firewall rules (only allow ports 80, 443, SSH)
- [ ] Enable rate limiting (already configured)
- [ ] Regular security updates: `npm audit fix`
- [ ] Use environment variables for all secrets (never hardcode)
- [ ] Enable database backups
- [ ] Set up monitoring and alerting
- [ ] Review logs regularly for suspicious activity

### GDPR Compliance

The API implements:

- **Right to Access** (Article 15): `GET /api/v1/users/profile`
- **Right to Rectification** (Article 16): `PUT /api/v1/users/profile`
- **Right to Erasure** (Article 17): `DELETE /api/v1/users/account`
- **Audit Logging**: All GDPR actions logged to `GDPR_Logs` table
- **Data Retention**: Configurable auto-delete for interactions

---

## 🐛 Troubleshooting

### Database Connection Errors

**Error**: `ER_ACCESS_DENIED_ERROR`

**Solution**: Check database credentials in `.env`:
```bash
DB_HOST=your-hetzner-host.com
DB_USER=correct_username
DB_PASSWORD=correct_password
```

### Port Already in Use

**Error**: `EADDRINUSE: address already in use :::3000`

**Solution**: Change port in `.env` or kill existing process:
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/Mac
lsof -i :3000
kill -9 <PID>
```

### JWT Token Errors

**Error**: `JsonWebTokenError: invalid signature`

**Solution**: Ensure `JWT_SECRET` matches between token generation and verification.

### GeoJSON Coordinate Issues

**Issue**: Map markers appear in wrong locations

**Solution**: Ensure coordinates are in `[longitude, latitude]` order, not `[lat, lon]`.

---

## 📚 Additional Documentation

- **Database Schema**: `../03-Architecture/DATABASE_SCHEMA.sql`
- **API Examples**: `../03-Architecture/API_ENDPOINTS.md`
- **Session Handover**: `../SESSION_HANDOVER_2025-10-31_PHASE4.md`
- **Phase 4 Plan**: `../04-Development/PHASE_4_KICKOFF.md`

---

## 🤝 Contributing

### Development Workflow

1. Create feature branch: `git checkout -b feature/your-feature`
2. Make changes following code quality standards
3. Write tests for new functionality
4. Run linter: `npm run lint`
5. Run tests: `npm test`
6. Commit with descriptive message
7. Push and create pull request

### Commit Message Format

```
feat: Add new endpoint for POI filtering
fix: Resolve JWT token expiration issue
docs: Update API documentation
refactor: Improve database query performance
test: Add tests for authentication flow
```

---

## 📞 Support

For issues, questions, or contributions:

- **Project Lead**: Frank - HolidAIbutler
- **Documentation**: See `/docs` directory
- **Issues**: Create issue in project repository

---

## 📄 License

MIT License - See LICENSE file for details

---

## 🎯 Project Status

**Phase 4 - Week 1: Backend Development** ✅ 95% Complete

### Completed
- ✅ Project structure and configuration
- ✅ Express server with full middleware stack
- ✅ Database connection pool + transaction support
- ✅ JWT authentication system
- ✅ All 6 controllers (auth, POI, user, Q&A, onboarding, categories)
- ✅ All 7 route modules
- ✅ Error handling and logging
- ✅ GDPR compliance implementation
- ✅ GeoJSON export for map integration
- ✅ Comprehensive documentation

### Remaining
- ⏳ Database deployment to Hetzner
- ⏳ Data migration (1600+ POIs)
- ⏳ End-to-end testing
- ⏳ Migration and seed scripts

### Next Phase
**Week 2**: Frontend development (React + Vite + TypeScript + Leaflet.js)

---

**Built with ❤️ for enterprise-level quality**

Last Updated: 2025-10-31
