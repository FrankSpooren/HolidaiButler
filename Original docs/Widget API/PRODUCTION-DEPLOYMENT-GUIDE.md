# Widget API Production Deployment Guide
**HoliBot Chat Integration - Production Deployment**

## Overview

This guide covers the complete deployment process for the HoliBot Widget API integration to production, including backend services, frontend widget, cron jobs, and monitoring setup.

---

## Prerequisites

### Required Access
- Production server SSH access
- Database credentials (MySQL)
- Domain DNS configuration access
- Mistral AI API key (production)

### Required Tools
- Node.js v18+ on production server
- npm or yarn package manager
- PM2 for process management
- Cron for scheduled tasks
- SSL certificate for HTTPS

---

## Phase 1: Backend Deployment

### 1.1 Environment Configuration

Create production `.env` file in backend directory:

```bash
# Production Environment Variables
NODE_ENV=production
PORT=3002

# Database Configuration (Hetzner)
DB_HOST=jotx.your-database.de
DB_PORT=3306
DB_USER=pxoziy_db1
DB_PASSWORD=[PRODUCTION_PASSWORD]
DB_NAME=pxoziy_db1

# Mistral AI Configuration
MISTRAL_API_KEY=[PRODUCTION_API_KEY]
MISTRAL_MODEL=mistral-small-latest

# CORS Configuration
CORS_ORIGIN=https://your-production-domain.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=30

# Session Configuration
SESSION_EXPIRY_HOURS=24
SESSION_CLEANUP_ENABLED=true
```

### 1.2 Database Verification

Verify database tables exist on production:

```bash
# Connect to production database
mysql -h jotx.your-database.de -u pxoziy_db1 -p pxoziy_db1

# Verify tables
SHOW TABLES LIKE 'ChatSession%';

# Should show:
# - ChatSession
# - ChatSessionCleanupLog
```

If tables don't exist, run migration:

```bash
node migrations/create-chat-session-table.js
```

### 1.3 Install Dependencies

```bash
cd /path/to/production/backend
npm install --production
```

### 1.4 Start Backend with PM2

```bash
# Install PM2 globally if not installed
npm install -g pm2

# Start backend service
pm2 start src/server.js --name holibot-backend

# Save PM2 configuration
pm2 save

# Setup PM2 to start on server reboot
pm2 startup
```

### 1.5 Verify Backend Running

```bash
# Check PM2 status
pm2 status

# Check logs
pm2 logs holibot-backend

# Test API endpoint
curl http://localhost:3002/api/v1/chat/message \
  -H "Content-Type: application/json" \
  -d '{"query": "test"}'
```

---

## Phase 2: Frontend Deployment

### 2.1 Update API Base URL

Edit `frontend/src/shared/services/chat.api.ts`:

```typescript
const API_BASE_URL = 'https://your-production-domain.com/api/v1';
```

### 2.2 Build Frontend

```bash
cd /path/to/production/frontend
npm install
npm run build
```

This creates optimized production build in `dist/` directory.

### 2.3 Deploy Frontend Assets

**Option A: Static Hosting (Netlify/Vercel)**
```bash
# Deploy dist/ folder to hosting service
netlify deploy --prod --dir=dist
```

**Option B: Nginx Server**
```bash
# Copy build to Nginx public directory
sudo cp -r dist/* /var/www/html/holibot/

# Nginx configuration
server {
    listen 443 ssl;
    server_name your-production-domain.com;

    ssl_certificate /path/to/ssl/cert.pem;
    ssl_certificate_key /path/to/ssl/key.pem;

    root /var/www/html/holibot;
    index index.html;

    # Frontend routes
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend API proxy
    location /api/ {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Restart Nginx
sudo systemctl restart nginx
```

### 2.4 Verify Frontend

Visit `https://your-production-domain.com` and:
- Open browser console
- Click HoliBot button
- Send test message
- Verify `window.openHoliBot` function exists

---

## Phase 3: Cron Job Setup

### 3.1 Create Cron Job Script Wrapper

Create `/path/to/production/backend/scripts/cron-cleanup.sh`:

```bash
#!/bin/bash
# Cron wrapper for chat session cleanup

# Set working directory
cd /path/to/production/backend

# Load environment variables
export $(cat .env | xargs)

# Run cleanup script
/usr/bin/node scripts/cleanup-chat-sessions.js >> logs/cleanup-$(date +\%Y-\%m-\%d).log 2>&1

# Keep only last 30 days of logs
find logs/cleanup-*.log -mtime +30 -delete
```

Make executable:

```bash
chmod +x scripts/cron-cleanup.sh
```

### 3.2 Add Cron Job

Edit crontab:

```bash
crontab -e
```

Add entry (runs daily at 3 AM):

```cron
0 3 * * * /path/to/production/backend/scripts/cron-cleanup.sh
```

