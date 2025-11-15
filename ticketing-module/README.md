# HolidaiButler Ticketing & Reservation Module

Enterprise-level ticketing and reservation system for POIs, tours, and experiences.

## 📋 Overview

The Ticketing Module handles:
- Real-time availability management
- Booking workflow (create, confirm, cancel)
- Ticket generation with QR codes
- Email delivery and mobile wallet integration
- Partner integration and inventory sync

## 🏗️ Architecture

```
ticketing-module/
├── backend/
│   ├── models/          # MongoDB models (Ticket, Booking, Availability)
│   ├── services/        # Business logic (AvailabilityService, BookingService, TicketService)
│   ├── routes/          # API endpoints
│   ├── middleware/      # Auth, validation
│   ├── utils/           # Logger, helpers
│   └── server.js        # Express server
└── frontend/            # React/React Native components (planned)
