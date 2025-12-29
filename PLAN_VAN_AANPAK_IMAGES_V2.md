# HolidaiButler - Plan van Aanpak: Image Systeem v2

**Datum:** 29 december 2025
**Versie:** 2.0 (Gebaseerd op accurate analyse)

---

## A. PROBLEEMDEFINITIE (Exact)

### Primair Probleem
**215 van 1.300 actieve POIs (17%)** tonen een fallback icon in hun tile omdat de eerste image (gps-cs-s URL type) een HTTP 403 retourneert.

### Secundair Probleem
Het image priority systeem plaatst gps-cs-s URLs op positie 1 (hoogste prioriteit), terwijl dit type een 32% failure rate heeft.

### NIET het probleem
- Browser tracking prevention
- Alle Google images werken niet (AF1Qip werkt 100%)
- Database schema issues

---

## B. KORTE TERMIJN OPLOSSING (Direct Implementeerbaar)

### B.1 Optie 1: Image Priority Aanpassen (Aanbevolen)

**Wijzig in `platform-core/src/models/ImageUrl.js`:**

```javascript
// HUIDIGE prioriteit (PROBLEMATISCH):
function getImagePriority(url) {
  if (url.includes('lh3.googleusercontent.com/gps-cs-s')) return 1;  // Hoogste, maar 32% faalt!
  if (url.includes('lh3.googleusercontent.com')) return 2;            // AF1Qip, 100% werkt
  if (url.includes('streetviewpixels')) return 10;
  return 5;
}

// NIEUWE prioriteit (AANBEVOLEN):
function getImagePriority(url) {
  if (url.includes('worldota.net')) return 1;                         // CDN, 100% werkt
  if (url.includes('lh3.googleusercontent.com/gps-cs-s')) return 5;   // Lagere prioriteit
  if (url.includes('lh3.googleusercontent.com')) return 2;            // AF1Qip, 100% werkt
  if (url.includes('streetviewpixels')) return 3;                     // 100% werkt
  return 6;
}
```

**Impact:**
- Geen images worden verwijderd
- AF1Qip en Streetview krijgen voorrang boven gps-cs-s
- Tiles tonen vaker werkende images als eerste

### B.2 Optie 2: Verwijder Alleen Falende gps-cs-s URLs

**Script om te runnen (na backup):**

```sql
-- Stap 1: Backup
CREATE TABLE imageurls_backup_20251229 AS SELECT * FROM imageurls;

-- Stap 2: Identificeer en verwijder ALLEEN falende gps-cs-s URLs
-- Dit vereist server-side validatie script
```

**Validatie script (`validate-gps-cs-s.js`):**
```javascript
// Test elke gps-cs-s URL en verwijder alleen die met 403
const failingUrls = await testGpsCssUrls();
await deleteFailingUrls(failingUrls);
```

### B.3 Optie 3: Frontend Fallback Verbetering

**Wijzig `POIImage.tsx` om door te gaan naar volgende image bij error:**

```typescript
// HUIDIGE logica: eerste image faalt → fallback
// NIEUWE logica: eerste image faalt → probeer volgende

useEffect(() => {
  const tryNextImage = async (index: number) => {
    if (index >= (poi.images?.length || 0)) {
      setImageState('error'); // Alle images gefaald
      return;
    }
    setImageSrc(poi.images![index]);
    // Bij error (in handleImageError): tryNextImage(index + 1)
  };
  tryNextImage(0);
}, [poi.images]);
```

**Impact:**
- Tiles proberen automatisch volgende image als eerste faalt
- Gebruiker ziet minder fallbacks
- Kleine performance impact (meerdere image loads)

---

## C. STRUCTURELE OPLOSSING (Middellange Termijn)

### C.1 Image Download & Opslag Systeem

**Concept:** Download images direct bij Apify fetch en sla lokaal op.

```
┌──────────────┐     ┌───────────────┐     ┌─────────────────┐
│ Apify Fetch  │────>│ Download Svc  │────>│ Hetzner Storage │
│ (image URL)  │     │ (validate+dl) │     │ /poi-images/    │
└──────────────┘     └───────────────┘     └─────────────────┘
                            │
                            v
                     ┌─────────────────┐
                     │ imageurls DB    │
                     │ + local_path    │
                     │ + verified_at   │
                     └─────────────────┘
```

### C.2 Database Uitbreiding

```sql
ALTER TABLE imageurls ADD COLUMN local_path VARCHAR(255) NULL;
ALTER TABLE imageurls ADD COLUMN file_hash VARCHAR(64) NULL;
ALTER TABLE imageurls ADD COLUMN verified_at DATETIME NULL;
ALTER TABLE imageurls ADD INDEX idx_local_path (local_path);
ALTER TABLE imageurls ADD INDEX idx_verified_at (verified_at);
```

### C.3 Image Validatie bij Fetch

**In Apify fetchData callback:**

