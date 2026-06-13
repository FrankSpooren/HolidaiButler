# Monitoring & Alerting — Infrastructure Health

> **Versie**: 1.1.0
> **Datum**: 2026-06-13
> **Geïmplementeerd na**: INC-2026-06-11-001 (Apache 10u silent outage)
> **v1.1.0**: Laag 4 (externe uptime-monitor) toegevoegd als ontwerp — zie §13

---

## 1. Waarom

Op 11 juni 2026 stond Apache **10 uur down** (06:23 → 16:28 UTC) zonder enige alert. Root cause: `systemd reexec` tijdens `unattended-upgrade` veroorzaakte race op port 80 (`(98)Address already in use`). De pre-incident `Restart=on-abort` directive ving deze failure mode niet.

Het ontbrak aan:
1. Automatische service-recovery na transient OS-level race condities
2. Notificatie bij service-failure (Frank moest het zelf ontdekken na 10u)
3. Externe-perspectief check voor scenarios waar service draait maar misroute

## 2. Architectuur — 4-laagse defense-in-depth

| Laag | Mechanisme | Detectie-snelheid | Vangt |
|------|------------|-------------------|-------|
| **1** | systemd `Restart=on-failure` op apache2 | binnen 10s automatisch | transient OS-races (port still bound by dying sibling) |
| **2** | systemd `OnFailure=alert-threema@%n.service` | < 1 sec na StartLimit-exhaust | hard service-failures na 5× retries |
| **3** | Cron `*/2` external-perspective HTTPS check (op prod) | 2-4 min | 5xx-responses, hangs, vhost-misroute, lokale DNS-issues |
| **4** | Externe uptime-monitor op aparte EU-host (UptimeKuma) | 1-2 min | **hele server-uitval, netwerk-isolatie, DNS-provider-uitval** |

**Cruciaal voor Laag 4**: de monitor draait op een **ander failure-domein** (UpCloud Helsinki) dan prod (Hetzner Nürnberg). Laag 1-3 alert-paden draaien óp prod — bij hele-server-uitval falen die mee. Laag 4 heeft een onafhankelijk alert-pad. Status: **ONTWERP — zie §13** (nog niet gedeployed tot VPS geprovisioned).

## 3. Bestanden en lokaties

| Pad | Inhoud | Mode |
|-----|--------|------|
| `/etc/systemd/system/apache2.service.d/restart-on-failure.conf` | Apache `Restart=on-failure` + StartLimit | 0644 |
| `/etc/systemd/system/<service>.service.d/onfailure-threema.conf` | `OnFailure=alert-threema@%n.service` voor 5 services | 0644 |
| `/etc/systemd/system/alert-threema@.service` | Template-unit, instance = falende service-naam | 0644 |
| `/etc/threema-alert.env` | `THREEMA_GATEWAY_ID`, `THREEMA_SECRET`, `OWNER_THREEMA_ID` | **0600 root-only** |
| `/usr/local/bin/alert-threema.sh` | Threema Gateway POST + rate-limit + log | 0750 |
| `/usr/local/bin/hb-health-check.sh` | Cron-driven external-perspective curl-loop | 0750 |
| `/etc/cron.d/hb-health` | `*/2 * * * * root /usr/local/bin/hb-health-check.sh` | 0644 |
| `/var/lib/hb-health/<host>.state` | Per-endpoint state-tracking voor 2-in-row detectie | 0640 |
| `/var/log/alert-threema.log` | Alert audit-trail | 0640 |
| `/var/log/hb-health-check.log` | Health-check failure-log (alleen non-200) | 0640 |
| `/run/alert-threema/<service>.lock` | Rate-limit guard (5-min cooldown per service) | 0644 |

**Backup**: `/root/backups/2026-06-11-monitoring-hardening/` bevat alle configs + pre-install baseline van apache2 systemd state.

## 4. Services covered door OnFailure-hook

