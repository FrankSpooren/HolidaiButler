# Security Incident Report — SOCIAL_TOKEN_ENCRYPTION_KEY Hardcoded Fallback + Static-Zero-IV

| Veld | Waarde |
|---|---|
| **Incident ID** | INC-2026-06-10-005 |
| **Detectiedatum** | 2026-06-10 |
| **Detectiemoment** | Anti-pattern audit follow-up triage van baseline-findings na INC-2026-06-10-004 (SESSION_SALT). Geïdentificeerd als candidate in `docs/security/SECURITY.md §10.2` (commit `cc6cb9d`). |
| **Detectiebron** | Manual code review van `platform-core/src/routes/adminPortal.js:15950` na pattern-niveau review uit INC-004 |
| **Remediation-datum** | 2026-06-11 |
| **Status** | Resolved + monitored |
| **Severity (CVSS v3.1 base)** | 6.2 (Medium) — vector: AV:N/AC:H/PR:H/UI:N/S:U/C:H/I:H/A:N |
| **Affected component** | `platform-core/src/routes/adminPortal.js:15950` (inline cipher) + `platform-core/src/models/SocialAccount.js:13` (model helpers) |
| **Affected credential type** | AES-256-CBC encryption key voor OAuth-tokens van Meta (Facebook/Instagram), LinkedIn, Pinterest, X, YouTube social-media accounts |
| **PII-exposure** | **Indirect** — encryption-key zou bij compromittering decrypt mogelijk maken van `social_accounts.access_token_encrypted` (5 actieve rijen, 2 destinations: Calpe + BUTE). Decrypted OAuth-tokens geven toegang tot publishing/reading op verbonden FB/IG/YouTube accounts. **GEEN** end-user PII direct in tokens — wel platform-controle van klant-social-accounts. |

---

## 1. Samenvatting

Twee gerelateerde encryption-anti-patterns in social-token-encryption:

### Patroon 1: hardcoded fallback-chain (in 2 files, 3 fallback-strings)

**`platform-core/src/models/SocialAccount.js:13`**:
```js
const key = process.env.SOCIAL_TOKEN_ENCRYPTION_KEY || process.env.JWT_SECRET || 'default-key-change-me-32-chars!!';
```

**`platform-core/src/routes/adminPortal.js:15955`**:
```js
const encryptionKey = process.env.SOCIAL_TOKEN_ENCRYPTION_KEY || process.env.JWT_SECRET || 'default-key';
```

`SOCIAL_TOKEN_ENCRYPTION_KEY` env-var was **niet** gedefinieerd in `platform-core/.env`, waardoor de fallback naar `process.env.JWT_SECRET` actief was als de facto productie-encryption-key. JWT_SECRET is bedoeld voor JWT-signing — separation-of-concerns schending.

### Patroon 2: static zero-IV in adminPortal.js inline-cipher

`platform-core/src/routes/adminPortal.js:15957-15959`:
```js
const cipher = encCrypto.createCipheriv('aes-256-cbc',
  encCrypto.createHash('sha256').update(encryptionKey).digest(),
  Buffer.alloc(16, 0)  // static zero-IV ⚠️
);
```

Static IV = deterministic encryption: identieke plaintexts produceren identieke ciphertexts. Voor OAuth-tokens met identical-prefix structure leakt dit potentiële prefix-patterns aan een aanvaller met decryption-key.

### Latent bug uit Patroon 2

`SocialAccount.encryptToken()` (model) stored Format A (`iv_hex:ciphertext_hex`).
`adminPortal.js:15955` Meta-connect endpoint stored Format B (`ciphertext_hex` zonder IV).
`SocialAccount.decryptToken()` (gebruikt door `metaClient.js`, `linkedinClient.js`) parsed alleen Format A → returnt `null` voor Format-B tokens. **Meta-connect via dat endpoint produceerde tokens die niet decryptable waren door publisher** — Calpe `id=1` (facebook) en `id=2` (instagram) waren in deze toestand.

