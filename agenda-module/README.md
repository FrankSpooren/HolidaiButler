# HolidaiButler Agenda Module

Enterprise-level event agenda module for Calpe tourism platform, featuring multi-source data aggregation, AI-powered multilingual support, and automated daily updates.

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [Data Sources](#data-sources)
- [API Documentation](#api-documentation)
- [Deployment](#deployment)
- [Contributing](#contributing)

## 🎯 Overview

The Agenda Module is a comprehensive event management system designed for the HolidaiButler tourism platform, specifically focused on Calpe events and activities. It provides tourists with a curated, up-to-date agenda of events, activities, festivals, and tours in Calpe.

### Key Capabilities

- **Multi-Source Data Aggregation**: Automatically scrapes and aggregates events from multiple sources
- **AI-Powered Translations**: Supports 5 languages (Dutch, English, Spanish, German, French)
- **Smart Verification**: Cross-references multiple sources for data accuracy
- **Automated Updates**: Daily automated scraping and data refresh
- **Advanced Filtering**: Comprehensive filtering by date, category, audience, time, location, and price
- **Mobile-First Design**: Fully responsive interface optimized for mobile devices
- **Enterprise Quality**: Production-ready with error handling, caching, and monitoring

## ✨ Features

### User Features

- **Event Discovery**: Browse upcoming events with rich media and detailed information
- **Advanced Search**: Full-text search across event titles, descriptions, and locations
- **Multi-Dimensional Filtering**:
  - Date ranges (today, this week, this month, custom)
  - 16 event categories (culture, beach, sports, food & drink, etc.)
  - Target audience (families, couples, seniors, etc.)
  - Time of day (morning, afternoon, evening, night)
  - Free vs paid events
  - Location/area filters
- **Event Details**: Comprehensive event information including:
  - Dates, times, and locations with maps
  - Pricing and registration information
  - Organizer contact details
  - Images and media
  - Target audience and accessibility info
- **Multilingual**: Auto-detect and translate content to 5 languages
- **Responsive Design**: Optimized for mobile, tablet, and desktop

### Admin Features

- **Automated Data Collection**: Daily scraping from configured sources
- **Multi-Source Verification**: Automatic conflict detection and resolution
- **Quality Scoring**: AI-driven quality assessment of event data
- **Manual Overrides**: Admin interface for manual event management
- **Analytics Dashboard**: Event statistics and performance metrics

## 🏗️ Architecture

```
agenda-module/
├── backend/
│   ├── src/
│   │   ├── models/           # MongoDB schemas
│   │   │   └── Event.js      # Comprehensive event model
│   │   ├── controllers/      # Request handlers
│   │   │   └── eventController.js
│   │   ├── routes/           # API routes
│   │   │   └── eventRoutes.js
│   │   ├── services/         # Business logic
│   │   │   ├── eventService.js
│   │   │   ├── multiSourceVerification.js
│   │   │   └── translationService.js
│   │   ├── scrapers/         # Data scrapers
│   │   │   ├── baseScraper.js
│   │   │   └── calpeOfficialScraper.js
│   │   ├── automation/       # Scheduled tasks
│   │   │   └── dailyEventUpdate.js
│   │   ├── config/           # Configuration
│   │   │   └── database.js
│   │   ├── middleware/       # Express middleware
│   │   │   └── errorHandler.js
│   │   └── server.js         # Application entry point
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── screens/          # Page components
    │   │   ├── AgendaList.jsx
    │   │   └── AgendaDetails.jsx
    │   ├── components/       # Reusable components
    │   │   ├── AgendaCard.jsx
    │   │   └── FilterPanel.jsx
    │   ├── services/         # API clients
    │   │   └── agendaService.js
    │   ├── utils/            # State management
    │   │   └── agendaStore.js
    │   ├── i18n.js           # Internationalization
    │   ├── App.jsx           # Main app component
    │   └── main.jsx          # Entry point
    ├── index.html
    ├── vite.config.js
    └── package.json
```

## 🛠️ Tech Stack

### Backend

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Scheduling**: node-cron for automated tasks
- **Scraping**: Axios + Cheerio
- **Translation**: OpenAI GPT-4 / Google Translate API
- **Authentication**: JWT (integrated with platform-core)

### Frontend

- **Framework**: React 18
- **Build Tool**: Vite
- **UI Library**: Material-UI (MUI) v5
- **State Management**: Zustand
- **Data Fetching**: React Query
- **Routing**: React Router v6
- **i18n**: i18next + react-i18next
- **Date Handling**: date-fns
- **Notifications**: React Toastify

## 📦 Installation

### Prerequisites

- Node.js 18+ and npm 9+
- MongoDB 5.0+
- OpenAI API key (optional, for AI translations)
- Google Translate API key (optional, for fallback translations)

### Backend Setup

```bash
# Navigate to backend directory
cd agenda-module/backend

# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env

# Edit .env with your configuration
nano .env

# Start development server
npm run dev
```

### Frontend Setup

```bash
# Navigate to frontend directory
cd agenda-module/frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend will be available at `http://localhost:3004` and will proxy API requests to the backend at `http://localhost:5003`.

## ⚙️ Configuration

### Backend Environment Variables (.env)

```env
# Server
PORT=5003
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/holidaibutler-agenda

# Translation APIs
OPENAI_API_KEY=your_openai_api_key_here
GOOGLE_TRANSLATE_API_KEY=your_google_translate_api_key_here

# External Data Sources (optional)
GETYOURGUIDE_API_KEY=your_getyourguide_api_key_here
TRIPADVISOR_API_KEY=your_tripadvisor_api_key_here

# Authentication
JWT_SECRET=your_jwt_secret_here

# CORS
CORS_ORIGIN=http://localhost:3004,http://localhost:5173
```

### Frontend Environment Variables (.env)

```env
VITE_API_URL=http://localhost:5003/api/agenda
```

## 🚀 Usage

### Starting the Application

1. **Start MongoDB**:
   ```bash
   mongod
   ```

2. **Start Backend**:
   ```bash
   cd agenda-module/backend
   npm run dev
   ```

3. **Start Frontend**:
   ```bash
   cd agenda-module/frontend
   npm run dev
   ```

4. **Access the Application**:
   - Frontend: http://localhost:3004
   - Backend API: http://localhost:5003/api/agenda
   - Health Check: http://localhost:5003/health

### Manual Data Scraping

To manually trigger event scraping:

```bash
# In backend directory
node scripts/scrape.js
```

### Triggering Automation

The daily update automation runs automatically at 2:00 AM daily. To manually trigger:

```javascript
const dailyEventUpdate = require('./src/automation/dailyEventUpdate');
await dailyEventUpdate.trigger();
```

## 🌐 Data Sources

The module aggregates event data from multiple sources:

### Primary Sources

1. **Calpe Official** (https://www.calpe.es/es/eventos)
   - Reliability: 95%
   - Update frequency: Hourly for urgent events
   - Languages: Spanish

2. **Cultura Calpe** (https://cultura.calp.es/)
   - Reliability: 90%
   - Update frequency: Daily
   - Languages: Spanish

3. **Calpe Online 24** (https://www.calpeonline24.com/)
   - Reliability: 70%
   - Update frequency: Daily
   - Languages: English, Spanish

4. **Costa Blanca Online 24** (https://www.costablancaonline24.com/)
   - Reliability: 70%
   - Update frequency: Daily
   - Languages: English, Spanish

### Secondary Sources (Integration Ready)

- TripAdvisor
- GetYourGuide
- Facebook Events
- Google Events
- Eventbrite

### Adding New Sources

To add a new event source:

1. Create a scraper extending `BaseScraper`:
   ```javascript
   const BaseScraper = require('./baseScraper');

   class NewSourceScraper extends BaseScraper {
     constructor() {
       super({
         name: 'NewSourceScraper',
         platform: 'new-source',
         baseUrl: 'https://newsource.com',
       });
     }

     async scrape() {
       // Implement scraping logic
     }

     transformToEventModel(data) {
       // Transform to Event model format
     }
   }
   ```

2. Register in `dailyEventUpdate.js`:
   ```javascript
   const newSourceScraper = require('./scrapers/newSourceScraper');
   this.scrapers = [..., newSourceScraper];
   ```

## 📚 API Documentation

### Base URL
```
http://localhost:5003/api/agenda
```

### Endpoints

#### GET /events
Get events with filtering and pagination.

**Query Parameters:**
- `dateRange`: `upcoming`, `today`, `thisWeek`, `thisMonth`
- `startDate`: ISO date string
- `endDate`: ISO date string
- `category`: Event category
- `categories`: Comma-separated categories
- `audience`: Target audience
- `timeOfDay`: `morning`, `afternoon`, `evening`, `night`, `all-day`
- `isFree`: `true` or `false`
- `search`: Search query
- `page`: Page number (default: 1)
- `limit`: Results per page (default: 50)
- `lang`: Language code (nl, en, es, de, fr)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "title": {
        "nl": "Evenement titel",
        "en": "Event title"
      },
      "startDate": "2025-06-15T10:00:00.000Z",
      "endDate": "2025-06-15T18:00:00.000Z",
      "location": {
        "name": "Old Town Calpe",
        "city": "Calpe"
      },
      "primaryCategory": "culture",
      "pricing": {
        "isFree": true
      },
      "images": [...]
    }
  ],
  "pagination": {
    "total": 150,
    "page": 1,
    "limit": 50,
    "pages": 3
  }
}
```

#### GET /events/:id
Get single event by ID.

#### GET /events/slug/:slug
Get event by URL slug.

#### GET /events/featured
Get featured events.

#### GET /stats
Get event statistics.

#### POST /events (Admin)
Create new event.

#### PUT /events/:id (Admin)
Update event.

#### DELETE /events/:id (Admin)
Soft delete event.

## 🎨 UI Components

### AgendaList
Main events listing page with:
- Featured events carousel
- Search bar
- Filter panel (drawer on mobile, sidebar on desktop)
- Grid/List view toggle
- Pagination
- Empty states and loading indicators

### AgendaDetails
Event detail page with:
- Hero image
- Full description
- Date, time, location information
- Pricing and registration details
- Organizer contact information
- Related events (future feature)

### FilterPanel
Comprehensive filtering interface:
- Date range selector
- Category chips (multi-select)
- Time of day dropdown
- Audience selector
- Free events checkbox
- Active filters count
- Clear filters button

### AgendaCard
Reusable event card component:
- Grid variant (for grid view)
- List variant (for list view)
- Responsive design
- Hover effects
- Category badges
- Free event indicator

## 🌍 Internationalization

Supported languages:
- Dutch (nl) - Default
- English (en)
- Spanish (es)
- German (de)
- French (fr)

### Translation Strategy

1. **Source Detection**: Automatically detect original language
2. **AI Translation**: Use OpenAI GPT-4 for context-aware translation
3. **Fallback**: Google Translate API as backup
4. **Caching**: 7-day cache for translations
5. **Manual Override**: Admin can manually edit translations

## 🔄 Automation

### Daily Update Process

Runs at 2:00 AM daily:

1. **Archive Old Events** (30+ days past)
2. **Scrape All Sources** (with rate limiting)
3. **Process Scraped Events**:
   - Find matching existing events
   - Update or create events
   - Add source references
4. **Verify Events**:
   - Multi-source verification
   - Conflict detection
   - Quality scoring
5. **Cleanup**:
   - Remove very old archived events (1+ year)

### Hourly Updates

High-priority sources (official) checked hourly for urgent events (today/tomorrow).

## 📊 Data Model

### Event Schema Highlights

- **Multilingual Fields**: Title, description stored as Maps
- **Multi-Source Tracking**: Array of sources with verification status
- **Comprehensive Metadata**: 50+ fields including:
  - Date/time (with recurrence support)
  - Location (with geospatial indexing)
  - 16 categories + activity types
  - Target audience
  - Pricing and registration
  - Accessibility information
  - SEO metadata
  - Engagement metrics
- **Verification System**: Status, confidence score, conflict tracking
- **AI Enhancements**: Translation metadata, sentiment analysis, keyword extraction

## 🚢 Deployment

### Production Build

```bash
# Backend
cd backend
npm install --production
npm start

# Frontend
cd frontend
npm run build
# Serve dist/ folder with nginx or similar
```

### Docker Support (Future)

```dockerfile
# Dockerfile example
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
EXPOSE 5003
CMD ["node", "src/server.js"]
```

### Recommended Production Setup

- **Backend**: PM2 process manager
- **Database**: MongoDB Atlas or self-hosted replica set
- **Frontend**: Nginx with reverse proxy
- **SSL**: Let's Encrypt
- **Monitoring**: Winston logs + error tracking
- **Caching**: Redis for API responses

## 🧪 Testing

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

## 🤝 Contributing

1. Follow existing code patterns
2. Use ESLint configuration
3. Write tests for new features
4. Update documentation
5. Submit pull requests to development branch

## 📝 License

MIT License - HolidaiButler Platform

## 🙏 Acknowledgments

- Calpe Tourism Office for official event data
- OpenAI for AI translation capabilities
- Material-UI team for excellent React components
- All open-source contributors

---

**Built with ❤️ for HolidaiButler**

Enterprise-level quality | Mobile-first design | AI-powered | Multi-source verified
