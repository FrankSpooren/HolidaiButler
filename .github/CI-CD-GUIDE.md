# HolidaiButler CI/CD Pipeline Guide

## Overview

This repository uses a **modular CI/CD architecture** where each module has its own deployment pipeline. This allows independent deployment of modules without affecting others.

## Workflow Structure

```
.github/workflows/
├── deploy-customer-portal.yml      # Customer Portal Frontend
├── deploy-admin-module.yml         # Admin Module (Frontend + Backend)
├── deploy-platform-core.yml        # Platform Core API
├── deploy-agenda-module.yml        # Agenda Module
├── deploy-ticketing-module.yml     # Ticketing Module (Frontend + Backend)
├── deploy-reservations-module.yml  # Reservations Module (Backend + Widget)
├── deploy-payment-module.yml       # Payment Module (Backend - Adyen)
├── manual-deploy.yml               # Manual deployment trigger
└── archived/                       # Old/deprecated workflows
```

## Module Port Assignments

| Module | Port | Description |
|--------|------|-------------|
| Platform Core | 3001 | Main API, POIs, Auth |
| Admin Module | 3003 | Admin dashboard API |
| Ticketing | 3004 | Ticket bookings |
| Payment | 3005 | Adyen payment processing |
| Reservations | 3006 | Restaurant reservations |
| Agenda | 3007 | Events & calendar |

## How It Works

### Automatic Deployment

Each workflow triggers **only when its module's files change**:

| Module | Trigger Paths | Deploys To |
|--------|--------------|------------|
| Customer Portal | `customer-portal/**` | test.holidaibutler.com |
| Admin Module | `admin-module/**` | admin.test.holidaibutler.com |
| Platform Core | `platform-core/**` | API port 3001 |
| Agenda Module | `agenda-module/**`, `modules/agenda-module/**` | API port 3007 |
| Ticketing | `ticketing-module/**`, `modules/ticketing-module/**` | API port 3004 |
| Reservations | `reservations-module/**`, `modules/reservations-module/**` | API port 3006 |
| Payment | `payment-module/**`, `modules/payment-module/**` | API port 3005 |

### Example: Independent Deployments

```bash
# Scenario 1: Only Customer Portal changes
git add customer-portal/frontend/src/App.tsx
git commit -m "Update customer portal UI"
git push origin main
# Result: ONLY deploy-customer-portal.yml runs

# Scenario 2: Only Payment Module changes
git add payment-module/backend/services/AdyenService.js
git commit -m "Update Adyen webhook handler"
git push origin main
# Result: ONLY deploy-payment-module.yml runs

# Scenario 3: Multiple modules change
git add customer-portal/ admin-module/
git commit -m "Update both portals"
git push origin main
# Result: BOTH deploy-customer-portal.yml AND deploy-admin-module.yml run
```

### Manual Deployment

Use the **Manual Deploy** workflow from GitHub Actions UI to:
- Deploy any module to any environment
- Deploy from a specific branch
- Trigger deployment without code changes

## Required GitHub Secrets

Configure these in Repository Settings → Secrets:

| Secret | Description |
|--------|-------------|
| `DEPLOY_KEY` | SSH private key for server access (Ed25519) |

### Setting up DEPLOY_KEY

```bash
# On your local machine, generate a key
ssh-keygen -t ed25519 -C "github-actions-deploy" -f deploy_key

# Add public key to server
ssh root@91.98.71.87 "cat >> ~/.ssh/authorized_keys" < deploy_key.pub

# Add private key content to GitHub Secrets as DEPLOY_KEY
cat deploy_key
```

## Deployment Environments

### Test Environment
- **Frontend URL**: test.holidaibutler.com
- **Admin URL**: admin.test.holidaibutler.com
- **API Base**: test.holidaibutler.com/api/v1
- **Server**: 91.98.71.87
- **Auto-deploy**: On push to `main`

### Production Environment (Future)
- **URL**: holidaibutler.com
- **Requires**: Manual trigger or release tag
- **Additional approval**: Required for payment-module

## PM2 Process Management

All backend services run under PM2:

```bash
# SSH to server
ssh root@91.98.71.87

# View all processes
pm2 status

# View logs
pm2 logs holidaibutler-api          # Platform Core
pm2 logs holidaibutler-admin-api    # Admin Module
pm2 logs holidaibutler-ticketing    # Ticketing
pm2 logs holidaibutler-payment      # Payment
pm2 logs holidaibutler-reservations # Reservations
pm2 logs holidaibutler-agenda       # Agenda

# Restart specific service
pm2 restart holidaibutler-api
```

## Rollback Procedure

Each deployment creates automatic backups:

```bash
# SSH to server
ssh root@91.98.71.87

# List backups for a module
ls -la /var/www/backups/customer-portal/
ls -la /var/www/backups/platform-core/
ls -la /var/www/backups/payment-module/

# Restore specific backup
BACKUP_NAME="backup-20251212-143000"
rsync -av --delete /var/www/backups/customer-portal/$BACKUP_NAME/ /var/www/test.holidaibutler.com/

# For backend modules, also restart PM2
pm2 restart holidaibutler-api
```

## Adding a New Module

1. Create workflow file: `.github/workflows/deploy-<module-name>.yml`
2. Define trigger paths in `on.push.paths`
3. Configure deployment steps (build, deploy, restart)
4. Add to manual-deploy.yml options
5. Update this documentation
6. Test with manual trigger first

## Troubleshooting

### Workflow not triggering
- Check that file paths match the `paths` filter
- Ensure you're pushing to the correct branch (`main`)
- Check GitHub Actions tab for workflow runs

### Deployment fails
- Check SSH key is correctly set in secrets
- Verify server is accessible
- Check PM2 logs for application errors

### Health check fails
- Service may still be starting (increase sleep time)
- Check application logs
- Verify environment variables are set
