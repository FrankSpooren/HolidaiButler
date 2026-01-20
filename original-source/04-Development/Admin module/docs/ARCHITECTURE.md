# Architecture Overview - HolidaiButler Admin Module

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT LAYER                         │
│  ┌────────────────────────────────────────────────┐    │
│  │  React Admin Dashboard (Port 5174)             │    │
│  │  - Material-UI Components                      │    │
│  │  - Zustand State Management                    │    │
│  │  - React Router (SPA)                          │    │
│  │  - Axios HTTP Client                           │    │
│  └────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
                           │
                           │ HTTPS/REST API
                           ▼
┌─────────────────────────────────────────────────────────┐
│                   API LAYER                             │
│  ┌────────────────────────────────────────────────┐    │
│  │  Express.js Server (Port 3003)                 │    │
│  │  ┌──────────────────────────────────────────┐  │    │
│  │  │  Routes                                   │  │    │
│  │  │  - /api/admin/auth                        │  │    │
│  │  │  - /api/admin/pois                        │  │    │
│  │  │  - /api/admin/upload                      │  │    │
│  │  │  - /api/admin/platform                    │  │    │
│  │  └──────────────────────────────────────────┘  │    │
│  │  ┌──────────────────────────────────────────┐  │    │
│  │  │  Middleware                               │  │    │
│  │  │  - JWT Verification                       │  │    │
│  │  │  - Role/Permission Checks                 │  │    │
│  │  │  - Rate Limiting                          │  │    │
│  │  │  - Activity Logging                       │  │    │
│  │  └──────────────────────────────────────────┘  │    │
│  └────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                  DATA LAYER                             │
│  ┌─────────────────────┐  ┌──────────────────────────┐ │
│  │   MongoDB           │  │  Local File System       │ │
│  │  - AdminUsers       │  │  - uploads/pois/         │ │
│  │  - PlatformConfig   │  │  - uploads/platform/     │ │
│  │  - POIs (shared)    │  │  - uploads/avatars/      │ │
│  │  - Users (shared)   │  │  - uploads/documents/    │ │
│  └─────────────────────┘  └──────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## 🔐 Authentication Flow

```
┌──────┐                ┌──────────┐              ┌──────────┐
│Client│                │  Server  │              │ Database │
└──┬───┘                └────┬─────┘              └────┬─────┘
   │                         │                         │
   │ 1. POST /auth/login     │                         │
   │ {email, password}       │                         │
   ├────────────────────────>│                         │
   │                         │ 2. Find user            │
   │                         ├────────────────────────>│
   │                         │                         │
   │                         │ 3. User data            │
   │                         │<────────────────────────┤
   │                         │                         │
   │                         │ 4. Verify password      │
   │                         │    (bcrypt compare)     │
   │                         │                         │
   │                         │ 5. Generate JWT         │
   │                         │    - Access token       │
   │                         │    - Refresh token      │
   │                         │                         │
   │ 6. Tokens + User data   │                         │
   │<────────────────────────┤                         │
   │                         │                         │
   │ 7. Store tokens in      │                         │
   │    localStorage         │                         │
   │                         │                         │
   │ 8. Subsequent requests  │                         │
   │ Authorization: Bearer   │                         │
   ├────────────────────────>│                         │
   │                         │ 9. Verify JWT           │
   │                         │                         │
   │                         │ 10. Check permissions   │
   │                         │                         │
   │ 11. Response            │                         │
   │<────────────────────────┤                         │
```

## 📊 Data Models

