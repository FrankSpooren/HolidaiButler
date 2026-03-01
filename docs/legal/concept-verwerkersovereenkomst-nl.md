# CONCEPT Verwerkersovereenkomst — HolidaiButler

> **DISCLAIMER**: Dit is een concept ter bespreking met een juridisch adviseur. Dit document is NIET juridisch bindend en NIET geschikt voor direct gebruik. Laat dit document altijd valideren door een gekwalificeerde jurist gespecialiseerd in privacyrecht/GDPR.

> **Versie**: CONCEPT 0.1 — Niet voor gebruik
> **Datum**: Maart 2026

---

## Partijen

**Verwerkingsverantwoordelijke** (hierna: "Verantwoordelijke"):
- [Partner naam], [adres], [KvK-nummer]

**Verwerker** (hierna: "Verwerker"):
- Holiday AI B.V. (HolidaiButler), [adres], [KvK-nummer]

---

## Artikel 1 — Onderwerp en Duur

1.1 Deze verwerkersovereenkomst regelt de verwerking van persoonsgegevens door de Verwerker ten behoeve van de Verantwoordelijke in het kader van het HolidaiButler Platform.

1.2 De overeenkomst treedt in werking op [DATUM] en geldt voor de duur van de samenwerking.

---

## Artikel 2 — Doel en Aard van de Verwerking

De Verwerker verwerkt persoonsgegevens uitsluitend ten behoeve van:
- Het faciliteren van ticketverkoop en reserveringen
- Het verwerken van betalingen (via Adyen als sub-verwerker)
- Het versturen van bevestigingen en herinneringen
- Het genereren van geanonimiseerde rapportages

---

## Artikel 3 — Categorien van Betrokkenen en Persoonsgegevens

### 3.1 Categorien betrokkenen:
- Klanten/gasten die tickets kopen of reserveringen maken

### 3.2 Categorien persoonsgegevens:
- Naam (voornaam, achternaam)
- E-mailadres
- Telefoonnummer (optioneel)
- Dieetvoorkeuren en allergieen [BIJZONDERE PERSOONSGEGEVENS — JURIDISCH ADVIES VEREIST]
- Betalingsgegevens (transactiereferenties, GEEN creditcardnummers)
- IP-adres en User-Agent (voor fraude-preventie)

---

## Artikel 4 — Verplichtingen Verwerker

4.1 De Verwerker verwerkt persoonsgegevens uitsluitend op basis van schriftelijke instructies van de Verantwoordelijke.

4.2 De Verwerker waarborgt dat personen die gemachtigd zijn persoonsgegevens te verwerken, zich tot geheimhouding hebben verbonden.

4.3 De Verwerker neemt passende technische en organisatorische maatregelen:
- Encryptie in transit (TLS 1.2+) en at rest
- Toegangscontrole (RBAC met 4 rollen)
- Logging en audit trail
- Regelmatige back-ups

4.4 De Verwerker maakt geen gebruik van sub-verwerkers zonder voorafgaande toestemming. Huidige sub-verwerkers:
- **Adyen N.V.** (Amsterdam, NL) — Betalingsverwerking
- **Hetzner Online GmbH** (Gunzenhausen, DE) — Hosting
- **MailerLite** (Vilnius, LT) — E-mailverzending

---

## Artikel 5 — Rechten van Betrokkenen

5.1 De Verwerker ondersteunt de Verantwoordelijke bij het afhandelen van verzoeken van betrokkenen (inzage, correctie, verwijdering, overdracht) binnen de wettelijke termijnen.

---

## Artikel 6 — Beveiliging en Datalekken

6.1 De Verwerker meldt datalekken binnen 24 uur aan de Verantwoordelijke.

6.2 De Verwerker documenteert alle datalekken, inclusief de gevolgen en genomen maatregelen.

---

## Artikel 7 — Bewaartermijnen

| Gegevenstype | Bewaartermijn | Grondslag |
|---|---|---|
| Betalingstransacties | 7 jaar | Fiscale verplichting |
| Gastprofielen | 24 maanden na laatste activiteit | Gerechtvaardigd belang |
| Reserveringsgegevens | 12 maanden | Uitvoering overeenkomst |
| Audit logs | 30 dagen | Beveiliging |

---

## Artikel 8 — Internationaal Dataverkeer

8.1 Alle primaire gegevensverwerking vindt plaats binnen de EU/EER:
- Server: Duitsland (Hetzner)
- Betalingen: Nederland (Adyen)
- E-mail: Litouwen (MailerLite)

8.2 Bij doorgifte buiten de EU/EER worden passende waarborgen getroffen (Standard Contractual Clauses).

---

## Artikel 9 — Beeindiging

9.1 Bij beeindiging van de overeenkomst verwijdert of retourneert de Verwerker alle persoonsgegevens binnen 30 dagen, tenzij wettelijke bewaarplicht van toepassing is.

---

*Dit concept dient uitsluitend ter bespreking met een juridisch adviseur gespecialiseerd in privacyrecht.*
