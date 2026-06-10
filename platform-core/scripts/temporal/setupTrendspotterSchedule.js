#!/usr/bin/env node
/**
 * Setup Trendspotter Weekly Schedule (one-time / idempotent)
 *
 * Registers a Temporal Schedule that triggers `trendspotterWeeklyWorkflow`
 * every Sunday at 03:45 UTC. Idempotent: if schedule with the same ID exists,
 * it is updated to match current spec.
 *
 * Usage (from platform-core/):
 *   node scripts/temporal/setupTrendspotterSchedule.js [--delete]
 *
 * Environment:
 *   TEMPORAL_NAMESPACE (default: 'hb-production')
 *   TEMPORAL_ADDRESS   (default: 'localhost:7233')
 *
 * Per docs/security/SECURITY.md §4 Patroon A — server-side only, no credentials.
 *
 * @version 1.0.0 — Trendspotter+Reisleider activation cycle (2026-06-10)
 */

import { Client, Connection } from '@temporalio/client';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const SCHEDULE_ID = 'trendspotter-weekly-v1';
const WORKFLOW_TYPE = 'trendspotterWeeklyWorkflow';
const TASK_QUEUE = 'hb-agents';
const NAMESPACE = process.env.TEMPORAL_NAMESPACE || 'hb-production';
const TEMPORAL_ADDRESS = process.env.TEMPORAL_ADDRESS || 'localhost:7233';

// Sunday 03:45 UTC = 05:45 CEST (summer) / 04:45 CET (winter)
// Off-peak hours for SimpleAnalytics + minimal impact on dashboards
const CRON_EXPRESSION = '45 3 * * 0';

async function main() {
  const isDelete = process.argv.includes('--delete');

  const connection = await Connection.connect({ address: TEMPORAL_ADDRESS });
  const client = new Client({ connection, namespace: NAMESPACE });

  if (isDelete) {
    try {
      const handle = client.schedule.getHandle(SCHEDULE_ID);
      await handle.delete();
      console.log(`[setup-schedule] Deleted ${SCHEDULE_ID}`);
    } catch (err) {
      if (err.name === 'ScheduleNotFoundError') {
        console.log(`[setup-schedule] Schedule ${SCHEDULE_ID} did not exist — no action needed`);
      } else {
        throw err;
      }
    }
    await connection.close();
    return;
  }

  // Check existence; create or update
  let existing = null;
  for await (const s of client.schedule.list()) {
    if (s.scheduleId === SCHEDULE_ID) {
      existing = s;
      break;
    }
  }

  const scheduleSpec = {
    cronExpressions: [CRON_EXPRESSION],
    timezoneName: 'Etc/UTC',
  };
  const action = {
    type: 'startWorkflow',
    workflowType: WORKFLOW_TYPE,
    args: [{ triggeredBy: 'temporal-schedule', scheduleId: SCHEDULE_ID }],
    taskQueue: TASK_QUEUE,
  };

  if (existing) {
    const handle = client.schedule.getHandle(SCHEDULE_ID);
    await handle.update(prev => ({ ...prev, spec: scheduleSpec, action }));
    console.log(`[setup-schedule] Updated ${SCHEDULE_ID} (cron='${CRON_EXPRESSION}')`);
  } else {
    await client.schedule.create({
      scheduleId: SCHEDULE_ID,
      spec: scheduleSpec,
      action,
      policies: { overlap: 'SKIP' },
      memo: { purpose: 'Weekly content-trending scan across SA-mapped destinations', version: '1.0.0' },
    });
    console.log(`[setup-schedule] Created ${SCHEDULE_ID} (cron='${CRON_EXPRESSION}')`);
  }

  await connection.close();
}

main().catch(err => {
  console.error('[setup-schedule] FATAL:', err);
  process.exit(1);
});