Vijfde incident op 2026-06-10 in INC-2026-06-10 reeks (OWM, SISTRIX, SimpleAnalytics, SESSION_SALT, SOCIAL_TOKEN).

## 2. Tijdlijn

| Tijdstip (UTC+02) | Gebeurtenis |
|---|---|
| 2026-06-10 (tijdens INC-004 triage) | Anti-pattern audit identificeerde `SOCIAL_TOKEN_ENCRYPTION_KEY` als 5e instance van `process.env.X \|\| 'literal'` pattern + zero-IV als toegevoegd risico |
| 2026-06-10 end-of-day | Candidate gedocumenteerd in `SECURITY.md §10.2` + `docs/sessions/2026-06-10-end-of-day-openstaand.md` + MEMORY.md regel |
| 2026-06-11 ~16:18 | Fact-finding remediation-sessie: scan `social_accounts` tabel — 7 rijen, 5 met token-data, Format-split FormatA (3) + FormatB (2) |
| 2026-06-11 ~16:18 | Backups: `.env` + JSON-dump `social_accounts` → `/root/backups/2026-06-11-inc005/` |
| 2026-06-11 ~16:18 | Source-code-fix `SocialAccount.js`: strip fallback-chain, fail-loud module-load guard, throw bij encrypt/decrypt zonder env-var |
| 2026-06-11 ~16:18 | Source-code-fix `adminPortal.js:15950`: inline cipher vervangen door `SocialAccount.encryptToken(access_token)` (random-IV, Format A consistency, fixes latent Meta bug) |
| 2026-06-11 ~16:19 | Nieuwe `SOCIAL_TOKEN_ENCRYPTION_KEY` gegenereerd via `openssl rand -hex 32` (32-byte random hex) + naar `.env` (niet in chat geëxponeerd, audit-trail: SHA-256 hash `0d4166e7338ec0292cb01d340b22e792aeed74c246450eccb003990eb182b08b`) |
| 2026-06-11 ~16:20 | Migration dry-run via `scripts/migrations/2026-06-11-inc005-reencrypt-social-tokens.mjs --dry-run`: 5 access + 1 refresh decrypted met OLD key (JWT_SECRET-derived), 0 failures |
| 2026-06-11 ~16:20 | Migration commit: 5 access + 1 refresh UPDATED met nieuwe key + random-IV, alle naar Format A |
| 2026-06-11 ~16:21 | Post-migration verify: alle 5 actieve rows `fmt_access=A`, `SocialAccount.decryptToken()` met nieuwe key succesvol per row |
| 2026-06-11 ~16:21 | PM2 restart `holidaibutler-api --update-env` (pid 2830701, online, uptime 24s, mem 345.8 MB) |
| 2026-06-11 ~16:22 | Live verificatie: geen `SOCIAL_TOKEN_ENCRYPTION_KEY env-var missing` warning in PM2 logs → env-var loaded correctly |

## 3. Root-cause analyse

### Direct
1. Hardcoded fallback-chain `process.env.X || process.env.Y || 'literal'` in twee aparte files met inconsistente literals (`'default-key'` vs `'default-key-change-me-32-chars!!'`)
2. `SOCIAL_TOKEN_ENCRYPTION_KEY` env-var nooit toegevoegd aan `platform-core/.env` → JWT_SECRET de facto encryption-key
3. Static zero-IV `Buffer.alloc(16, 0)` in `adminPortal.js:15955` Meta-connect inline-cipher (terwijl `SocialAccount.encryptToken()` correct random-IV gebruikte) → format-inconsistency tussen encrypt-paden + deterministic-encryption-zwakheid

