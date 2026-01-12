# GreenGeeks Deployment Guide

## Overview
This guide explains how to deploy the chatbot API to GreenGeeks hosting.

## What Files to Copy

**You need to copy MORE than just the `dist` folder.** Here's what's required:

### Required Files and Folders:
1. ✅ **`dist/`** - Compiled JavaScript files (the built application)
2. ✅ **`node_modules/`** - All npm dependencies (or install on server)
3. ✅ **`package.json`** - Dependency definitions
4. ✅ **`app.js`** - Entry point for GreenGeeks (created in this guide)
5. ✅ **`.env`** - Environment variables (create from `env.example`)
6. ✅ **`logs/`** - Log directory (create if it doesn't exist)

### Optional but Recommended:
- `package-lock.json` - Ensures exact dependency versions

## Step-by-Step Deployment

### 1. Build the Application Locally
```bash
cd "6 - chatbot api v3"
npm install
npm run build
```

### 2. Create the app.js Entry Point
GreenGeeks typically looks for `app.js` as the entry point. The `app.js` file (created below) will load your compiled server.

### 3. Prepare Files for Upload

Create a deployment package with these files/folders:
```
your-deployment-folder/
├── app.js                    (entry point for GreenGeeks)
├── package.json
├── package-lock.json         (optional but recommended)
├── .env                      (your environment variables)
├── dist/                     (entire folder)
│   ├── server.js
│   ├── app.js
│   └── ... (all compiled files)
├── node_modules/             (or install on server)
└── logs/                     (create empty folder)
```

### 4. Upload to GreenGeeks

Upload all files to your GreenGeeks Node.js application directory (usually `public_html/` or a subdirectory).

### 5. Install Dependencies on Server

SSH into your GreenGeeks account and run:
```bash
cd /path/to/your/app
npm install --production
```

Or if you uploaded `node_modules`, verify it's complete.

### 6. Set Environment Variables

**Option A: Using .env file (Recommended)**
1. Copy `env.example` to `.env`
2. Fill in all required values (see below)
3. Upload `.env` to your server
4. Make sure `.env` is in `.gitignore` (don't commit secrets!)

**Option B: Using cPanel Environment Variables**
If GreenGeeks supports setting environment variables in cPanel:
1. Go to cPanel → Node.js App → Environment Variables
2. Add each variable from `env.example`

### 7. Start/Restart the Application

In GreenGeeks cPanel:
1. Go to Node.js App section
2. Select your application
3. Set the entry point to: `app.js`
4. Set Node.js version to: `18.x` or higher (check `package.json` engines)
5. Click "Start" or "Restart"

## Environment Variables Setup

Create a `.env` file based on `env.example` with these values:

### Required Variables:
```env
# Server Configuration
PORT=3000
NODE_ENV=production
HOST=0.0.0.0

# Mistral API Configuration (REQUIRED)
MISTRAL_API_KEY=your_actual_mistral_api_key
MISTRAL_BASE_URL=https://api.mistral.ai/v1

# ChromaDB Configuration (REQUIRED)
CHROMADB_URL=http://127.0.0.1:8000  # or your ChromaDB server URL
CHROMADB_COLLECTION_NAME=calpe_pois

# CORS Configuration
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

### Optional Variables:
```env
# Session Storage
USE_REDIS=false
REDIS_URL=redis://localhost:6379

# Rate Limiting
RATE_LIMIT_WINDOW=3600000
RATE_LIMIT_MAX=100

# Logging
LOG_LEVEL=info

# Performance Settings
SEARCH_MAX_RESULTS=100
ENABLE_SCORING_CACHE=true
SCORING_CACHE_TIMEOUT=300000
ENABLE_PERFORMANCE_LOGGING=true
DEFAULT_SCORING_WEIGHTS={"semanticSimilarity":0.4,"userRating":0.2,"distance":0.2,"freshness":0.1,"popularity":0.1}
```

## Important Notes

### Port Configuration
- GreenGeeks may assign a specific port automatically
- Check your cPanel Node.js settings for the assigned port
- Update `PORT` in `.env` if needed, or let the app use the port from environment

### ChromaDB
- If ChromaDB is running on the same server, use `http://127.0.0.1:8000`
- If ChromaDB is external, use the full URL
- Make sure ChromaDB is accessible from your Node.js app

### Logs Directory
- The app creates logs in the `logs/` directory
- Make sure this directory exists and is writable
- You may need to set permissions: `chmod 755 logs/`

### Security
- **NEVER commit `.env` to version control**
- Use strong API keys
- Set `NODE_ENV=production` in production
- Configure `ALLOWED_ORIGINS` properly for CORS

## Troubleshooting

### App won't start
1. Check Node.js version matches `package.json` engines (>=18.0.0)
2. Verify `app.js` exists and is in the root directory
3. Check logs in cPanel or `logs/` directory
4. Verify all environment variables are set

### Dependencies missing
1. Run `npm install --production` on the server
2. Check `package.json` is uploaded correctly
3. Verify `node_modules/` is complete

### Port errors
1. Check what port GreenGeeks assigned
2. Update `.env` PORT variable
3. Some hosts use `process.env.PORT` automatically

### ChromaDB connection issues
1. Verify ChromaDB is running
2. Check `CHROMADB_URL` is correct
3. Test connection from server: `curl http://127.0.0.1:8000/api/v1/heartbeat`

## Testing After Deployment

1. **Health Check:**
   ```bash
   curl https://yourdomain.com/api/health
   ```

2. **Root Endpoint:**
   ```bash
   curl https://yourdomain.com/
   ```

3. **Search Endpoint:**
   ```bash
   curl -X POST https://yourdomain.com/api/search \
     -H "Content-Type: application/json" \
     -d '{"query": "restaurants", "sessionId": "test123"}'
   ```

## File Structure on Server

After deployment, your server should have:
```
/
├── app.js
├── package.json
├── .env
├── dist/
│   ├── server.js
│   ├── app.js
│   └── ... (all compiled files)
├── node_modules/
└── logs/
    └── (log files will be created here)
```

