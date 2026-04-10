# HolidAIButler - Complete Codebase
# Mediterranean AI Travel Platform

## Project Structure
```
holidaibutler/
├── mobile/                     # React Native Mobile App
├── backend/                    # Node.js/Express API Server
├── shared/                     # Shared types and utilities
├── database/                   # Database schemas and seeds
├── infrastructure/             # Docker, K8s, CI/CD
├── docs/                       # Technical documentation
└── scripts/                    # Build and deployment scripts
```

## Quick Start
```bash
# Clone and setup
git clone <repository>
cd holidaibutler

# Install dependencies
npm run install:all

# Setup environment
cp .env.example .env
# Configure your Claude API key, MongoDB URI, etc.

# Start development
npm run dev:all

# Deploy to production
npm run deploy:production
```

## Architecture Overview
- **Frontend**: React Native with TypeScript, Redux Toolkit
- **Backend**: Node.js, Express, Socket.io
- **AI**: Claude 3.5 Sonnet API integration
- **Database**: MongoDB Atlas with Redis caching
- **Infrastructure**: Docker, Kubernetes, AWS/EU
- **Compliance**: GDPR-ready, EU data residency

## Key Features
- 🤖 AI-powered travel recommendations
- 🌊 Mediterranean specialization (Costa Blanca)
- 🏛️ Official DMO partnership integration
- 📱 Offline-capable mobile app
- 🌍 Multi-language support (EN/ES/DE/NL/FR)
- ⚖️ GDPR compliant by design
- 🔒 Enterprise-grade security

## Environment Setup
Required environment variables in `.env`:
```
# AI Services
CLAUDE_API_KEY=your_anthropic_api_key
CLAUDE_MODEL=claude-3-5-sonnet-20241022

# Database
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/holidaibutler
REDIS_URL=redis://localhost:6379

# Authentication
JWT_SECRET=your_jwt_secret_256_bit
JWT_REFRESH_SECRET=your_jwt_refresh_secret

# External APIs
WEATHER_API_KEY=your_openweather_api_key
GOOGLE_MAPS_API_KEY=your_google_maps_api_key

# Email & Notifications
SENDGRID_API_KEY=your_sendgrid_api_key
PUSH_NOTIFICATION_KEY=your_push_key

# Payment
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# DMO Integration
DMO_API_ENDPOINT=https://api.costablanca.org
DMO_API_KEY=your_dmo_api_key

# Deployment
NODE_ENV=development
PORT=3001
CORS_ORIGIN=http://localhost:3000
```

## Team Structure
Based on the project documentation:
- **🎨 Design Unit (Sarah)**: Brand guidelines, UI/UX
- **💻 Development Unit (Mark)**: Technical implementation  
- **📈 Marketing Unit (Lisa)**: Go-to-market strategy
- **⚖️ Legal Unit**: GDPR compliance, IP protection

This codebase implements the complete technical vision from the architectural documentation, ready for Mediterranean AI travel platform deployment.