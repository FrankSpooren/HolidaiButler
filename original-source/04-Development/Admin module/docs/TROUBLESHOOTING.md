# Troubleshooting Guide - HolidaiButler Admin Module

**Laatste update:** 16 januari 2025

---

## 🔴 Veel Voorkomende Problemen

### 1. "Failed to load POIs" / "Server error fetching POIs"

**Symptomen:**
- Frontend laadt maar toont error: "Failed to load POIs"
- POI lijst blijft leeg
- Console error in browser

**Mogelijke oorzaken & oplossingen:**

#### A. Backend POI API endpoint fout

**Diagnose:**
```bash
# Test de POI endpoint direct
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3003/api/admin/pois
```

**Check backend console** voor errors zoals:
- SQL syntax errors
- Database connection errors
- Permission errors

#### B. POI tabel kolom verschillen

De admin module verwacht bepaalde kolommen in de POI tabel. Check of deze aanwezig zijn:

**Via phpMyAdmin:**
1. Ga naar pxoziy_db1 database
2. Klik op POI tabel
3. Check of deze kolommen bestaan:
   - `id`, `name`, `category`, `city`, `country`
   - `latitude`, `longitude`, `description`
   - `verified` (BOOLEAN - maps naar status)
   - `rating`, `images`, `opening_hours`
   - `created_at`, `updated_at`

**Fix: Kolom naam mapping**

Als je POI tabel andere kolomnamen heeft, pas de adminPOI.js route aan:

Locatie: `backend/routes/adminPOI.js`

Vind de SELECT queries en map de kolommen:
```javascript
// Voorbeeld: als jouw tabel 'poi_name' heeft in plaats van 'name'
const query = `
  SELECT
    id,
    poi_name as name,  // <-- mapping
    ...
  FROM POI
`;
```

#### C. CORS Error

**Symptoom:** Browser console toont CORS error

**Fix:** Check `.env` in backend:
```env
ADMIN_FRONTEND_URL=http://localhost:5174
```

En in `server.js`:
```javascript
app.use(cors({
  origin: process.env.ADMIN_FRONTEND_URL || 'http://localhost:5174',
  credentials: true
}));
```

#### D. JWT Token niet verstuurd

**Symptoom:** 401 Unauthorized bij POI calls

**Fix:** Check in browser DevTools → Network tab:
- Is `Authorization: Bearer <token>` header aanwezig?
- Is token geldig? (check expiratie)

**Frontend fix:** Check `src/services/api.js`:
```javascript
// Token moet uit Zustand store komen
const token = useAuthStore.getState().token;
```

---

### 2. Database Connection Failed (ECONNREFUSED)

**Symptomen:**
- Backend start niet
- Error: `ECONNREFUSED ::1:3306` of `127.0.0.1:3306`

**Oorzaak:** `.env` wijst naar localhost maar er draait geen lokale MySQL

**Oplossing:**

Check `.env` in backend directory:
```env
# FOUT:
DB_HOST=localhost

# GOED (Hetzner):
DB_HOST=jotx.your-database.de
DB_USER=pxoziy_1
DB_PASSWORD=j8,DrtshJSm$
DB_NAME=pxoziy_db1
```

**Test connectie:**
```bash
# Via MySQL client
mysql -h jotx.your-database.de -u pxoziy_1 -p pxoziy_db1

# Via Node.js script
node -e "const mysql = require('mysql2/promise'); mysql.createConnection({host:'jotx.your-database.de',user:'pxoziy_1',password:'j8,DrtshJSm$',database:'pxoziy_db1'}).then(()=>console.log('OK')).catch(e=>console.error(e));"
```

---

### 3. Seed Script Fails

**Symptomen:**
- `npm run seed` geeft errors
- AdminUsers tabel niet gevonden
- Foreign key constraint errors

**Oplossing A: Migraties niet uitgevoerd**

Check of de admin tabellen bestaan:
```sql
SHOW TABLES LIKE 'AdminUsers';
SHOW TABLES LIKE 'PlatformConfig';
```

Als deze niet bestaan, voer migraties uit via phpMyAdmin:
- `migrations/01-create-admin-users-table.sql`
- `migrations/02-create-platform-config-table.sql`

**Oplossing B: Users bestaan al**

Als je `ER_DUP_ENTRY` error krijgt:
```
Error: Duplicate entry 'admin@holidaibutler.com' for key 'email'
```

