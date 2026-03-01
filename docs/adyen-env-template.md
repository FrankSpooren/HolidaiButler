# Adyen Environment Variables Template

> **WAARSCHUWING**: Sla deze waarden NOOIT op in git. Alleen in `.env` op Hetzner.
> Locatie: `/var/www/api.holidaibutler.com/platform-core/.env`

```bash
# Adyen Test Environment
ADYEN_API_KEY=test_xxxxxxxxxxxx
ADYEN_CLIENT_KEY=test_xxxxxxxxxxxx
ADYEN_MERCHANT_ACCOUNT=HolidaiButler378ECOM
ADYEN_HMAC_KEY=xxxxxxxxxxxx
ADYEN_ENVIRONMENT=TEST
ADYEN_BASIC_AUTH=xxxxxxxxxxxx
ADYEN_WEBHOOK_URL=https://api.holidaibutler.com/api/v1/payments/webhook

# Adyen Production (NA succesvolle testing)
# ADYEN_API_KEY=live_xxxxxxxxxxxx
# ADYEN_CLIENT_KEY=live_xxxxxxxxxxxx
# ADYEN_MERCHANT_ACCOUNT=HolidaiButler378ECOM  (zelfde voor production)
# ADYEN_ENVIRONMENT=LIVE
# ADYEN_WEBHOOK_URL=https://api.holidaibutler.com/api/v1/payments/webhook
```

## Variabelen Toelichting

| Variabele | Beschrijving | Waar te vinden |
|-----------|-------------|----------------|
| `ADYEN_API_KEY` | Server-side API key | Customer Area > Developers > API credentials |
| `ADYEN_CLIENT_KEY` | Client-side key (Drop-in) | Customer Area > Developers > API credentials |
| `ADYEN_MERCHANT_ACCOUNT` | Merchant account naam | Customer Area > Account > Merchant accounts |
| `ADYEN_HMAC_KEY` | Webhook HMAC verificatie | Customer Area > Developers > Webhooks > HMAC key |
| `ADYEN_ENVIRONMENT` | `TEST` of `LIVE` | Afhankelijk van fase |
| `ADYEN_BASIC_AUTH` | Basic auth wachtwoord | Customer Area > Developers > API credentials |
| `ADYEN_WEBHOOK_URL` | Webhook ontvangst URL | Ingesteld in Customer Area |
