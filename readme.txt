# 🧭 HolidAIButler - Costa Blanca AI Holiday Assistant

An AI-powered holiday assistant specializing in Costa Blanca, Spain. The platform combines Claude AI with real-time data to provide personalized holiday recommendations, weather-aware suggestions, and seamless booking capabilities.

## 🎯 Project Overview

- **Target Market**: Costa Blanca receives 6+ million tourists annually
- **Revenue Model**: Freemium SaaS + booking commissions (€15+ monthly per premium user)
- **Competitive Advantage**: First AI-native holiday assistant for specific region
- **Tech Stack**: Node.js + Express + MongoDB + Claude AI + React Native

## 🏗️ Architecture

```
Mobile App          Backend API         Claude AI
(React Native) ←→   (Node.js)    ←→    Service
     ↓                  ↓              
   User Auth       MongoDB Database    Weather API
(Google/FB/Apple)   (Costa Blanca)     Integration
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB Atlas account
- Claude API key
- Docker (optional)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/holidaibutler.git
cd holidaibutler

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install

# Copy environment variables
cp .env.example .env
# Edit .env with your API keys
```

### Environment Variables

```bash
# Backend (.env)
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb://localhost:27017/holidaibutler
CLAUDE_API_KEY=your_claude_api_key
JWT_SECRET=your_jwt_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

### Run with Docker

```bash
docker-compose up -d
```

### Run Locally

```bash
# Start backend
cd backend
npm run dev

# Start frontend (in another terminal)
cd frontend
npm start
```

## 📱 Features

### Core Functionality
- 🤖 **AI Chat Interface**: Claude-powered holiday assistant
- 🌍 **Local Expertise**: 200+ pre-loaded Costa Blanca POIs
- 🌤️ **Weather Integration**: Context-aware recommendations
- 📱 **Mobile First**: React Native cross-platform app
- 🔐 **Social Auth**: Google, Facebook, Apple login

### AI Capabilities
- Personalized recommendations based on preferences
- Real-time weather-aware suggestions
- Multi-language support (EN/ES/DE/NL/FR)
- Context-aware conversation memory
- Booking intent detection

## 🗂️ Project Structure

```
holidaibutler/
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   └── middleware/
│   ├── package.json
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── screens/
│   │   ├── services/
│   │   └── contexts/
│   ├── package.json
│   └── app.json
├── docker-compose.yml
└── README.md
```

## 🔧 Development

### API Endpoints

```
Authentication:
POST /api/auth/google
POST /api/auth/facebook
DELETE /api/auth/logout

AI Chat:
POST /api/chat/message
GET /api/chat/conversations/:id

POI Data:
GET /api/pois/search
GET /api/pois/:id
GET /api/pois/nearby

Bookings:
POST /api/bookings
GET /api/bookings/user
```

### Database Schema

- **Users**: Profile, preferences, subscription data
- **POIs**: Costa Blanca points of interest with geo-location
- **Conversations**: Chat history with AI responses
- **Bookings**: Reservation data and partner integration

## 🎨 Brand Assets

The project uses the Mediterranean Coastal Elegant Kompas logo with the official color palette:
- **Mediterranean Teal**: #5E8B7E
- **Kompas Gold**: #D4AF37
- **Mediterranean Cream**: #F5F5DC
- **Deep Sea Navy**: #2C3E50

## 📊 Success Metrics

### Technical KPIs
- API Response Time: <200ms
- AI Response Time: <3 seconds
- App Loading Time: <2 seconds
- System Uptime: 99.9%

### Business KPIs
- Partner Sign-ups: 25 local businesses
- Revenue per User: €15+ monthly
- Costa Blanca POI Coverage: 200+
- Monthly Recurring Revenue: €7,500+ by month 6

## 🚀 Deployment

### Production Environment
- **Infrastructure**: Docker + AWS/Azure
- **Database**: MongoDB Atlas (EU region)
- **AI Service**: Claude 3.5 Sonnet API
- **Monitoring**: Prometheus + Grafana

### Staging Pipeline
```bash
# Build and deploy
npm run build
docker build -t holidaibutler .
docker push your-registry/holidaibutler
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🏆 Roadmap

### Phase 1: MVP (Months 1-2)
- ✅ Core AI chat functionality
- ✅ Basic POI recommendations
- ✅ Weather integration
- ✅ Mobile app foundation

### Phase 2: Growth (Months 3-6)
- 🔄 Partner booking integration
- 🔄 Multi-language support
- 🔄 Advanced personalization
- 🔄 Offline capabilities

### Phase 3: Scale (Months 7-12)
- 📋 Regional expansion (Valencia, Andalusia)
- 📋 Voice interface
- 📋 AR/Visual features
- 📋 Business analytics dashboard

## 🆘 Support

- **Documentation**: [Wiki](https://github.com/your-username/holidaibutler/wiki)
- **Issues**: [GitHub Issues](https://github.com/your-username/holidaibutler/issues)
- **Email**: support@holidaibutler.com
- **Discord**: [Community Server](https://discord.gg/holidaibutler)

---

**Ready for immediate execution with the right technical co-founder!**

*This project represents a €300K+ annual revenue opportunity in the Costa Blanca tourism market.*