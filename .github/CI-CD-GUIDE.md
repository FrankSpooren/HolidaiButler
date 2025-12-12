# HolidaiButler CI/CD Pipeline Guide

## Overview

This repository uses a **modular CI/CD architecture** where each module has its own deployment pipeline. This allows independent deployment of modules without affecting others.

## Workflow Structure

```
.github/workflows/
├── deploy-customer-portal.yml    # Customer Portal Frontend
├── deploy-admin-module.yml       # Admin Module (Frontend + Backend)
├── deploy-platform-core.yml      # Platform Core API
├── deploy-agenda-module.yml      # Agenda Module
├── manual-deploy.yml             # Manual deployment trigger
└── archived/                     # Old/deprecated workflows
```

## How It Works

### Automatic Deployment

Each workflow triggers **only when its module's files change**:

| Module | Trigger Paths | Deploys To |
|--------|--------------|------------|
| Customer Portal | `customer-portal/**` | test.holidaibutler.com |
| Admin Module | `admin-module/**` | admin.test.holidaibutler.com |
| Platform Core | `platform-core/**` | API on port 3001 |
| Agenda Module | `agenda-module/**`, `modules/agenda-module/**` | API on port 3007 |

### Example: Only Customer Portal Deploys

```bash
# Make changes to customer portal
git add customer-portal/frontend/src/App.tsx
git commit -m "Update customer portal UI"
git push origin main

# Result: ONLY deploy-customer-portal.yml runs
# Admin, Platform Core, etc. are NOT deployed
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
| `DEPLOY_KEY` | SSH private key for server access |

## Deployment Environments

### Test Environment
- **URL**: test.holidaibutler.com
- **Server**: 91.98.71.87
- **Auto-deploy**: On push to `main`

### Production Environment (Future)
- **URL**: holidaibutler.com
- **Requires**: Manual trigger or release tag

## Adding a New Module

1. Create workflow file: `.github/workflows/deploy-<module-name>.yml`
2. Configure trigger paths
3. Add deployment steps
4. Test with manual trigger first

## Rollback

Each deployment creates a backup. To rollback:

```bash
# SSH to server
ssh root@91.98.71.87

# List backups
ls /var/www/backups/<module-name>/

# Restore specific backup
rsync -av --delete /var/www/backups/<module-name>/backup-YYYYMMDD-HHMMSS/ /var/www/<target-path>/

# Restart service if needed
pm2 restart <process-name>
```

## Monitoring

Check deployment status:
- GitHub Actions tab in repository
- PM2 status: `pm2 status` on server
- Logs: `pm2 logs <process-name>`
