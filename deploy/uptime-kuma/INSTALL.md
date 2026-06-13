# Laag 4 — Externe uptime-monitor (UptimeKuma, EU-self-host)

> Deployment-runbook. Hoort bij `docs/runbooks/monitoring-and-alerting.md` §3.
> Status: **deployment-klaar — nog niet live getest** tot de VPS bestaat.

## 0. Waarom een aparte host (lees eerst)

Laag 4 vangt het scenario dat de Laag 1-3 alert-paden zelf NIET vangen:
hele-server-uitval, netwerk-isolatie en DNS-provider-problemen op prod
(Hetzner Nurnberg). Daarom MOET deze monitor in een **ander failure-domein**
draaien. Gekozen: **UpCloud, datacenter Helsinki (fi-hel1)** — Fins/EU-soeverein,
99,99% SLA, los stroomnet/provider t.o.v. prod. Draai dit NOOIT op prod.

## 1. VPS provisioning (handmatig, eenmalig)

- Plan: UpCloud Starter 1GB / 1 vCPU / 25GB SSD (~€3,50/mnd; 2GB voor lucht)
- Regio: `fi-hel1` (Helsinki)
- OS: Ubuntu 26.04 LTS (gedeployed; Docker-repo ondersteunt 26.04 — bevestigd)
- Storage: encryption-at-rest AAN (gratis, AES-256, alleen bij aanmaak instelbaar)
- SSH-key: voeg Frank's `id_ed25519` *public* key toe (publieke deel `.pub`!)
- DNS: A-record `status.holidaibutler.com` -> VPS-IP (MONITOR-ip, niet prod) voor Caddy auto-TLS

## 2. Host-hardening (als root op de nieuwe VPS)

```bash
apt update && apt -y upgrade
# Firewall — alleen SSH + HTTP(S)
apt -y install ufw
ufw default deny incoming && ufw default allow outgoing
ufw allow 22/tcp && ufw allow 80/tcp && ufw allow 443/tcp
ufw --force enable
# Automatische security-updates + brute-force bescherming
apt -y install unattended-upgrades fail2ban
dpkg-reconfigure -plow unattended-upgrades   # of: echo enable in 20auto-upgrades
systemctl enable --now fail2ban
# SSH: root-login alleen via key (geen wachtwoord)
sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
systemctl reload ssh
```

## 3. Docker installeren

```bash
curl -fsSL https://get.docker.com | sh
systemctl enable --now docker
docker compose version   # verifieer plugin aanwezig
```

## 4. Kit uitrollen

```bash
mkdir -p /opt && cd /opt
# kopieer deze deploy/uptime-kuma map naar /opt/uptime-kuma
# (bv. via: rsync vanaf prod-repo of git clone + sparse-checkout)
cd /opt/uptime-kuma
cp threema-relay/.env.example threema-relay/.env
chmod 0600 threema-relay/.env
# vul THREEMA_GATEWAY_ID / THREEMA_SECRET / OWNER_THREEMA_ID
#   -> zelfde waarden als prod /etc/threema-alert.env
nano threema-relay/.env
docker compose up -d --build
docker compose ps        # alle 3 services 'running' + healthy
docker compose logs threema-relay | tail   # 'listening' verwacht
```

Open `https://status.holidaibutler.com` -> UptimeKuma eerste-run: maak admin-account
(sterk wachtwoord, bewaar in password-manager). Dit is de dashboard-auth.

## 5. De 6 monitors aanmaken (in UptimeKuma UI)

Per monitor: type **HTTP(s)**, interval **60s**, retries **2**, accepted **200-299**.

| Naam | URL |
|------|-----|
| prod-holidaibutler | https://holidaibutler.com |
| prod-calpetrip | https://calpetrip.com |
| prod-texelmaps | https://texelmaps.nl |
| prod-api-health | https://api.holidaibutler.com/health |
| prod-admin | https://admin.holidaibutler.com |
| prod-grafana | https://grafana.holidaibutler.com |

## 6. Threema-notificatie koppelen

UptimeKuma -> Settings -> Notifications -> Add -> type **Webhook**:
- Post URL: `http://threema-relay:8099/notify`
- Content type: `application/json`
- (optioneel) Additional Headers: `{"X-Relay-Token":"<zelfde als RELAY_TOKEN>"}`
- Test -> je moet een Threema-bericht ontvangen.

Koppel deze notificatie aan ALLE 6 monitors (vink aan per monitor of default-on).

## 7. SPOF-mitigatie: wederzijdse monitoring

De monitor bewaakt prod. **Prod moet de monitor bewaken** (anders: wie bewaakt de
bewaker?). Op PROD wordt `hb-health-check.sh` uitgebreid met een 7e endpoint dat
`https://status.holidaibutler.com` (of het VPS-IP) controleert. Valt de monitor-VPS
weg, dan alarmeert prod via zijn eigen Threema-pad. Zie de patch in
`docs/runbooks/monitoring-and-alerting.md` §3 en pas die toe NA provisioning.

## 8. Backup & updates

- **Backup**: het `uptime-kuma-data` volume bevat de SQLite-DB + config.
  Cron op de VPS: `docker run --rm -v uptime-kuma_uptime-kuma-data:/d -v /root/backups:/b alpine tar czf /b/kuma-$(date +%F).tgz /d`
- **Updates**: `docker compose pull && docker compose up -d` (UptimeKuma `:1` tag
  blijft binnen major v1). Test-alert na elke update (§9 hoofdrunbook).

## 9. E2E-verificatie (na deploy — VERPLICHT vóór 'actief' claimen)

1. Webhook-test in UptimeKuma -> Threema ontvangen? (§6)
2. Pauzeer/forceer 1 monitor down (bv. tijdelijk verkeerde URL) -> DOWN-alert?
3. Herstel -> recovery-alert?
4. Stop de monitor-VPS kort -> prod alarmeert via §7? (mutual-monitoring)
5. Documenteer uitkomst in monitoring-and-alerting.md §3 + flip status naar 'actief'.