De seed users bestaan al! Check in database:
```sql
SELECT * FROM AdminUsers;
```

**Oplossing C: POI tabel niet gevonden**

Foreign key in `AdminUser_OwnedPOIs` verwijst naar POI tabel.

Check of POI tabel bestaat:
```sql
SHOW TABLES LIKE 'POI';
```

Als deze niet bestaat, moet je eerst de POI tabel aanmaken/importeren.

---

### 4. Login Werkt Niet

**Symptomen:**
- "Invalid credentials" error bij correcte login
- Account locked message

**Diagnose:**

**A. Check of user bestaat:**
```sql
SELECT email, status FROM AdminUsers WHERE email = 'admin@holidaibutler.com';
```

**B. Check account status:**
- `status` moet `active` zijn (niet `pending` of `suspended`)
- `email_verified` moet `1` (TRUE) zijn
- `lock_until` moet NULL of in het verleden zijn

**C. Reset login attempts:**
```sql
UPDATE AdminUsers
SET login_attempts = 0, lock_until = NULL
WHERE email = 'admin@holidaibutler.com';
```

**D. Reset password (als je vergeten bent):**
```sql
-- Password hash voor: Admin123!@#
UPDATE AdminUsers
SET password = '$2a$12$abcdefghijklmnopqrstuvwxyz...'
WHERE email = 'admin@holidaibutler.com';
```

Of run seed script opnieuw (verwijder users eerst):
```sql
DELETE FROM AdminUsers;
-- Dan: npm run seed
```

---

### 5. Frontend Build Errors

**Symptomen:**
- `npm run build` fails
- Missing dependencies

**Oplossing:**

```bash
# Verwijder node_modules en package-lock
rm -rf node_modules package-lock.json

# Herinstalleer
npm install

# Missing @fontsource/inter?
npm install @fontsource/inter

# Build opnieuw
npm run build
```

---

### 6. File Uploads Werken Niet

**Symptomen:**
- Upload knop werkt niet
- Error: "Maximum file size exceeded"
- 500 error bij upload

**Oplossing A: Folder permissions**

Check of `uploads/` directory schrijfbaar is:
```bash
# Windows
icacls "backend\uploads" /grant Everyone:F

# Linux/Mac
chmod 755 backend/uploads
```

**Oplossing B: File te groot**

Check `.env`:
```env
MAX_FILE_SIZE=5242880  # 5MB
```

En in `server.js`:
```javascript
app.use(express.json({ limit: '10mb' }));
```

**Oplossing C: Wrong file type**

Check toegestane types in `routes/adminUpload.js`:
- **Images:** JPEG, PNG, GIF, WebP, SVG
- **Documents:** PDF, DOC, DOCX, TXT

---

### 7. JWT Token Errors

**Symptomen:**
- "Invalid token" bij API calls
- "Token expired" errors
- 401 Unauthorized

**Diagnose:**

**A. Check JWT secrets:**

`.env` moet dezelfde secrets hebben als waar token mee signed is:
```env
JWT_ADMIN_SECRET=a7f3e9d2c1b8a4f6e5d3c2b1a9f8e7d6c5b4a3f2e1d9c8b7a6f5e4d3c2b1a0f9
JWT_REFRESH_SECRET=b8e4f1c3d2a9b7f6e5c4d3a2b1f0e9c8d7b6a5f4e3d2c1b0a9f8e7d6c5b4a3f2
```

**B. Token expiratie:**

Access token: 1 uur (refresh nodig)
Refresh token: 7 dagen

**Fix:** Gebruik refresh endpoint:
```bash
curl -X POST http://localhost:3003/api/admin/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"YOUR_REFRESH_TOKEN"}'
```

**C. Token format:**

Header moet zijn:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Niet: `Token ...` of `JWT ...`

---

### 8. Platform Admin Heeft Geen Permissies

**Symptomen:**
- Platform Admin kan niks wijzigen
- "Insufficient permissions" errors

**Diagnose:**

Check permissions in database:
```sql
SELECT role, permissions_pois, permissions_platform
FROM AdminUsers
WHERE email = 'admin@holidaibutler.com';
```

**Oplossing:**

