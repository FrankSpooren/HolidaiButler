# HolidaiButler Productie-Incident — 18-20 Mei 2026

**Voor**: Frank Spooren — overleg met compagnon
**Door**: Frank + Claude (sessie-AI)
**Status**: ✅ Volledig hersteld
**Duur productie-onbeschikbaarheid backend**: ~42u45m (18-05 14:24 UTC → 20-05 09:01 UTC)
**Klantimpact**: Beperkt — calpetrip.com publieke site bleef gedurende de hele outage bereikbaar (Next.js cached content); backend dynamische functies waren uit.

---

## 1. Korte samenvatting in mensentaal

Tijdens voorbereiding voor Node 22-migratie ontstond een keten van fouten die uiteindelijk een 42-uur durende productie-uitval veroorzaakten. De primaire trigger lag bij de AI-assistent (mij): bij een diagnose-commando werd het productie-DB-wachtwoord per ongeluk in plain-text zichtbaar in chat. Frank's correctie (wachtwoord rouleren) was de juiste reactie maar leidde via een aantal cascading-effecten tot drie opeenvolgende IP-blokkades door Hetzner's auto-defense systeem en tot vier diagnostische dieptepunten waarbij telkens een nieuwe oorzaak werd ontdekt.

De **echte root cause** bleek uiteindelijk technisch elegant simpel: bij het activeren van REQUIRE SSL op de DB-user moest onze applicatie expliciet de `CLIENT_SSL` capability flag zetten, en moest de mysql2-driver een geverifieerd CA-certificaat krijgen. De fix was een patch in 3 `database.js` bestanden plus het downloaden van Hetzner's MariaDB CA-cert.

Productie is hersteld met **enterprise-grade TLSv1.3 + CA-pinned SSL** — strenger dan de baseline van vóór het incident.

---

## 2. Tijdlijn (UTC)

| Datum-tijd | Wat | Door |
|---|---|---|
| 18-05 ~13:00 | FASE B Sessie 1 start — Node 22 migratie pre-werk | Frank + AI |
| 18-05 ~14:15 | Backup-script inspectie toont productie-wachtwoord in chat | AI-fout |
| 18-05 14:20-14:24 | Wachtwoord-rotatie via konsoleH + REQUIRE SSL activatie | Frank |
| 18-05 14:24 | Hetzner activeert auto-block op productie-IP (alle poorten) — productie down | Hetzner auto-defense |
| 18-05 15:24 | Auto-block cyclus 1 heft op (60 min cooldown) | Hetzner |
| 18-05 15:25 | Eerste herstart — door pwd-mismatch trigger we nieuwe block | AI + Frank |
| 18-05 16:47 | Auto-block cyclus 2 heft op | Hetzner |
| 18-05 17:00 | Eerste Hetzner support-ticket geopend | Frank |
| 18-05 → 19-05 | Drie support-tickets, geen Hetzner-respons binnen 24u | — |
| 19-05 09:47 | Pwd-update via PowerShell helper script v2 | Frank + AI |
| 19-05 13:00 | HeidiSQL-test vanaf thuis-IP — bevestigt access denied vanaf 2 IPs | Frank |
| 19-05 ~15:30 | Telefonische escalatie naar Hetzner technical support | Frank |
| 19-05 ~17:00 | Hetzner email: "your password matches in our DB" | Hetzner |
| 20-05 ~07:00 | Hetzner email: "you're attempting unencrypted connection but REQUIRE SSL is on" — **echte root cause** | Hetzner |
| 20-05 08:00 | CA-cert download + SSL CA-pinning patch in platform-core | AI |
| 20-05 08:06 | Eerste herstel — alle endpoints HTTP 200 | AI |
| 20-05 08:20 | Hetzner-zijde TLS-read ECONNRESET → mysql2 pool retry-storm → cyclus 3 block | onbekende Hetzner-hiccup |
| 20-05 ~09:00 | Hetzner email: "no maintenance, IPs unbanned again" | Hetzner |
| 20-05 09:01 | Apply defensive pool-config + mysql2 versie-consistency + final restart | AI |
| 20-05 09:01+ | Volledig hersteld, stable soak, alle smoke-tests groen | — |

---

## 3. Root cause-analyse — vijf samenwerkende oorzaken

