# HolidaiButler - Claude Code Instructions

## DEPLOYMENT PROTOCOL (KRITIEK - ALTIJD VOLGEN)

### Branch Workflow
```
dev → test → main (productie)
```

### Regels
1. **ALLEEN naar `dev` pushen** - Alle code wijzigingen gaan eerst naar dev
2. **WACHT op gebruiker goedkeuring** voordat je naar `test` merged/pushed
3. **WACHT op gebruiker goedkeuring** voordat je naar `main` merged/pushed
4. **NOOIT direct naar productie server** via SSH voor code wijzigingen
5. **ALTIJD verifieer** elke push met `git ls-remote origin <branch>`

### Deployment Commando's
```bash
# Na goedkeuring voor test:
git checkout test && git merge dev --no-edit && git push origin test

# Na goedkeuring voor main:
git checkout main && git merge test --no-edit && git push origin main
```

### GitHub Actions
- Deploy workflow: `.github/workflows/deploy-holibot.yml`
- Triggers automatisch bij push naar dev/test/main
- Controleer workflow status via GitHub Actions

---

## Project Structuur

### Platform Core (Backend API)
- **Locatie**: `platform-core/`
- **Server**: 91.98.71.87
- **Deploy path**: `/var/www/api.holidaibutler.com/platform-core`
- **PM2 process**: `holidaibutler-api`

### HoliBot 2.0 (RAG Chatbot)
- **Services**: `platform-core/src/services/holibot/`
  - `ragService.js` - Hoofdlogica voor RAG queries
  - `embeddingService.js` - ChromaDB embeddings en prompts
  - `chromaService.js` - Vector database connectie
- **Routes**: `platform-core/src/routes/holibot.js`
- **Endpoints**: `/api/v1/holibot/*`

### Customer Portal (Frontend)
- **Locatie**: `customer-portal/frontend/`
- **Framework**: React + TypeScript + Vite

---

## Belangrijke Code Conventies

### AI Text Processing
- Gebruik `cleanAIText()` functie voor ALLE AI-gegenereerde tekst
- Functie staat in `platform-core/src/routes/holibot.js`
- Handelt spacing rond POI namen en Nederlandse voorzetsels

### POI Filtering
- Gebruik `isPOIClosed()` methode om gesloten POIs te filteren
- Check `is_active` flag en tekst indicators ("permanently closed", etc.)

### Image Handling
- `ImageUrl` model voor meerdere afbeeldingen per POI
- Prioriteer lokale afbeeldingen boven externe URLs (Google vaak 403)
- Fallback: category gradient + icon

---

## Omgevingen

| Omgeving | API URL | Branch |
|----------|---------|--------|
| Development | https://api.dev.holidaibutler.com | dev |
| Test | https://api.test.holidaibutler.com | test |
| Production | https://api.holidaibutler.com | main |

---

## Laatste Update
- **Datum**: 2026-01-05
- **Commit**: 8fd3a57
- **Wijzigingen**: Closed POI filtering, spacing fixes, Calpesa compound word fix