### Onderliggend (vijfde incident met identiek patroon)
1. Anti-pattern `process.env.X || 'literal'` cataloged in `SECURITY.md §10` na INC-001..004 — INC-005 was reeds gedocumenteerd als candidate
2. Code-duplicatie: twee aparte encrypt-implementaties (model helpers + inline cipher) — DRY-schending
3. Encryption-key shared met `JWT_SECRET` → separation-of-concerns schending. JWT_SECRET rotation zou implicit social_accounts.access_token corruption veroorzaken.
4. Geen module-load fail-fast guard bij ontbrekende `SOCIAL_TOKEN_ENCRYPTION_KEY`
5. Geen IV-format-consistency-check tussen encrypt-pad (inline → Format B) en decrypt-pad (model → Format A) — latent Meta-token decrypt-bug ontstond hierdoor

### Patroon-niveau
Vijfde en laatste actieve `process.env.X || 'literal'` instance gefixed. Bevestigt patroon-completeness na INC-001..004 audit (zie `SECURITY.md §10.2`). Verdere baseline-findings zijn 29 historical-only (per `SECURITY.md §9.3` — niet fixable zonder destructive `git filter-repo`).

## 4. Blast-radius assessment

| Vector | Risico-niveau | Onderbouwing |
|---|---|---|
| OAuth-token decrypt bij key-compromittering | **Hoog (pre-fix)** | Aanvaller met JWT_SECRET zou alle social_accounts.access_token rijen kunnen decrypten — geeft API-toegang tot verbonden FB/IG/YouTube accounts (publishing, reading) |
| OAuth-token decrypt door static-IV cipher-analysis | Laag (pre-fix, alleen Format-B records) | Zero-IV produceert deterministic ciphertexts — bij voldoende known-plaintext attacks/sample-size potentiële prefix-leak. Mitigated door slechts 2 Format-B records in productie. |
| Auth-bypass (sessions/JWT-tokens) | **Geen** | JWT_SECRET wordt nog steeds gebruikt voor JWT-signing; alleen de SECONDARY usage als social-token-encryption-key is verwijderd. Bestaande sessions onaangetast. |
| Klant-social-account compromittering | Theoretisch hoog, niet-actief | Vereist (a) JWT_SECRET-compromittering OF (b) literal-fallback-trigger door config-failure. Geen daadwerkelijke leak gedetecteerd in `git blame`/audit-logs. |
| GDPR Art 33 breach notification | **Niet van toepassing** — geen daadwerkelijke unauthorized access | Geen meldingsplicht. Tokens behoren tot HB-platform (niet end-user PII direct) — wel zorgvuldigheidsplicht onder Art 32. |
| User-impact bij rotation | **Geen logout** | Auth-tokens (JWT) blijven valide; social_accounts.access_token migrated transparent — publisher kan blijven gebruiken. |
| Publishing continuïteit | **Verbetering** (Meta-tokens worden eindelijk decryptable) | Pre-fix: Calpe `id=1,2` Meta-tokens niet decryptable door `SocialAccount.decryptToken()` (Format B mismatch). Post-fix: alle 5 actieve tokens Format A, allemaal decryptable. |
| Repo-history exposure | Permanent | `'default-key'` + `'default-key-change-me-32-chars!!'` zichtbaar in alle git-clones vóór 2026-06-11. History-rewrite afgewezen per INC-001 §7 rationale. |

## 5. Remediation-stappen (uitgevoerd)

1. ✅ Pre-rotation `.env` backup: `/root/backups/2026-06-11-inc005/platform-core.env.pre-inc005-rotation`
2. ✅ Pre-migration `social_accounts` JSON-dump: `/root/backups/2026-06-11-inc005/social_accounts.pre-inc005.json` (7 rijen, 6678 bytes)
3. ✅ Pre-fix source backups: `SocialAccount.js.pre-inc005`, `adminPortal.js.pre-inc005`
4. ✅ `SocialAccount.js` source-code-fix:
   - Module-load constant `const SOCIAL_TOKEN_ENCRYPTION_KEY = process.env.SOCIAL_TOKEN_ENCRYPTION_KEY;` met `console.error` fail-loud guard
   - `getEncryptionKey()` throwt `Error('SOCIAL_TOKEN_ENCRYPTION_KEY env-var is required for social-account token encryption')` bij ontbreken — fail-loud-zonder-fail-fast voor request-path service (analoog INC-004 design)
   - JSDoc geüpdatet voor format-doc (Format A: `iv_hex:ciphertext_hex`)
