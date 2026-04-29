/**
 * Server Health Check
 * Monitors server connectivity, system resources, and disk space
 *
 * @module healthMonitor/checks/serverHealth
 */

import ping from 'ping';
import os from 'os';
import { execSync } from 'child_process';

class ServerHealthCheck {
  /**
   * Check if server is reachable via ping
   * @param {string} host - Host to ping
   * @returns {Promise<Object>} Ping result
   */
  async checkServerPing(host = 'localhost') {
    try {
      const result = await ping.promise.probe(host, { timeout: 5 });
      return {
        check: 'server_ping',
        status: result.alive ? 'healthy' : 'unhealthy',
        latency: result.time,
        host,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        check: 'server_ping',
        status: 'error',
        error: error.message,
        host,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get available memory on Linux (more accurate than free memory)
   * @returns {number} Available memory in bytes
   */
  getAvailableMemory() {
    try {
      if (process.platform === 'linux') {
        // Read /proc/meminfo for accurate available memory
        const meminfo = execSync('cat /proc/meminfo', { encoding: 'utf8' });
        const availMatch = meminfo.match(/MemAvailable:\s+(\d+)\s+kB/);
        if (availMatch) {
          return parseInt(availMatch[1]) * 1024; // Convert kB to bytes
        }
      }
      // Fallback to os.freemem() for non-Linux or if parsing fails
      return os.freemem();
    } catch (err) {
      return os.freemem();
    }
  }

  /**
   * Check system resources (CPU, memory, uptime)
   * @returns {Promise<Object>} System resources result
   */
  async checkSystemResources() {
    try {
      const cpuUsage = os.loadavg()[0];
      const cores = os.cpus().length;
      const normalizedCpuLoad = cpuUsage / cores; // Normalize by core count

      const totalMem = os.totalmem();
      const availableMem = this.getAvailableMemory();
      const usedMem = totalMem - availableMem;
      const memUsagePercent = (usedMem / totalMem) * 100;

      // Determine status based on thresholds
      // CPU: normalized load > 0.9 = critical, > 0.7 = warning
      // Memory: > 90% = critical, > 85% = warning
      let status = 'healthy';
      if (normalizedCpuLoad > 0.9 || memUsagePercent > 90) {
        status = 'critical';
      } else if (normalizedCpuLoad > 0.7 || memUsagePercent > 85) {
        status = 'warning';
      }

      return {
        check: 'system_resources',
        status,
        metrics: {
          cpu: {
            loadAverage: cpuUsage.toFixed(2),
            normalizedLoad: (normalizedCpuLoad * 100).toFixed(0) + '%',
            cores
          },
          memory: {
            total: Math.round(totalMem / 1024 / 1024 / 1024) + ' GB',
            available: Math.round(availableMem / 1024 / 1024) + ' MB',
            usagePercent: memUsagePercent.toFixed(1) + '%'
          },
          uptime: Math.round(os.uptime() / 3600) + ' hours'
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        check: 'system_resources',
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Check disk space usage
   * @returns {Promise<Object>} Disk space result
   */
  async checkDiskSpace() {
    try {
      const dfOutput = execSync('df -B1 /').toString();
      const lines = dfOutput.trim().split('\n');
      const parts = lines[1].split(/\s+/);

      const total = parseInt(parts[1]);
      const used = parseInt(parts[2]);
      const available = parseInt(parts[3]);
      const usagePct = Math.round((used / total) * 1000) / 10;

      let status = 'healthy';
      let severity = 'healthy';
      if (usagePct > 90) { status = 'critical'; severity = 'critical'; }
      else if (usagePct > 85) { status = 'critical'; severity = 'critical'; }
      else if (usagePct > 80) { status = 'warning'; severity = 'warning'; }
      else if (usagePct > 70) { status = 'warning'; severity = 'warning'; }
      else if (usagePct > 60) { status = 'healthy'; severity = 'info'; }

      return {
        check: 'disk_space',
        status,
        severity,
        usagePercent: usagePct,
        total_gb: Math.round(total / 1e9 * 10) / 10,
        used_gb: Math.round(used / 1e9 * 10) / 10,
        available_gb: Math.round(available / 1e9 * 10) / 10,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        check: 'disk_space',
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Run all server health checks
   * @param {string} host - Host to check
   * @returns {Promise<Array>} All check results
   */
  async runAllChecks(host = '91.98.71.87') {
    const [ping, resources, disk] = await Promise.all([
      this.checkServerPing(host),
      this.checkSystemResources(),
      this.checkDiskSpace()
    ]);

    return [ping, resources, disk];
  }
}

export default new ServerHealthCheck();
