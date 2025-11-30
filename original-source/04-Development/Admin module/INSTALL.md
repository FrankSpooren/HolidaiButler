# Installatie Instructies - HolidaiButler Admin Module

## 🎯 Snel Overzicht

Deze admin module is gebouwd en klaar om geïntegreerd te worden met je bestaande HolidaiButler platform.

**Locatie in repository:** `/admin-module/`

## 📋 Vereisten

Zorg dat je hebt:
- ✅ Node.js >= 18.0.0
- ✅ MongoDB (draaiend)
- ✅ NPM of Yarn
- ✅ Git

## 🚀 Installatie Stappen

### Stap 1: Navigeer naar de module

De bestanden zijn aangemaakt in:
```
/home/user/HolidaiButler/admin-module/
```

Op jouw Windows machine moet je deze kopiëren naar:
```
C:\Users\frank\OneDrive\Documenten\AI 2025\HolidAIbutler\HolidaiButler-Platform-Project\04-Development\User module
```

Of direct in je project root werken.

### Stap 2: Backend Installatie

```bash
cd admin-module/backend

# Installeer dependencies
npm install

# Kopieer en configureer environment variabelen
cp .env.example .env

# Open .env en pas aan:
# - MONGODB_URI (naar jouw MongoDB)
# - JWT secrets (genereer nieuwe keys)
# - ADMIN_FRONTEND_URL (naar jouw frontend URL)

# Seed database met admin users
npm run seed

# Start backend server
npm run dev
```

✅ Backend draait nu op: `http://localhost:3003`

### Stap 3: Frontend Installatie

Open een **nieuwe terminal**:

```bash
cd admin-module/frontend

# Installeer dependencies
npm install

# Kopieer en configureer environment
cp .env.example .env

# .env zou moeten bevatten:
# VITE_API_URL=http://localhost:3003/api/admin

# Start frontend development server
npm run dev
```

✅ Frontend draait nu op: `http://localhost:5174`

### Stap 4: Test de Installatie

1. Open browser: `http://localhost:5174/login`

2. Log in met platform admin:
   - Email: `admin@holidaibutler.com`
   - Password: `Admin123!@#`

3. Je zou nu het dashboard moeten zien!

## ✅ Verificatie

Check of alles werkt:

**Backend:**
```bash
# Health check
curl http://localhost:3003/api/admin/health
```

Zou moeten returnen:
```json
{
  "success": true,
  "message": "Admin API is running",
  "timestamp": "...",
  "environment": "development"
}
```

**MongoDB:**
```bash
# Check of admin users zijn aangemaakt
mongo holidaibutler --eval "db.adminusers.count()"
```

Zou `4` moeten returnen (4 test users).

## 🔐 Belangrijke Security Stappen

### Voor Productie:

1. **Wijzig alle default passwords!**
   ```bash
   # Via MongoDB of maak nieuwe users aan
   ```

2. **Genereer sterke JWT secrets:**
   ```bash
   # In .env:
   JWT_ADMIN_SECRET=$(openssl rand -base64 32)
   JWT_REFRESH_SECRET=$(openssl rand -base64 32)
   ```

3. **Update CORS settings:**
   ```javascript
   // In server.js
   cors({
     origin: 'https://jouw-productie-domain.com',
     credentials: true
   })
   ```

4. **Enable HTTPS**
5. **Setup MongoDB authentication**
6. **Configure firewall rules**

## 🗂️ Project Integratie

### Optie 1: Standalone (Aanbevolen voor testing)

Houd de module gescheiden:
```
/project-root
  /holidaibutler-main       (bestaande app - port 5173)
  /admin-module
    /backend                (admin API - port 3003)
    /frontend               (admin UI - port 5174)
```

### Optie 2: Integratie in Monorepo

Integreer in bestaand project:
```
/project-root
  /backend
    /main                   (bestaande backend - port 3002)
    /admin                  (admin backend - port 3003)
  /frontend
    /consumer               (bestaande frontend - port 5173)
    /admin                  (admin frontend - port 5174)
```

## 📝 Configuratie Bestanden

### Backend .env
```env
NODE_ENV=development
ADMIN_PORT=3003
MONGODB_URI=mongodb://localhost:27017/holidaibutler
JWT_ADMIN_SECRET=your-secret-key-here
JWT_REFRESH_SECRET=your-refresh-key-here
ADMIN_FRONTEND_URL=http://localhost:5174
PUBLIC_URL=http://localhost:3003
```

### Frontend .env
```env
VITE_API_URL=http://localhost:3003/api/admin
```

## 🐛 Troubleshooting

### "Cannot find module"
```bash
# Verwijder node_modules en installeer opnieuw
rm -rf node_modules package-lock.json
npm install
```

### "MongoDB connection failed"
```bash
# Check of MongoDB draait
sudo systemctl status mongod
# Start MongoDB
sudo systemctl start mongod
```

### "Port already in use"
```bash
# Vind welk proces port 3003 gebruikt
lsof -ti:3003
# Kill het proces
lsof -ti:3003 | xargs kill -9
```

### "CORS error"
- Controleer of `ADMIN_FRONTEND_URL` in backend .env correct is
- Check of frontend op de juiste port draait (5174)

## 📞 Test Accounts

Na seed script run je met deze accounts testen:

1. **Platform Admin** (volledige toegang)
   - Email: `admin@holidaibutler.com`
   - Password: `Admin123!@#`

2. **POI Owner** (alleen eigen POIs)
   - Email: `poi.owner@example.com`
   - Password: `POI123!@#`

3. **Editor** (alle POIs bewerken)
   - Email: `editor@holidaibutler.com`
   - Password: `Editor123!@#`

4. **Reviewer** (POIs goedkeuren)
   - Email: `reviewer@holidaibutler.com`
   - Password: `Reviewer123!@#`

## 📚 Volgende Stappen

Na succesvolle installatie:

1. ✅ Lees de [README.md](./README.md) voor complete documentatie
2. ✅ Bekijk [QUICK_START.md](./docs/QUICK_START.md) voor gebruik
3. ✅ Lees [ARCHITECTURE.md](./docs/ARCHITECTURE.md) voor architectuur
4. ✅ Check [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) voor overzicht

## 🎉 Klaar!

Je admin module is nu geïnstalleerd en klaar voor gebruik!

**Belangrijkste URLs:**
- Admin Dashboard: http://localhost:5174
- Admin API: http://localhost:3003/api/admin
- Main App: http://localhost:5173 (jouw bestaande app)

---

Bij vragen of problemen, check de troubleshooting sectie of bekijk de volledige documentatie.