5. ✅ `adminPortal.js:15950` source-code-fix:
   - 8-regel inline cipher-block vervangen door 3-regel `SocialAccount.encryptToken()` aanroep (DRY + random-IV consistency)
   - INC-tag in code-comment voor traceability
6. ✅ Nieuwe `SOCIAL_TOKEN_ENCRYPTION_KEY` gegenereerd: `openssl rand -hex 32` → 32-byte random hex (64 chars)
7. ✅ `SOCIAL_TOKEN_ENCRYPTION_KEY=<new>` toegevoegd aan `platform-core/.env` (write-verify gecontroleerd)
8. ✅ Migration `scripts/migrations/2026-06-11-inc005-reencrypt-social-tokens.mjs`:
   - Idempotent dual-format detect (`:` separator → Format A, else Format B)
   - Decrypt met OLD key (JWT_SECRET → SHA-256 → 32-byte) + correct IV per format
   - Re-encrypt met NEW key + `crypto.randomBytes(16)` → Format A
   - Dry-run vs commit mode
   - Per-row try/catch — failures logged maar batch continueert
9. ✅ Migration dry-run: 5 access + 1 refresh decrypted, 0 failures
10. ✅ Migration commit: 5 access + 1 refresh UPDATED in `social_accounts`, alle Format A
11. ✅ Post-migration verify: alle 5 actieve rows decryptable met nieuwe key (lengths 201/206/253 chars natural OAuth-token range)
12. ✅ PM2 restart `holidaibutler-api --update-env` (pid 2830701, online, uptime 24s, mem 345.8 MB)
13. ✅ Live verificatie: geen `SOCIAL_TOKEN_ENCRYPTION_KEY env-var missing` warning in PM2 logs

## 6. Design-besluit: fail-loud-zonder-fail-fast + DRY-by-replacement

`SocialAccount.encryptToken()` / `decryptToken()` zijn **request-path** services (called bij OAuth-connect, publishing, refresh). Identiek aan INC-004 SESSION_SALT design-keuze:

- **Module-load**: `console.error` fail-loud (zichtbaar in PM2 startup-logs voor operator-alert)
- **Request-time**: throw `Error` — calling endpoint catcht en returnt 500 (geen silent token-corruption)
- **Geen graceful degradation**: anders dan SESSION_SALT (waar empty-salt-hash bruikbaar bleef), is encryption-key STRICT-required — er is geen veilige fallback voor encryption

Voor `adminPortal.js:15950` inline cipher: i.p.v. paralle-source-fix gekozen voor **DRY-by-replacement** — vervang inline-code door bestaande `SocialAccount.encryptToken()` aanroep. Voorkomt toekomstige format-divergentie + lost latent Meta-decrypt-bug op + minder code-surface voor toekomstige audits.

Update aan `SECURITY.md §4 Patroon A` om dit DRY-by-replacement onderscheid expliciet te documenteren.

## 7. Compliance-evaluatie

Identiek kader aan INC-001/002/003/004 sectie 6. Specifiek voor INC-005:

| Artikel/Standaard | Toepasbaarheid | Status |
|---|---|---|
| GDPR Art 5(1)(c) data minimisation | Indirect | OAuth-tokens zijn opgeslagen `access_token_encrypted` per platform-account. Encryption beschermt tegen DB-leak. Sterkere key + random-IV verbetert privacy-by-design. |
| GDPR Art 25 by design | Direct | Hardcoded dev-fallback + zero-IV ondermijnden "secure by default" — rotation + random-IV + fail-loud guard herstelt. |
| GDPR Art 32 security of processing | Direct | (a) Strong dedicated key (32-byte random) vervangt shared JWT_SECRET-fallback. (b) Random-IV vervangt deterministic zero-IV. Beide verbeteringen vereist onder Art 32 "state of the art" technical measures. |
| GDPR Art 33 breach notification | Niet van toepassing — geen daadwerkelijke unauthorized access | Geen actie |
| EU AI Act | Niet van toepassing — social-token-encryption is non-AI-system | Geen actie |
| OAuth 2.0 Best Practice (RFC 6819 §5.1.4.5) | Direct | "Refresh tokens MUST be encrypted at rest" — gehandhaafd. (Encryption-key-rotation-plan was de gap.) |

