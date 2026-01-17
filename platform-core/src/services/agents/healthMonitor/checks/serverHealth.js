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
    } catch {
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
      // Works on Linux/Mac, Windows needs different approach
      let usagePercent;

      if (process.platform === 'win32') {
        // Windows: Use wmic
        try {
          const output = execSync('wmic logicaldisk get size,freespace,caption', { encoding: 'utf8' });
          const lines = output.trim().split('\n').slice(1);
          // Parse first drive
          const parts = lines[0].trim().split(/\s+/);
          if (parts.length >= 3) {
            const free = parseInt(parts[1]);
            const total = parseInt(parts[2]);
            usagePercent = Math.round(((total - free) / total) * 100);
          } else {
            usagePercent = 0;
          }
        } catch {
          usagePercent = 0;
        }
      } else {
        // Linux/Mac: Use df
        const output = execSync("df -h / | tail -1 | awk '{print $5}'").toString().trim();
        usagePercent = parseInt(output);
      }

      let status = 'healthy';
      if (usagePercent > 90) {
        status = 'critical';
      } else if (usagePercent > 80) {
        status = 'warning';
      }

      return {
        check: 'disk_space',
        status,
        usagePercent,
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
