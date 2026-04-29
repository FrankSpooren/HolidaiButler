# Runbook: Hetzner Cloud Server Rescale

## Wanneer uitvoeren?

Trigger: De Dokter rapporteert disk usage >85% OF projection <30 dagen tot 90%.

## Voorbereiding (1 dag vooraf)

1. Verlaag DNS TTL naar 300s in DNS-provider
2. Plan onderhoudsvenster (avond/weekend, ~10 min downtime)
3. Informeer Frank's compagnon
4. Maak Hetzner Cloud snapshot (Console > server > Snapshots)

## Backup (op moment van rescale)

```bash
ssh root@91.98.71.87
mkdir -p /root/pre_rescale_$(date +%Y%m%d)
cd /root/pre_rescale_$(date +%Y%m%d)
mysqldump --no-defaults --all-databases --single-transaction | gzip > mysql.sql.gz
mongodump --gzip --out=./mongo
redis-cli BGSAVE && sleep 10 && cp /var/lib/redis/dump.rdb redis.rdb
rsync -av -e 'ssh -p 23' ./ u585583@u585583.your-storagebox.de:holidaibutler/pre-rescale-snapshots/
```

## Rescale (via Hetzner Cloud Console)

1. Login op Hetzner Cloud Console (https://console.hetzner.cloud)
2. Navigate naar server
3. Klik tab "Rescale"
4. Kies hogere tier:
   - CPX42 (huidig) -> CPX52 (32 GB RAM, 16 vCPU, 60 GB SSD)
   - of CCX series voor dedicated cores
5. Bevestig rescale -> Hetzner doet automatisch ~5-10 min
6. Server herstart automatisch op nieuwe specs

## Post-rescale verificatie

```bash
ssh root@91.98.71.87
nproc                    # Verwacht: nieuwe vCPU count
free -h                  # Verwacht: nieuwe RAM
df -h /                  # Verwacht: nieuwe disk size

systemctl status apache2 mongod redis-server
pm2 list
pm2 logs --lines 50 --nostream | grep -i error
docker compose -f /opt/tempo/docker-compose.yml ps
```

## Bij issues

- Service down: `systemctl restart <service>`
- PM2 process down: `pm2 resurrect`
- Disk uitbreiding: Linux herkent automatisch (geen resize2fs nodig op Hetzner Cloud)
- DNS issues: TTL afwachten of handmatig flush

## Rollback

Hetzner kan terug-rescale naar lagere tier (zelfde procedure).
Bij ramp: snapshot terugzetten via Hetzner Cloud Console.

## Disk thresholds (Fase 14)

| Threshold | Trigger | Actie |
|-----------|---------|-------|
| >60% | Info in dagelijks briefing | Trend bewaken |
| >70% | Warning in briefing | Log-rotatie controleren |
| >80% | Warning + agent_issues P2 | Cleanup of upgrade plannen |
| >85% | Critical + P1 | Frank actie binnen 24u |
| >90% | Critical + Threema | Hetzner rescale-window plannen |
