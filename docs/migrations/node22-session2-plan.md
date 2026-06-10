# Node 22 Migration — Sessie 2 Plan

**Document type**: Uitvoer-plan voor Sessie 2 (staging snapshot + VPS provisioning + PII scrub)
**Plan-referentie**: docs/migrations/NODE-22-MIGRATION-PLAN.md §6.2 + §8.2 + §10.2
**Datum opgesteld**: 2026-05-18 (na succesvolle Sessie 1)
**Streefdatum start uitvoer**: week 23 (vanaf 2026-05-25) per plan §10.5 mijlpaal-tabel
**Effort schatting**: 4.5u actief + 24u staging soak voor Wave 1 (cumulatief 192u soak over 5 waves)

---

## 1. Voorwaarden vóór start (alle moeten GROEN staan)

| # | Voorwaarde | Status na Sessie 1 |
|---|---|---|
| 1 | Sessie 1 pre-werk afgerond | ✅ Commit `6989521` + `05f1849` op origin/dev |
| 2 | Baseline tag aanwezig | ✅ `pre-node22-session1-2026-05-18` |
| 3 | nvm + Node 22.22.3 + Node 20.19.6 op productie | ✅ Geverifieerd (`/root/.nvm/versions/node/`) |
| 4 | ecosystem.config.cjs bootstrap op disk | ✅ `/var/www/api.holidaibutler.com/ecosystem.config.cjs` |
| 5 | admin-module/backend verwijderd (Scenario A) | ✅ Wave 2 geskipt — pm2 list 12 processen |
| 6 | PII-scrub draft SQL klaar | ✅ `docs/migrations/node22-session2-pii-scrub.sql` |
| 7 | **Hetzner kostenakkoord** | ⏸ Frank's bevestiging nodig (~€6/maand CX22 + ~€0.36/maand snapshot storage) |
| 8 | **DNS staging-subdomain klaar** | ⏸ `staging.api.holidaibutler.com` A-record naar nieuwe VPS IP |
| 9 | **`hcloud` CLI op productie OF lokaal beschikbaar** | ⏸ Verifieer met `which hcloud` of installeer |
| 10 | **HETZNER_API_TOKEN met snapshot+server scope** | ⏸ Frank's API token (project=holidaibutler) |
| 11 | Geen openstaande v5.7.0 / v5.6.2 regressies | ✅ PM2 unstable_restarts=0, /health OK |
| 12 | Geen nieuwe parallel-sessie commits ten tijde van start | ⏸ Check `git log --oneline -5` vóór elke server-actie |

## 2. Uitvoer-stappen (volgorde van afhankelijkheid)

### Blok S2-A — Hetzner snapshot van productie (~30 min)

```bash
# Productie SSH
ssh holidaibutler-prod 'hcloud server list | grep holidaibutler-prod'
# Verifieer server-id (vermoedelijk: holidaibutler-prod)

hcloud server create-image \
  --type snapshot \
  --description "pre-node22-prod-snapshot-2026-MM-DD" \
  holidaibutler-prod

# Noteer image-id voor staging-VPS create + rollback-anchor
# Retention 90d ná prod-cutover (GDPR Art. 5(1)(e))
```

**Verificatie**:
- `hcloud image list --type=snapshot | grep pre-node22-prod-snapshot` toont nieuwe image
- Image-grootte ~prod-disk-size (verwacht 80-100GB)

**Rollback**: snapshot kan altijd `hcloud image delete <id>` indien aborted.

### Blok S2-B — Staging VPS provisioning (~15 min)

```bash
hcloud server create \
  --image <snapshot-id-uit-S2-A> \
  --name holidaibutler-staging \
  --type cx22 \
  --location nbg1 \
  --ssh-key <root-key-naam> \
  --label environment=staging \
  --label parent=holidaibutler-prod \
  --label purpose=node22-migration

# Noteer nieuwe IP voor DNS + SSH config
```

**Verificatie**:
- `hcloud server describe holidaibutler-staging` → status=running
- SSH werkt: `ssh root@<staging-IP> 'pm2 list'` → toont 12 processen (zelfde als prod post-Sessie 1)

**DNS bijwerken**:
- `staging.api.holidaibutler.com` A-record naar staging-IP
- TTL kort (5 min) voor snelle cutover-flexibiliteit
- Geen wildcard certificaat vereist (Apache vhost gebruikt admin-route SSO indien gewenst, of HTTP-only voor pure staging-tests)

**Rollback**: `hcloud server delete holidaibutler-staging` → blast-radius nul (geen prod-impact).

### Blok S2-C — Staging health-check (~30 min)

```bash
ssh root@<staging-IP> '
  echo "=== STAGING POST-RESTORE STATE ==="
  pm2 list
  systemctl status apache2 mariadb redis-server | head -20
  cd /var/www/api.holidaibutler.com && git log --oneline -3
  node -v && pm2 -v
  curl -s -o /dev/null -w "API: %{http_code}\n" http://localhost:5004/health
'
```