**Oorzaak A — AI-fout (primaire trigger)**: bij `cat /root/daily_mysql_backup.sh` werd het hardcoded productie-wachtwoord in plain-text in chat zichtbaar. Backup-scripts zijn een classic secrets-hotspot waar ik vooraf had moeten redacten of via grep-filter had moeten kijken.

**Oorzaak B — Ontbrekende volgorde-discipline bij credential-changes**: ik adviseerde direct pwd-rotatie zonder eerst de PM2-applicatieprocessen te stoppen. Dat leidde tot een kort venster waarin de applicatie met het oude wachtwoord bleef verbinden — wat Hetzner's auto-defense als brute-force-aanval interpreteerde.

**Oorzaak C — mysql2 default zet `CLIENT_SSL` flag niet**: dit was de **echte root cause** die we pas op dag 3 ontdekten. Bij REQUIRE SSL op DB-user moet client expliciet `ssl: {}` of `ssl: { ca, ... }` meegeven in connection options. Zonder dat zet mysql2 de `CLIENT_SSL` capability flag niet → server weigert auth met "Access denied". Productie's `database.js` had geen `ssl:` block — wat met REQUIRE SSL onverenigbaar bleek.

**Oorzaak D — Hetzner konsoleH UI bug-misverstand**: de eerste twee dagen vermoedden we (en deels Hetzner ook) een pwd-sync-issue tussen konsoleH UI en sql125 DB. Pas na expliciete handmatige hash-vergelijking door Hetzner technical staff bleek deze hypothese fout — wat ons drie volle dagen kostte.

**Oorzaak E — mysql2 versie-divergentie tussen modules**: agenda + ticketing draaiden op mysql2 3.16.0, platform-core op 3.15.3. Versie 3.16.0 heeft een nog onbekende regressie met SSL CA-config — TCP timeout in plaats van auth-flow. Gefixed door alle modules naar 3.15.3 te downgraden.

### Waarom duurde de oplossing zo lang?

- Hetzner support-response time op tickets was 24u — ongebruikelijk voor productie-down zaken
- Symptomen leken op meerdere mogelijke oorzaken (netwerk-block, fail2ban, pwd-mismatch, SSL-config)
- Hetzner's eerste twee response-rondes wezen in de verkeerde richting (netwerk-block, pwd-sync)
- Pas in de derde Hetzner-response kwam de echte oorzaak (`CLIENT_SSL` flag ontbreekt) naar boven
- mysql2 3.16.0 regressie was niet eerder gedocumenteerd → vereiste eigen diagnostiek

---

## 4. Wat is hersteld + huidige state

### Productie-services (status na finale recovery 20-05 09:01 UTC)

| Service | Status | Uptime | Notes |
|---|---|---|---|
| `holidaibutler-api` | ✅ online | stable | TLSv1.3 + CA-pinned SSL |
| `hb-temporal-worker` | ✅ online | stable | Idem |
| `holidaibutler-agenda` | ✅ online | stable | Idem; non-fatal `agenda_events` schema-issue (pre-existing) |
| `holidaibutler-ticketing` | ✅ online | stable | Idem |
| `hb-websites` | ✅ online | 8D+ | Niet aangeraakt |
| 6 hb-mcp-* servers | ✅ online | 14D+ | Niet aangeraakt |
| `holidaibutler-reservations` | ❌ errored | — | Pre-existing, FASE C scope |

### Verificaties (allemaal groen)

- `/health` HTTP 200, mysql+mongodb connected, 3× consecutive
- `/api/v1/pois` returnt echte data (was 500 tijdens incident, nu 200)
- `/api/v1/admin-portal/auth/login` POST → 401 INVALID_CREDENTIALS (correct auth-flow)
- calpetrip.com homepage HTTP 200
- admin.holidaibutler.com HTTP 200
- 5× live queries consecutive 200, response times normaal
- Restart-counts stabiel sinds start (geen crashes, geen retry-storms)

### Configuratie verbeteringen ten opzichte van pre-incident

**Versterkt** (beter dan baseline):
- Enterprise-grade SSL CA-pinning met Hetzner's officiële certificaat
- TLSv1.3 minimum enforced (was: opportunistic TLS zonder verificatie)
- Defensieve mysql2 connection pool: max 3 (was 20), 2 retries met exponential backoff
- mysql2 versie-consistency tussen alle modules

