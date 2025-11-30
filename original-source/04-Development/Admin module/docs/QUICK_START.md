# Quick Start Guide - HolidaiButler Admin Module

## ⚡ Snelle Setup (5 minuten)

### 1. Clone & Navigate
```bash
cd /path/to/HolidaiButler/admin-module
```

### 2. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
npm run seed
npm run dev
```

✅ Backend draait op `http://localhost:3003`

### 3. Frontend Setup (nieuwe terminal)
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

✅ Frontend draait op `http://localhost:5174`

### 4. Login
Open browser: `http://localhost:5174/login`

**Login als Platform Admin:**
- Email: `admin@holidaibutler.com`
- Password: `Admin123!@#`

### 5. Eerste POI Aanmaken
1. Klik "Add New POI" in dashboard
2. Vul basis informatie in (naam, categorie, beschrijving)
3. Vul locatie gegevens in (stad, land)
4. Upload afbeeldingen (optioneel)
5. Klik "Create POI"

Klaar! 🎉

## 🎯 Belangrijkste Features Testen

### POI Management
- Lijst bekijken: Navigeer naar "POIs" in sidebar
- POI aanmaken: Klik "Add New POI"
- POI bewerken: Klik ••• menu → "Edit"
- Status wijzigen: Klik ••• menu → "Approve" of "Deactivate"
- Zoeken & filteren: Gebruik de filters boven de tabel

### User Roles
Log uit en log in met verschillende accounts:

**POI Owner** (beperkte rechten):
- Email: `poi.owner@example.com`
- Password: `POI123!@#`
- Kan alleen eigen POIs beheren

**Editor** (content beheer):
- Email: `editor@holidaibutler.com`
- Password: `Editor123!@#`
- Kan alle POIs bewerken

**Reviewer** (approval):
- Email: `reviewer@holidaibutler.com`
- Password: `Reviewer123!@#`
- Kan POIs goedkeuren/afkeuren

## 🔧 Development Tips

### Backend Logs Bekijken
De backend toont logs in de terminal:
```
🚀 Admin API server running on port 3003
✅ MongoDB connected successfully
```

### API Testen (zonder frontend)
```bash
# Health check
curl http://localhost:3003/api/admin/health

# Login
curl -X POST http://localhost:3003/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@holidaibutler.com","password":"Admin123!@#"}'
```

### Database Reset
Als je wilt herbeginnen:
```bash
cd backend
# Drop de admin users collection
mongo holidaibutler --eval "db.adminusers.drop()"
# Re-seed
npm run seed
```

## 📝 Common Tasks

### Nieuwe Admin Gebruiker Aanmaken
Momenteel via MongoDB direct:
```bash
mongo holidaibutler
db.adminusers.insertOne({
  email: "new@example.com",
  password: "$2a$12$...",  // Hash via bcrypt
  role: "editor",
  status: "active",
  profile: { firstName: "John", lastName: "Doe" }
})
```

Of wijzig `scripts/seedAdmin.js` en run `npm run seed`

### POI Status Bulk Update
In de POI lijst:
1. Filter POIs (bijv. status: "pending")
2. Gebruik bulk actions (in development)
3. Of via API:
```bash
curl -X POST http://localhost:3003/api/admin/pois/bulk/action \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"poiIds":["id1","id2"],"action":"activate"}'
```

### Uploads Folder Cleanup
```bash
cd backend/uploads
# Verwijder oude bestanden
find . -type f -mtime +30 -delete
```

## 🚨 Troubleshooting

**"Cannot connect to MongoDB"**
```bash
# Check of MongoDB draait
sudo systemctl status mongod
# Of start het
sudo systemctl start mongod
```

**"Port 3003 already in use"**
```bash
# Vind en kill het proces
lsof -ti:3003 | xargs kill -9
# Of wijzig port in .env
```

**"CORS error in browser"**
- Check of backend `ADMIN_FRONTEND_URL` = `http://localhost:5174`
- Check of frontend `VITE_API_URL` = `http://localhost:3003/api/admin`

## 🎓 Next Steps

1. ✅ Bekijk de volledige [README.md](../README.md)
2. ✅ Lees de [API Documentation](./API.md)
3. ✅ Bekijk de [Architecture Overview](./ARCHITECTURE.md)
4. ✅ Ontdek de code in `backend/models` en `frontend/src/pages`

Happy coding! 🚀
