# Hetzner VPS Deployment Guide

## Overview
This guide explains how to deploy the chatbot API to a Hetzner VPS. Unlike shared hosting, you have full control and can run the application directly without wrapper files.

## Key Differences from GreenGeeks

- ✅ **No `app.js` wrapper needed** - Run `dist/server.js` directly
- ✅ **Full server control** - Install Node.js, manage processes, configure firewall
- ✅ **Process management** - Use PM2 or systemd for production
- ✅ **Reverse proxy** - Use Nginx to handle HTTPS and route traffic
- ✅ **Better performance** - Dedicated resources

## Prerequisites

- Hetzner VPS (Ubuntu 20.04/22.04 recommended)
- SSH access to the server
- Domain name pointing to your server IP (optional but recommended)
- Basic Linux command line knowledge

## Step 1: Server Setup

### 1.1 Connect to Your Server
```bash
ssh root@your-server-ip
```

### 1.2 Update System
```bash
apt update && apt upgrade -y
```

### 1.3 Install Node.js (v18+)
```bash
# Using NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Verify installation
node --version  # Should be >= 18.0.0
npm --version
```

### 1.4 Install PM2 (Process Manager)
```bash
npm install -g pm2
```

### 1.5 Install Nginx (Reverse Proxy)
```bash
apt install -y nginx
systemctl enable nginx
systemctl start nginx
```

### 1.6 Install ChromaDB (if running locally)
```bash
# Option 1: Using Docker (recommended)
apt install -y docker.io docker-compose
systemctl enable docker
systemctl start docker

# Run ChromaDB
docker run -d \
  --name chromadb \
  -p 8000:8000 \
  -v chromadb_data:/chroma/chroma \
  chromadb/chroma:latest

# Option 2: Using Python (alternative)
apt install -y python3 python3-pip
pip3 install chromadb
# Then run: chroma run --host 0.0.0.0 --port 8000
```

## Step 2: Deploy Application

### 2.1 Create Application Directory
```bash
mkdir -p /var/www/chatbot-api
cd /var/www/chatbot-api
```

### 2.2 Upload Files

**Option A: Using Git (Recommended)**
```bash
# Install git
apt install -y git

# Clone your repository (if using Git)
git clone your-repo-url .
# Or upload files via SFTP/SCP
```

**Option B: Using SCP from Local Machine**
```bash
# From your local machine
scp -r "6 - chatbot api v3/"* root@your-server-ip:/var/www/chatbot-api/
```

**Option C: Using rsync**
```bash
# From your local machine
rsync -avz "6 - chatbot api v3/" root@your-server-ip:/var/www/chatbot-api/
```

### 2.3 Install Dependencies
```bash
cd /var/www/chatbot-api
npm install --production
```

### 2.4 Build the Application
```bash
# If you didn't build locally, build on server
npm install  # Install dev dependencies for build
npm run build
npm prune --production  # Remove dev dependencies
```

### 2.5 Create Environment File
```bash
cp env.example .env
nano .env  # Edit with your production values
```

**Required `.env` values:**
```env
PORT=3000
NODE_ENV=production
HOST=0.0.0.0

MISTRAL_API_KEY=your_actual_mistral_api_key
MISTRAL_BASE_URL=https://api.mistral.ai/v1

CHROMADB_URL=http://127.0.0.1:8000
CHROMADB_COLLECTION_NAME=calpe_pois

ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

LOG_LEVEL=info
```

### 2.6 Create Logs Directory
```bash
mkdir -p logs
chmod 755 logs
```

## Step 3: Process Management with PM2

### 3.1 Create PM2 Ecosystem File
```bash
nano ecosystem.config.js
```

Add this content:
```javascript
module.exports = {
  apps: [{
    name: 'chatbot-api',
    script: './dist/server.js',
    instances: 1,  // or 'max' for cluster mode
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',
    max_memory_restart: '1G'
  }]
};
```

### 3.2 Start Application with PM2
```bash
pm2 start ecosystem.config.js
pm2 save  # Save PM2 process list
pm2 startup  # Enable PM2 to start on system boot
```

### 3.3 PM2 Useful Commands
```bash
pm2 status          # Check status
pm2 logs chatbot-api # View logs
pm2 restart chatbot-api  # Restart
pm2 stop chatbot-api    # Stop
pm2 monit           # Monitor resources
```

## Step 4: Configure Nginx Reverse Proxy

### 4.1 Create Nginx Configuration
```bash
nano /etc/nginx/sites-available/chatbot-api
```