Platform Admin moet alle permissions hebben. Update:
```sql
UPDATE AdminUsers
SET
  permissions_pois = '{"create":true,"read":true,"update":true,"delete":true,"approve":true}',
  permissions_platform = '{"branding":true,"content":true,"settings":true}',
  permissions_users = '{"view":true,"manage":true}',
  permissions_media = '{"upload":true,"delete":true}'
WHERE email = 'admin@holidaibutler.com';
```

Of verwijder user en run seed opnieuw.

---

### 9. Port 3003 Already in Use

**Symptomen:**
- Backend start niet: "EADDRINUSE"

**Oplossing:**

**Windows:**
```bash
# Find process
netstat -ano | findstr :3003

# Kill process (replace PID)
taskkill /PID 12345 /F

# Or use kill-port
npx kill-port 3003
```

**Linux/Mac:**
```bash
# Find and kill
lsof -ti:3003 | xargs kill -9
```

**Of wijzig port** in `.env`:
```env
ADMIN_PORT=3004
```

---

### 10. MySQL Connection Pool Exhausted

**Symptomen:**
- "Too many connections" error
- API wordt langzaam
- Timeout errors

**Diagnose:**

Check connection pool settings:
```env
DB_CONNECTION_LIMIT=10
```

**Oplossing:**

**A. Verhoog limit** (voor productie):
```env
DB_CONNECTION_LIMIT=50
```

**B. Check for connection leaks**

Ensure alle queries de connection releasen:
```javascript
// GOED:
const [rows] = await db.execute(query, params);

// FOUT (connection leak):
const connection = await pool.getConnection();
await connection.query(query);
// Vergeten: connection.release()
```

**C. Restart backend**

Connections worden gereleased bij restart.

---

### 11. CORS Errors in Browser

**Symptomen:**
- Console error: "Access-Control-Allow-Origin"
- Preflight OPTIONS requests fail

**Oplossing:**

**Backend `.env`:**
```env
ADMIN_FRONTEND_URL=http://localhost:5174
```

**server.js:**
```javascript
app.use(cors({
  origin: process.env.ADMIN_FRONTEND_URL,
  credentials: true
}));
```

**Frontend `.env`:**
```env
VITE_API_URL=http://localhost:3003/api/admin
```

**Check origins match!**

---

### 12. JSON Parse Errors

**Symptomen:**
- SyntaxError: Unexpected token in JSON
- NULL values in JSON fields

**Oorzaak:**

POI tabel heeft JSON velden (`images`, `opening_hours`, etc.) die NULL zijn of invalid JSON bevatten.

**Oplossing:**

Update POI records met valid JSON:
```sql
-- Check voor NULL/invalid JSON
SELECT id, name, images, opening_hours
FROM POI
WHERE images IS NULL OR opening_hours IS NULL
LIMIT 10;

-- Fix NULL values
UPDATE POI SET images = '[]' WHERE images IS NULL;
UPDATE POI SET opening_hours = '{}' WHERE opening_hours IS NULL;
```

---

## 🔧 Debug Tools

### Backend Logging

Enable verbose logging in `.env`:
```env
LOG_LEVEL=debug
```

Check backend console voor:
- Database queries
- Errors met stack traces
- Request/response logs (Morgan)

### Frontend Logging

Open browser DevTools:
- **Console** - JavaScript errors
- **Network** - API calls, status codes, responses
- **Application → Local Storage** - Check auth token

### Database Queries

Test queries direct in phpMyAdmin of MySQL client:
```sql
-- Check admin users
SELECT * FROM AdminUsers;

-- Check POIs
SELECT id, name, category, city, verified FROM POI LIMIT 10;

-- Check activity log
SELECT * FROM AdminUser_ActivityLog ORDER BY timestamp DESC LIMIT 20;
```

### Health Check

Test of backend draait:
```bash
curl http://localhost:3003/api/admin/health
```

---

## 📞 Nog Steeds Problemen?

**Stappen:**

1. **Check alle logs** - Backend console, browser console, network tab
2. **Test API direct** - Met curl/Postman om frontend uit te sluiten
3. **Verify database** - Check of tabellen/data kloppen in phpMyAdmin
4. **Check configuratie** - `.env` files, ports, credentials
5. **Restart alles** - Backend, frontend, clear browser cache

**Documentatie:**
- [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) - Database structuur
- [API_REFERENCE.md](./API_REFERENCE.md) - API endpoints
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Technische details

---

**Troubleshooting Guide v1.0**
