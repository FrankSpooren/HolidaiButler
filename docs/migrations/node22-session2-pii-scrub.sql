-- ==================================================================
-- Node 22 Migration — Sessie 2 Pre-werk: PII Scrub voor Staging VPS
-- ==================================================================
-- Datum: 2026-05-18
-- Sessie: FASE B Uitvoer Sessie 1 (pre-werk) — DRAFT voor Sessie 2 uitvoer
-- Plan-referentie: NODE-22-MIGRATION-PLAN.md §6.2 stap 4 + §10.2
-- Doel: GDPR Art. 32 minimization — anonymiseer PII op staging-VPS
--        (gerepliceerd via Hetzner snapshot van productie-DB)
-- Bron-inventaris: information_schema.COLUMNS REGEXP scan 2026-05-18 (zie
--                  docs/migrations/node22-session1-admin-module-investigation.md)
--
-- ==================================================================
-- KRITIEKE SAFETY GUARDS — LEES VOOR UITVOER
-- ==================================================================
-- 1. DIT SCRIPT WORDT NOOIT OP PRODUCTIE (jotx.your-database.de prod-DB) UITGEVOERD
-- 2. Voor uitvoer: verifieer @@hostname OF DB-host bevat 'staging' EN niet 'jotx' OF 'prod'
-- 3. Voor uitvoer: bevestig DATABASE() naam bevat 'staging' OF aparte staging-DB
-- 4. Idempotent ontwerp: SET <col> = pseudo(<id>) — meerdere uitvoer geeft zelfde resultaat
-- 5. Referential integrity: gebruik <id>-deterministische functie zodat user X dezelfde fake email
--    krijgt over alle FK-tabellen
-- 6. Format-preserving: email blijft @scrubbed.invalid (geen real-domain), phone blijft +00... lengte
-- 7. Audit-log: noteer rij-tellingen vóór en ná elke UPDATE voor verificatie
-- ==================================================================

-- ------------------------------------------------------------------
-- STAP 0: SAFETY ASSERTIONS (FAIL FAST OP PRODUCTIE)
-- ------------------------------------------------------------------

-- Assertion 1: hostname bevat geen 'jotx' (= productie database-host)
SELECT
    CASE
        WHEN @@hostname LIKE '%jotx%' OR @@hostname LIKE '%prod%'
        THEN (SELECT 'ABORT: hostname suggereert productie-DB. Stop.' FROM information_schema.tables WHERE 1=0 LIMIT 1)
        ELSE 'OK — hostname NIET productie-pattern'
    END AS safety_check_hostname;

-- Assertion 2: database-naam — handmatige bevestiging vereist
SELECT DATABASE() AS current_db,
       'BEVESTIG HANDMATIG: bovenstaande DB is STAGING, niet productie' AS note;

-- Assertion 3: rij-count baseline (vergelijk met na-uitvoer voor sanity)
SELECT 'BASELINE_ROW_COUNT' AS marker, (
    (SELECT COUNT(*) FROM users) +
    (SELECT COUNT(*) FROM admin_users) +
    (SELECT COUNT(*) FROM guest_profiles) +
    (SELECT COUNT(*) FROM reservations) +
    (SELECT COUNT(*) FROM ticket_orders) +
    (SELECT COUNT(*) FROM transactions)
) AS total_pii_subjects_before;

-- ------------------------------------------------------------------
-- STAP 1: AUTH/USER PII (case-sensitive: zowel Users als users tabel)
-- ------------------------------------------------------------------

START TRANSACTION;

-- users (snake_case canonical tabel)
UPDATE users SET
    email = CONCAT('user-', id, '@scrubbed.invalid'),
    first_name = CONCAT('Scrub', id),
    last_name = 'User',
    phone_number = LPAD(CAST(id AS CHAR), 12, '+00000000000')
WHERE email NOT LIKE '%@scrubbed.invalid';

