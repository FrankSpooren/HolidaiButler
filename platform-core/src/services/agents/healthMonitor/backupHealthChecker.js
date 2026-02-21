/**
 * Backup Health Checker
 *
 * Verantwoordelijkheid: Verificatie dat backups draaien en integer zijn
 * Oorsprong: Disaster Recovery Agent (IMPLEMENTATIEPLAN A.8 — niet geimplementeerd)
 * Geintegreerd in: De Dokter (Agent #3, Health Monitor)
 *
 * @module healthMonitor/backupHealthChecker
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import mongoose from 'mongoose';
import { logAgent, logError } from '../../orchestrator/auditTrail/index.js';

const BACKUP_DIR = '/root/backups';
const IMAGES_DIR = '/var/www/api.holidaibutler.com/storage/poi-images';

// MongoDB schema for backup health checks
const backupHealthCheckSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  mysql: { type: mongoose.Schema.Types.Mixed },
  mongodb: { type: mongoose.Schema.Types.Mixed },
  disk: { type: mongoose.Schema.Types.Mixed },
  overall: { type: String, enum: ['HEALTHY', 'WARNING', 'CRITICAL'] }
}, { collection: 'backup_health_checks' });

let BackupHealthCheck;
try {
  BackupHealthCheck = mongoose.model('BackupHealthCheck');
} catch {
  BackupHealthCheck = mongoose.model('BackupHealthCheck', backupHealthCheckSchema);
}

class BackupHealthChecker {
  /**
   * Check backup recency and file integrity
   * @returns {Promise<Object>} Backup recency report
   */
  async checkBackupRecency() {
    console.log('[De Dokter] Checking backup recency...');

    const result = {
      mysql: { status: 'CRITICAL', error: 'Not checked' },
      mongodb: { status: 'CRITICAL', error: 'Not checked' },
      overall: 'CRITICAL'
    };

    try {
      // Check if backup directory exists
      if (!fs.existsSync(BACKUP_DIR)) {
        result.mysql = { status: 'CRITICAL', error: `Backup directory not found: ${BACKUP_DIR}` };
        result.mongodb = { status: 'CRITICAL', error: `Backup directory not found: ${BACKUP_DIR}` };
        console.error(`[De Dokter] Backup directory not found: ${BACKUP_DIR}`);
        return result;
      }

      const files = fs.readdirSync(BACKUP_DIR);

      // Check MySQL backups (db_*.sql.gz, mysql*.sql, *_backup_*.sql, any .sql/.sql.gz)
      result.mysql = this._checkBackupType(files, /\.(sql|sql\.gz)$/i, 'MySQL');

      // Check MongoDB backups — skip if Atlas cloud-managed
      const mongoUri = process.env.MONGODB_URI || '';
      if (mongoUri.includes('mongodb+srv') || mongoUri.includes('mongodb.net')) {
        result.mongodb = { status: 'HEALTHY', note: 'Atlas Cloud Managed — automated backups by MongoDB Atlas' };
      } else {
        result.mongodb = this._checkBackupType(files, /^mongo.*\.(gz|tar\.gz|archive)$/i, 'MongoDB');
      }

      // Determine overall status
      if (result.mysql.status === 'CRITICAL' || result.mongodb.status === 'CRITICAL') {
        result.overall = 'CRITICAL';
      } else if (result.mysql.status === 'WARNING' || result.mongodb.status === 'WARNING') {
        result.overall = 'WARNING';
      } else {
        result.overall = 'HEALTHY';
      }

      console.log(`[De Dokter] Backup recency: MySQL=${result.mysql.status}, MongoDB=${result.mongodb.status}, Overall=${result.overall}`);
    } catch (error) {
      console.error('[De Dokter] Backup recency check failed:', error.message);
      result.mysql = { status: 'CRITICAL', error: error.message };
      result.mongodb = { status: 'CRITICAL', error: error.message };
    }

    return result;
  }

  /**
   * Check a specific backup type
   * @private
   */
  _checkBackupType(files, pattern, typeName) {
    const matchingFiles = files.filter(f => pattern.test(f));

    if (matchingFiles.length === 0) {
      return {
        status: 'CRITICAL',
        error: `No ${typeName} backup files found`,
        lastBackup: null,
        age_hours: null,
        size_mb: null
      };
    }

    // Find most recent file by mtime
    let newestFile = null;
    let newestMtime = 0;

    for (const file of matchingFiles) {
      try {
        const filePath = path.join(BACKUP_DIR, file);
        const stat = fs.statSync(filePath);
        if (stat.mtimeMs > newestMtime) {
          newestMtime = stat.mtimeMs;
          newestFile = { name: file, stat };
        }
      } catch {
        // Skip files we can't stat
      }
    }

    if (!newestFile) {
      return {
        status: 'CRITICAL',
        error: `Cannot read ${typeName} backup files`,
        lastBackup: null,
        age_hours: null,
        size_mb: null
      };
    }

    const ageHours = Math.round((Date.now() - newestFile.stat.mtimeMs) / (1000 * 60 * 60));
    const sizeMb = Math.round(newestFile.stat.size / (1024 * 1024) * 10) / 10;

    let status = 'HEALTHY';
    if (sizeMb < 0.001) {
      status = 'CRITICAL'; // Less than 1 KB = probably empty/corrupt
    } else if (ageHours > 48) {
      status = 'CRITICAL';
    } else if (ageHours > 25) {
      status = 'WARNING';
    }

    return {
      status,
      lastBackup: newestFile.stat.mtime.toISOString(),
      age_hours: ageHours,
      size_mb: sizeMb,
      file: newestFile.name
    };
  }

  /**
   * Check disk space usage
   * @returns {Promise<Object>} Disk space report
   */
  async checkDiskSpace() {
    console.log('[De Dokter] Checking disk space...');

    const result = {
      root_pct: 0,
      root_status: 'HEALTHY',
      backup_dir_mb: 0,
      images_dir_mb: 0
    };

    try {
      // Root filesystem usage
      const dfOutput = execSync('df -h / | tail -1', { encoding: 'utf8', timeout: 10000 });
      const pctMatch = dfOutput.match(/(\d+)%/);
      if (pctMatch) {
        result.root_pct = parseInt(pctMatch[1], 10);
        if (result.root_pct > 90) {
          result.root_status = 'CRITICAL';
        } else if (result.root_pct > 80) {
          result.root_status = 'WARNING';
        }
      }
    } catch (error) {
      console.error('[De Dokter] df command failed:', error.message);
      result.root_status = 'CRITICAL';
      result.root_pct = -1;
    }

    try {
      // Backup directory size
      const backupSize = execSync(`du -sm ${BACKUP_DIR} 2>/dev/null || echo "0 none"`, { encoding: 'utf8', timeout: 30000 });
      const backupMatch = backupSize.match(/^(\d+)/);
      if (backupMatch) {
        result.backup_dir_mb = parseInt(backupMatch[1], 10);
      }
    } catch {
      result.backup_dir_mb = -1;
    }

    try {
      // Images directory size
      const imagesSize = execSync(`du -sm ${IMAGES_DIR} 2>/dev/null || echo "0 none"`, { encoding: 'utf8', timeout: 30000 });
      const imagesMatch = imagesSize.match(/^(\d+)/);
      if (imagesMatch) {
        result.images_dir_mb = parseInt(imagesMatch[1], 10);
      }
    } catch {
      result.images_dir_mb = -1;
    }

    console.log(`[De Dokter] Disk: ${result.root_pct}% used, backups=${result.backup_dir_mb}MB, images=${result.images_dir_mb}MB`);
    return result;
  }

  /**
   * Run full backup health check (recency + disk space)
   * @returns {Promise<Object>} Combined backup health report
   */
  async runBackupHealthCheck() {
    console.log('[De Dokter] Running backup health check...');

    try {
      const recency = await this.checkBackupRecency();
      const disk = await this.checkDiskSpace();

      // Determine combined overall status
      let overall = recency.overall;
      if (disk.root_status === 'CRITICAL') overall = 'CRITICAL';
      else if (disk.root_status === 'WARNING' && overall === 'HEALTHY') overall = 'WARNING';

      const report = {
        timestamp: new Date(),
        mysql: recency.mysql,
        mongodb: recency.mongodb,
        disk,
        overall
      };

      // Persist to MongoDB
      await BackupHealthCheck.create(report);

      await logAgent('health-monitor', 'backup_health_check', {
        description: `Backup health: ${overall} (MySQL=${recency.mysql.status}, MongoDB=${recency.mongodb.status}, Disk=${disk.root_pct}%)`,
        metadata: { overall, mysql: recency.mysql.status, mongodb: recency.mongodb.status, disk_pct: disk.root_pct }
      });

      // Alert if CRITICAL
      if (overall === 'CRITICAL') {
        try {
          const { sendAlert } = await import('../../orchestrator/ownerInterface/index.js');
          const criticalParts = [];
          if (recency.mysql.status === 'CRITICAL') criticalParts.push(`MySQL: ${recency.mysql.error || `${recency.mysql.age_hours}h oud`}`);
          if (recency.mongodb.status === 'CRITICAL') criticalParts.push(`MongoDB: ${recency.mongodb.error || `${recency.mongodb.age_hours}h oud`}`);
          if (disk.root_status === 'CRITICAL') criticalParts.push(`Disk: ${disk.root_pct}% vol`);

          await sendAlert({
            urgency: 4,
            title: 'Backup Health CRITICAL',
            message: criticalParts.join('. ')
          });
        } catch (alertError) {
          console.error('[De Dokter] Failed to send backup alert:', alertError.message);
        }
      }

      console.log(`[De Dokter] Backup health check complete: ${overall}`);
      return report;
    } catch (error) {
      await logError('health-monitor', error, { action: 'backup_health_check' });
      console.error('[De Dokter] Backup health check failed:', error.message);
      return {
        timestamp: new Date(),
        mysql: { status: 'CRITICAL', error: error.message },
        mongodb: { status: 'CRITICAL', error: error.message },
        disk: { root_pct: -1, root_status: 'CRITICAL' },
        overall: 'CRITICAL',
        error: error.message
      };
    }
  }

  /**
   * Get the most recent backup health check
   * @returns {Promise<Object|null>}
   */
  async getLatestCheck() {
    try {
      return await BackupHealthCheck.findOne().sort({ timestamp: -1 }).lean();
    } catch {
      return null;
    }
  }
}

export default new BackupHealthChecker();