**Verwachte uitkomsten**:
- PM2: 12 processen online (mits Sessie 1 baseline state)
- Apache + MariaDB + Redis + ChromaDB: actief
- Git HEAD = `05f1849` (Sessie 1 eindcommit)
- Node v20.19.6 + PM2 v6.0.14
- API health: 200 (via interne loopback, want DNS/SSL nog niet bijgewerkt)

**Bij afwijking**: noteer + rollback via `hcloud server delete + opnieuw create-from-snapshot`.

### Blok S2-D — Externe DB ontkoppelen / lokaliseren (KRITIEK, ~1u)

Productie gebruikt extern `jotx.your-database.de` MariaDB. Staging-VPS via snapshot HEEFT deze externe verbinding nog steeds — wat betekent: **staging schrijft per default in productie-DB**.

**Niet uitvoeren staging zonder DB-isolatie!**

Twee opties:

| Optie | Beschrijving | Effort | Risico |
|---|---|---|---|
| **D1 — Lokale MariaDB op staging-VPS** | Installeer MariaDB lokaal op staging, dump prod-DB, import lokaal, herconfigureer `.env` → `DB_HOST=localhost` | 1.5u + ~10GB disk | Laag — volledige isolatie, GDPR-compliant indien PII-scrub na import |
| **D2 — Separate Hetzner Cloud DB instance** | Hetzner Cloud Database (managed) of tweede VPS als DB-host. `DB_HOST` aanpassen | 1u + extra kosten (~€6/maand) | Laag |
| **D3 — Externe MariaDB read-replica met PII-scrub view** | Op `jotx.your-database.de` extra DB aanmaken via Hetzner database panel, restore productie DB met scrub | 2u + Hetzner panel-toegang | Middel — nog steeds shared infrastructure |

**Aanbeveling**: **D1 (lokale MariaDB)** — single source van staging-data, geen confusion met prod, eenvoudig clean-slate teardown ná migratie.

Stappen voor D1:
```bash
ssh root@<staging-IP> '
  apt update && apt install -y mariadb-server
  systemctl enable --now mariadb
  mysql_secure_installation  # interactive: set root password
  
  # Dump productie DB (vanaf staging, met prod credentials uit huidige .env)
  source /var/www/api.holidaibutler.com/platform-core/.env
  mysqldump -u "$DB_USER" -p"$DB_PASSWORD" -h "$DB_HOST" "$DB_NAME" \
    --single-transaction --routines --triggers > /root/prod-dump-2026-MM-DD.sql
  
  # Import lokaal
  mysql -u root -p -e "CREATE DATABASE staging_db CHARSET utf8mb4 COLLATE utf8mb4_unicode_ci;"
  mysql -u root -p staging_db < /root/prod-dump-2026-MM-DD.sql
  
  # Maak staging DB-user
  mysql -u root -p -e "CREATE USER staging_user@localhost IDENTIFIED BY \"<sterke-wachtwoord>\"; GRANT ALL ON staging_db.* TO staging_user@localhost; FLUSH PRIVILEGES;"
  
  # Update .env in ALLE modules (platform-core + agenda + ticketing + reservations + hb-websites)
  for env in platform-core/.env agenda-module/backend/.env ticketing-module/backend/.env reservations-module/backend/.env; do
    sed -i \
      -e "s|^DB_HOST=.*|DB_HOST=localhost|" \
      -e "s|^DB_USER=.*|DB_USER=staging_user|" \
      -e "s|^DB_PASSWORD=.*|DB_PASSWORD=<sterke-wachtwoord>|" \
      -e "s|^DB_NAME=.*|DB_NAME=staging_db|" \
      "/var/www/api.holidaibutler.com/$env"
  done
  
  # Restart alle PM2 processen voor nieuwe DB-config
  pm2 restart all
'
```

**Verificatie D1**:
- `mysql -u staging_user -p staging_db -e "SELECT COUNT(*) FROM users;"` → match prod-snapshot tijdspunt
- `curl http://localhost:5004/health` → MySQL=connected (now local)
- Geen connect-attempts naar `jotx.your-database.de` in PM2 logs

### Blok S2-E — PII-scrub uitvoer (~30 min)

```bash
ssh root@<staging-IP> '
  # Safety assertions handmatig controleren in script-header
  cd /var/www/api.holidaibutler.com
  
  # Uitvoer met logging
  mysql -u staging_user -p staging_db < docs/migrations/node22-session2-pii-scrub.sql \
    > /root/pii-scrub-2026-MM-DD.log 2>&1
  
  # Verifieer steekproef
  mysql -u staging_user -p staging_db -e "
    SELECT id, email, first_name, last_name FROM users LIMIT 5;
    SELECT id, guest_name, guest_email FROM reservations LIMIT 5;
  "
'
```