1. `apache2.service` — alle externe HTTPS-traffic (alle vhosts)
2. `pm2-root.service` — manages holidaibutler-api + 11 andere PM2 processes
3. `redis-server.service` — cache + sessies (down = sessies stuk)
4. `postgresql@16-main.service` — Bugsink error tracking
5. `mysql.service` — lokale DB (Bugsink / agenda)

**Niet gedekt** (omdat extern beheerd):
- MongoDB (Atlas-remote via `mongodb+srv://`) — Atlas heeft eigen monitoring
- Hetzner Managed MySQL (productie-DB) — Hetzner heeft eigen monitoring

## 5. Health-check endpoints

```
holidaibutler.com:/:200
calpetrip.com:/:200
texelmaps.nl:/:200
api.holidaibutler.com:/health:200
```

Curl gebruikt `--resolve <host>:443:127.0.0.1` om eigen DNS te bypassen — externe DNS-issues lekken niet in eigen monitoring.

## 6. Alert-bericht format

```
🚨 Service failure: <SERVICE> op <HOSTNAME>

Tijdstip: 2026-06-11T06:23:46+00:00
Service: apache2.service
Host: holibot-fastapi-prod
Reden: result=exit-code restarts=5 — <laatste 3 journal-lines>

Check: ssh holidaibutler-prod 'systemctl status apache2.service; journalctl -u apache2.service -n 50 --no-pager'
```

## 7. Rate-limiting

`alert-threema.sh` heeft een **5-min cooldown per service**. Bij apache2 dat 5× restart in 5 min window krijgt Frank slechts 1 message (geen burst).

## 8. Nieuwe service toevoegen

```bash
# 1. Drop-in plaatsen
mkdir -p /etc/systemd/system/<new-service>.service.d/
cp /root/backups/2026-06-11-monitoring-hardening/onfailure.conf.tmpl \
   /etc/systemd/system/<new-service>.service.d/onfailure-threema.conf

# 2. Reload
systemctl daemon-reload

# 3. Verify
systemctl show <new-service>.service --property=OnFailure --value
```

## 9. Test-trigger handmatig

```bash
systemctl start "alert-threema@TEST-validatie.service"
journalctl -u "alert-threema@TEST-validatie.service" --no-pager -n 10
tail -3 /var/log/alert-threema.log
```

## 10. Troubleshooting

| Symptoom | Check |
|----------|-------|
| Geen Threema ontvangen | `journalctl -u "alert-threema@*" -n 20` + `cat /var/log/alert-threema.log` |
| HTTP 401 in log | `THREEMA_SECRET` mismatch — check `/etc/threema-alert.env` vs Threema Gateway console |
| HTTP 404 in log | `OWNER_THREEMA_ID` onbekend bij Gateway — verify Threema ID |
| Alert burst (5× zelfde message) | Lock-file niet geschreven → `ls -la /run/alert-threema/` |
| Health-check niet runt | `journalctl -u cron --since '5min ago'` + `cat /var/log/hb-health-check.log` |

## 11. Niet-gevangen failure modes (backlog)

- **Hele server-uitval / netwerk-isolatie**: → opgelost in ontwerp **Laag 4** (§13). Status: deployment-klaar, wacht op VPS-provisioning + live E2E.
- **DNS-provider uitval bij OVH**: external resolver-based check (cloudflare DoH probe) — deels ondervangen door Laag 4 (externe checker bypasst lokale DNS)
- **Certbot renewal-failure**: separate runbook + alerting via certbot hook

## 12. Les uit incident 2026-06-11

Voor DNS-migraties: **TTL verlagen naar 60-300s VÓÓR de wijziging** (24-48u tevoren). Default OVH = 3600s, wat 1u stale-window oplevert. Met TTL 60s is window minuten i.p.v. uur.

## 13. Laag 4 — Externe uptime-monitor (UptimeKuma, EU) — ACTIEF

