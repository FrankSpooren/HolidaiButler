# Digital Wallet Integration Setup Guide
**HolidaiButler Ticketing Module - Phase 2: Week 11-12**

Date: November 17, 2025
Status: ✅ Implemented

---

## Overview

This guide covers the setup and configuration of Apple Wallet (PKPass) and Google Pay pass generation for the HolidaiButler ticketing system.

---

## 📱 Apple Wallet Setup

### Prerequisites
1. Apple Developer Account ($99/year)
2. macOS for certificate generation (or Linux with OpenSSL)

### Step 1: Create Pass Type ID

1. Go to [Apple Developer Portal](https://developer.apple.com/account/)
2. Navigate to **Certificates, Identifiers & Profiles**
3. Select **Identifiers** → **Pass Type IDs**
4. Click **+** to create new Pass Type ID
5. Enter identifier: `pass.com.holidaibutler.ticket`
6. Save and note the Pass Type ID

### Step 2: Create Pass Type ID Certificate

1. In Pass Type IDs section, select your Pass Type ID
2. Click **Create Certificate**
3. On your Mac, open **Keychain Access**
4. Go to **Keychain Access** → **Certificate Assistant** → **Request a Certificate from a Certificate Authority**
5. Enter email and name, select **Saved to disk**
6. Upload the CSR file to Apple Developer Portal
7. Download the certificate (`.cer` file)

### Step 3: Convert Certificate to PEM Format

```bash
# Download the certificate and double-click to install in Keychain

# Export as .p12 from Keychain Access:
# 1. Select the certificate in Keychain
# 2. Right-click → Export
# 3. Save as "PassCertificate.p12" with a password

# Convert .p12 to PEM files
openssl pkcs12 -in PassCertificate.p12 -clcerts -nokeys -out signerCert.pem
openssl pkcs12 -in PassCertificate.p12 -nocerts -out signerKey.pem

# Remove password from key (optional)
openssl rsa -in signerKey.pem -out signerKey.pem
```

### Step 4: Download WWDR Certificate

```bash
# Download Apple's WWDR (Worldwide Developer Relations) certificate
wget https://www.apple.com/certificateauthority/AppleWWDRCAG4.cer

# Convert to PEM
openssl x509 -inform der -in AppleWWDRCAG4.cer -out wwdr.pem
```

### Step 5: Place Certificates in Project

```bash
# Copy certificates to project
cp signerCert.pem ticketing-module/backend/certs/apple/
cp signerKey.pem ticketing-module/backend/certs/apple/
cp wwdr.pem ticketing-module/backend/certs/apple/
```

### Step 6: Configure Environment Variables

Add to `.env`:

```env
# Apple Wallet Configuration
APPLE_PASS_TYPE_ID=pass.com.holidaibutler.ticket
APPLE_TEAM_ID=YOUR_TEAM_ID
APPLE_CERT_PATH=/path/to/ticketing-module/backend/certs/apple
APPLE_KEY_PASSPHRASE=your_key_password_if_set
```

**To find your Team ID:**
1. Go to [Apple Developer Account](https://developer.apple.com/account/)
2. Click on **Membership** in the sidebar
3. Your Team ID is listed there (10 characters)

---

## 🤖 Google Pay Setup

### Prerequisites
1. Google Cloud Platform account
2. Google Pay API for Passes access

### Step 1: Enable Google Pay API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable **Google Pay API for Passes**:
   - Navigate to **APIs & Services** → **Library**
   - Search for "Google Pay API for Passes"
   - Click **Enable**

### Step 2: Create Service Account

1. Go to **IAM & Admin** → **Service Accounts**
2. Click **Create Service Account**
3. Name: `holidaibutler-wallet-service`
4. Grant role: **Google Pay for Passes User**
5. Click **Done**

### Step 3: Create Service Account Key

1. Click on the created service account
2. Go to **Keys** tab
3. Click **Add Key** → **Create new key**
4. Select **JSON** format
5. Download the key file (`service-account.json`)

### Step 4: Create Issuer Account

1. Go to [Google Pay Business Console](https://pay.google.com/business/console)
2. Apply for **Google Pay API for Passes** access
3. Once approved, note your **Issuer ID** (looks like: `1234567890123456789`)

### Step 5: Create Pass Class

```javascript
// Run this once to create the event ticket class
const { google } = require('googleapis');

const serviceAccount = require('./certs/google/service-account.json');

const httpClient = google.auth.fromJSON(serviceAccount);
httpClient.scopes = ['https://www.googleapis.com/auth/wallet_object.issuer'];

const walletobjects = google.walletobjects({
  version: 'v1',
  auth: httpClient,
});

const eventTicketClass = {
  id: `${ISSUER_ID}.event-ticket-class`,
  issuerName: 'HolidaiButler',
  reviewStatus: 'UNDER_REVIEW',
  eventName: {
    defaultValue: {
      language: 'en',
      value: 'HolidaiButler Event',
    },
  },
};

await walletobjects.eventticketclass.insert({
  requestBody: eventTicketClass,
});
```

### Step 6: Place Configuration in Project

```bash
# Copy service account JSON
cp service-account.json ticketing-module/backend/certs/google/
```

### Step 7: Configure Environment Variables

Add to `.env`:

```env
# Google Pay Configuration
GOOGLE_ISSUER_ID=1234567890123456789
GOOGLE_SERVICE_ACCOUNT_PATH=/path/to/ticketing-module/backend/certs/google/service-account.json
```

---

## 🎨 Assets Setup

### Required Assets

Create the following images and place in `ticketing-module/backend/assets/`:

**For Apple Wallet:**
- `icon.png` - 29x29px (60x60px @2x)
- `logo.png` - 160x50px (320x100px @2x)

**For Google Pay:**
- `hero.png` - 1032x336px (recommended)
- `logo.png` - 660x660px (recommended)

### Image Requirements

**Apple Wallet:**
- PNG format
- RGB color space
- 72 DPI
- No transparency for logo

**Google Pay:**
- PNG or JPG
- Maximum file size: 1MB
- Transparent background supported

---

## 🔧 Configuration File

Update `ticketing-module/backend/.env.example`:

```env
# ========== WALLET CONFIGURATION ==========

# Apple Wallet (PKPass)
APPLE_PASS_TYPE_ID=pass.com.holidaibutler.ticket
APPLE_TEAM_ID=ABCDE12345
APPLE_CERT_PATH=./certs/apple
APPLE_KEY_PASSPHRASE=

# Google Pay
GOOGLE_ISSUER_ID=1234567890123456789
GOOGLE_SERVICE_ACCOUNT_PATH=./certs/google/service-account.json

# Storage
PASS_STORAGE_PATH=/tmp/wallet-passes
API_URL=https://api.holidaibutler.com
```

---

## 🧪 Testing

### Test Apple Wallet Pass

```bash
# Test pass generation
curl -X POST http://localhost:3004/api/v1/tickets/{ticketId}/wallet \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"walletType": "apple"}'

# Download pass
curl http://localhost:3004/api/v1/tickets/{ticketId}/wallet/apple/download \
  -o test-ticket.pkpass

# Verify pass on iPhone:
# - AirDrop the .pkpass file to iPhone
# - Tap to add to Apple Wallet
```

### Test Google Pay Pass

```bash
# Generate Google Pay URL
curl -X POST http://localhost:3004/api/v1/tickets/{ticketId}/wallet \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"walletType": "google"}'

# Response will contain Google Pay URL:
# https://pay.google.com/gp/v/save/JWT_TOKEN

# Open URL in browser on Android device
```

---

## 📦 Dependencies

Already installed via `npm install`:

```json
{
  "passkit-generator": "^3.x",
  "@walletpass/pass-js": "^4.x"
}
```

---

## 🔒 Security Best Practices

1. **Never commit certificates to version control**
   - Add to `.gitignore`:
     ```
     /certs/
     /assets/
     *.p12
     *.pem
     service-account.json
     ```

2. **Use environment variables for sensitive data**
   - Certificate paths
   - API keys
   - Passphrases

3. **Rotate certificates before expiration**
   - Apple certificates expire annually
   - Google service account keys can be rotated

4. **Secure storage**
   - Store certificates in secure location on server
   - Restrict file permissions: `chmod 600 *.pem`

5. **Use HTTPS in production**
   - Pass download endpoints must be HTTPS
   - Google Pay requires HTTPS

---

## 🚀 Deployment Checklist

- [ ] Apple Developer Account created
- [ ] Apple Pass Type ID certificate generated
- [ ] Certificates converted to PEM format
- [ ] Certificates placed in `certs/apple/`
- [ ] WWDR certificate downloaded
- [ ] Google Cloud project created
- [ ] Google Pay API enabled
- [ ] Service account created with JSON key
- [ ] Issuer ID obtained
- [ ] Pass class created in Google Pay
- [ ] Service account JSON placed in `certs/google/`
- [ ] Assets created and placed in `assets/`
- [ ] Environment variables configured
- [ ] Test passes generated successfully
- [ ] Certificates added to `.gitignore`
- [ ] Production API URLs configured

---

## 📚 Additional Resources

### Apple Wallet
- [Wallet Developer Guide](https://developer.apple.com/wallet/)
- [PassKit Documentation](https://developer.apple.com/documentation/passkit)
- [Pass Design Guide](https://developer.apple.com/design/human-interface-guidelines/wallet)

### Google Pay
- [Google Pay API for Passes](https://developers.google.com/pay/passes)
- [Event Ticket Class Reference](https://developers.google.com/pay/passes/reference/v1/eventticketclass)
- [Google Pay Design Guidelines](https://developers.google.com/pay/passes/guides/design-guidelines)

---

## ❓ Troubleshooting

### Apple Wallet Issues

**Error: "Certificate not found"**
- Verify certificate paths in `.env`
- Check file permissions
- Ensure PEM format is correct

**Pass won't install on iPhone**
- Verify HTTPS endpoint
- Check certificate validity
- Validate pass structure

### Google Pay Issues

**Error: "Invalid JWT"**
- Check service account credentials
- Verify issuer ID
- Ensure proper scopes in service account

**Pass doesn't appear**
- Verify class ID exists
- Check Google Pay API is enabled
- Ensure Android device supports Google Pay

---

**Last Updated:** November 17, 2025
**Version:** 1.0
**Contact:** tech@holidaibutler.com