-- Users (PascalCase variant; idempotent indien tabel bestaat)
UPDATE Users SET
    email = CONCAT('user-', id, '@scrubbed.invalid'),
    email_verification_token = NULL
WHERE email NOT LIKE '%@scrubbed.invalid';

-- admin_users (snake_case)
UPDATE admin_users SET
    email = CONCAT('admin-', id, '@scrubbed.invalid'),
    first_name = CONCAT('AdminScrub', id),
    last_name = 'User',
    phone_number = LPAD(CAST(id AS CHAR), 12, '+00000000000')
WHERE email NOT LIKE '%@scrubbed.invalid';

-- AdminUsers (PascalCase variant)
UPDATE AdminUsers SET
    email = CONCAT('admin-', id, '@scrubbed.invalid'),
    first_name = CONCAT('AdminScrub', id),
    last_name = 'User',
    phone_number = LPAD(CAST(id AS CHAR), 12, '+00000000000')
WHERE email NOT LIKE '%@scrubbed.invalid';

COMMIT;

-- ------------------------------------------------------------------
-- STAP 2: GUEST/CUSTOMER PII (referentieel gekoppeld aan booking flows)
-- ------------------------------------------------------------------

START TRANSACTION;

UPDATE guest_profiles SET
    email = CONCAT('guest-', id, '@scrubbed.invalid'),
    first_name = CONCAT('GuestScrub', id),
    last_name = 'Person',
    phone = LPAD(CAST(id AS CHAR), 12, '+00000000000')
WHERE email NOT LIKE '%@scrubbed.invalid';

UPDATE reservations SET
    guest_email = CONCAT('res-guest-', id, '@scrubbed.invalid'),
    guest_name = CONCAT('GuestRes', id),
    guest_phone = LPAD(CAST(id AS CHAR), 12, '+00000000000')
WHERE guest_email NOT LIKE '%@scrubbed.invalid';

UPDATE ticket_orders SET
    guest_email = CONCAT('ticket-guest-', id, '@scrubbed.invalid'),
    guest_name = CONCAT('GuestTicket', id),
    guest_phone = LPAD(CAST(id AS CHAR), 12, '+00000000000')
WHERE guest_email NOT LIKE '%@scrubbed.invalid';

UPDATE intermediary_transactions SET
    guest_email = CONCAT('inter-guest-', id, '@scrubbed.invalid'),
    guest_name = CONCAT('GuestInter', id),
    guest_phone = LPAD(CAST(id AS CHAR), 12, '+00000000000')
WHERE guest_email NOT LIKE '%@scrubbed.invalid';

UPDATE transactions SET
    customer_email = CONCAT('cust-', id, '@scrubbed.invalid'),
    customer_name = CONCAT('CustScrub', id),
    customer_phone = LPAD(CAST(id AS CHAR), 12, '+00000000000'),
    billing_address = '[REDACTED FOR STAGING]'
WHERE customer_email NOT LIKE '%@scrubbed.invalid';

UPDATE demo_requests SET
    email = CONCAT('demo-', id, '@scrubbed.invalid'),
    phone = LPAD(CAST(id AS CHAR), 12, '+00000000000')
WHERE email NOT LIKE '%@scrubbed.invalid';

COMMIT;

-- ------------------------------------------------------------------
-- STAP 3: PARTNER/BUSINESS PII (B2B contacts, geen consument-PII maar wel beschermd)
-- ------------------------------------------------------------------

START TRANSACTION;

UPDATE partners SET
    contact_email = CONCAT('partner-', id, '@scrubbed.invalid'),
    contact_phone = LPAD(CAST(id AS CHAR), 12, '+00000000000')
WHERE contact_email NOT LIKE '%@scrubbed.invalid';

