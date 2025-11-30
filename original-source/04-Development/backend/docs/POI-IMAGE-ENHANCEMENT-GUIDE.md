# POI Image Enhancement Guide

## 📋 Overzicht

Dit document beschrijft hoe je hoogwaardige, rechtenvrije afbeeldingen kunt verkrijgen voor POI's in Calpe via een hybrid strategie met Flickr Creative Commons en Unsplash API's.

---

## 🎯 Strategie

### **Waarom deze aanpak?**

1. **Authentieke foto's** - Echte locatiefoto's in plaats van AI-generated content
2. **Rechtenvrij** - Creative Commons en Unsplash licenties
3. **Hoge kwaliteit** - Professionele fotografie
4. **Gratis** - Minimale tot geen kosten
5. **Categorisatie** - Outdoor, indoor, en sfeer foto's

### **3-Tier Strategie:**

```
Priority 1: Google Places API (al geïmplementeerd)
         ↓ (als kwaliteit laag)
Priority 2: Flickr Creative Commons (geografisch zoeken)
         ↓ (als geen resultaten)
Priority 3: Unsplash API (keyword-based zoeken)
```

---

## 🔑 API Keys Verkrijgen

### **1. Flickr API (GRATIS)**

1. Ga naar https://www.flickr.com/services/apps/create/
2. Klik op "Request an API Key"
3. Kies "Apply for a Non-Commercial Key"
4. Vul het formulier in:
   - App name: "HolidaiButler POI Images"
   - App description: "Tourism platform for Calpe, Spain - fetching CC-licensed POI photos"
5. Je ontvangt direct een API Key en Secret

**Limieten:** 10,000 requests/uur (ruim voldoende!)

**Voeg toe aan .env:**
```env
FLICKR_API_KEY=your_flickr_api_key_here
```

---

### **2. Unsplash API (GRATIS voor 50/uur)**

1. Ga naar https://unsplash.com/developers
2. Klik "Register as a developer"
3. Maak een applicatie aan:
   - Application name: "HolidaiButler"
   - Description: "POI discovery platform for Calpe"
4. Je ontvangt een Access Key en Secret Key

**Limieten:**
- Demo: 50 requests/uur (gratis)
- Production: Onbeperkt ($99/maand - NIET nodig nu)

**Voeg toe aan .env:**
```env
UNSPLASH_ACCESS_KEY=your_unsplash_access_key_here
```

---

## 🚀 Implementatie Stappen

### **Stap 1: Database Migration**

```bash
cd C:\Users\frank\OneDrive\Documenten\AI 2025\HolidAIbutler\HolidaiButler-Platform-Project\04-Development\backend

# Run migration
mysql -u root -p holibutler < migrations/add-enhanced-images-column.sql
```

### **Stap 2: API Keys Toevoegen**

Voeg toe aan je `.env` bestand:

```env
# Image Enhancement APIs
FLICKR_API_KEY=your_flickr_key_here
UNSPLASH_ACCESS_KEY=your_unsplash_key_here
```

### **Stap 3: Test met 10 POI's**

```bash
# Test eerst met 10 POI's
node poi-image-enhancer.js 10
```

**Expected output:**
```
🚀 Starting POI Image Enhancement Process
============================================================
📊 Found 10 POIs needing enhancement

🖼️  Enhancing images for: Peñón de Ifach
  📍 Searching Flickr near location...
  ✅ Found 12 Flickr images
  💾 Stored 3 enhanced images

...

============================================================
✅ Image Enhancement Complete!
   Total processed: 10
   Successfully enhanced: 8
   Failed: 2
============================================================
```

### **Stap 4: Process Alle POI's**

Als test succesvol is:

```bash
# Process all POIs (zonder limit)
node poi-image-enhancer.js
```

---

## 📊 Verwachte Resultaten

### **Coverage Schatting:**

| Bron | Dekking | Kwaliteit | Authenticiteit |
|------|---------|-----------|----------------|
| Google Places | 100% | Variabel (3/5) | ✅ Authentiek |
| Flickr CC | 60-80% | Hoog (4/5) | ✅ Authentiek |
| Unsplash | 40-60% | Zeer hoog (5/5) | ⚠️ Generiek |

### **Per POI Verwachting:**