```javascript
async function processImage(imageUrl, poiId) {
  // 1. Download image
  const response = await fetch(imageUrl);
  if (response.status !== 200) {
    console.log(`Skipping ${imageUrl} - status ${response.status}`);
    return null;
  }

  // 2. Save to local storage
  const buffer = await response.buffer();
  const hash = crypto.createHash('sha256').update(buffer).digest('hex');
  const localPath = `/var/www/.../storage/poi-images/${poiId}/${hash}.jpg`;
  await fs.writeFile(localPath, buffer);

  // 3. Return local path for DB storage
  return { originalUrl: imageUrl, localPath, hash };
}
```

### C.4 Nginx voor Image Serving

```nginx
location /poi-images/ {
    alias /var/www/api.holidaibutler.com/storage/poi-images/;
    expires 30d;
    add_header Cache-Control "public, immutable";
    add_header X-Content-Type-Options "nosniff";
}
```

---

## D. IMPLEMENTATIE STAPPENPLAN

### Fase 1: Quick Fix (30 minuten)

1. [ ] Wijzig image priority in `ImageUrl.js`
   - Verlaag gps-cs-s prioriteit van 1 naar 5
   - Verhoog AF1Qip prioriteit
2. [ ] Deploy naar productie
3. [ ] Verify: tiles met fallback nu tonen images

**Verwacht resultaat:** Veel POIs die nu fallback tonen, krijgen werkende AF1Qip image als eerste.

### Fase 2: Database Opschoning (1 uur)

1. [ ] Maak backup: `imageurls_backup_20251229`
2. [ ] Run validatie script op alle gps-cs-s URLs
3. [ ] Verwijder URLs met 403 status
4. [ ] Update image_id ordering voor affected POIs
5. [ ] Verify counts

**Verwacht resultaat:** Alleen werkende URLs in database.

### Fase 3: Lokale Opslag Setup (2-3 uur)

1. [ ] Maak storage directory op Hetzner
2. [ ] Extend database schema
3. [ ] Implementeer image download service
4. [ ] Configureer nginx
5. [ ] Test met 10 POIs

### Fase 4: Migratie Bestaande Images (2-4 uur)

1. [ ] Download alle werkende externe images
2. [ ] Update database met local_path
3. [ ] Verify frontend werkt met lokale URLs
4. [ ] Monitor performance

### Fase 5: Preventie (1 uur)

1. [ ] Wijzig Apify integration om images direct te downloaden
2. [ ] Voeg image validatie toe aan fetch flow
3. [ ] Setup weekly health check cron
4. [ ] Alert bij >5% image failures

---

## E. KOSTENANALYSE

### E.1 Quick Fix (Fase 1)
| Item | Kosten |
|------|--------|
| Code wijziging | 0 |
| Deployment | 0 |
| **Totaal** | **Gratis** |

### E.2 Volledige Implementatie (Fase 1-5)
| Item | Kosten |
|------|--------|
| Development tijd | ~8 uur |
| Hetzner storage | ~€1/maand (50GB) |
| Bandwidth | Inclusief |
| **Totaal eenmalig** | **~€1** |

### E.3 Vergelijking met Alternatieven
| Optie | Kosten | Betrouwbaarheid |
|-------|--------|-----------------|
| Quick fix (prioriteit) | Gratis | Verbeterd |
| Lokale opslag | ~€1/maand | 100% |
| Google Places API | ~€12 eenmalig | 100% |

---

## F. BESLISPUNTEN

1. **Welke oplossing heeft prioriteit?**
   - [ ] Quick fix alleen (nu implementeerbaar)
   - [ ] Quick fix + opschoning (vandaag)
   - [ ] Volledige lokale opslag (deze week)

2. **Moeten falende gps-cs-s URLs verwijderd worden?**
   - [ ] Ja, direct verwijderen
   - [ ] Nee, alleen prioriteit verlagen
   - [ ] Ja, maar eerst lokale kopie maken van werkende URLs

3. **Frontend aanpassing gewenst?**
   - [ ] Ja, probeer meerdere images in tile
   - [ ] Nee, backend fix is voldoende

---

## G. RISICO'S EN MITIGATIE

| Risico | Kans | Impact | Mitigatie |
|--------|------|--------|-----------|
| Priority change breekt andere POIs | Laag | Medium | Test op staging eerst |
| Lokale storage vol | Laag | Laag | Monitoring + 50GB is ruim voldoende |
| Apify format wijzigt weer | Medium | Medium | Lokale opslag maakt dit irrelevant |
| Performance impact frontend retry | Laag | Laag | Lazy loading limiteert impact |

---

## H. DEFINITIE VAN SUCCES

### Kwantitatief
| Metriek | Nu | Doel |
|---------|-----|------|
| Tiles met werkende image | 83% | >95% |
| POIs met fallback tile | 215 | <50 |
| Image load errors in logs | Onbekend | <5% |

### Kwalitatief
- Consistente image weergave in tiles
- Geen zichtbare fallback voor populaire POIs
- Robuust systeem dat niet afhankelijk is van externe URL geldigheid

---

## I. VOLGENDE STAPPEN

1. **Direct:** Implementeer Fase 1 (priority fix)
2. **Vandaag:** Evalueer resultaat
3. **Deze week:** Besluit over Fase 2-5 op basis van resultaat Fase 1
