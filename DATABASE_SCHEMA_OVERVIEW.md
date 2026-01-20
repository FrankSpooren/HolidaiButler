# HolidaiButler Database Schema Overview

**Laatste Update:** 30 november 2025
**Status:** ✅ Aligned

---

## Database Configuratie

| Aspect | Waarde |
|--------|--------|
| **Database** | MySQL 8.0 |
| **Host** | Hetzner Cloud |
| **Database Name** | pxoziy_db1 |
| **Charset** | utf8mb4 |
| **Collation** | utf8mb4_unicode_ci |
| **ORM** | Sequelize 6.x |

---

## Schema Overzicht per Module

### Platform Core (Port 3001)

| Tabel | Beschrijving | Migratie |
|-------|--------------|----------|
| `pois` | Centrale POI data met AI tier classificatie | 001 |
| `poi_score_history` | Score veranderingen over tijd | 001 |
| `poi_data_sources` | Multi-source data aggregatie | 001 |
| `poi_top_attractions` | Ranking data van externe bronnen | 001 |
| `api_usage_log` | API budget monitoring | 001 |
| `budget_monitoring` | Maandelijkse budget tracking | 001 |
| `poi_classification_queue` | Batch processing queue | 001 |
| `poi_images` | High-quality POI afbeeldingen | 002 |
| `poi_image_queue` | Image discovery processing queue | 002 |
| `poi_image_sources` | Image source configuratie | 002 |
| `poi_image_moderation_log` | Image moderation audit trail | 002 |
| `roles` | RBAC rollen | 003 |
| `permissions` | RBAC permissies | 003 |
| `role_permissions` | Role-Permission mapping | 003 |
| `users` | Customer/user accounts | 003 |
| `user_permissions` | User permission overrides | 003 |
| `sessions` | JWT session tracking | 003 |
| `user_favorites` | User favorite POIs | 003 |
| `poi_qa` | Q&A voor HoliBot | 003 |
| `poi_reviews` | User reviews | 003 |
| `audit_log` | Security audit trail | 003 |
| `api_keys` | External API keys | 003 |
| `notification_settings` | User notification preferences | 003 |

### Ticketing Module (Port 3004)

| Tabel | Beschrijving |
|-------|--------------|
| `bookings` | Ticket boekingen |
| `tickets` | Individuele tickets met QR |
| `availability` | Beschikbaarheid per POI/datum |
| `ticket_transfers` | Ticket overdracht tracking |
| `device_tokens` | Firebase push notification tokens |

### Payment Module (Port 3005)

| Tabel | Beschrijving |
|-------|--------------|
| `transactions` | Adyen payment transacties |
| `refunds` | Refund tracking |
| `stored_payment_methods` | Tokenized betaalmethoden |

### Admin Module (Port 3003)

| Tabel | Beschrijving |
|-------|--------------|
| `admin_users` | Admin/staff accounts (MongoDB) |
| `platform_config` | Platform configuratie |

### Reservations Module (Port 3006)

| Tabel | Beschrijving |
|-------|--------------|
| `restaurants` | Restaurant data |
| `tables` | Tafel configuratie |
| `reservations` | Restaurant reserveringen |
| `guests` | Gast informatie |
| `guest_notes` | Gast notities |
| `restaurant_availability` | Restaurant beschikbaarheid |
| `floor_plans` | Restaurant plattegronden |
| `waitlist` | Wachtlijst |

---

## RBAC Systeem

### Rollen

| Rol | Beschrijving |
|-----|--------------|
| `super_admin` | Volledige systeemtoegang |
| `admin` | Platform administratie |
| `moderator` | Content moderatie |
| `poi_owner` | Eigenaar beheert eigen POI(s) |
| `user` | Standaard geregistreerde gebruiker |
| `guest` | Niet-geregistreerde bezoeker |

### Permissie Structuur

Format: `resource.action`

**Resources:**
- `poi` - Points of Interest
- `user` - Gebruikers
- `booking` - Boekingen
- `review` - Reviews
- `content` - Content
- `analytics` - Analytics
- `system` - Systeemconfiguratie

**Actions:**
- `create` - Aanmaken
- `read` - Bekijken
- `update` - Wijzigen
- `delete` - Verwijderen
- `moderate` - Modereren
- `manage_all` - Alles beheren

### Voorbeeld Permissies

```
poi.create      - POI aanmaken
poi.read        - POI bekijken
poi.update      - POI wijzigen
poi.delete      - POI verwijderen
poi.verify      - POI verifiëren
poi.moderate    - POI content modereren
poi.manage_all  - Alle POIs beheren
```

---

## Entity Relationships

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│    roles    │◄──────│    users    │──────►│  sessions   │
└─────────────┘       └─────────────┘       └─────────────┘
      │                     │
      ▼                     ▼
┌─────────────┐       ┌─────────────┐
│role_permissions│    │user_permissions│
└─────────────┘       └─────────────┘
      │                     │
      └──────────┬──────────┘
                 ▼
         ┌─────────────┐
         │ permissions │
         └─────────────┘


┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│    pois     │◄──────│  bookings   │──────►│   tickets   │
└─────────────┘       └─────────────┘       └─────────────┘
      │                     │                     │
      ▼                     ▼                     ▼
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│ poi_images  │       │transactions │       │ticket_transfers│
└─────────────┘       └─────────────┘       └─────────────┘
      │
      ▼
┌─────────────┐
│poi_score_history│
└─────────────┘
```

---

## Migraties Runnen

```bash
# Navigeer naar platform-core
cd platform-core

# Run migraties
npm run migrate

# Of handmatig:
mysql -h <host> -u <user> -p pxoziy_db1 < database/migrations/001_poi_classification_schema.sql
mysql -h <host> -u <user> -p pxoziy_db1 < database/migrations/002_poi_images_schema.sql
mysql -h <host> -u <user> -p pxoziy_db1 < database/migrations/003_unified_schema_alignment.sql
```

---

## Data Types Conventies

| Type | Gebruik |
|------|---------|
| `CHAR(36)` | UUIDs |
| `VARCHAR(255)` | Emails, URLs |
| `VARCHAR(50)` | Korte strings (names, codes) |
| `TEXT` | Lange teksten (descriptions) |
| `DECIMAL(10,2)` | Bedragen (EUR) |
| `DECIMAL(10,8)` | Latitude |
| `DECIMAL(11,8)` | Longitude |
| `JSON` | Structured data, arrays |
| `TIMESTAMP` | Tijdstempels |
| `BOOLEAN` | Ja/Nee velden |
| `TINYINT` | Kleine integers (1-255) |
| `ENUM` | Fixed options |

---

## Indexering Strategie

1. **Primary Keys:** UUID of AUTO_INCREMENT
2. **Unique:** Email, slug, reference codes
3. **Foreign Keys:** Cascade delete waar applicable
4. **Composite:** (poi_id, date), (user_id, status)
5. **Fulltext:** name, description voor zoeken
6. **Timestamp:** created_at DESC voor recente items

---

## Security Overwegingen

- **Password Storage:** bcrypt met 12 rounds
- **Tokens:** SHA256 hashed opgeslagen
- **PII:** Minimale opslag, soft delete voor GDPR
- **Audit:** Alle wijzigingen gelogd
- **API Keys:** Alleen hash opgeslagen, niet reversible

---

**Document Versie:** 1.0
**Auteur:** HolidaiButler Development Team
