/**
 * audit-flow-runtime-coverage.cjs
 * Verifies runtime trace coverage for all registered flows
 * Checks Tempo (OTel traces) + MongoDB audit_logs
 *
 * Run: node scripts/audit-flow-runtime-coverage.cjs [--since=7d]
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const { MongoClient } = require('mongodb');

const REGISTRY_PATH = path.join(__dirname, 'flow-registry.json');
const sinceArg = process.argv.find(a => a.startsWith('--since='));
const sinceDays = sinceArg ? parseInt(sinceArg.split('=')[1]) : 7;
const sinceDate = new Date(Date.now() - sinceDays * 24 * 3600 * 1000);

function tempoQuery(flowId) {
  return new Promise((resolve) => {
    const q = encodeURIComponent(`{span.flow.id = "${flowId}"}`);
    const url = `http://localhost:3200/api/search?q=${q}&limit=1`;
    http.get(url, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve(JSON.parse(d).traces?.length || 0); }
        catch { resolve(0); }
      });
    }).on('error', () => resolve(0));
  });
}

async function main() {
  if (!fs.existsSync(REGISTRY_PATH)) {
    console.error('ERROR: flow-registry.json not found. Run build-flow-registry.cjs first.');
    process.exit(1);
  }
  const reg = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));

  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db();

  console.log('=== RUNTIME COVERAGE AUDIT ===');
  console.log(`Since: ${sinceDate.toISOString()} (${sinceDays}d)`);
  console.log(`Flows in registry: ${reg.flows.length}`);
  console.log('');

  const implemented = reg.flows.filter(f => f.status === 'implemented');
  const specOnly = reg.flows.filter(f => f.status === 'spec-only');

  // 1. Batch: get all distinct flow_ids from audit_logs in period
  const auditFlowIds = await db.collection('audit_logs').distinct(
    'metadata.flow_id',
    { createdAt: { $gte: sinceDate } }
  );
  const auditSet = new Set(auditFlowIds);
  console.log(`Distinct flow_ids in audit_logs (${sinceDays}d): ${auditFlowIds.length}`);

  // 2. Tempo queries for implemented flows (parallel batches of 10)
  const tempoResults = {};
  for (let i = 0; i < implemented.length; i += 10) {
    const batch = implemented.slice(i, i + 10);
    const results = await Promise.all(batch.map(f => tempoQuery(f.id)));
    batch.forEach((f, j) => { tempoResults[f.id] = results[j]; });
  }

  // 3. Classify results
  let verified = 0;
  let tempoHits = 0;
  let auditHits = 0;
  const unverifiedList = [];
  const details = [];

  for (const f of implemented) {
    const hasTempo = (tempoResults[f.id] || 0) > 0;
    const hasAudit = auditSet.has(f.id);
    if (hasTempo) tempoHits++;
    if (hasAudit) auditHits++;
    const ok = hasTempo || hasAudit;
    if (ok) verified++;
    else unverifiedList.push(f.id);
    details.push({ id: f.id, tempo: hasTempo, audit: hasAudit, verified: ok });
  }

  // 4. Output
  console.log('');
  console.log('=== IMPLEMENTED FLOWS ===');
  console.log(`Total: ${implemented.length}`);
  console.log(`With Tempo trace: ${tempoHits}/${implemented.length}`);
  console.log(`With audit_log: ${auditHits}/${implemented.length}`);
  console.log(`Runtime verified (Tempo OR audit): ${verified}/${implemented.length}`);
  console.log(`Unverified: ${unverifiedList.length}`);

  if (unverifiedList.length > 0) {
    console.log('\n=== UNVERIFIED IMPLEMENTED FLOWS ===');
    unverifiedList.forEach(id => console.log(`  ${id}`));
  }

  console.log(`\n=== SPEC-ONLY FLOWS (${specOnly.length}, need implementation) ===`);
  specOnly.forEach(f => console.log(`  ${f.id} -> ${f.specFile}`));

  // 5. Write report
  const report = {
    generated: new Date().toISOString(),
    sinceDays,
    sinceDate: sinceDate.toISOString(),
    summary: {
      total_flows: reg.flows.length,
      implemented: implemented.length,
      spec_only: specOnly.length,
      tempo_hits: tempoHits,
      audit_hits: auditHits,
      runtime_verified: verified,
      unverified: unverifiedList.length
    },
    unverified: unverifiedList,
    spec_only: specOnly.map(f => f.id),
    details
  };

  const reportDir = path.join(__dirname, '..', 'reports');
  fs.mkdirSync(reportDir, { recursive: true });
  const reportPath = path.join(reportDir, 'runtime-coverage-audit.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log('\nReport:', reportPath);

  await client.close();
}

main().catch(e => { console.error(e); process.exit(1); });
