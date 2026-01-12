# GreenGeeks Deployment Checklist

## Pre-Deployment (Local)

- [ ] Run `npm install` to ensure all dependencies are installed
- [ ] Run `npm run build` to compile TypeScript to JavaScript
- [ ] Verify `dist/` folder contains all compiled files
- [ ] Test locally with `npm start` to ensure everything works
- [ ] Create `.env` file from `env.example` with production values
- [ ] Verify `app.js` exists in root directory (created for GreenGeeks)

## Files to Upload

- [ ] `app.js` (entry point)
- [ ] `package.json`
- [ ] `package-lock.json` (recommended)
- [ ] `.env` (with production values - **DO NOT commit to git!**)
- [ ] `dist/` folder (entire folder with all contents)
- [ ] `node_modules/` folder (OR install on server)
- [ ] `logs/` folder (create empty folder if it doesn't exist)

## Server Setup

- [ ] Upload all files to GreenGeeks Node.js app directory
- [ ] SSH into server and navigate to app directory
- [ ] Run `npm install --production` (if you didn't upload node_modules)
- [ ] Verify Node.js version: `node --version` (should be >= 18.0.0)
- [ ] Create `logs/` directory if it doesn't exist: `mkdir -p logs`
- [ ] Set logs directory permissions: `chmod 755 logs`

## Environment Variables

- [ ] Set `PORT` (check GreenGeeks assigned port)
- [ ] Set `NODE_ENV=production`
- [ ] Set `MISTRAL_API_KEY` (your actual API key)
- [ ] Set `CHROMADB_URL` (local or external ChromaDB URL)
- [ ] Set `CHROMADB_COLLECTION_NAME=calpe_pois`
- [ ] Set `ALLOWED_ORIGINS` (your domain URLs, comma-separated)
- [ ] Set other optional variables as needed

## GreenGeeks cPanel Configuration

- [ ] Go to Node.js App section in cPanel
- [ ] Set entry point to: `app.js`
- [ ] Set Node.js version to: `18.x` or higher
- [ ] Verify port assignment (if shown)
- [ ] Click "Start" or "Restart" application

## Post-Deployment Testing

- [ ] Test health endpoint: `curl https://yourdomain.com/api/health`
- [ ] Test root endpoint: `curl https://yourdomain.com/`
- [ ] Test search endpoint with a sample query
- [ ] Check logs in `logs/` directory for errors
- [ ] Verify ChromaDB connection is working
- [ ] Test CORS if accessing from a frontend

## Troubleshooting

If something doesn't work:

1. **Check logs:**
   - Server logs in GreenGeeks cPanel
   - Application logs in `logs/` directory

2. **Verify file structure:**
   ```bash
   ls -la
   # Should see: app.js, package.json, .env, dist/, node_modules/, logs/
   ```

3. **Check environment variables:**
   ```bash
   node -e "require('dotenv').config(); console.log(process.env.MISTRAL_API_KEY ? 'API key set' : 'API key missing')"
   ```

4. **Test server manually:**
   ```bash
   node app.js
   # Should start without errors
   ```

5. **Verify dependencies:**
   ```bash
   npm list --depth=0
   # Should show all required packages
   ```

## Security Reminders

- [ ] `.env` file is NOT in version control
- [ ] `.env` has correct file permissions (not world-readable)
- [ ] API keys are production keys (not test keys)
- [ ] `NODE_ENV=production` is set
- [ ] `ALLOWED_ORIGINS` only includes your actual domains
- [ ] Logs directory is not publicly accessible