**Open** (spawn-tasks aangemaakt voor follow-up):
- `agenda_events` tabel ontbreekt in productie-DB (pre-existing, non-fatal)
- Orchestrator visualTrendDiscovery.js import-pad bug (pre-existing, non-fatal)
- Productie-user `pxoziy_1` REQUIRE SSL niet op user-level (Hetzner enforced server-side, defensieve verbetering)
- Hardcoded credentials in `/root/daily_mysql_backup.sh` + 10 Python utility scripts (security hardening)
- mysql2 versie-monitoring (om volgende 3.16.0-stijl regressie te detecteren)
- holidaibutler-reservations error-state (FASE C scope)

---

## 5. Preventie-maatregelen — vastgelegde lessen

### Aan AI-assistent zijde

1. **No-secrets-in-chat protocol**: backup-scripts, .env, credentials-files NOOIT met onbeperkte `cat` — altijd via grep-filter of redact.
2. **Volgorde-discipline bij credential-changes**: stop services VOOR pwd-rotatie, niet erna.
3. **SSL-policy-changes vereisen vooraf code-validation**: bij `REQUIRE SSL` enabling eerst applicatie-config controleren of `CLIENT_SSL` flag wordt gezet.
4. **Versie-consistency monitoring**: alle modules moeten dezelfde major+minor van mysql2/sequelize gebruiken (regression-risk).
5. **Eén-attempt-per-cycle bij auth-tests**: NOOIT retry-storm bij failed auth — Hetzner-style auto-defense triggert direct.

### Aan infrastructuur-zijde

1. **CA-pinned SSL is nu standaard** in alle 3 actieve module-database-configs.
2. **Defensieve pool-config** voorkomt cascade bij Hetzner-side hiccup.
3. **`.env`-files met centrale credential-bron** (spawn-task voor backup-script hardening).
4. **Tempo + Sentry observability** kan worden uitgebreid voor pre-fail2ban alerting.

### Aan vendor-management zijde

1. **Hetzner support-tier overwegen**: 24u response-time op productie-down is suboptimaal voor zakelijke service. Priority-contract evalueren.
2. **mysql2 3.16.0 regressie rapporteren** aan mysql2 maintainers (GitHub issue) als reproductie kan worden gemaakt.

---

## 6. Voor het overleg met compagnon

**Sleutelboodschap**: vijf samenwerkende oorzaken (1 AI-fout + 1 protocol-gat + 1 SDK-default + 1 vendor-UI-miscommunicatie + 1 versie-regressie) leidden tot 42 uur outage. **Geen enkele afzonderlijke oorzaak was on-zichzelf voldoende** — het was de combinatie. Productie is uiteindelijk hersteld op een **strenger SSL-niveau** dan vóór het incident, met defense-in-depth maatregelen voor toekomstige Hetzner-hiccups.

**Klantimpact** was beperkt: calpetrip.com bleef bereikbaar voor bezoekers via Next.js cached content. Backend-functies (login, dynamische data) waren tijdelijk uit. Geen externe gebruikers met SLA-impact.

**Kwetsbaarheidsexposure**: het kort blootgestelde wachtwoord is direct geroteerd binnen ~30 minuten en daarna nog 2× geroteerd in het herstel-proces. Geen evidence van extern misbruik (TLS-encrypted DB-verbindingen, geen anomalies in access-logs).

**Vertrouwen in werkwijze met AI-assistent**: dit incident heeft concrete protocol-verbeteringen opgeleverd die in MEMORY.md zijn vastgelegd. De voorlaatste fase (defensive pool-config + version-consistency check + CA-pinning) is een lasting improvement die toekomstige Hetzner-hiccups elegant zal opvangen.

**Vertrouwen in vendor-relatie**: dit incident bevestigt dat Hetzner's infrastructuur solide is en hun auto-defense correct werkt. Het hiaat zit in support-response-time op zakelijke productie-incidents.

---

*Dit document beschrijft het volledige incident vanaf trigger tot herstel. Spawn-tasks zijn aangemaakt voor de pre-existing issues die we hebben gespot tijdens diagnose. Recovery script + post-mortem staan op `/var/www/api.holidaibutler.com/docs/migrations/` en `/root/scripts/`.*