### 3.3 Verify Cron Job

```bash
# List cron jobs
crontab -l

# Test manual execution
/path/to/production/backend/scripts/cron-cleanup.sh

# Check log file
tail -f logs/cleanup-$(date +%Y-%m-%d).log
```

---

## Phase 4: Monitoring Setup

### 4.1 PM2 Monitoring

```bash
# Install PM2 monitoring dashboard
pm2 install pm2-logrotate

# Configure log rotation
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### 4.2 Database Monitoring Queries

Create monitoring script `scripts/monitor-chat-sessions.js`:

```javascript
require('dotenv').config();
const mysql = require('mysql2/promise');

async function monitorSessions() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    // Current session stats
    const [stats] = await connection.query(`
      SELECT
        COUNT(*) as total_sessions,
        COUNT(CASE WHEN expires_at > NOW() THEN 1 END) as active_sessions,
        COUNT(CASE WHEN user_id IS NOT NULL THEN 1 END) as authenticated_sessions,
        AVG(TIMESTAMPDIFF(SECOND, created_at, updated_at)) as avg_session_duration
      FROM ChatSession
    `);

    console.log('\n📊 Chat Session Statistics');
    console.log('===========================');
    console.log(`Total sessions: ${stats[0].total_sessions}`);
    console.log(`Active sessions: ${stats[0].active_sessions}`);
    console.log(`Authenticated: ${stats[0].authenticated_sessions}`);
    console.log(`Avg duration: ${Math.round(stats[0].avg_session_duration)}s`);

    // Recent cleanup history
    const [cleanups] = await connection.query(`
      SELECT sessions_deleted, run_at
      FROM ChatSessionCleanupLog
      ORDER BY run_at DESC
      LIMIT 7
    `);

    console.log('\n🧹 Recent Cleanups (Last 7 Days)');
    console.log('==================================');
    cleanups.forEach(log => {
      const date = new Date(log.run_at).toISOString().split('T')[0];
      console.log(`${date}: ${log.sessions_deleted} sessions cleaned`);
    });

  } finally {
    await connection.end();
  }
}

monitorSessions();
```

Run weekly:

```bash
# Add to crontab
0 9 * * MON /usr/bin/node /path/to/production/backend/scripts/monitor-chat-sessions.js
```

### 4.3 Mistral AI Usage Monitoring

Monitor API usage in backend logs:

```bash
# Search for Mistral AI calls
pm2 logs holibot-backend | grep "Mistral AI"

# Count API calls per hour
pm2 logs holibot-backend --lines 1000 | grep "Mistral AI" | awk '{print $1" "$2}' | cut -d: -f1 | uniq -c
```

---

## Phase 5: Production Testing

### 5.1 Smoke Tests

```bash
# Test 1: Initial chat message
curl -X POST https://your-production-domain.com/api/v1/chat/message \
  -H "Content-Type: application/json" \
  -d '{"query": "best restaurants in Calpe"}'

# Expected: sessionId returned, POIs in response

# Test 2: Follow-up message (use sessionId from Test 1)
curl -X POST https://your-production-domain.com/api/v1/chat/message \
  -H "Content-Type: application/json" \
  -d '{"query": "which one has outdoor seating?", "sessionId": "YOUR_SESSION_ID"}'

# Expected: Same sessionId, filtered POIs

# Test 3: Session retrieval
curl https://your-production-domain.com/api/v1/chat/session/YOUR_SESSION_ID

# Expected: Session data with conversation history

# Test 4: Session deletion
curl -X DELETE https://your-production-domain.com/api/v1/chat/session/YOUR_SESSION_ID

# Expected: 200 OK
```

### 5.2 Load Testing

Use Apache Bench or similar tool:

```bash
# Install Apache Bench
apt-get install apache2-utils

# Test 100 requests, 10 concurrent
ab -n 100 -c 10 -T "application/json" \
   -p test-payload.json \
   https://your-production-domain.com/api/v1/chat/message

# Create test-payload.json
echo '{"query": "test"}' > test-payload.json
```

### 5.3 Frontend Testing Checklist

- [ ] Widget loads on homepage
- [ ] Click widget button opens chat
- [ ] Send message receives response
- [ ] Follow-up questions work
- [ ] POIs display correctly
- [ ] Session persists across page refresh
- [ ] Mobile responsive (test on phone)
- [ ] Cross-browser (Chrome, Firefox, Safari)

---

## Phase 6: Security Checklist

### 6.1 Environment Security

```bash
# Secure .env file
chmod 600 .env

# Verify no secrets in Git
git grep -i "password\|api_key\|secret"

# Enable firewall
sudo ufw enable
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw allow 3002  # Backend (only from localhost)
```

### 6.2 Rate Limiting Verification

Test rate limiting:

```bash
# Send 31 requests rapidly (should trigger rate limit)
for i in {1..31}; do
  curl -X POST http://localhost:3002/api/v1/chat/message \
    -H "Content-Type: application/json" \
    -d '{"query": "test"}' &
