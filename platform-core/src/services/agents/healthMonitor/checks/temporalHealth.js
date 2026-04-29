/**
 * Temporal Health Checks for De Dokter
 * Checks Temporal Server, Worker, and Postgres connectivity
 */
import { getClient } from '../../../../temporal/connection.js';
import { execSync } from 'child_process';

export async function checkTemporalHealth() {
  try {
    const client = await getClient();
    const result = await Promise.race([
      client.workflowService.describeNamespace({ namespace: 'hb-production' }),
      new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 5000))
    ]);
    return {
      healthy: true,
      namespace: result.namespaceInfo.name,
      state: result.namespaceInfo.state
    };
  } catch (error) {
    return { healthy: false, error: error.message };
  }
}

export async function checkTemporalPostgresHealth() {
  try {
    execSync('pg_isready -U temporal -d temporal', { stdio: 'pipe', timeout: 5000 });
    return { healthy: true };
  } catch (error) {
    return { healthy: false, error: error.message };
  }
}

export async function checkTemporalWorkerHealth() {
  try {
    const output = execSync('pm2 jlist', { stdio: 'pipe', timeout: 5000 }).toString();
    const processes = JSON.parse(output);
    const worker = processes.find(p => p.name === 'hb-temporal-worker');
    if (!worker) return { healthy: false, error: 'Worker not found in PM2' };
    return {
      healthy: worker.pm2_env.status === 'online',
      status: worker.pm2_env.status,
      uptime: worker.pm2_env.pm_uptime,
      restarts: worker.pm2_env.restart_time
    };
  } catch (error) {
    return { healthy: false, error: error.message };
  }
}
