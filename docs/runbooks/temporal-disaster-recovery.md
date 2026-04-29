# Runbook: Temporal Disaster Recovery

## Detectie

De Dokter health-check zal Temporal-failure binnen 1u detecteren:
- `agent_issues` met severity P1, source `dokter-temporal`
- Threema-alert via De Bode

Symptomen die direct alarmeren:
- Workflow-executions stoppen
- Admin Portal `/agents` toont errors voor agent runs die Temporal gebruiken
- `temporal operator namespace list` faalt

## Triage

```bash
ssh root@91.98.71.87

# 1. Postgres ok?
systemctl status postgresql
sudo -u postgres psql -c '\l'

# 2. Temporal Server ok?
docker compose -f /opt/temporal/docker-compose.yml ps
docker compose -f /opt/temporal/docker-compose.yml logs --tail=100

# 3. Worker ok?
pm2 list | grep temporal
pm2 logs hb-temporal-worker --lines 100 --nostream
```

## Recovery scenarios

### Scenario 1: Temporal Server crash
```bash
cd /opt/temporal
docker compose restart
sleep 30
docker compose ps
```

### Scenario 2: Postgres corruptie (pg_dump restore)
```bash
# Stop Temporal Server eerst
cd /opt/temporal
docker compose stop temporal

# Restore laatste backup
LATEST=$(ls -t /var/backups/temporal/temporal_*.sql.gz | head -1)
echo "Restoring from: $LATEST"

sudo -u postgres dropdb temporal
sudo -u postgres dropdb temporal_visibility
sudo -u postgres createdb temporal -O temporal
sudo -u postgres createdb temporal_visibility -O temporal
gunzip -c $LATEST | sudo -u postgres psql temporal

LATEST_VIS=$(ls -t /var/backups/temporal/temporal_visibility_*.sql.gz | head -1)
gunzip -c $LATEST_VIS | sudo -u postgres psql temporal_visibility

# Restart Temporal
docker compose start temporal
sleep 30
```

RPO: 24u (daily backup) + 7 dagen (Storage Box weekly)
RTO: ~30 min

### Scenario 3: Worker crash
```bash
pm2 restart hb-temporal-worker
pm2 logs hb-temporal-worker --lines 50 --nostream
```

### Scenario 4: Volledig server-loss
1. Provision nieuwe Hetzner server (gelijk type)
2. Restore vanuit Storage Box backups
3. Restore Temporal Postgres vanuit Storage Box
4. DNS cutover
5. Workflows resume automatisch (Temporal event sourcing)

RTO: ~4u

## Workflow state recovery

Temporal handelt dit automatisch via event sourcing. Worker gewoon herstarten, workflows pikken op waar ze gebleven waren.

## Communicatie

- Notify Frank via Threema bij P1 issue
- Update statuspagina bij langer dan 30 min downtime

## Referenties

- Temporal docs: https://docs.temporal.io/cluster-deployment-guide
- HB self-hosted ops-eisen: zie CLAUDE.md
