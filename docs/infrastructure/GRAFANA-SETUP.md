# Grafana UI Setup — HolidaiButler Observability

> **Status**: LIVE op `127.0.0.1:3000` sinds 2026-05-18 (Blok A6 / v5.6.2)
> **DNS-actie nodig**: `grafana.holidaibutler.com` A-record → `91.98.71.87`

## Architectuur

Grafana 11.3.0 draait als Docker container in het bestaande Tempo stack
(`tempo-grafana-1`), met automatisch geprovisioneerde Tempo datasource.

```
Browser → https://grafana.holidaibutler.com → Apache (vhost grafana) →
127.0.0.1:3000 (Grafana container) → tempo-network → tempo:3200 (Tempo)
```

## Bestanden op productie-server

| Pad | Doel | In git |
|-----|------|--------|
| `/opt/tempo/docker-compose.yml` | Tempo + Grafana stack | nee (infra) |
| `/opt/tempo/docker-compose.yml.bak.pre-grafana-*` | Pre-A6 backup | nee |
| `/opt/grafana/.env` | Admin credentials + GF_* config (mode 600) | nee (secrets) |
| `/opt/grafana/data/` | Grafana SQLite, dashboards, etc. (uid 472) | nee |
| `/opt/grafana/provisioning/datasources/tempo.yaml` | Tempo datasource | nee |
| `/etc/apache2/sites-available/grafana.holidaibutler.com.conf` | Apache vhost (HTTP) | nee |

## Apache vhost-pattern

Volgt sentry self-hosted pattern (v5.2.0):
- HTTP-only vhost initieel
- `mod_proxy_wstunnel` voor Grafana Live (al enabled sinds v5.2.0)
- `certbot --apache -d grafana.holidaibutler.com` voegt `-le-ssl.conf` toe na DNS

## Datasource provisioning

Tempo wordt auto-toegevoegd bij Grafana boot via
`/opt/grafana/provisioning/datasources/tempo.yaml`:

- **UID**: `tempo`
- **URL**: `http://tempo:3200` (container-naam binnen `tempo` Docker network)
- **isDefault**: true
- **editable**: false (provisioned, dus alleen via file te wijzigen)

## Operations

### Start / stop / status

```bash
cd /opt/tempo
docker compose up -d           # Start Tempo + Grafana
docker compose down            # Stop both
docker compose ps              # Status
docker logs tempo-grafana-1    # Grafana logs
docker logs tempo-tempo-1      # Tempo logs
```

### Grafana versie-upgrade

1. Update `image: grafana/grafana:X.Y.Z` in `/opt/tempo/docker-compose.yml`
2. `cd /opt/tempo && docker compose pull grafana && docker compose up -d grafana`
3. Persistence volume `/opt/grafana/data` is automatisch gemount

### Admin password resetten

```bash
docker exec -it tempo-grafana-1 grafana-cli admin reset-admin-password <NEW_PW>
```

## DNS-instructie (Frank)

A-record toevoegen bij de DNS-beheerder:

```
Type:     A
Naam:     grafana
Waarde:   91.98.71.87
TTL:      300 (5 min)
```

Verificatie na ~5 min: `dig +short grafana.holidaibutler.com` → moet `91.98.71.87` retourneren.

## Let's Encrypt cert (na DNS-propagatie)

```bash
certbot --apache -d grafana.holidaibutler.com --redirect
```

Verifieer: `https://grafana.holidaibutler.com/api/health` → 200 OK.

## SSH-tunnel toegang (pre-DNS)

```bash
ssh -L 3000:127.0.0.1:3000 holidaibutler-prod
# Open in browser: http://localhost:3000
# Login: admin / <password uit /opt/grafana/.env GF_SECURITY_ADMIN_PASSWORD>
```

## Beveiliging

- Port 3000 alleen op `127.0.0.1` (geen public binding)
- Admin password random (24-char base64) in `/opt/grafana/.env` (mode 600)
- `GF_USERS_ALLOW_SIGN_UP=false` (geen self-registration)
- `GF_ANALYTICS_REPORTING_ENABLED=false` (geen telemetry naar Grafana Labs)
- `GF_SECURITY_DISABLE_GRAVATAR=true` (geen external avatar lookups)
- `GF_SECURITY_COOKIE_SECURE=true` (https-only cookies)
- `GF_SECURITY_STRICT_TRANSPORT_SECURITY=true` (HSTS)

## Rollback

```bash
cd /opt/tempo
docker compose stop grafana
docker compose rm -f grafana
cp /opt/tempo/docker-compose.yml.bak.pre-grafana-20260518_0916 /opt/tempo/docker-compose.yml
docker compose up -d tempo  # Tempo only, no Grafana
a2dissite grafana.holidaibutler.com.conf && systemctl reload apache2
```