### AdminUser Model
```javascript
{
  _id: ObjectId,
  email: String,                    // Unique, indexed
  password: String,                 // Bcrypt hashed

  profile: {
    firstName: String,
    lastName: String,
    avatar: String,                 // URL
    phoneNumber: String,
    language: 'en'|'es'|'de'|'fr'
  },

  role: 'platform_admin'|'poi_owner'|'editor'|'reviewer',

  permissions: {
    pois: { create, read, update, delete, approve },
    platform: { branding, content, settings },
    users: { view, manage },
    media: { upload, delete }
  },

  ownedPOIs: [ObjectId],            // For POI owners

  status: 'active'|'suspended'|'pending',

  security: {
    emailVerified: Boolean,
    verificationToken: String,
    resetPasswordToken: String,
    loginAttempts: Number,
    lockUntil: Date,
    lastLogin: Date,
    twoFactorEnabled: Boolean
  },

  activityLog: [{
    action: String,
    resource: String,
    timestamp: Date,
    ipAddress: String
  }],

  createdAt: Date,
  updatedAt: Date
}
```

### PlatformConfig Model
```javascript
{
  _id: 'platform_config',           // Singleton

  branding: {
    logo: { url, filename },
    favicon: { url, filename },
    colors: {
      primary: '#1976d2',
      secondary: '#dc004e',
      accent: '#9c27b0'
    },
    fonts: {
      primary: 'Roboto',
      heading: 'Montserrat'
    }
  },

  content: {
    about: {
      en: { title, description, content },
      es: { ... },
      de: { ... },
      fr: { ... }
    },
    faq: {
      en: [{ question, answer, order }],
      ...
    }
  },

  contact: {
    email: { general, support, sales },
    phone: { main, support },
    address: { street, city, country },
    social: { facebook, twitter, instagram }
  },

  legal: {
    privacy: { en, es, de, fr },
    terms: { en, es, de, fr },
    cookies: { en, es, de, fr }
  },

  settings: {
    languages: {
      available: [{ code, name, enabled }],
      default: 'en'
    },
    currency: { default: 'EUR', supported: [] },
    timezone: 'Europe/Amsterdam'
  },

  metadata: {
    lastModifiedBy: ObjectId,
    lastModifiedAt: Date,
    version: Number
  }
}
```

## 🔄 Request Flow

### POI Creation Flow
```
User → Login → Get Token → Create POI Request
                    ↓
            Verify Token Middleware
                    ↓
        Check 'pois.create' Permission
                    ↓
         Validate Request Data
                    ↓
    Set dataSource = 'manual'
    Set status based on role
    (POI owner → 'pending')
    (Admin → 'active')
                    ↓
        Save to MongoDB
                    ↓
    Add to user.ownedPOIs (if POI owner)
                    ↓
        Log Activity
                    ↓
        Return Success
```

### Permission Check Flow
```
Request with JWT Token
        ↓
Extract userId from token
        ↓
Load user from database
        ↓
Check user.role
        ↓
Is platform_admin? → ✅ Allow
        ↓ No
Check permissions object
permissions[resource][action]
        ↓
true? → ✅ Allow
false? → ❌ Deny (403)
```

## 🗂️ Folder Structure

### Backend
```
backend/
├── models/              # Mongoose schemas
│   ├── AdminUser.js
│   └── PlatformConfig.js
├── routes/              # Express routes
│   ├── adminAuth.js     # Auth endpoints
│   ├── adminPOI.js      # POI CRUD
│   ├── adminUpload.js   # File uploads
│   └── adminPlatform.js # Config management
├── middleware/          # Custom middleware
│   └── adminAuth.js     # Auth & permissions
├── controllers/         # (Future) Business logic
├── services/            # (Future) External services
├── utils/               # Helper functions
├── scripts/             # Utility scripts
│   └── seedAdmin.js
├── uploads/             # Static files
│   ├── pois/
│   ├── platform/
│   ├── avatars/
│   └── documents/
├── server.js            # Entry point
└── package.json
```