> Status: **LIVE per 13-06-2026** op UpCloud Helsinki (`212.147.237.156`).
> Dashboard: `https://status.holidaibutler.com` (Caddy auto-TLS, login `admin`).
> 6 monitors UP, alert-keten E2E bewezen (UptimeKuma→relay→Threema, msgId
> 86aabeb9...). Wederzijdse monitoring actief: prod's `hb-health-check.sh` heeft
> een reverse-probe (IP gepind) naar de monitor. Deploy-runbook:
> `deploy/uptime-kuma/INSTALL.md`. Config-as-code: `deploy/uptime-kuma/setup_kuma.py`.

### Provider-keuze (onderbouwd, 13-06-2026)

**UpCloud — datacenter Helsinki (fi-hel1)**. Afwegingen:
- **EU-soeverein**: Fins, onafhankelijk eigendom (geen US-moeder). Voldoet aan de "100% GDPR/EU-proof"-eis. Geen end-user-PII door de monitor — alleen publieke URL's + Frank's account-mail (data-minimalisatie).
- **Betrouwbaarheid van de bewaker**: enige optie met **99,99% SLA op het instap-tier** (~€3,20/mnd). Een monitor moet betrouwbaarder zijn dan wat hij bewaakt.
- **Failure-domein**: Helsinki = ander land, andere provider, ander stroomnet dan prod (Hetzner Nürnberg). Vangt zelfs Hetzner-brede uitval.
- Overwogen: netcup (DE, goedkoper maar Neurenberg-DC = zelfde stad als prod), Scaleway (FR, duurder/Stardust te licht). UptimeRobot/BetterStack afgevallen: US-dataopslag (UptimeRobot) resp. Delaware-entiteit (BetterStack) — minder schoon onder de EU-eis; bovendien is self-host maximaal soeverein.

### Architectuur

```
MONITOR (UpCloud Helsinki, Docker): UptimeKuma + Caddy(TLS) + threema-relay
   checkt 6 endpoints elke 60s → DOWN → relay → Threema (eigen pad, los van prod)
PROD (Nürnberg): Laag 1-3 + reverse-check op de monitor → mutual monitoring
```

De relay (`deploy/uptime-kuma/threema-relay/`) vertaalt UptimeKuma's JSON-webhook
naar een Threema Gateway `send_simple` (form-urlencoded), met rate-limit + retry +
timeout + structured logging — gelijk aan `alert-threema.sh`. Intern-only.

### SPOF-mitigatie: wederzijdse monitoring (toepassen NA provisioning)

`hb-health-check.sh` op prod forceert `--resolve …:443:127.0.0.1` (loopback) voor
alle eigen vhosts. De monitor-host is **remote**, dus die check mag dié override
NIET gebruiken. Voeg een aparte probe toe (na de bestaande loop):

```bash
# Laag-4 reverse-check: prod bewaakt de monitor (geen loopback-resolve!)
MON_URL="https://status.holidaibutler.com"   # of het kale VPS-IP
mon_code=$(curl -sS -o /dev/null -m 5 -w "%{http_code}" "$MON_URL" 2>/dev/null || echo "000")
if [ "$mon_code" != "200" ]; then
  # 2-in-row via eigen state-file, dan alert via het bestaande pad:
  /usr/local/bin/alert-threema.sh "laag4-monitor-down" \
    "Externe uptime-monitor ($MON_URL) onbereikbaar: HTTP $mon_code — wie bewaakt de bewaker?"
fi
```

Resultaat: valt de monitor-VPS weg, dan alarmeert prod via zijn eigen Threema-pad.
Beide lagen hebben een onafhankelijk alert-pad → geen single point of failure.

---

*Geconfigureerd door Claude Opus 4.7 / Frank Spooren — INC-2026-06-11-001 response.*
*Laag 4-ontwerp door Claude Opus 4.8 — 13-06-2026.*