UPDATE POI SET
    email = CASE WHEN email IS NULL OR email = '' THEN email
                 ELSE CONCAT('poi-', id, '@scrubbed.invalid') END,
    phone = CASE WHEN phone IS NULL OR phone = '' THEN phone
                 ELSE LPAD(CAST(id AS CHAR), 12, '+00000000000') END,
    address = CASE WHEN address IS NULL OR address = '' THEN address
                   ELSE '[REDACTED FOR STAGING]' END
WHERE (email NOT LIKE '%@scrubbed.invalid' OR email IS NULL);

UPDATE events SET
    organizer_email = CASE WHEN organizer_email IS NULL OR organizer_email = '' THEN organizer_email
                           ELSE CONCAT('event-org-', id, '@scrubbed.invalid') END,
    organizer_phone = CASE WHEN organizer_phone IS NULL OR organizer_phone = '' THEN organizer_phone
                           ELSE LPAD(CAST(id AS CHAR), 12, '+00000000000') END,
    location_address = CASE WHEN location_address IS NULL OR location_address = '' THEN location_address
                            ELSE CONCAT('[STAGING-LOC-', id, ']') END
WHERE (organizer_email NOT LIKE '%@scrubbed.invalid' OR organizer_email IS NULL);

UPDATE agenda SET
    location_address = CASE WHEN location_address IS NULL OR location_address = ''
                            THEN location_address
                            ELSE CONCAT('[STAGING-AGENDA-LOC-', id, ']') END
WHERE location_address IS NOT NULL AND location_address NOT LIKE '[STAGING-AGENDA-LOC-%';

UPDATE PlatformConfig SET
    contact_email_general = 'general@scrubbed.invalid',
    contact_email_sales = 'sales@scrubbed.invalid',
    contact_email_support = 'support@scrubbed.invalid',
    contact_phone_main = '+000000000000',
    contact_phone_international = '+000000000001',
    contact_phone_support = '+000000000002',
    contact_address_street = '[REDACTED]',
    contact_address_city = '[REDACTED]',
    contact_address_state = '[REDACTED]',
    contact_address_zip_code = '00000',
    contact_address_country = 'XX',
    settings_email_from_address = 'noreply@scrubbed.invalid',
    settings_email_from_name = 'Staging-Bot'
WHERE id > 0;

UPDATE media SET
    owner_email = CASE WHEN owner_email IS NULL OR owner_email = ''
                       THEN owner_email
                       ELSE CONCAT('media-owner-', id, '@scrubbed.invalid') END
WHERE owner_email IS NOT NULL AND owner_email NOT LIKE '%@scrubbed.invalid';

COMMIT;

-- ------------------------------------------------------------------
-- STAP 4: AUDIT/IP-ADDRESS COLLECTING TABELLEN (Art. 32 minimization)
-- ------------------------------------------------------------------

START TRANSACTION;

UPDATE Sessions SET ip_address = '0.0.0.0' WHERE ip_address NOT IN ('0.0.0.0', '::');
UPDATE consent_history SET ip_address = '0.0.0.0' WHERE ip_address NOT IN ('0.0.0.0', '::');
UPDATE Email_Verification_Logs SET ip_address = '0.0.0.0', user_email = 'scrub@scrubbed.invalid'
WHERE ip_address NOT IN ('0.0.0.0', '::');
UPDATE feature_flag_audit SET ip_address = '0.0.0.0' WHERE ip_address NOT IN ('0.0.0.0', '::');
UPDATE financial_audit_log SET ip_address = '0.0.0.0', actor_email = 'scrub@scrubbed.invalid'
WHERE ip_address NOT IN ('0.0.0.0', '::');
UPDATE GDPR_Logs SET ip_address = '0.0.0.0', user_email = 'scrub@scrubbed.invalid'
WHERE ip_address NOT IN ('0.0.0.0', '::');
UPDATE payment_transactions SET ip_address = '0.0.0.0' WHERE ip_address NOT IN ('0.0.0.0', '::');
UPDATE AdminUser_ActivityLog SET ip_address = '0.0.0.0' WHERE ip_address NOT IN ('0.0.0.0', '::');
UPDATE media_audit_log SET ip_address = '0.0.0.0' WHERE ip_address NOT IN ('0.0.0.0', '::');