**Verwachte uitkomsten**:
- 25+ tabellen geupdated (uit pii-scrub.sql §1-§5)
- Alle email-velden bevatten `@scrubbed.invalid`
- Alle phone-velden bevatten `+00000000<id>`-patroon
- ip_address velden = `0.0.0.0`
- Verification query rapporteert 100% `scrubbed`-match per tabel

**Rollback**: snapshot van staging vóór scrub (`hcloud server create-image holidaibutler-staging --description=pre-pii-scrub-staging-2026-MM-DD`).

### Blok S2-F — Sessie 1 pre-werk repeat op staging (~30 min)

Hetzelfde als productie Sessie 1, maar zonder de admin-module verwijdering (al gedaan via snapshot van post-Scenario A productie):

```bash
ssh root@<staging-IP> '
  # nvm installeren (snapshot heeft hem al van prod, maar verifieer)
  ls /root/.nvm/versions/node/  # verwacht: v20.19.6, v22.22.3
  
  # Indien missing (snapshot was van eerder moment):
  curl -sSL -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
  source ~/.nvm/nvm.sh
  nvm install 22.22.3
  nvm install 20.19.6
  nvm alias default system
  
  # Verifieer ecosystem.config.cjs aanwezig
  cd /var/www/api.holidaibutler.com && ls -la ecosystem.config.cjs
'
```

### Blok S2-G — Staging snapshot als rollback-anchor (~15 min)

```bash
hcloud server create-image \
  --type snapshot \
  --description "post-pii-scrub-staging-2026-MM-DD" \
  holidaibutler-staging
```

Bewaar voor 90d ná prod-cutover (GDPR retention).

### Blok S2-H — Documentatie + handover naar Sessie 3 (~30 min)

Maak `docs/migrations/node22-session2-execution-log.md`:
- Werkelijke uitvoer-tijden per blok
- Eventuele afwijkingen van plan
- Verbruikte Hetzner-resources (snapshot-grootte, VPS uptime, kosten ramp-up)
- Issues + workarounds
- Go/no-go signaal voor Sessie 3 Wave 1 (agenda) staging-cutover

## 3. Rollback-tabel

| Faal-punt | Rollback-actie | Effort |
|---|---|---|
| Snapshot create faalt | Hetzner support contact + alternatief: `dd` block-device backup | 1-2u |
| Staging-VPS provisioning faalt | `hcloud server delete` + opnieuw create-from-snapshot | 10 min |
| DB-isolatie (Blok D) faalt | Stop PM2 (`pm2 stop all`), revert `.env`, restart | 10 min |
| PII-scrub corrumpt staging-data | Restore vanaf snapshot S2-A → opnieuw S2-D + S2-E | 30 min |
| Hetzner kostenoverflow | `hcloud server delete + image delete` per resource | 5 min |

## 4. Open vragen voor Frank vóór start

1. **Hetzner kosten-akkoord** (~€6/maand staging-VPS + ~€0.36/maand snapshot storage, 30d active + 90d retention)
2. **`hcloud` CLI installatie**: gebruiken we het lokaal of op productie-VPS? (lokaal aanbevolen voor risico-scheiding)
3. **`HETZNER_API_TOKEN` scope**: snapshot+server beide nodig — bestaat deze token al of moet worden aangemaakt in Hetzner Cloud panel?
4. **DNS-provider**: waar wordt `staging.api.holidaibutler.com` A-record bijgewerkt? (Cloudflare? Hetzner DNS? Reseller?)
5. **DB-isolatie keuze**: D1 / D2 / D3 — aanbevolen D1, maar Frank's voorkeur?
6. **Staging SSL**: HTTP-only of Let's Encrypt cert via Apache `staging.api.*` vhost? (HTTP-only voor interne smoke tests is voldoende)

## 5. Effort + tijdlijn

| Blok | Effort | Kalendertijd |
|---|---|---|
| S2-A snapshot create | 30 min | 30 min |
| S2-B staging VPS provisioning | 15 min | 15 min |
| S2-C health-check | 30 min | 30 min |
| S2-D DB-isolatie (D1 aanbevolen) | 1.5u | 1.5u |
| S2-E PII-scrub uitvoer | 30 min | 30 min |
| S2-F Sessie 1 pre-werk repeat op staging | 30 min | 30 min |
| S2-G staging snapshot rollback-anchor | 15 min | 15 min |
| S2-H documentatie + handover | 30 min | 30 min |
| **Totaal actief** | **~4.5u** | **~5u** |

Daarna start Sessie 3 (Wave 1 = `holidaibutler-agenda` cutover op staging, 24u soak).

## 6. Plan-document patches die uit Sessie 2 voortvloeien

Indien D1 wordt gekozen, plan §6.2 stap 2-3 toevoegen:
- "Lokale MariaDB op staging-VPS, prod-DB dump+restore, `.env` herconfiguratie"

Indien PII-scrub draft SQL aanpassingen nodig blijken (kolommen die in de praktijk anders heten), commit naar dev op feature/node22-session2-execution branch.
