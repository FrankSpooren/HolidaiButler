# Monitoring & Alerting — Infrastructure Health

> **Versie**: 1.0.0
> **Datum**: 2026-06-11
> **Geïmplementeerd na**: INC-2026-06-11-001 (Apache 10u silent outage)

---

## 1. Waarom

Op 11 juni 2026 stond Apache **10 uur down** (06:23 → 16:28 UTC) zonder enige alert. Root cause: `systemd reexec` tijdens `unattended-upgrade` veroorzaakte race op port 80 (`(98)Address already in use`). De pre-incident `Restart=on-abort` directive ving deze failure mode niet.

Het ontbrak aan:
1. Automatische service-recovery na transient OS-level race condities
2. Notificatie bij service-failure (Frank moest het zelf ontdekken na 10u)
3. Externe-perspectief check voor scenarios waar service draait maar misroute

## 2. Architectuur — 3-laagse defense-in-depth

| Laag | Mechanisme | Detectie-snelheid | Vangt |
|------|------------|-------------------|-------|
| **1** | systemd `Restart=on-failure` op apache2 | binnen 10s automatisch | transient OS-races (port still bound by dying sibling) |
| **2** | systemd `OnFailure=alert-threema@%n.service` | < 1 sec na StartLimit-exhaust | hard service-failures na 5× retries |
| **3** | Cron `*/2` external-perspective HTTPS check | 2-4 min | 5xx-responses, hangs, vhost-misroute, DNS-issues |

**Niet gedekt**: hele server-uitval, netwerk-isolatie, DNS-provider problemen. Daarvoor is een **externe uptime-monitor** nodig (UptimeRobot / BetterStack / UptimeKuma op andere host) → backlog-item.

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

- **Hele server-uitval**: externe uptime-monitor vereist (UptimeRobot gratis tier, 1min interval, Threema webhook)
- **DNS-provider uitval bij OVH**: external resolver-based check (cloudflare DoH probe)
- **Certbot renewal-failure**: separate runbook + alerting via certbot hook

## 12. Les uit incident 2026-06-11

Voor DNS-migraties: **TTL verlagen naar 60-300s VÓÓR de wijziging** (24-48u tevoren). Default OVH = 3600s, wat 1u stale-window oplevert. Met TTL 60s is window minuten i.p.v. uur.

---

*Geconfigureerd door Claude Opus 4.7 / Frank Spooren — INC-2026-06-11-001 response.*
