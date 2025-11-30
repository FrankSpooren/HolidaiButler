# Database Schema - HolidaiButler Admin Module

**Database:** MySQL 8.0
**Database Name:** pxoziy_db1 (Hetzner)
**Charset:** utf8mb4_unicode_ci

---

## 📊 Tabel Overzicht

De admin module gebruikt **4 nieuwe tabellen** en **1 bestaande tabel**:

| Tabel | Type | Beschrijving |
|-------|------|--------------|
| AdminUsers | Nieuw | Admin gebruikers met rollen en permissions |
| AdminUser_OwnedPOIs | Nieuw | Junction table POI ownership |
| AdminUser_ActivityLog | Nieuw | Activity logging |
| PlatformConfig | Nieuw | Platform configuratie (singleton) |
| POI | Bestaand | Point of Interest data (1,593 records) |

---

## 1. AdminUsers

**Primaire tabel voor admin gebruikers**

```sql
CREATE TABLE AdminUsers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,

  -- Profile
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  avatar VARCHAR(255) DEFAULT NULL,
  phone_number VARCHAR(50) DEFAULT NULL,
  language ENUM('en', 'es', 'de', 'fr') DEFAULT 'en',

  -- Role & Status
  role ENUM('platform_admin', 'poi_owner', 'editor', 'reviewer') NOT NULL DEFAULT 'editor',
  status ENUM('active', 'suspended', 'pending') DEFAULT 'pending',

  -- Permissions (JSON)
  permissions_pois JSON DEFAULT NULL,
  permissions_platform JSON DEFAULT NULL,
  permissions_users JSON DEFAULT NULL,
  permissions_media JSON DEFAULT NULL,

  -- Security
  email_verified BOOLEAN DEFAULT FALSE,
  verification_token VARCHAR(255) DEFAULT NULL,
  verification_expires DATETIME DEFAULT NULL,
  reset_password_token VARCHAR(255) DEFAULT NULL,
  reset_password_expires DATETIME DEFAULT NULL,
  login_attempts INT DEFAULT 0,
  lock_until DATETIME DEFAULT NULL,
  last_login DATETIME DEFAULT NULL,
  two_factor_enabled BOOLEAN DEFAULT FALSE,
  two_factor_secret VARCHAR(255) DEFAULT NULL,

  -- Preferences (JSON)
  preferences JSON DEFAULT NULL,

  -- Metadata
  created_by INT DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- Indexes
  INDEX idx_email (email),
  INDEX idx_role (role),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at),

  -- Foreign Keys
  FOREIGN KEY (created_by) REFERENCES AdminUsers(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### Velden Details

#### Profile Informatie
- `first_name`, `last_name` - Naam van de admin gebruiker
- `avatar` - URL naar avatar afbeelding
- `phone_number` - Telefoonnummer
- `language` - Interface taal (en/es/de/fr)

#### Role & Status
- `role` - Platform admin, POI owner, editor, of reviewer
- `status` - active, suspended, of pending

#### Permissions (JSON Format)

```json
{
  "pois": {
    "create": true,
    "read": true,
    "update": true,
    "delete": false,
    "approve": false
  },
  "platform": {
    "branding": false,
    "content": true,
    "settings": false
  },
  "users": {
    "view": false,
    "manage": false
  },
  "media": {
    "upload": true,
    "delete": false
  }
}
```

#### Security Velden
- `email_verified` - Email verificatie status
- `login_attempts` - Counter voor failed logins
- `lock_until` - Account lock timestamp (na 5 failed attempts)
- `last_login` - Laatste login timestamp
- `two_factor_enabled` - 2FA status
- `reset_password_token` - Token voor password reset
- `reset_password_expires` - Expiratie van reset token

#### Preferences (JSON Format)

```json
{
  "emailNotifications": true,
  "dashboardLayout": "default"
}
```

---

## 2. AdminUser_OwnedPOIs

**Junction table voor many-to-many relatie tussen admin users en POIs**

```sql
CREATE TABLE AdminUser_OwnedPOIs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  admin_user_id INT NOT NULL,
  poi_id INT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY unique_admin_poi (admin_user_id, poi_id),
  INDEX idx_admin_user (admin_user_id),
  INDEX idx_poi (poi_id),

  FOREIGN KEY (admin_user_id) REFERENCES AdminUsers(id) ON DELETE CASCADE,
  FOREIGN KEY (poi_id) REFERENCES POI(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### Gebruik
- POI Owners kunnen alleen hun eigen POIs beheren
- Wanneer een POI Owner een POI aanmaakt, wordt een record hier toegevoegd
- Platform Admins en Editors hebben geen records hier (toegang tot alle POIs)

---

## 3. AdminUser_ActivityLog

**Activity logging voor admin acties**

```sql
CREATE TABLE AdminUser_ActivityLog (
  id INT AUTO_INCREMENT PRIMARY KEY,
  admin_user_id INT NOT NULL,
  action VARCHAR(100) NOT NULL,
  resource VARCHAR(100) DEFAULT NULL,
  resource_id INT DEFAULT NULL,
  ip_address VARCHAR(45) DEFAULT NULL,
  user_agent TEXT DEFAULT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_admin_user (admin_user_id),
  INDEX idx_timestamp (timestamp),
  INDEX idx_action (action),

  FOREIGN KEY (admin_user_id) REFERENCES AdminUsers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### Gelogde Acties
- `login`, `logout`, `password_change`
- `poi_create`, `poi_update`, `poi_delete`
- `platform_update`, `upload`, `delete`
- Etc.

### Automatische Cleanup
- Laatste 100 entries per user worden bewaard
- Oudere entries worden automatisch verwijderd

---

## 4. PlatformConfig

**Singleton tabel voor platform configuratie (altijd 1 row)**

```sql
CREATE TABLE PlatformConfig (
  id VARCHAR(50) PRIMARY KEY DEFAULT 'platform_config',

  -- Branding
  branding_logo_url VARCHAR(500),
  branding_logo_filename VARCHAR(255),
  branding_logo_uploaded_at DATETIME,
  branding_favicon_url VARCHAR(500),
  branding_favicon_filename VARCHAR(255),
  branding_favicon_uploaded_at DATETIME,
  branding_colors JSON COMMENT '{primary, secondary, accent, background, text}',
  branding_fonts JSON COMMENT '{primary, secondary, heading}',
  branding_hero_url VARCHAR(500),
  branding_hero_filename VARCHAR(255),
  branding_hero_uploaded_at DATETIME,
  branding_background_url VARCHAR(500),
  branding_background_filename VARCHAR(255),
  branding_background_uploaded_at DATETIME,

  -- Content (multilingual JSON)
  content_about JSON COMMENT 'About: {en, es, de, fr}',
  content_faq JSON COMMENT 'FAQ: {en, es, de, fr}',
  content_reviews_enabled BOOLEAN DEFAULT TRUE,
  content_reviews_moderation_required BOOLEAN DEFAULT TRUE,
  content_reviews_featured JSON,

  -- Contact
  contact_email_general VARCHAR(255),
  contact_email_support VARCHAR(255),
  contact_email_sales VARCHAR(255),
  contact_phone_main VARCHAR(50),
  contact_phone_support VARCHAR(50),
  contact_phone_international VARCHAR(50),
  contact_address_street VARCHAR(255),
  contact_address_city VARCHAR(100),
  contact_address_state VARCHAR(100),
  contact_address_zip_code VARCHAR(20),
  contact_address_country VARCHAR(100),
  contact_social_facebook VARCHAR(255),
  contact_social_twitter VARCHAR(255),
  contact_social_instagram VARCHAR(255),
  contact_social_linkedin VARCHAR(255),
  contact_social_youtube VARCHAR(255),
  contact_social_tiktok VARCHAR(255),
  contact_website VARCHAR(255),
  contact_business_hours JSON,

  -- Legal (multilingual JSON)
  legal_privacy JSON COMMENT 'Privacy: {en, es, de, fr}',
  legal_terms JSON COMMENT 'Terms: {en, es, de, fr}',
  legal_cookies JSON COMMENT 'Cookies: {en, es, de, fr}',
  legal_gdpr_enabled BOOLEAN DEFAULT TRUE,
  legal_gdpr_consent_required BOOLEAN DEFAULT TRUE,
  legal_gdpr_data_retention_days INT DEFAULT 365,

  -- Settings
  settings_languages_available JSON,
  settings_languages_default VARCHAR(10) DEFAULT 'en',
  settings_currency_default VARCHAR(10) DEFAULT 'EUR',
  settings_currency_supported JSON,
  settings_timezone VARCHAR(100) DEFAULT 'Europe/Amsterdam',
  settings_date_format VARCHAR(50) DEFAULT 'DD/MM/YYYY',
  settings_maintenance_enabled BOOLEAN DEFAULT FALSE,
  settings_maintenance_message JSON,
  settings_maintenance_scheduled_start DATETIME,
  settings_maintenance_scheduled_end DATETIME,
  settings_analytics_google_id VARCHAR(100),
  settings_analytics_facebook_pixel_id VARCHAR(100),
  settings_analytics_enabled BOOLEAN DEFAULT FALSE,
  settings_email_provider ENUM('sendgrid', 'mailgun', 'smtp') DEFAULT 'smtp',
  settings_email_from_address VARCHAR(255),
  settings_email_from_name VARCHAR(255),

  -- Features
  features_chat_enabled BOOLEAN DEFAULT TRUE,
  features_chat_max_messages_per_day INT,
  features_booking_enabled BOOLEAN DEFAULT TRUE,
  features_booking_requires_approval BOOLEAN DEFAULT FALSE,
  features_reviews_enabled BOOLEAN DEFAULT TRUE,
  features_reviews_moderation_required BOOLEAN DEFAULT TRUE,
  features_social_allow_sharing BOOLEAN DEFAULT TRUE,
  features_social_platforms JSON,

  -- Metadata
  metadata_last_modified_by INT,
  metadata_last_modified_at DATETIME,
  metadata_version INT DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (metadata_last_modified_by) REFERENCES AdminUsers(id) ON DELETE SET NULL
) ENGINE=InnoDB;
```

### Singleton Pattern
- Altijd exact 1 row met `id = 'platform_config'`
- Default waarden worden geïnsert bij eerste run
- Updates wijzigen altijd deze ene row

### JSON Veld Voorbeelden

**Branding Colors:**
```json
{
  "primary": "#1976d2",
  "secondary": "#dc004e",
  "accent": "#9c27b0",
  "background": "#ffffff",
  "text": "#000000"
}
```

**Content About (multilingual):**
```json
{
  "en": {
    "title": "About Us",
    "description": "...",
    "content": "..."
  },
  "es": {...},
  "de": {...},
  "fr": {...}
}
```

**Settings Languages:**
```json
[
  {"code": "en", "name": "English", "enabled": true},
  {"code": "es", "name": "Español", "enabled": true},
  {"code": "de", "name": "Deutsch", "enabled": true},
  {"code": "fr", "name": "Français", "enabled": true}
]
```

---

## 5. POI (Bestaande Tabel)

**Point of Interest data - bestaande tabel uit holibutler database**

Deze tabel wordt **niet gewijzigd** door de admin module, alleen gebruikt voor:
- Read operaties (GET POIs)
- Update operaties (PUT POI)
- Status updates (PATCH POI status)

### Relevante Velden voor Admin Module

| Veld | Type | Beschrijving |
|------|------|--------------|
| id | INT | Primary key |
| name | VARCHAR | POI naam |
| category | VARCHAR | Categorie |
| city | VARCHAR | Stad |
| country | VARCHAR | Land |
| latitude | DECIMAL | GPS latitude |
| longitude | DECIMAL | GPS longitude |
| description | TEXT | Beschrijving |
| verified | BOOLEAN | Verificatie status (maps naar 'active' status) |
| rating | DECIMAL | Gemiddelde rating |
| images | JSON | Afbeeldingen array |
| opening_hours | JSON | Openingstijden |
| contact_info | JSON | Contact informatie |
| created_at | DATETIME | Aanmaak datum |
| updated_at | DATETIME | Laatste update |

### Status Mapping

Admin module gebruikt custom status, gemapped naar POI.verified:

| Admin Status | POI.verified |
|--------------|--------------|
| active | 1 (TRUE) |
| pending | 0 (FALSE) |
| inactive | 0 (FALSE) |

---

## 🔄 Relaties

```
AdminUsers (1) ----< (N) AdminUser_OwnedPOIs (N) >---- (1) POI
                                    ^
                                    |
AdminUsers (1) ----< (N) AdminUser_ActivityLog

AdminUsers (1) ----< (1) PlatformConfig (via metadata_last_modified_by)

AdminUsers (1) ----< (1) AdminUsers (via created_by - self-referencing)
```

---

## 📈 Indexes

### AdminUsers
- `idx_email` - Voor snelle email lookups (login)
- `idx_role` - Voor role-based queries
- `idx_status` - Voor status filtering
- `idx_created_at` - Voor chronologische sorting

### AdminUser_OwnedPOIs
- `unique_admin_poi` - Voorkomt duplicaten
- `idx_admin_user` - Voor user → POIs lookups
- `idx_poi` - Voor POI → owners lookups

### AdminUser_ActivityLog
- `idx_admin_user` - Voor user activity history
- `idx_timestamp` - Voor chronologische queries
- `idx_action` - Voor action filtering

---

## 🔒 Constraints

### Foreign Keys
- **CASCADE on DELETE** - AdminUser_OwnedPOIs en ActivityLog worden verwijderd wanneer admin user wordt verwijderd
- **SET NULL on DELETE** - created_by en last_modified_by worden NULL wanneer admin user wordt verwijderd

### Unique Constraints
- `AdminUsers.email` - Email moet uniek zijn
- `AdminUser_OwnedPOIs (admin_user_id, poi_id)` - Voorkomt duplicate ownership

---

## 📊 Data Volume Estimates

| Tabel | Initieel | Na 1 jaar | Groei |
|-------|----------|-----------|-------|
| AdminUsers | 4-10 | 20-50 | Laag |
| AdminUser_OwnedPOIs | 0-20 | 100-500 | Medium |
| AdminUser_ActivityLog | 0 | 50k-100k | Hoog |
| PlatformConfig | 1 | 1 | Geen |
| POI | 1,593 | 3,000-5,000 | Medium |

### Storage Estimates
- AdminUsers: ~5KB per record
- ActivityLog: ~500 bytes per record (auto-cleanup na 100 per user)
- PlatformConfig: ~50KB (singleton)

---

## 🛠️ Maintenance

### Reguliere taken
- **ActivityLog cleanup** - Gebeurt automatisch (laatste 100 per user)
- **Backup** - Dagelijks via Hetzner backup systeem
- **Index optimization** - Maandelijks `OPTIMIZE TABLE`

### Monitor
- AdminUser growth rate
- ActivityLog size
- Failed login attempts (security)

---

**Database Schema Versie 1.0 - MySQL Edition**
