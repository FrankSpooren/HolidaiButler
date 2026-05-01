/**
 * build-flow-registry.js
 * Generates scripts/flow-registry.json from AsyncAPI specs + code flow.id attributes
 * Run: node scripts/build-flow-registry.js
 */
const fs = require('fs');
const path = require('path');

const SPEC_DIR = path.join(__dirname, '..', 'specs', 'asyncapi', 'flows');
const CODE_DIRS = [
  path.join(__dirname, '..', 'src', 'services', 'agents'),
  path.join(__dirname, '..', 'src', 'a2a'),
  path.join(__dirname, '..', 'src', 'temporal')
];

// 1. Parse spec files -> extract short flow ID from title line
const specFiles = fs.readdirSync(SPEC_DIR).filter(f => f.endsWith('.yaml'));
const specs = [];
for (const file of specFiles) {
  const content = fs.readFileSync(path.join(SPEC_DIR, file), 'utf8');
  const titleMatch = content.match(/title:\s*["']?(.+?)["']?\s*$/m);
  const descMatch = content.match(/description:\s*["']?(.+?)["']?\s*$/m);
  const title = titleMatch ? titleMatch[1].trim() : file.replace('.yaml', '');

  // Extract short ID from title: "A2 - redacteur -> seoMeester/validateSEO" -> "A2"
  // or "RES1: anomaliedetective -> maestro/coordinateAnomalyRecovery" -> "RES1"
  const idMatch = title.match(/^([A-Z_]+\d+[a-z]?)/);
  const shortId = idMatch ? idMatch[1] : file.replace('.yaml', '');

  // Extract source -> target from title
  const arrowMatch = title.match(/(\w+)\s*->\s*(\w+)\/(\w+)/);

  specs.push({
    shortId,
    specFile: file,
    title,
    description: descMatch ? descMatch[1].trim() : '',
    source: arrowMatch ? arrowMatch[1] : null,
    target: arrowMatch ? arrowMatch[2] : null,
    skill: arrowMatch ? arrowMatch[3] : null
  });
}

// 2. Scan code for flow.id attributes + registerSkill calls
function scanCodeFlows(dirs) {
  const flows = {};
  function walk(dir) {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const fp = path.join(dir, e.name);
      if (e.isDirectory()) { walk(fp); continue; }
      if (!e.name.endsWith('.js')) continue;
      const content = fs.readFileSync(fp, 'utf8');
      // Find flow.id spans
      const flowMatches = content.matchAll(/'flow\.id':\s*'([^']+)'/g);
      for (const m of flowMatches) {
        const flowId = m[1];
        if (!flows[flowId]) flows[flowId] = { files: [], hasOtelSpan: false, hasAuditLog: false };
        flows[flowId].files.push(fp.replace(path.join(__dirname, '..') + path.sep, ''));
        flows[flowId].hasOtelSpan = true;
      }
      // Check for audit_log with flow_id
      const auditMatches = content.matchAll(/flow_id:\s*'([^']+)'/g);
      for (const m of auditMatches) {
        const flowId = m[1];
        if (!flows[flowId]) flows[flowId] = { files: [], hasOtelSpan: false, hasAuditLog: false };
        flows[flowId].hasAuditLog = true;
      }
    }
  }
  dirs.forEach(d => walk(d));
  return flows;
}

const codeFlows = scanCodeFlows(CODE_DIRS);
const codeFlowIds = new Set(Object.keys(codeFlows));

// 3. Merge: match spec shortId to code flow.id
const registry = [];
const matched = new Set();

for (const spec of specs) {
  const codeFlow = codeFlows[spec.shortId];
  matched.add(spec.shortId);
  registry.push({
    id: spec.shortId,
    specFile: spec.specFile,
    title: spec.title,
    description: spec.description,
    source: spec.source,
    target: spec.target,
    skill: spec.skill,
    hasOtelSpan: codeFlow ? codeFlow.hasOtelSpan : false,
    hasAuditLog: codeFlow ? codeFlow.hasAuditLog : false,
    codeFiles: codeFlow ? [...new Set(codeFlow.files)] : [],
    status: codeFlow ? 'implemented' : 'spec-only'
  });
}

// Add code flows without spec
for (const [id, flow] of Object.entries(codeFlows)) {
  if (!matched.has(id)) {
    registry.push({
      id,
      specFile: null,
      title: id,
      description: '',
      source: null,
      target: null,
      skill: null,
      hasOtelSpan: flow.hasOtelSpan,
      hasAuditLog: flow.hasAuditLog,
      codeFiles: [...new Set(flow.files)],
      status: 'code-only'
    });
  }
}

registry.sort((a, b) => a.id.localeCompare(b.id));

// 4. Summary
const implemented = registry.filter(f => f.status === 'implemented');
const specOnly = registry.filter(f => f.status === 'spec-only');
const codeOnly = registry.filter(f => f.status === 'code-only');
const withOtel = registry.filter(f => f.hasOtelSpan);
const withAudit = registry.filter(f => f.hasAuditLog);

const output = {
  version: '1.0.0',
  generated: new Date().toISOString(),
  summary: {
    totalSpecs: specs.length,
    totalCodeFlows: codeFlowIds.size,
    totalRegistry: registry.length,
    implemented: implemented.length,
    specOnly: specOnly.length,
    codeOnly: codeOnly.length,
    withOtelSpan: withOtel.length,
    withAuditLog: withAudit.length
  },
  flows: registry
};

fs.writeFileSync(path.join(__dirname, 'flow-registry.json'), JSON.stringify(output, null, 2));

console.log('=== Flow Registry Generated ===');
console.log('Total specs:', specs.length);
console.log('Total code flow.id:', codeFlowIds.size);
console.log('Implemented (spec + code):', implemented.length);
console.log('Spec-only (no code):', specOnly.length);
console.log('Code-only (no spec):', codeOnly.length);
console.log('With OTel span:', withOtel.length);
console.log('With audit_log:', withAudit.length);

if (specOnly.length > 0) {
  console.log('\nSpec-only flows (NO code):');
  specOnly.forEach(f => console.log('  ' + f.id + ' -> ' + f.specFile));
}
if (codeOnly.length > 0) {
  console.log('\nCode-only flows (NO spec):');
  codeOnly.forEach(f => console.log('  ' + f.id + ' -> ' + f.codeFiles.join(', ')));
}
