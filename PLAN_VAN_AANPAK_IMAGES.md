# HolidaiButler - Plan van Aanpak: Image Systeem

**Datum:** 29 december 2025
**Versie:** 1.0

---

## A. PROBLEEMDEFINITIE

### Primair Probleem
Google Places photo URLs zijn **ephemeral (tijdelijk)** en blokkeren directe HTTP toegang. Het huidige systeem slaat alleen URLs op, niet de daadwerkelijke images. Zodra Google de URLs invalideert (of directe toegang blokkeert), stoppen de images met werken.

### Secundair Probleem
De cleanup scripts hebben mogelijk werkende non-Google images onterecht verwijderd door te agressieve logica (HEAD request check op eerste image, dan alle images verwijderen).

---

## B. KORTE TERMIJN OPLOSSING (Direct)

### B.1 Stap 1: Behoud Werkende Images
Identificeer en markeer de 308 werkende images (Worldota + Streetview) als "verified":

```sql
-- Voer NIET uit zonder backup!
-- Markeer werkende images
UPDATE imageurls
SET source = 'verified_working'
WHERE image_url LIKE '%worldota.net%'
   OR image_url LIKE '%streetviewpixels%';
```

### B.2 Stap 2: Verwijder Niet-Werkende Google URLs
```sql
-- Verwijder alleen Google URLs die 403 geven
DELETE FROM imageurls
WHERE image_url LIKE '%lh3.googleusercontent.com%';
```

**Impact:** 11.384 records verwijderd, 470 images behouden

### B.3 Stap 3: Alternatieve Image Bronnen

**Optie 1: Wikimedia Commons API (Gratis)**
- Geen kosten
- Hoge kwaliteit
- Beperkte dekking voor specifieke POIs

**Optie 2: Unsplash API (Gratis tier)**
- 50 requests/uur gratis
- Generieke locatie-images
- Goed voor fallback

**Optie 3: Google Places API met Download (Betaald)**
- $7 per 1000 foto requests
- Images direct downloaden en lokaal opslaan
- Structurele oplossing

### B.4 Stap 4: Fallback Systeem Verbeteren
Huidige fallback (gekleurde placeholder met icoon) is functioneel. Prioriteer het vinden van nieuwe image bronnen boven cosmetische verbeteringen.

---

## C. STRUCTURELE OPLOSSING (Middellange Termijn)

### C.1 Image Download & Opslag Systeem

**Architectuur:**
```
[Image Bron] → [Download Service] → [Hetzner Storage] → [CDN] → [Frontend]
     ↑              ↓
     |         [imageurls DB]
     |              ↓
     └──── [local_path kolom toegevoegd]
```

### C.2 Database Schema Uitbreiding

```sql
ALTER TABLE imageurls ADD COLUMN local_path VARCHAR(255) NULL;
ALTER TABLE imageurls ADD COLUMN file_size INT NULL;
ALTER TABLE imageurls ADD COLUMN verified_at DATETIME NULL;
ALTER TABLE imageurls ADD INDEX idx_local_path (local_path);
```

### C.3 Image Download Service

**Locatie:** `platform-core/src/services/imageDownloader.js`

**Functionaliteit:**
1. Bij Apify fetch: download image direct
2. Sla op in `/var/www/api.holidaibutler.com/storage/poi-images/{poi_id}/`
3. Update `local_path` in database
4. Serve via nginx of CDN

### C.4 Nginx Configuratie voor Image Serving

```nginx
location /poi-images/ {
    alias /var/www/api.holidaibutler.com/storage/poi-images/;
    expires 30d;
    add_header Cache-Control "public, immutable";
}
```

---

## D. KOSTENANALYSE

### D.1 Huidige Situatie
- Apify: €0.003 per POI scrape
- ~1.600 POIs = €4.80 per volledige refresh
- Google URLs werken niet = **100% verlies**

### D.2 Voorgestelde Oplossing Kosten

| Optie | Kosten per POI | Totaal (1.600 POIs) | Structureel |
|-------|---------------|---------------------|-------------|
| Wikimedia | Gratis | €0 | Nee |
| Unsplash | Gratis (50/uur) | €0 | Nee |
| Google Places + Download | €0.007 | €11.20 | Ja |
| Lokale opslag (Hetzner) | ~€0.01/GB/maand | <€1/maand | Ja |

### D.3 Aanbeveling
**Google Places API + Lokale Download** is de meest betrouwbare oplossing:
- Eenmalige kost: ~€12
- Structureel: Images verlopen niet
- Kwaliteit: Beste beschikbare

---

## E. IMPLEMENTATIE STAPPENPLAN

### Fase 1: Opruimen (1 uur)
1. [ ] Backup huidige imageurls tabel
2. [ ] Verwijder niet-werkende Google URLs
3. [ ] Behoud werkende Worldota/Streetview images
4. [ ] Verify: elke POI met werkende images toont correct

### Fase 2: Lokale Opslag Setup (2 uur)
1. [ ] Maak storage directory: `/var/www/.../storage/poi-images/`
2. [ ] Configureer nginx voor image serving
3. [ ] Extend database schema met `local_path`
4. [ ] Implementeer basic download service

### Fase 3: Image Ophalen (3-4 uur)
1. [ ] Kies primaire bron (Google Places API aanbevolen)
2. [ ] Implementeer download + save flow
3. [ ] Process in batches (50 POIs per run)
4. [ ] Monitor en valideer

### Fase 4: Frontend Aanpassing (1 uur)
1. [ ] Update POIImage component voor lokale URLs
2. [ ] Fallback naar externe URL indien geen local_path
3. [ ] Test op staging

### Fase 5: Monitoring & Preventie
1. [ ] Cron job voor image health check (wekelijks)
2. [ ] Alert bij >10% image failures
3. [ ] Automatische refresh voor verlopen images

---

## F. BESLISPUNTEN VOOR OPDRACHTGEVER

1. **Akkoord met verwijderen 11.384 niet-werkende Google URLs?**
   - Ja → Ga door met Fase 1
   - Nee → Alternatief onderzoeken

2. **Budget voor Google Places API?**
   - Ja (€12 eenmalig) → Beste kwaliteit
   - Nee → Wikimedia/Unsplash fallback

3. **Prioriteit implementatie?**
   - Urgent → Direct starten
   - Normaal → Plannen voor volgende sprint

---

## G. RISICO'S EN MITIGATIE

| Risico | Impact | Mitigatie |
|--------|--------|-----------|
| Google API rate limiting | Medium | Batch processing met delays |
| Storage vol | Laag | ~50MB per 1000 images, monitoren |
| Image kwaliteit varieert | Laag | Quality check bij download |
| Vendor lock-in | Medium | Abstractie laag voor image bronnen |

---

## H. DEFINITIE VAN SUCCES

1. **Kwantitatief:**
   - >90% van actieve POIs heeft minimaal 1 werkende image
   - 0% 403 errors op image requests
   - <2 seconden laadtijd per image

2. **Kwalitatief:**
   - Consistente image kwaliteit
   - Geen zichtbare fallback placeholders op populaire POIs
   - Robuust systeem dat niet afhankelijk is van externe URL geldigheid