- 🟢 **Top attracties** (Peñón de Ifach, stranden): 10-20 Flickr foto's
- 🟡 **Populaire restaurants/bars**: 3-10 Flickr foto's
- 🔴 **Kleinere POI's**: 0-3 Flickr foto's → Unsplash fallback

---

## 🎨 Image Categorisatie

Het script categoriseert automatisch op basis van tags:

### **Outdoor (Exterior)**
- Tags: "exterior", "outdoor", "outside", "facade", "building"
- Gebruik: Hero image, map thumbnails

### **Indoor (Interior)**
- Tags: "interior", "indoor", "inside", "room"
- Gebruik: Detail modal, carousel

### **Atmosphere (Sfeer)**
- Tags: "atmosphere", "ambiance", "mood", "people", "crowd"
- Gebruik: Secondary carousel images

---

## 💰 Kosten Analyse

### **Current Solution (Google Places)**
- Cost: ~$0.003 per photo request
- 1600 POIs × 3 photos = 4800 photos
- **Total: ~$14.40**

### **Proposed Solution (Flickr + Unsplash)**
- Flickr: **$0 (gratis)**
- Unsplash: **$0 (gratis tot 50/uur)**
- Rate limiting: 1 request/sec = ~1 uur voor alle POI's
- **Total: $0**

### **💡 Besparing: $14.40 + veel betere kwaliteit!**

---

## 🔄 Maintenance

### **Re-enhancement Schedule:**

Het script heeft automatische re-enhancement:

```sql
-- POI's worden opnieuw ge-enhanced als:
WHERE enhanced_at < DATE_SUB(NOW(), INTERVAL 30 DAY)
```

**Aanbevolen:**
- Draai maandelijks: `node poi-image-enhancer.js`
- Of voeg toe aan cron job:

```bash
# Crontab (maandelijks op 1e van de maand, 3am)
0 3 1 * * cd /path/to/backend && node poi-image-enhancer.js
```

---

## ⚠️ Belangrijke Opmerkingen

### **Licenties & Attributie:**

**Flickr Creative Commons:**
- ✅ Mag je gebruiken
- ⚠️ Check specifieke CC license (sommige vereisen attributie)
- 💡 Best practice: Link terug naar originele Flickr foto

**Unsplash:**
- ✅ Volledig vrij te gebruiken (zelfs commercieel)
- ⚠️ Photographer credit wordt gewaardeerd (niet verplicht)
- 💡 Store photographer name in database

### **Database Storage:**

Afbeeldingen worden NIET gedownload, alleen URL's:
- ✅ Geen storage costs
- ✅ Altijd up-to-date
- ⚠️ Afhankelijk van externe services (maar Flickr/Unsplash zijn zeer stabiel)

---

## 🐛 Troubleshooting

### **"Flickr API error: Invalid API Key"**
- Check je .env file
- Zorg dat FLICKR_API_KEY correct is ingesteld
- Test met: https://www.flickr.com/services/api/explore/flickr.test.echo

### **"Unsplash API error: Unauthorized"**
- Check UNSPLASH_ACCESS_KEY in .env
- Zorg dat je app "Demo" status heeft (of Production)
- Rate limit: max 50/uur op Demo

### **"No images found for POI"**
- Normale situatie voor obscure POI's
- Script gebruikt automatisch fallback naar Unsplash
- Overweeg handmatige curation voor belangrijke POI's

---

## 📈 Toekomstige Verbeteringen

### **Fase 2 Opties:**

1. **AI Image Upscaling**
   - Replicate.com Real-ESRGAN
   - Cost: ~$0.002 per image
   - Verbeter bestaande Google Places foto's

2. **Pexels API** (extra fallback)
   - https://www.pexels.com/api/
   - Gratis, rechtenvrij
   - 200 requests/uur

3. **Manual Curation Portal**
   - Admin interface om handmatig beste foto's te selecteren
   - Voor top 50 POI's

---

## 📞 Support

Voor vragen of problemen:
1. Check console output voor specifieke errors
2. Test API keys met curl commands
3. Controleer rate limits in API dashboards

---

**Created:** 2025-01-13
**Last Updated:** 2025-01-13
**Status:** Ready for implementation ✅