done
wait

# Expected: Last request returns 429 Too Many Requests
```

### 6.3 CORS Configuration

Verify CORS only allows production domain:

```bash
# Test from unauthorized domain
curl -X POST https://your-production-domain.com/api/v1/chat/message \
  -H "Origin: https://malicious-site.com" \
  -H "Content-Type: application/json" \
  -d '{"query": "test"}' \
  -v

# Expected: CORS error (no Access-Control-Allow-Origin header)
```

---

## Phase 7: Rollback Plan

### 7.1 Backup Before Deployment

```bash
# Backup database
mysqldump -h jotx.your-database.de -u pxoziy_db1 -p pxoziy_db1 > backup-$(date +%Y%m%d).sql

# Backup current code
tar -czf backend-backup-$(date +%Y%m%d).tar.gz /path/to/production/backend
tar -czf frontend-backup-$(date +%Y%m%d).tar.gz /path/to/production/frontend
```

### 7.2 Rollback Procedure

If issues occur after deployment:

```bash
# 1. Stop new backend
pm2 stop holibot-backend

# 2. Restore old code
tar -xzf backend-backup-YYYYMMDD.tar.gz -C /

# 3. Restart with old code
pm2 restart holibot-backend

# 4. Restore database if needed
mysql -h jotx.your-database.de -u pxoziy_db1 -p pxoziy_db1 < backup-YYYYMMDD.sql
```

---

## Phase 8: Post-Deployment Monitoring

### 8.1 First 24 Hours

Monitor closely:

```bash
# Watch backend logs
pm2 logs holibot-backend --lines 100

# Watch error logs specifically
pm2 logs holibot-backend --err

# Monitor system resources
pm2 monit

# Check database session growth
watch -n 60 'mysql -h jotx.your-database.de -u pxoziy_db1 -p pxoziy_db1 -e "SELECT COUNT(*) FROM ChatSession"'
```

### 8.2 Weekly Review

After one week in production:

1. Review cleanup logs: Check `logs/cleanup-*.log`
2. Analyze session statistics: Run `monitor-chat-sessions.js`
3. Check Mistral AI usage: Review API costs
4. Review error logs: `pm2 logs holibot-backend --err --lines 1000`
5. Verify rate limiting effectiveness: Check for abuse

---

## Troubleshooting

### Issue: Backend won't start

```bash
# Check logs
pm2 logs holibot-backend --err

# Common issues:
# - Missing environment variables
# - Database connection failure
# - Port already in use

# Test database connection
mysql -h $DB_HOST -u $DB_USER -p $DB_NAME

# Check if port is available
lsof -i :3002
```

### Issue: Rate limit too restrictive

Edit `.env`:

```bash
RATE_LIMIT_MAX_REQUESTS=50  # Increase from 30
```

Restart:

```bash
pm2 restart holibot-backend
```

### Issue: Sessions not cleaning up

```bash
# Check cron is running
crontab -l

# Test cleanup script manually
/path/to/production/backend/scripts/cron-cleanup.sh

# Check cleanup logs
tail -f logs/cleanup-$(date +%Y-%m-%d).log
```

### Issue: Mistral AI timeout

Increase timeout in `mistralService.js`:

```javascript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 30000); // Increase from 10000
```

---

## Configuration Summary

### Backend Configuration
- Port: 3002
- Process Manager: PM2
- Rate Limit: 30 requests/minute
- Session Expiry: 24 hours
- Database: MySQL on Hetzner

### Frontend Configuration
- Build Tool: Vite
- Deploy: Static assets
- API URL: https://your-production-domain.com/api/v1

### Cron Jobs
- Session cleanup: Daily at 3 AM
- Session monitoring: Weekly Monday 9 AM

### Monitoring
- PM2 logs: Real-time process monitoring
- Cleanup logs: Daily cleanup reports
- Database stats: Weekly session statistics

---

## Support Contacts

- Database Host: Hetzner (jotx.your-database.de)
- Mistral AI: https://console.mistral.ai
- PM2 Documentation: https://pm2.keymetrics.io

---

## Deployment Checklist

Use this checklist for each deployment:

- [ ] Backup database
- [ ] Backup current code
- [ ] Update .env with production values
- [ ] Install dependencies
- [ ] Run database migrations
- [ ] Build frontend
- [ ] Deploy frontend assets
- [ ] Start backend with PM2
- [ ] Configure cron jobs
- [ ] Run smoke tests
- [ ] Verify rate limiting
- [ ] Check CORS configuration
- [ ] Monitor logs for 24 hours
- [ ] Document any issues
- [ ] Update team on deployment status

---

**Document Version:** 1.0
**Last Updated:** 2025-11-10
**Status:** Production Ready
