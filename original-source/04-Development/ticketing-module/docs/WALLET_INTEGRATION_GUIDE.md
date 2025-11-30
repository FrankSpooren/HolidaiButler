# Digital Wallet Integration Guide
**Apple Wallet (PassKit) + Google Wallet for Event Tickets**

**Last Updated**: 2025-11-18
**Status**: Research Complete | Frontend UI Ready | Backend Pending
**Platforms**: Apple Wallet | Google Wallet/Pay

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Current Status](#current-status)
3. [Apple Wallet Integration](#apple-wallet-integration)
4. [Google Wallet Integration](#google-wallet-integration)
5. [Backend Implementation](#backend-implementation)
6. [Frontend Integration](#frontend-integration)
7. [Testing](#testing)
8. [Production Deployment](#production-deployment)
9. [Best Practices](#best-practices)

---

## 🎯 Overview

Digital wallet passes allow customers to store their event tickets directly in Apple Wallet or Google Wallet for convenient access, eliminating the need for printed tickets or screenshots.

### Benefits

**For Customers:**
- ✅ Instant ticket access from lock screen
- ✅ Automatic updates (time changes, gate info)
- ✅ Location-based notifications
- ✅ No need for paper or PDFs
- ✅ Works offline

**For Business:**
- ✅ Reduced support (no lost/forgotten tickets)
- ✅ Real-time updates to all passes
- ✅ Better customer experience
- ✅ Analytics and insights
- ✅ Modern, professional image

### Use Cases

- 🎫 Event tickets
- 🎟️ Admission passes
- 🎪 Multi-day festival passes
- 🎭 Theater/concert tickets
- 🏛️ Museum/attraction tickets

---

## ✅ Current Status

### Frontend (90% Complete)
- ✅ Wallet UI components ready
- ✅ "Add to Apple Wallet" button
- ✅ "Add to Google Wallet" button
- ✅ Visual design matches platform guidelines
- ❌ Backend API integration pending

### Backend (0% - Needs Implementation)
- ❌ PassKit certificate setup (Apple)
- ❌ Pass generation service
- ❌ Google Wallet JWT generation
- ❌ Webhook handlers for updates
- ❌ Pass storage and versioning

**Estimated Implementation Time**: 8-12 hours total
- Apple Wallet: 4-6 hours
- Google Wallet: 3-4 hours
- Testing & deployment: 2 hours

---

## 🍎 Apple Wallet Integration

### Architecture

```
Customer purchases ticket
    ↓
Backend generates .pkpass file
    ↓
Signs with Apple certificate
    ↓
Stores pass + serial number
    ↓
Returns download URL
    ↓
User clicks "Add to Apple Wallet"
    ↓
iOS downloads and adds pass
```

### Prerequisites

1. **Apple Developer Account** ($99/year)
   - Enroll at: https://developer.apple.com/programs/
   - Required for pass signing certificates

2. **Pass Type ID Certificate**
   - Create in Apple Developer Portal
   - Download .cer file
   - Convert to .p12 format

3. **WWDR Certificate** (included in modern libraries)
   - Apple Worldwide Developer Relations
   - Usually bundled with passkit libraries

### Recommended Library: passkit-generator

**GitHub**: https://github.com/alexandercerutti/passkit-generator
**npm**: `passkit-generator`
**Version**: 3.x (latest)
**Stars**: 900+
**Last Updated**: Active (2024-2025)

#### Why passkit-generator?

- ✅ Most popular and actively maintained
- ✅ TypeScript support
- ✅ Excellent documentation
- ✅ Supports all pass types
- ✅ Built-in certificate handling
- ✅ Push notification support
- ✅ Modern async/await API

### Installation

```bash
cd ticketing-module/backend
npm install passkit-generator
```

### Certificate Setup

**Step 1: Create Pass Type ID**

1. Go to: https://developer.apple.com/account/resources/identifiers/list
2. Click **+** → Select **Pass Type IDs**
3. Description: "HolidAIbutler Event Tickets"
4. Identifier: `pass.com.holidaibutler.eventtickets`
5. Click **Continue** → **Register**

**Step 2: Create Certificate**

1. Select your Pass Type ID
2. Click **Create Certificate**
3. Upload CSR (Certificate Signing Request):
   ```bash
   # Generate CSR on Mac
   openssl req -new -key private.key -out request.csr
   ```
4. Download certificate (e.g., `pass.cer`)

**Step 3: Convert to .p12**

```bash
# Convert .cer to .pem
openssl x509 -inform DER -outform PEM -in pass.cer -out passcertificate.pem

# Create .p12 from .pem and private key
openssl pkcs12 -export -out pass.p12 \\
  -inkey private.key \\
  -in passcertificate.pem \\
  -passout pass:your_password_here
```

**Step 4: Store Securely**

Place in `ticketing-module/backend/certificates/`:
```
certificates/
├── pass.p12          # Your certificate
└── README.md         # Certificate info (NO passwords!)
```

Store password in `.env`:
```bash
PASSKIT_CERTIFICATE_PASSWORD=your_password_here
```

### Pass Design

Use **Passkit Visual Designer** (free online tool):
- URL: https://pkvd.app/ or similar
- Design your pass template
- Export as .pass folder
- Place in `backend/pass-templates/event-ticket/`

**Template Structure:**
```
event-ticket.pass/
├── pass.json         # Pass definition
├── icon.png          # 29x29
├── icon@2x.png       # 58x58
├── logo.png          # 160x50
├── logo@2x.png       # 320x100
└── background.png    # 180x220 (optional)
```

### Implementation Example

**File**: `ticketing-module/backend/services/AppleWalletService.js`

```javascript
const { PKPass } = require('passkit-generator');
const fs = require('fs');
const path = require('path');

class AppleWalletService {
  constructor() {
    // Load certificate
    this.certPath = path.join(__dirname, '../certificates/pass.p12');
    this.certPassword = process.env.PASSKIT_CERTIFICATE_PASSWORD;
    this.templatePath = path.join(__dirname, '../pass-templates/event-ticket.pass');
  }

  async generatePass(booking) {
    try {
      // Create pass from template
      const pass = await PKPass.from({
        model: this.templatePath,
        certificates: {
          wwdr: false, // Library includes WWDR
          signerCert: fs.readFileSync(this.certPath),
          signerKey: {
            keyFile: fs.readFileSync(this.certPath),
            passphrase: this.certPassword,
          },
        },
      });

      // Set dynamic fields
      pass.serialNumber = `TICKET-${booking.id}`;
      pass.authenticationToken = this.generateToken(booking.id);
      pass.webServiceURL = `https://${process.env.DOMAIN}/api/wallet`;

      // Primary fields (front of pass)
      pass.primaryFields.push({
        key: 'event',
        label: 'Event',
        value: booking.eventName,
      });

      // Secondary fields
      pass.secondaryFields.push(
        {
          key: 'date',
          label: 'Date',
          value: booking.eventDate,
          dateStyle: 'PKDateStyleMedium',
        },
        {
          key: 'time',
          label: 'Time',
          value: booking.eventTime,
        }
      );

      // Auxiliary fields
      pass.auxiliaryFields.push(
        {
          key: 'location',
          label: 'Location',
          value: booking.venue,
        },
        {
          key: 'gate',
          label: 'Gate',
          value: booking.gate || 'TBD',
          changeMessage: 'Gate changed to %@',
        }
      );

      // Back fields
      pass.backFields.push(
        {
          key: 'ticketType',
          label: 'Ticket Type',
          value: booking.ticketType,
        },
        {
          key: 'quantity',
          label: 'Quantity',
          value: `${booking.quantity} ticket(s)`,
        },
        {
          key: 'booking',
          label: 'Booking Reference',
          value: booking.reference,
        },
        {
          key: 'terms',
          label: 'Terms & Conditions',
          value: 'https://holidaibutler.com/terms',
          attributedValue: '<a href="https://holidaibutler.com/terms">View Terms</a>',
        }
      );

      // Barcode (QR code)
      pass.setBarcodes({
        message: booking.qrData,
        format: 'PKBarcodeFormatQR',
        messageEncoding: 'iso-8859-1',
      });

      // Relevance (location-based notification)
      if (booking.latitude && booking.longitude) {
        pass.setRelevantLocation({
          latitude: booking.latitude,
          longitude: booking.longitude,
          relevantText: `${booking.eventName} is nearby!`,
        });
      }

      // Colors
      pass.backgroundColor = 'rgb(32, 110, 247)';
      pass.foregroundColor = 'rgb(255, 255, 255)';
      pass.labelColor = 'rgb(200, 200, 255)';

      // Generate .pkpass buffer
      const buffer = pass.getAsBuffer();

      return buffer;
    } catch (error) {
      console.error('Error generating Apple Wallet pass:', error);
      throw error;
    }
  }

  generateToken(bookingId) {
    // Generate secure token for pass authentication
    const crypto = require('crypto');
    return crypto.randomBytes(16).toString('hex');
  }

  // Webhook to update passes (push notifications)
  async updatePass(serialNumber, updates) {
    // Load existing pass
    // Apply updates
    // Push update to devices
  }
}

module.exports = AppleWalletService;
```

### API Endpoints

```javascript
// Generate and download .pkpass
GET /api/wallet/apple/:bookingId
Response: .pkpass file (application/vnd.apple.pkpass)

// Webhook: Register device
POST /api/wallet/v1/devices/:deviceID/registrations/:passTypeID/:serialNumber
Body: { pushToken: string }

// Webhook: Get serial numbers for device
GET /api/wallet/v1/devices/:deviceID/registrations/:passTypeID

// Webhook: Get latest pass
GET /api/wallet/v1/passes/:passTypeID/:serialNumber

// Webhook: Unregister device
DELETE /api/wallet/v1/devices/:deviceID/registrations/:passTypeID/:serialNumber

// Webhook: Log messages
POST /api/wallet/v1/log
```

---

## 📱 Google Wallet Integration

### Architecture

```
Customer purchases ticket
    ↓
Backend creates Pass Class (template)
    ↓
Backend creates Pass Object (specific ticket)
    ↓
Signs JWT with credentials
    ↓
Generates "Add to Google Wallet" link
    ↓
User clicks link
    ↓
Google Wallet adds pass
```

### Prerequisites

1. **Google Cloud Project**
   - Create at: https://console.cloud.google.com/
   - Free tier available

2. **Enable Google Wallet API**
   - In Google Cloud Console
   - Navigate to APIs & Services
   - Enable "Google Wallet API"

3. **Service Account**
   - Create service account
   - Download JSON key file
   - Grant "Google Wallet Issuer" role

4. **Issuer Account**
   - Create at: https://pay.google.com/business/console
   - Get Issuer ID

### Recommended Approach: Official googleapis Library

**npm**: `googleapis`
**Version**: Latest
**Documentation**: https://developers.google.com/wallet

### Installation

```bash
npm install googleapis jsonwebtoken
```

### Implementation Example

**File**: `ticketing-module/backend/services/GoogleWalletService.js`

```javascript
const { google } = require('googleapis');
const jwt = require('jsonwebtoken');
const fs = require('fs');

class GoogleWalletService {
  constructor() {
    // Load service account credentials
    const credentials = JSON.parse(
      fs.readFileSync(process.env.GOOGLE_WALLET_CREDENTIALS_PATH)
    );

    this.issuerId = process.env.GOOGLE_WALLET_ISSUER_ID;
    this.credentials = credentials;

    // Initialize API client
    this.auth = new google.auth.GoogleAuth({
      credentials: credentials,
      scopes: ['https://www.googleapis.com/auth/wallet_object.issuer'],
    });

    this.client = google.walletobjects({
      version: 'v1',
      auth: this.auth,
    });
  }

  async createEventClass(eventInfo) {
    const classId = `${this.issuerId}.event-${eventInfo.id}`;

    const eventClass = {
      id: classId,
      issuerName: 'HolidAIbutler',
      eventName: {
        defaultValue: {
          language: 'nl',
          value: eventInfo.name,
        },
      },
      logo: {
        sourceUri: {
          uri: eventInfo.logoUrl || 'https://holidaibutler.com/logo.png',
        },
      },
      venue: {
        name: {
          defaultValue: {
            language: 'nl',
            value: eventInfo.venueName,
          },
        },
        address: {
          defaultValue: {
            language: 'nl',
            value: eventInfo.venueAddress,
          },
        },
      },
      dateTime: {
        start: eventInfo.startDateTime,
        end: eventInfo.endDateTime,
      },
      reviewStatus: 'UNDER_REVIEW', // or 'APPROVED' for production
    };

    try {
      await this.client.eventticketclass.insert({
        requestBody: eventClass,
      });
      return classId;
    } catch (error) {
      if (error.code === 409) {
        // Class already exists, update it
        await this.client.eventticketclass.update({
          resourceId: classId,
          requestBody: eventClass,
        });
        return classId;
      }
      throw error;
    }
  }

  async createTicketObject(booking, classId) {
    const objectId = `${this.issuerId}.ticket-${booking.id}`;

    const ticketObject = {
      id: objectId,
      classId: classId,
      state: 'ACTIVE',
      ticketHolderName: `${booking.firstName} ${booking.lastName}`,
      ticketNumber: booking.reference,
      barcode: {
        type: 'QR_CODE',
        value: booking.qrData,
        alternateText: booking.reference,
      },
      seatInfo: {
        seat: {
          defaultValue: {
            language: 'nl',
            value: booking.seatNumber || 'General Admission',
          },
        },
        row: {
          defaultValue: {
            language: 'nl',
            value: booking.row || '',
          },
        },
        section: {
          defaultValue: {
            language: 'nl',
            value: booking.section || '',
          },
        },
        gate: {
          defaultValue: {
            language: 'nl',
            value: booking.gate || 'TBD',
          },
        },
      },
      hexBackgroundColor: '#206EF7',
      validTimeInterval: {
        start: {
          date: booking.eventDate,
        },
      },
    };

    try {
      await this.client.eventticketobject.insert({
        requestBody: ticketObject,
      });
      return objectId;
    } catch (error) {
      if (error.code === 409) {
        // Object already exists, update it
        await this.client.eventticketobject.update({
          resourceId: objectId,
          requestBody: ticketObject,
        });
        return objectId;
      }
      throw error;
    }
  }

  generateAddToWalletLink(booking, classId, objectId) {
    // Create JWT payload
    const payload = {
      iss: this.credentials.client_email,
      aud: 'google',
      typ: 'savetowallet',
      iat: Math.floor(Date.now() / 1000),
      origins: [process.env.FRONTEND_URL],
      payload: {
        eventTicketObjects: [
          {
            id: objectId,
            classId: classId,
          },
        ],
      },
    };

    // Sign JWT
    const token = jwt.sign(payload, this.credentials.private_key, {
      algorithm: 'RS256',
    });

    // Generate link
    return `https://pay.google.com/gp/v/save/${token}`;
  }

  async generateWalletPass(booking) {
    try {
      // Create or get class
      const classId = await this.createEventClass(booking.eventInfo);

      // Create ticket object
      const objectId = await this.createTicketObject(booking, classId);

      // Generate add to wallet link
      const walletLink = this.generateAddToWalletLink(booking, classId, objectId);

      return {
        classId,
        objectId,
        walletLink,
      };
    } catch (error) {
      console.error('Error generating Google Wallet pass:', error);
      throw error;
    }
  }

  async updateTicket(objectId, updates) {
    // Update existing ticket with new information
    await this.client.eventticketobject.patch({
      resourceId: objectId,
      requestBody: updates,
    });
  }
}

module.exports = GoogleWalletService;
```

### API Endpoints

```javascript
// Generate Google Wallet link
GET /api/wallet/google/:bookingId
Response: { walletLink: string }

// Update ticket
PATCH /api/wallet/google/:ticketId
Body: { gate: string, seatNumber: string, etc. }
```

---

## 🔧 Backend Implementation

### Directory Structure

```
ticketing-module/backend/
├── services/
│   ├── AppleWalletService.js
│   └── GoogleWalletService.js
├── controllers/
│   └── WalletController.js
├── routes/
│   └── wallet.js
├── certificates/
│   ├── pass.p12              # Apple certificate
│   └── google-credentials.json
├── pass-templates/
│   └── event-ticket.pass/    # Apple pass template
│       ├── pass.json
│       ├── icon.png
│       └── logo.png
└── models/
    └── WalletPass.js          # Track issued passes
```

### Database Schema

**Table**: `wallet_passes`

```sql
CREATE TABLE wallet_passes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  booking_id INT NOT NULL,
  platform ENUM('apple', 'google') NOT NULL,
  serial_number VARCHAR(255) UNIQUE,
  auth_token VARCHAR(255),
  pass_url VARCHAR(500),
  google_class_id VARCHAR(255),
  google_object_id VARCHAR(255),
  version INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  INDEX idx_booking_platform (booking_id, platform),
  INDEX idx_serial (serial_number)
);

CREATE TABLE wallet_devices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  device_id VARCHAR(255) NOT NULL,
  push_token VARCHAR(500),
  pass_serial VARCHAR(255) NOT NULL,
  registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY unique_device_pass (device_id, pass_serial),
  FOREIGN KEY pass_serial REFERENCES wallet_passes(serial_number) ON DELETE CASCADE
);
```

### Environment Variables

```bash
# Apple Wallet / PassKit
PASSKIT_CERTIFICATE_PATH=./certificates/pass.p12
PASSKIT_CERTIFICATE_PASSWORD=your_password
PASSKIT_PASS_TYPE_ID=pass.com.holidaibutler.eventtickets
PASSKIT_TEAM_ID=YOUR_TEAM_ID

# Google Wallet
GOOGLE_WALLET_CREDENTIALS_PATH=./certificates/google-credentials.json
GOOGLE_WALLET_ISSUER_ID=your_issuer_id

# Domain for webhooks
DOMAIN=api.holidaibutler.com
FRONTEND_URL=https://holidaibutler.com
```

### Dependencies

```json
{
  "dependencies": {
    "passkit-generator": "^3.2.0",
    "googleapis": "^latest",
    "jsonwebtoken": "^9.0.2"
  }
}
```

---

## 🎨 Frontend Integration

### Wallet Buttons Component

**File**: `frontend/src/components/WalletButtons.jsx`

```javascript
import { useState } from 'react';
import { Button, Box } from '@mui/material';
import AppleIcon from '@mui/icons-material/Apple';
import { styled } from '@mui/material/styles';

const AppleWalletButton = styled(Button)(({ theme }) => ({
  backgroundColor: '#000',
  color: '#fff',
  '&:hover': {
    backgroundColor: '#333',
  },
  textTransform: 'none',
  fontWeight: 600,
}));

const GoogleWalletButton = styled(Button)(({ theme }) => ({
  backgroundColor: '#fff',
  color: '#3c4043',
  border: '1px solid #dadce0',
  '&:hover': {
    backgroundColor: '#f8f9fa',
  },
  textTransform: 'none',
  fontWeight: 600,
}));

function WalletButtons({ bookingId }) {
  const [loading, setLoading] = useState({ apple: false, google: false });

  const handleAppleWallet = async () => {
    setLoading({ ...loading, apple: true });
    try {
      const response = await fetch(`/api/wallet/apple/${bookingId}`);
      const blob = await response.blob();

      // Trigger download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ticket-${bookingId}.pkpass`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error adding to Apple Wallet:', error);
    } finally {
      setLoading({ ...loading, apple: false });
    }
  };

  const handleGoogleWallet = async () => {
    setLoading({ ...loading, google: true });
    try {
      const response = await fetch(`/api/wallet/google/${bookingId}`);
      const data = await response.json();

      // Open Google Wallet link
      window.open(data.walletLink, '_blank');
    } catch (error) {
      console.error('Error adding to Google Wallet:', error);
    } finally {
      setLoading({ ...loading, google: false });
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
      <AppleWalletButton
        variant="contained"
        startIcon={<AppleIcon />}
        onClick={handleAppleWallet}
        disabled={loading.apple}
        fullWidth
      >
        {loading.apple ? 'Loading...' : 'Add to Apple Wallet'}
      </AppleWalletButton>

      <GoogleWalletButton
        variant="outlined"
        startIcon={
          <img
            src="https://www.gstatic.com/images/branding/product/1x/wallet_48dp.png"
            alt="Google Wallet"
            style={{ width: 20, height: 20 }}
          />
        }
        onClick={handleGoogleWallet}
        disabled={loading.google}
        fullWidth
      >
        {loading.google ? 'Loading...' : 'Add to Google Wallet'}
      </GoogleWalletButton>
    </Box>
  );
}

export default WalletButtons;
```

---

## 🧪 Testing

### Apple Wallet Testing

1. **iOS Simulator** (Mac only):
   ```bash
   # Open simulator
   open -a Simulator

   # Drag .pkpass file to simulator
   # Or use Safari to download
   ```

2. **Real Device**:
   - Email .pkpass file to yourself
   - Or host on HTTPS server and click link
   - Pass should open in Wallet app

3. **Validation Tool**:
   ```bash
   # Validate .pkpass file structure
   signpass -v ticket.pkpass
   ```

### Google Wallet Testing

1. **Test on Android**:
   - Click generated "Add to Google Wallet" link
   - Pass opens in Google Wallet app

2. **Test on Web**:
   - Works on Chrome/Chrome-based browsers
   - Opens Google Wallet web interface

3. **Validation**:
   - Check Google Pay Console
   - View issued passes
   - Test updates

### Common Issues

**Apple Wallet:**
- ❌ Certificate expired → Renew in Apple Developer Portal
- ❌ Invalid signature → Check .p12 password
- ❌ Pass not showing → Verify pass.json structure

**Google Wallet:**
- ❌ JWT invalid → Check service account permissions
- ❌ Class not approved → Submit for review in console
- ❌ Barcode not scanning → Verify QR data format

---

## 🚀 Production Deployment

### Pre-Launch Checklist

**Apple Wallet:**
- [ ] Production Pass Type ID created
- [ ] Production certificate (.p12) generated
- [ ] Webhook endpoints configured with HTTPS
- [ ] Pass templates finalized and tested
- [ ] Push notification certificates configured

**Google Wallet:**
- [ ] Service account configured for production
- [ ] Issuer account verified
- [ ] Pass classes submitted and approved
- [ ] Test passes issued and validated
- [ ] Analytics tracking configured

### Security Best Practices

1. **Certificate Storage**:
   - Never commit certificates to git
   - Use environment variables
   - Encrypt certificates at rest
   - Rotate certificates annually

2. **Token Security**:
   - Use strong random tokens
   - Validate all webhook requests
   - Implement rate limiting
   - Log all pass operations

3. **Data Privacy**:
   - Only include necessary information
   - Comply with GDPR
   - Allow pass deletion
   - Secure pass URLs

---

## 📊 Summary

### Implementation Roadmap

**Phase 1: Apple Wallet (4-6 hours)**
1. Setup Apple Developer account & certificates (1-2h)
2. Implement AppleWalletService (2h)
3. Create API endpoints (1h)
4. Testing (1h)

**Phase 2: Google Wallet (3-4 hours)**
1. Setup Google Cloud & service account (1h)
2. Implement GoogleWalletService (1.5h)
3. Create API endpoints (0.5h)
4. Testing (1h)

**Phase 3: Frontend & Testing (2 hours)**
1. Integrate wallet buttons in confirmation screen (1h)
2. End-to-end testing (1h)

**Total Estimated Time**: 9-12 hours

### Next Steps

1. ✅ Research complete (this document)
2. ⏳ Setup Apple Developer account
3. ⏳ Setup Google Cloud project
4. ⏳ Implement backend services
5. ⏳ Create API endpoints
6. ⏳ Integrate frontend
7. ⏳ Testing
8. ⏳ Production deployment

---

## 📚 Resources

### Official Documentation
- **Apple PassKit**: https://developer.apple.com/wallet/
- **Google Wallet**: https://developers.google.com/wallet
- **PassKit Generator**: https://github.com/alexandercerutti/passkit-generator
- **Google APIs**: https://github.com/googleapis/google-api-nodejs-client

### Tutorials
- PassKit Web Service: https://raimundodiaz.github.io/apple-wallet-passes/
- Google Wallet Codelab: https://codelabs.developers.google.com/add-to-wallet-web

### Tools
- Passkit Visual Designer: https://pkvd.app/
- Google Wallet Console: https://pay.google.com/business/console

---

**Last Updated**: 2025-11-18 by Claude
**Version**: 1.0
**Status**: Research Complete - Implementation Ready