Add this configuration:
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Redirect HTTP to HTTPS (after SSL setup)
    # return 301 https://$server_name$request_uri;

    # For now, proxy to Node.js
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 4.2 Enable Site
```bash
ln -s /etc/nginx/sites-available/chatbot-api /etc/nginx/sites-enabled/
nginx -t  # Test configuration
systemctl reload nginx
```

## Step 5: SSL/HTTPS Setup (Let's Encrypt)

### 5.1 Install Certbot
```bash
apt install -y certbot python3-certbot-nginx
```

### 5.2 Obtain SSL Certificate
```bash
certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

### 5.3 Update Nginx Config for HTTPS
Certbot will automatically update your Nginx config. Or manually update:
```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

### 5.4 Auto-Renewal
Certbot sets up auto-renewal automatically. Test it:
```bash
certbot renew --dry-run
```

## Step 6: Firewall Configuration

### 6.1 Configure UFW (Uncomplicated Firewall)
```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw allow 8000/tcp  # If ChromaDB needs external access
ufw enable
ufw status
```

## Step 7: Alternative: systemd Service (Instead of PM2)

If you prefer systemd over PM2:

### 7.1 Create systemd Service File
```bash
nano /etc/systemd/system/chatbot-api.service
```

Add this content:
```ini
[Unit]
Description=Chatbot API Service
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/chatbot-api
Environment=NODE_ENV=production
EnvironmentFile=/var/www/chatbot-api/.env
ExecStart=/usr/bin/node /var/www/chatbot-api/dist/server.js
Restart=always
RestartSec=10
StandardOutput=append:/var/www/chatbot-api/logs/app.log
StandardError=append:/var/www/chatbot-api/logs/error.log

[Install]
WantedBy=multi-user.target
```

### 7.2 Enable and Start Service
```bash
systemctl daemon-reload
systemctl enable chatbot-api
systemctl start chatbot-api
systemctl status chatbot-api
```

## Step 8: Monitoring and Maintenance

### 8.1 View Logs
```bash
# PM2 logs
pm2 logs chatbot-api

# Application logs
tail -f /var/www/chatbot-api/logs/*.log

# Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# System logs (if using systemd)
journalctl -u chatbot-api -f
```

### 8.2 Health Check
```bash
curl http://localhost:3000/api/health
curl https://yourdomain.com/api/health
```

### 8.3 Update Application
```bash
cd /var/www/chatbot-api
git pull  # If using Git
# Or upload new files

npm install --production
npm run build  # If needed

pm2 restart chatbot-api  # Or: systemctl restart chatbot-api
```

## Troubleshooting

### Application Won't Start
```bash
# Check PM2 logs
pm2 logs chatbot-api --lines 50

# Check if port is in use
netstat -tulpn | grep 3000

# Test manually
cd /var/www/chatbot-api
node dist/server.js
```

### Nginx 502 Bad Gateway
- Check if Node.js app is running: `pm2 status`
- Check if app is listening on port 3000: `netstat -tulpn | grep 3000`
- Check Nginx error logs: `tail -f /var/log/nginx/error.log`

### ChromaDB Connection Issues
```bash
# Check if ChromaDB is running
docker ps | grep chromadb
# Or
curl http://127.0.0.1:8000/api/v1/heartbeat

# Check ChromaDB logs
docker logs chromadb
```

### Permission Issues
```bash
# Fix ownership
chown -R www-data:www-data /var/www/chatbot-api
chmod -R 755 /var/www/chatbot-api
```

## File Structure on Server

```
/var/www/chatbot-api/
├── dist/              # Compiled JavaScript
├── node_modules/      # Dependencies
├── logs/              # Application logs
├── .env               # Environment variables
├── package.json
├── ecosystem.config.js  # PM2 config
└── dist/server.js     # Entry point (no app.js needed!)
```

## Security Best Practices

1. **Firewall**: Only open necessary ports (80, 443, 22)
2. **SSL**: Always use HTTPS in production
3. **Environment Variables**: Never commit `.env` to Git
4. **User Permissions**: Run app as non-root user (www-data)
5. **Updates**: Keep system and dependencies updated
6. **Backups**: Regularly backup your application and database

## Performance Optimization

1. **PM2 Cluster Mode**: Use `instances: 'max'` for multi-core CPUs
2. **Nginx Caching**: Add caching for static responses
3. **Load Balancing**: Use multiple PM2 instances or multiple servers
4. **CDN**: Use Cloudflare or similar for static assets

## Next Steps

- Set up monitoring (e.g., PM2 Plus, New Relic)
- Configure automated backups
- Set up CI/CD pipeline
- Monitor resource usage and scale as needed

