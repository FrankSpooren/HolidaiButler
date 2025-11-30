# ⚠️ DEPRECATED - DO NOT USE

**Date**: 2025-11-18
**Status**: **DEPRECATED** - Replaced by Main Frontend Components

---

## This Frontend is OBSOLETE

This ticketing frontend (port 3001) has been **replaced** by new components in the **main frontend** (port 5173).

### Why Deprecated?

1. **API Incompatibility**: This frontend uses `/api/ticketing/events` which doesn't exist in the new backend
2. **Replaced by Better Implementation**: New BookingFlow and TicketManagement components are production-ready
3. **Code Duplication**: Maintaining two frontends creates technical debt

### What to Use Instead?

**Main Frontend Components** (Port 5173):
```
04-Development/frontend/src/features/ticketing/components/
├── BookingFlow/
│   ├── GuestInfoForm.tsx (350 LOC)
│   ├── BookingSummary.tsx (280 LOC)
│   ├── PaymentButton.tsx (320 LOC)
│   └── BookingConfirmation.tsx (290 LOC)
└── TicketManagement/
    ├── MyTickets.tsx (330 LOC)
    ├── TicketCard.tsx (280 LOC)
    ├── TicketDetail.tsx (390 LOC)
    └── WalletButtons.tsx (270 LOC)
```

**Main Frontend Routes**:
- `/ticketing-demo` - Ticketing demo page
- `/account` - Includes ticket management

---

## Action Required

**This directory can be safely deleted**:

```bash
# Close any running processes first
# Then delete:
rm -rf frontend/
```

Or manually delete:
```
C:\Users\frank\OneDrive\Documenten\AI 2025\HolidAIbutler\HolidaiButler-Platform-Project\04-Development\ticketing-module\frontend
```

---

## Migration Guide

If you need functionality from this old frontend:

1. **Event Selection** → Use POI pages in main frontend (`/pois`)
2. **Ticket Booking** → Use BookingFlow components (`/ticketing-demo`)
3. **Ticket View** → Use TicketManagement components (`/account`)

All new components work with the **correct backend API** on port 3004.

---

**Deprecated**: 2025-11-18
**Replaced By**: Main Frontend (port 5173) + Ticketing Components
**Backend API**: http://localhost:3004/api/v1/tickets (✅ Production Ready)
