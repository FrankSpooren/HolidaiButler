# Adyen Setup Checklist — HolidaiButler

## Stap 1: Test Account Aanmaken
- [x] Ga naar https://www.adyen.com/signup
- [x] Selecteer "Test Account"
- [x] Vul bedrijfsgegevens in (HolidaiButler / Holiday AI B.V.)
- [x] Merchant Account naam: **HolidaiButler378ECOM**
- [x] Company Account naam: **HolidaiButler**

## Stap 2: API Credentials Aanmaken
- [x] Customer Area > Developers > API credentials
- [x] API Key gegenereerd (test)
- [x] Client Key gegenereerd (test): `test_GTHKLMCCOVHUXDTB5LGRHR7UBYGA7PIM`
- [x] HMAC key voor webhooks genoteerd
- [x] Basic Auth password genoteerd
- [x] Alle keys opgeslagen in .env op Hetzner (NOOIT in git!)

## Stap 3: Webhook Configuratie
- [ ] Customer Area > Developers > Webhooks
- [ ] Standard webhook URL: `https://api.holidaibutler.com/api/v1/payments/webhook`
- [ ] HMAC verificatie: AAN
- [ ] Events: AUTHORISATION, CAPTURE, CANCELLATION, REFUND, CHARGEBACK

## Stap 4: KYC Documentatie Verzamelen
- [ ] KvK uittreksel (< 3 maanden oud)
- [ ] ID bewijs UBO (Ultimate Beneficial Owner)
- [ ] Bankafschrift bedrijfsrekening
- [ ] Website URL + privacy policy URL
- [ ] Beschrijving bedrijfsmodel (intermediair/platform)

## Stap 5: Payment Methods Activeren (Test)
- [ ] iDEAL (NL)
- [ ] Bancontact (BE)
- [ ] Credit Card (Visa/Mastercard)
- [ ] Sofort/Klarna (optioneel)

## Stap 6: PCI DSS SAQ Bepalen
- [ ] Gebruik Adyen Drop-in/Components > SAQ-A van toepassing
- [ ] SAQ-A: Geen kaartgegevens op eigen servers
- [ ] Download SAQ-A template van PCI SSC
- [ ] Vul in en archiveer

## Stap 7: Production Account Aanvragen
- [ ] Pas aan na succesvolle test-integratie
- [ ] KYC review door Adyen (2-4 weken doorlooptijd)
- [ ] Production API keys genereren
- [ ] Webhook URLs updaten naar production