## 8. Audit-trail referenties

| Bewijs | Locatie |
|---|---|
| Pre-fix `.env` backup | `/root/backups/2026-06-11-inc005/platform-core.env.pre-inc005-rotation` |
| Pre-migration `social_accounts` JSON-dump | `/root/backups/2026-06-11-inc005/social_accounts.pre-inc005.json` (7 rijen) |
| Pre-fix source backups | `/root/backups/2026-06-11-inc005/SocialAccount.js.pre-inc005`, `/root/backups/2026-06-11-inc005/adminPortal.js.pre-inc005` |
| Migration script | `scripts/migrations/2026-06-11-inc005-reencrypt-social-tokens.mjs` (commit op `dev`) |
| Migration dry-run output | Console-log 2026-06-11 ~16:20 — 5 access + 1 refresh decrypted, 0 failures |
| Migration commit output | Console-log 2026-06-11 ~16:20 — `written: 5` (access) + `written: 1` (refresh) |
| Post-migration DB-state verify | Console-log 2026-06-11 ~16:21 — alle 5 actieve rows `fmt=A` + decrypt-OK met nieuwe key |
| PM2 restart audit | `pm2 list` 2026-06-11 ~16:21 — `holidaibutler-api` pid 2830701, uptime 24s, online |
| Key SHA-256 hash voor identification (geen reverse-mapping) | `0d4166e7338ec0292cb01d340b22e792aeed74c246450eccb003990eb182b08b` |

## 9. Lessons learned + follow-ups

### Codified policies (vermeden bij future audits)
1. **Hardcoded fallback-chain pattern** — beleid uit `SECURITY.md §10` strict gehandhaafd. Alle 5 actieve instances nu gefixed. Permanente baseline-findings (29) zijn history-only per `SECURITY.md §9.3`.
2. **Encryption-key vs signing-key separation** — JWT_SECRET mag NIET als fallback voor encryption-keys gebruikt worden. Apart configuration-key per use-case (encryption / signing / hashing).
3. **IV-strategy consistency** — alle encryption-paden MOETEN random-IV gebruiken + format-prefixed in ciphertext (`iv_hex:ciphertext_hex`). Geen zero-IV, ooit.
4. **DRY-by-replacement preferred over parallel-fix** — bij dubbele implementaties, vervang inline-code door shared helper (single source of truth voor crypto-primitives).
5. **Encrypt/decrypt format-consistency check** — encrypt-pad en decrypt-pad MOETEN dezelfde format produceren/parsen. Het latent Meta-decrypt-bug toont waarom: stille token-corruption tot publisher-call.

### Geen open follow-ups
INC-2026-06-10 reeks is afgesloten: 5/5 incidents resolved (OWM, SISTRIX, SimpleAnalytics, SESSION_SALT, SOCIAL_TOKEN). Verdere security-hygiene werk valt onder Dependabot-triage (separate sprint per Frank's openstaand-doc F3).

## 10. Sign-off

| Rol | Naam | Datum |
|---|---|---|
| Account-owner (key generatie + .env update) | Frank Spooren (via spawn-task GO Variant B) | 2026-06-11 |
| Remediation engineer | Claude (AI-assistant, session-based) | 2026-06-11 |
| Review + acceptance | _Frank Spooren_ | _pending_ |

---

*Document gegenereerd 2026-06-11. Vijfde en laatste incident in INC-2026-06-10 reeks. Pattern-niveau lessons learned: `SECURITY.md §10` + `MEMORY.md`.*
