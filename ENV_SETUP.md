# HolidaiButler - Environment Setup Guide

## Overzicht

Dit document beschrijft hoe je de environment variabelen correct configureert voor de HolidaiButler platform modules.

## Belangrijke Security Regels

1. **NOOIT** echte `.env` bestanden committen naar GitHub
2. Gebruik `.env.example` bestanden als template (deze bevatten placeholders)
3. Voor productie: gebruik **GitHub Secrets** voor CI/CD

---

## Quick Start (Lokale Ontwikkeling)

### Stap 1: Kopieer .env.example bestanden

```bash
# Root configuratie
cp .env.example .env

# Customer Portal Frontend
cp customer-portal/frontend/.env.example customer-portal/frontend/.env

# Platform Core (API Gateway)
cp platform-core/.env.example platform-core/.env

# Admin Module
cp admin-module/backend/.env.example admin-module/backend/.env

# Payment Module
cp payment-module/backend/.env.example payment-module/backend/.env

# Ticketing Module
cp ticketing-module/backend/.env.example ticketing-module/backend/.env

# Reservations Module
cp reservations-module/backend/.env.example reservations-module/backend/.env

# Agenda Module
cp agenda-module/backend/.env.example agenda-module/backend/.env
```

### Stap 2: Vul de waarden in

Bewerk elk `.env` bestand en vervang de placeholders met echte waarden.

---

## Productie Deployment (GitHub Actions)

### GitHub Secrets Configureren

1. Ga naar je GitHub repository
2. **Settings** → **Secrets and variables** → **Actions**
3. Voeg de volgende secrets toe:

#### Verplichte Secrets

| Secret Name | Beschrijving | Voorbeeld |
|------------|--------------|-----------|
| `DATABASE_HOST` | Hetzner MySQL host | `your-server.hetzner.com` |
| `DATABASE_USER` | Database username | `holidaibutler_user` |
| `DATABASE_PASSWORD` | Database wachtwoord | `secure-password` |
| `DATABASE_NAME` | Database naam | `pxoziy_db1` |
| `JWT_SECRET` | JWT signing key (32+ chars) | `openssl rand -hex 32` |
| `MISTRAL_API_KEY` | Mistral AI API key | `your-mistral-key` |
| `ADYEN_API_KEY` | Adyen API key | `AQE...` |
| `ADYEN_MERCHANT_ACCOUNT` | Adyen merchant account | `YourMerchantAccount` |
| `ADYEN_HMAC_KEY` | Webhook verification | `your-hmac-key` |
| `ADYEN_CLIENT_KEY` | Frontend client key | `pub_test_xxx` |

#### Optionele Secrets

| Secret Name | Beschrijving |
|------------|--------------|
| `REDIS_HOST` | Redis server host |
| `REDIS_PASSWORD` | Redis wachtwoord |
| `MAILERLITE_API_KEY` | Email service |
| `TWILIO_ACCOUNT_SID` | SMS service |
| `AWS_ACCESS_KEY_ID` | S3 file storage |

---

## Module-Specifieke Configuratie

### Customer Portal Frontend

**Bestand:** `customer-portal/frontend/.env`

```env
# API Endpoints (voor test.holidaibutler.com)
VITE_API_URL=https://api.holidaibutler.com/api/v1
VITE_TICKETING_API_URL=https://api.holidaibutler.com/api/v1/ticketing
VITE_PAYMENT_API_URL=https://api.holidaibutler.com/api/v1/payments

# Adyen (Frontend)
VITE_ADYEN_ENVIRONMENT=test
VITE_ADYEN_CLIENT_KEY=pub_test_your-key
```

### Platform Core (API Gateway)

**Bestand:** `platform-core/.env`

```env
# Server
NODE_ENV=production
PORT=3001

# Database (Hetzner MySQL)
DB_HOST=your-hetzner-host
DB_PORT=3306
DB_USER=your-username
DB_PASSWORD=your-password
DB_NAME=pxoziy_db1

# AI Services
MISTRAL_API_KEY=your-mistral-key
```

### Payment Module

**Bestand:** `payment-module/backend/.env`

```env
# Adyen (Backend)
ADYEN_API_KEY=your-api-key
ADYEN_ENVIRONMENT=test
ADYEN_MERCHANT_ACCOUNT=YourMerchant
ADYEN_HMAC_KEY=your-hmac-key

# Database
DATABASE_HOST=your-hetzner-host
DATABASE_USER=your-username
DATABASE_PASSWORD=your-password
```

---

## Secure Secret Generatie

### JWT Secret
```bash
openssl rand -hex 32
```

### Encryption Key (64 chars hex)
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### API Key
```bash
openssl rand -base64 32
```

---

## Hetzner Database Verbinding

Je Hetzner MySQL database credentials:

1. **Host**: Krijg dit van Hetzner Console
2. **Port**: Standaard `3306`
3. **Database**: `pxoziy_db1` (of jouw database naam)
4. **User/Password**: Geconfigureerd in Hetzner

### Test de verbinding
```bash
mysql -h your-hetzner-host -u your-user -p your-database
```

---

## Adyen Configuratie

### Test Omgeving
1. Login op [Adyen Customer Area](https://ca-test.adyen.com)
2. Ga naar **Developers** → **API credentials**
3. Genereer/kopieer:
   - API Key (voor backend)
   - Client Key (voor frontend: `pub_test_xxx`)
   - HMAC Key (voor webhooks)

### Live Omgeving
Zelfde stappen maar op [ca-live.adyen.com](https://ca-live.adyen.com)

---

## Mistral AI (HoliBot)

1. Ga naar [console.mistral.ai](https://console.mistral.ai)
2. Genereer een API key
3. Voeg toe aan je `.env`:
   ```env
   MISTRAL_API_KEY=your-api-key
   MISTRAL_MODEL=mistral-small-latest
   ```

---

## Troubleshooting

### "Database connection failed"
- Check of `DATABASE_HOST` bereikbaar is
- Verifieer username/password
- Check firewall regels op Hetzner

### "Adyen payment error"
- Verifieer dat `ADYEN_CLIENT_KEY` begint met `pub_test_` of `pub_live_`
- Check of `ADYEN_MERCHANT_ACCOUNT` correct is
- Test mode API key werkt niet in live omgeving

### "HoliBot geeft geen antwoord"
- Check `MISTRAL_API_KEY` in platform-core
- Verifieer API quota op Mistral console

---

## Contact

Voor hulp met configuratie, neem contact op met het development team.
