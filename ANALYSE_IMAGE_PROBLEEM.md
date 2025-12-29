# HolidaiButler - Image Probleem Analyse

**Datum:** 29 december 2025
**Auteur:** Claude Code
**Status:** Root Cause Geidentificeerd

---

## 1. SAMENVATTING

### Probleem
POI tiles en detail cards tonen geen images, ondanks 11.854 image records in de database.

### Root Cause
**97.4% van de opgeslagen images (Google URLs) retourneert HTTP 403 Forbidden** omdat Google Places photo URLs niet bedoeld zijn voor directe server/browser toegang zonder de Google Maps JavaScript API.

### Impact
- 11.384 Google images: **NIET WERKEND** (403)
- 45 Worldota images: WERKEND (200)
- 263 Streetview images: WERKEND (200)
- **Slechts 308 van 11.854 images zijn toegankelijk (2.6%)**

---

## 2. DATABASE INVENTARISATIE

### 2.1 Huidige Status (29-12-2025 11:52 UTC)

| Metriek | Waarde |
|---------|--------|
| Totaal images in database | 11.854 |
| Unieke POIs met images | 1.301 |
| Actieve POIs zonder images | 291 |
| Totaal actieve POIs | 1.591 |

### 2.2 Image Bronnen

| Bron | Aantal | Percentage | HTTP Status |
|------|--------|------------|-------------|
| lh3.googleusercontent.com | 11.384 | 96.0% | 403 Forbidden |
| streetviewpixels | 263 | 2.2% | 200 OK |
| worldota.net | 45 | 0.4% | 200 OK |
| Overig | 162 | 1.4% | Niet getest |

### 2.3 Tijdstempels

**Kritiek:** ALLE 11.854 images hebben `last_fetched_at` binnen de laatste 24 uur. Er zijn GEEN oudere images meer in de database.

---

## 3. UITGEVOERDE ACTIES (Chronologisch)

### 3.1 Eerdere Apify Run (voor deze sessie)
- **Wat:** Apify Google Maps Scraper uitgevoerd
- **Resultaat:** Onbekend aantal images toegevoegd
- **Status:** Images waren werkend op dat moment

### 3.2 Fix-Expired-Images.js (28-12-2025)
- **Locatie:** `platform-core/scripts/fix-expired-images.js`
- **Logica:**
  1. Voor elke POI: check EERSTE image met HEAD request
  2. Als status != 200: verwijder ALLE images voor die POI
- **Resultaat:** 1.831 images verwijderd bij 350 POIs
- **Probleem:**
  - HEAD requests naar Google URLs gedragen zich anders dan GET
  - Script verwijdert ALLE images als eerste faalt (te agressief)
  - Mogelijk ook werkende images verwijderd

### 3.3 Refresh-Missing-Images.js (28-12-2025, gestart maar gestopt)
- **Locatie:** `platform-core/scripts/refresh-missing-images.js`
- **Actie:** Apify aanroepen voor POIs zonder images
- **Resultaat:** ~16 POIs verwerkt voordat gestopt
- **Kosten:** Apify credits verbruikt

### 3.4 Eerdere Batch (Referentie user)
- User meldt ook een eerdere batch van 3.400 images (576 POIs) verwijderd
- Details onbekend - mogelijk in vorige sessie

---

## 4. ROOT CAUSE ANALYSE

### 4.1 Waarom Google Images 403 Geven

Google Places photo URLs (`lh3.googleusercontent.com`) zijn **signed URLs** met beperkte geldigheid:

1. **gps-cs-s format** (7.947 URLs): Nieuwe signed format van Apify scraper
2. **AF1QipM format** (3.436 URLs): Klassieke Google Places photo format

**Beide formaten zijn NIET bedoeld voor directe toegang:**
- Vereisen Google Maps JavaScript API context
- Hebben korte TTL (Time To Live)
- Blokkeren server-side requests
- Blokkeren ook browser requests zonder juiste referrer/context

### 4.2 Waarom Worldota en Streetview WEL Werken

- **Worldota (CDN):** Publieke CDN URLs zonder toegangsbeperking
- **Streetview:** Andere Google service met permissieve toegang

### 4.3 Tijdlijn Probleem

```
[Oorspronkelijk] 12.421 images (mix van bronnen)
        ↓
[Fix Script Actie 1] -3.400 images (vermoedelijk)
        ↓
[Fix Script Actie 2] -1.831 images
        ↓
[Apify Refresh] +X nieuwe Google images
        ↓
[Nu] 11.854 images waarvan 97% niet toegankelijk
```

---

## 5. CONCLUSIE

### 5.1 Exacte Probleemdefinitie

**Het image-systeem is afhankelijk van Google Places photo URLs die inherent tijdelijk zijn en directe toegang blokkeren.** De "fix" en "refresh" scripts hebben:

1. Werkende non-Google images mogelijk onterecht verwijderd
2. Nieuwe Google images toegevoegd die direct 403 retourneren
3. De situatie verergerd in plaats van verbeterd

### 5.2 Terecht Verwijderde vs Onterecht Verwijderde Images

| Type | Terecht Verwijderd? | Reden |
|------|---------------------|-------|
| Verlopen Google URLs | Ja | Gaven al 403 |
| Oude maar werkende Worldota | **Mogelijk NIET** | HEAD check kan false negative geven |
| Oude maar werkende Streetview | **Mogelijk NIET** | HEAD check kan false negative geven |

### 5.3 Nog Bruikbare Images

| Type | Aantal | Status |
|------|--------|--------|
| Worldota | 45 | 100% bruikbaar |
| Streetview | 263 | 100% bruikbaar |
| Google | 0 | 0% bruikbaar |
| **Totaal Bruikbaar** | **308** | |

---

## 6. AANBEVELINGEN

Zie separaat Plan van Aanpak document.