COMMIT;

-- ------------------------------------------------------------------
-- STAP 5: STAGING-ONLY TABELLEN (poi_content_staging, POI_OLD archive)
-- ------------------------------------------------------------------

START TRANSACTION;

UPDATE poi_content_staging SET
    email_new = CASE WHEN email_new IS NULL OR email_new = ''
                     THEN email_new
                     ELSE CONCAT('staging-poi-', id, '@scrubbed.invalid') END,
    phone_new = CASE WHEN phone_new IS NULL OR phone_new = ''
                     THEN phone_new
                     ELSE LPAD(CAST(id AS CHAR), 12, '+00000000000') END
WHERE (email_new NOT LIKE '%@scrubbed.invalid' OR email_new IS NULL);

UPDATE POI_OLD SET
    google_address = CASE WHEN google_address IS NULL OR google_address = '' THEN google_address
                          ELSE '[REDACTED ARCHIVE]' END,
    google_phone = CASE WHEN google_phone IS NULL OR google_phone = '' THEN google_phone
                        ELSE '+000000000000' END,
    google_phoneunformatted = CASE WHEN google_phoneunformatted IS NULL OR google_phoneunformatted = ''
                                   THEN google_phoneunformatted
                                   ELSE '+000000000000' END
WHERE google_address IS NOT NULL AND google_address NOT LIKE '[REDACTED%';

COMMIT;

-- ------------------------------------------------------------------
-- STAP 6: VERIFICATIE (rij-tellingen + steekproef)
-- ------------------------------------------------------------------

SELECT 'POST_SCRUB_VERIFICATION' AS marker;

SELECT 'users' AS tabel, COUNT(*) AS total, SUM(email LIKE '%@scrubbed.invalid') AS scrubbed FROM users
UNION ALL SELECT 'admin_users', COUNT(*), SUM(email LIKE '%@scrubbed.invalid') FROM admin_users
UNION ALL SELECT 'guest_profiles', COUNT(*), SUM(email LIKE '%@scrubbed.invalid') FROM guest_profiles
UNION ALL SELECT 'reservations', COUNT(*), SUM(guest_email LIKE '%@scrubbed.invalid') FROM reservations
UNION ALL SELECT 'ticket_orders', COUNT(*), SUM(guest_email LIKE '%@scrubbed.invalid') FROM ticket_orders
UNION ALL SELECT 'transactions', COUNT(*), SUM(customer_email LIKE '%@scrubbed.invalid') FROM transactions
UNION ALL SELECT 'partners', COUNT(*), SUM(contact_email LIKE '%@scrubbed.invalid') FROM partners;

-- Steekproef: 3 random rijen tonen om scrubbing visueel te bevestigen
SELECT 'STEEKPROEF users:' AS sample;
SELECT id, email, first_name, last_name, phone_number FROM users ORDER BY RAND() LIMIT 3;

SELECT 'STEEKPROEF reservations:' AS sample;
SELECT id, guest_name, guest_email, guest_phone FROM reservations ORDER BY RAND() LIMIT 3;

-- ==================================================================
-- EINDE SCRIPT — totaal ~25 tabellen, 5 transaction blocks, idempotent
-- ==================================================================
-- LET OP voor Sessie 2 uitvoer:
-- - Stap 0 assertions zijn READ-ONLY safety checks; controleer output handmatig
-- - Bij twijfel: STOP en overleg met Frank
-- - Na uitvoer: snapshot staging-VPS als 'post-pii-scrub-snapshot-<date>' voor audit-trail
-- - DPA/privacy notice update apart documenteren (technische scrub ≠ legal compliance volledig)
-- ==================================================================
