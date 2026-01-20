# Warredal Candidate Matcher - Deployment Guide

## 📋 Vereisten

- Hetzner Cloud Server (min. 2 vCPUs, 4GB RAM)
- Docker & Docker Compose geïnstalleerd
- Domein naam (optioneel, voor SSL)
- MailerLite account met API key
- PostgreSQL (wordt via Docker geleverd)

## 🚀 Deployment op Hetzner

### Stap 1: Server Voorbereiden

```bash
# SSH naar je Hetzner server
ssh root@your-server-ip

# Update systeem
apt update && apt upgrade -y

# Installeer Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Installeer Docker Compose
apt install docker-compose -y

# Verificeer installatie
docker --version
docker-compose --version
```

### Stap 2: Code Deployen

```bash
# Clone repository (of upload via SCP/SFTP)
git clone https://github.com/your-repo/warredal-candidate-matcher.git
cd warredal-candidate-matcher

# Of via SCP
# scp -r ./warredal-candidate-matcher root@your-server-ip:/root/
```

### Stap 3: Environment Configuratie

```bash
# Kopieer .env.example naar .env
cp .env.example .env

# Bewerk .env met je gegevens
nano .env
```

**Belangrijke variabelen:**
```env
DB_PASSWORD=JouwVeiligeDatabaseWachtwoord
JWT_SECRET=JouwVeiligeLangeRandomString
MAILERLITE_API_KEY=jouw_mailerlite_api_key
VITE_API_URL=http://your-domain.com:5000  # Of je server IP
FRONTEND_URL=http://your-domain.com
```

### Stap 4: Applicatie Starten

```bash
# Build en start alle containers
docker-compose up -d --build

# Controleer status
docker-compose ps

# Bekijk logs
docker-compose logs -f
```

### Stap 5: Database Initialiseren

```bash
# Wacht tot database gezond is
docker-compose logs postgres | grep "ready to accept connections"

# Database wordt automatisch gesynced bij eerste start
# Controleer backend logs
docker-compose logs backend
```

### Stap 6: Admin User Aanmaken

```bash
# Via API call (vervang met je server IP/domein)
curl -X POST http://your-server-ip:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@warredal.be",
    "password": "SecurePassword123!",
    "firstName": "Admin",
    "lastName": "User",
    "role": "admin"
  }'
```

## 🔒 SSL/HTTPS Setup (Optioneel maar Aanbevolen)

### Met Nginx & Let's Encrypt

```bash
# Installeer Certbot
apt install certbot python3-certbot-nginx -y

# Maak Nginx configuratie
mkdir -p nginx
cat > nginx/nginx.conf << 'EOF'
upstream backend {
    server backend:5000;
}

upstream frontend {
    server frontend:80;
}

server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://frontend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /api {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
EOF

# Start met productie profiel
docker-compose --profile production up -d

# Verkrijg SSL certificaat
certbot --nginx -d your-domain.com
```

## 📊 Monitoring & Onderhoud

### Logs Bekijken

```bash
# All logs
docker-compose logs -f

# Specifieke service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
```

### Backup Database

```bash
# Maak backup
docker exec warredal_postgres pg_dump -U postgres warredal_matcher > backup_$(date +%Y%m%d).sql

# Herstel backup
docker exec -i warredal_postgres psql -U postgres warredal_matcher < backup_20240101.sql
```

### Applicatie Updaten

```bash
# Pull nieuwe code
git pull origin main

# Rebuild containers
docker-compose up -d --build

# Verwijder oude images
docker image prune -f
```

### Resource Monitoring

```bash
# Container statistieken
docker stats

# Disk usage
docker system df

# Cleanup (voorzichtig!)
docker system prune -a
```

## 🔧 Troubleshooting

### Backend Start Niet

```bash
# Controleer logs
docker-compose logs backend

# Veelvoorkomende oorzaken:
# - Database nog niet klaar -> wacht 30 seconden
# - Verkeerde environment vars -> controleer .env
# - Port conflict -> wijzig PORT in docker-compose.yml
```

### Database Connectie Problemen

```bash
# Test database connectie
docker exec -it warredal_postgres psql -U postgres -d warredal_matcher

# Reset database (WAARSCHUWING: verwijdert alle data!)
docker-compose down -v
docker-compose up -d
```

### Frontend Toont Geen Data

```bash
# Controleer API URL in browser console
# Controleer CORS instellingen in backend .env
# Controleer of backend bereikbaar is:
curl http://localhost:5000/health
```

### Puppeteer/Scraping Crashes

```bash
# Verhoog shared memory
# In docker-compose.yml, voeg toe aan backend service:
shm_size: 2gb

# Of restart met meer resources
docker-compose restart backend
```

## 🔐 Security Best Practices

1. **Wijzig alle standaard wachtwoorden** in `.env`
2. **Gebruik sterke JWT_SECRET** (min. 64 characters random)
3. **Configureer firewall** (ufw):
   ```bash
   ufw allow 22/tcp
   ufw allow 80/tcp
   ufw allow 443/tcp
   ufw enable
   ```
4. **Schakel SSL in** voor productie
5. **Regelmatige backups** instellen (cronjob)
6. **Updates installeren** regelmatig

## 📈 Performance Optimalisatie

### Voor Hoge Volumes

```yaml
# In docker-compose.yml
backend:
  deploy:
    replicas: 2  # Meerdere backend instances
    resources:
      limits:
        cpus: '2'
        memory: 2G
```

### Database Tuning

```bash
# Postgresql configuratie aanpassen
# In docker-compose.yml voeg toe:
command: postgres -c shared_buffers=512MB -c max_connections=200
```

## 📞 Support

Voor vragen of problemen:
- GitHub Issues: [Repository URL]
- Email: recruitment@warredal.be

## 📝 Maintenance Schedule

**Aanbevolen:**
- **Dagelijks**: Controleer logs op errors
- **Wekelijks**: Database backup
- **Maandelijks**: Updates & security patches
- **Kwartaal**: Performance review & optimalisatie