### Frontend
```
frontend/
├── src/
│   ├── components/      # Reusable components
│   │   ├── auth/
│   │   ├── layout/
│   │   │   └── DashboardLayout.jsx
│   │   ├── common/      # Buttons, inputs, etc.
│   │   ├── poi/         # POI-specific components
│   │   └── platform/    # Platform-specific
│   ├── pages/           # Route pages
│   │   ├── auth/
│   │   │   └── Login.jsx
│   │   ├── dashboard/
│   │   │   └── Dashboard.jsx
│   │   ├── pois/
│   │   │   ├── POIList.jsx
│   │   │   └── POIForm.jsx
│   │   ├── platform/    # (Future)
│   │   └── users/       # (Future)
│   ├── services/        # API layer
│   │   └── api.js
│   ├── store/           # State management
│   │   └── authStore.js
│   ├── utils/           # Helpers
│   ├── styles/          # Global styles
│   ├── locales/         # i18n translations
│   ├── App.jsx          # Main app
│   └── main.jsx         # Entry point
├── public/              # Static assets
├── index.html
├── vite.config.js
└── package.json
```

## 🔌 API Architecture

### RESTful Design
- **Resources**: pois, platform, users, uploads
- **Methods**: GET, POST, PUT, PATCH, DELETE
- **Status Codes**:
  - 200: Success
  - 201: Created
  - 400: Bad Request
  - 401: Unauthorized
  - 403: Forbidden
  - 404: Not Found
  - 429: Too Many Requests
  - 500: Server Error

### Response Format
```javascript
// Success
{
  success: true,
  message: "Operation successful",
  data: { ... }
}

// Error
{
  success: false,
  message: "Error description",
  errors: [ ... ]  // Optional validation errors
}
```

## 🔒 Security Architecture

### Layers of Security

1. **Transport Security**
   - HTTPS in production
   - Secure headers (Helmet.js)

2. **Authentication**
   - JWT tokens (stateless)
   - Refresh token rotation
   - Token expiry (24h access, 7d refresh)

3. **Authorization**
   - Role-based access control (RBAC)
   - Permission-based checks
   - Resource ownership verification

4. **Input Validation**
   - Express-validator
   - Mongoose schema validation
   - File type/size validation

5. **Rate Limiting**
   - Per-endpoint limits
   - Per-user limits
   - Account lockout on failed logins

6. **Data Protection**
   - Password hashing (bcrypt)
   - Sensitive data exclusion
   - Activity logging

## 📈 Scalability Considerations

### Current Architecture
- **Monolithic**: Single backend server
- **Single Database**: MongoDB instance
- **Local Storage**: File system for uploads

### Future Scalability
- **Horizontal Scaling**: Multiple backend instances
- **Database**: MongoDB replica set
- **File Storage**: S3/CloudFront CDN
- **Caching**: Redis for sessions/cache
- **Load Balancer**: nginx/ALB

## 🔄 State Management (Frontend)

### Zustand Stores
```
authStore
├── user          # Current user object
├── token         # Access token
├── isAuth        # Auth status
├── login()       # Login action
├── logout()      # Logout action
└── hasPermission() # Permission check
```

### Component State
- Local state: `useState` for UI state
- Form state: `react-hook-form`
- Server state: Direct API calls (no cache)
- Future: React Query for caching

## 🎨 UI Architecture

### Component Hierarchy
```
App
├── ThemeProvider (MUI)
├── BrowserRouter
├── Routes
    ├── PublicRoute (Login)
    └── ProtectedRoute (Dashboard)
        ├── DashboardLayout
        │   ├── AppBar
        │   ├── Drawer
        │   └── Outlet (Page content)
        ├── Dashboard
        ├── POIList
        └── POIForm
```

### Design System
- **Base**: Material-UI v5
- **Theme**: Custom purple gradient
- **Typography**: Inter font family
- **Spacing**: 8px grid system
- **Colors**: Primary #667eea, Secondary #764ba2

## 🧩 Integration Points

### With Main Application
- **Shared Database**: MongoDB collections
  - POI collection (read/write by admin)
  - User collection (read-only by admin)
- **Shared Models**: POI schema
- **File URLs**: Admin uploads accessible by main app

### External Services (Future)
- Email (Nodemailer/SendGrid)
- Analytics (Google Analytics)
- File Storage (S3)
- CDN (CloudFront)

---

**Architecture designed for:** Maintainability, Security, Scalability
