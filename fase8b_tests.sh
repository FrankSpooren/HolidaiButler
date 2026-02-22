#!/bin/bash
cd /var/www/api.holidaibutler.com/platform-core
echo "=== FASE 8B TEST SUITE (Re-run) ==="
echo ""
PASS=0
FAIL=0
TOTAL=0

sleep 3

# T1: BaseAgent.js exists + exports class
TOTAL=$((TOTAL+1))
T1_OUT=$(node --input-type=module -e '
  import BaseAgent from "./src/services/agents/base/BaseAgent.js";
  const b = new BaseAgent({name:"Test",category:"Test",version:"1.0.0"});
  if (b.name === "Test" && typeof b.run === "function") { console.log("OK"); process.exit(0); }
  else { process.exit(1); }
' 2>/dev/null)
if echo "$T1_OUT" | grep -q "OK"; then
  echo "T1: BaseAgent class instantiation — PASS"
  PASS=$((PASS+1))
else
  echo "T1: BaseAgent class instantiation — FAIL"
  FAIL=$((FAIL+1))
fi

# T2: destinationRunner.js exports wrapWithDestinationAwareness
TOTAL=$((TOTAL+1))
T2_OUT=$(node --input-type=module -e '
  import { wrapWithDestinationAwareness } from "./src/services/agents/base/destinationRunner.js";
  if (typeof wrapWithDestinationAwareness === "function") { console.log("OK"); process.exit(0); }
  else { process.exit(1); }
' 2>/dev/null)
if echo "$T2_OUT" | grep -q "OK"; then
  echo "T2: destinationRunner exports — PASS"
  PASS=$((PASS+1))
else
  echo "T2: destinationRunner exports — FAIL"
  FAIL=$((FAIL+1))
fi

# T3: agentRegistry.js exports all functions + 18 agents
TOTAL=$((TOTAL+1))
T3_OUT=$(node --input-type=module -e '
  import { getAllAgents, getAgent, getDestinationAwareAgents, getSharedAgents } from "./src/services/agents/base/agentRegistry.js";
  const all = getAllAgents();
  const keys = Object.keys(all);
  const destAware = getDestinationAwareAgents();
  const shared = getSharedAgents();
  console.log(JSON.stringify({total: keys.length, destAware: Object.keys(destAware).length, shared: Object.keys(shared).length}));
' 2>/dev/null)
T3_TOTAL=$(echo "$T3_OUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['total'])" 2>/dev/null || echo "0")
T3_DA=$(echo "$T3_OUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['destAware'])" 2>/dev/null || echo "0")
T3_SH=$(echo "$T3_OUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['shared'])" 2>/dev/null || echo "0")
if [ "$T3_TOTAL" -ge 18 ] && [ "$T3_DA" -ge 11 ] && [ "$T3_SH" -ge 4 ]; then
  echo "T3: agentRegistry: $T3_TOTAL agents ($T3_DA dest-aware, $T3_SH shared) — PASS"
  PASS=$((PASS+1))
else
  echo "T3: agentRegistry: $T3_TOTAL agents ($T3_DA dest-aware, $T3_SH shared) — FAIL (expected >=18, >=11, >=4)"
  FAIL=$((FAIL+1))
fi

# T4: Destination config mapping (the bug fix test)
TOTAL=$((TOTAL+1))
T4_OUT=$(node --input-type=module -e '
  import { wrapWithDestinationAwareness } from "./src/services/agents/base/destinationRunner.js";
  const mock = {
    runForDestination: async (id) => {
      if (id === 999) throw new Error("test error");
      return { ok: true, id };
    }
  };
  wrapWithDestinationAwareness(mock, { name: "TestAgent", category: "Test", destinationAware: true });
  const result = await mock.run("all");
  const ids = result.per_destination.map(d => d.destinationId);
  if (ids.includes(1) && ids.includes(2) && ids.length === 2) {
    console.log("PASS:" + JSON.stringify(ids));
  } else {
    console.log("FAIL:" + JSON.stringify(ids) + " result:" + JSON.stringify(result));
  }
' 2>/dev/null)
if echo "$T4_OUT" | grep -q "^PASS:"; then
  echo "T4: Destination config mapping (all) — PASS"
  PASS=$((PASS+1))
else
  echo "T4: Destination config mapping — FAIL: $T4_OUT"
  FAIL=$((FAIL+1))
fi

# T5: Single destination (Calpe=1)
TOTAL=$((TOTAL+1))
T5_OUT=$(node --input-type=module -e '
  import { wrapWithDestinationAwareness } from "./src/services/agents/base/destinationRunner.js";
  const mock = { runForDestination: async (id) => ({ ok: true, id }) };
  wrapWithDestinationAwareness(mock, { name: "T5", category: "Test", destinationAware: true });
  const result = await mock.run(1);
  const ids = result.per_destination.map(d => d.destinationId);
  if (ids.length === 1 && ids[0] === 1) console.log("PASS");
  else console.log("FAIL:" + JSON.stringify(result));
' 2>/dev/null)
if echo "$T5_OUT" | grep -q "^PASS"; then
  echo "T5: Single destination (Calpe=1) — PASS"
  PASS=$((PASS+1))
else
  echo "T5: Single destination (Calpe=1) — FAIL: $T5_OUT"
  FAIL=$((FAIL+1))
fi

# T6: Single destination (Texel=2)
TOTAL=$((TOTAL+1))
T6_OUT=$(node --input-type=module -e '
  import { wrapWithDestinationAwareness } from "./src/services/agents/base/destinationRunner.js";
  const mock = { runForDestination: async (id) => ({ ok: true, id }) };
  wrapWithDestinationAwareness(mock, { name: "T6", category: "Test", destinationAware: true });
  const result = await mock.run(2);
  const ids = result.per_destination.map(d => d.destinationId);
  if (ids.length === 1 && ids[0] === 2) console.log("PASS");
  else console.log("FAIL:" + JSON.stringify(result));
' 2>/dev/null)
if echo "$T6_OUT" | grep -q "^PASS"; then
  echo "T6: Single destination (Texel=2) — PASS"
  PASS=$((PASS+1))
else
  echo "T6: Single destination (Texel=2) — FAIL: $T6_OUT"
  FAIL=$((FAIL+1))
fi

# T7: Shared agent (destinationAware: false) calls execute()
TOTAL=$((TOTAL+1))
T7_OUT=$(node --input-type=module -e '
  import { wrapWithDestinationAwareness } from "./src/services/agents/base/destinationRunner.js";
  const mock = { execute: async () => ({ executed: true }) };
  wrapWithDestinationAwareness(mock, { name: "T7", category: "Test", destinationAware: false });
  const result = await mock.run();
  if (result.destinationAware === false && result.executed === true) console.log("PASS");
  else console.log("FAIL:" + JSON.stringify(result));
' 2>/dev/null)
if echo "$T7_OUT" | grep -q "^PASS"; then
  echo "T7: Shared agent execute() — PASS"
  PASS=$((PASS+1))
else
  echo "T7: Shared agent execute() — FAIL: $T7_OUT"
  FAIL=$((FAIL+1))
fi

# T8: Error in one destination does not crash others
TOTAL=$((TOTAL+1))
T8_OUT=$(node --input-type=module -e '
  import { wrapWithDestinationAwareness } from "./src/services/agents/base/destinationRunner.js";
  const mock = {
    runForDestination: async (id) => {
      if (id === 1) throw new Error("Calpe error");
      return { ok: true, id };
    }
  };
  wrapWithDestinationAwareness(mock, { name: "T8", category: "Test", destinationAware: true });
  const result = await mock.run("all");
  const calpe = result.per_destination.find(d => d.destinationId === 1);
  const texel = result.per_destination.find(d => d.destinationId === 2);
  if (!calpe.success && texel.success && result.destinations_failed === 1) console.log("PASS");
  else console.log("FAIL:" + JSON.stringify(result));
' 2>/dev/null)
if echo "$T8_OUT" | grep -q "^PASS"; then
  echo "T8: One destination fails, other succeeds — PASS"
  PASS=$((PASS+1))
else
  echo "T8: One destination fails, other succeeds — FAIL: $T8_OUT"
  FAIL=$((FAIL+1))
fi

# T9: _baseAgentConfig present on wrapped agents
TOTAL=$((TOTAL+1))
T9_OUT=$(node --input-type=module -e '
  import { wrapWithDestinationAwareness } from "./src/services/agents/base/destinationRunner.js";
  const mock = {};
  wrapWithDestinationAwareness(mock, { name: "T9Agent", category: "Strategy", version: "2.0.0", destinationAware: true });
  if (mock._baseAgentConfig && mock._baseAgentConfig.name === "T9Agent" && mock._baseAgentConfig.category === "Strategy" && mock._baseAgentConfig.version === "2.0.0") console.log("PASS");
  else console.log("FAIL:" + JSON.stringify(mock._baseAgentConfig));
' 2>/dev/null)
if echo "$T9_OUT" | grep -q "^PASS"; then
  echo "T9: _baseAgentConfig metadata — PASS"
  PASS=$((PASS+1))
else
  echo "T9: _baseAgentConfig metadata — FAIL: $T9_OUT"
  FAIL=$((FAIL+1))
fi

# T10: wrapResult includes timing info
TOTAL=$((TOTAL+1))
T10_OUT=$(node --input-type=module -e '
  import { wrapWithDestinationAwareness } from "./src/services/agents/base/destinationRunner.js";
  const mock = { execute: async () => { await new Promise(r => setTimeout(r, 50)); return {}; } };
  wrapWithDestinationAwareness(mock, { name: "T10", category: "Test", destinationAware: false });
  const result = await mock.run();
  if (result.duration_ms >= 40 && result.timestamp && result.agent === "T10") console.log("PASS");
  else console.log("FAIL:" + JSON.stringify({d:result.duration_ms,t:result.timestamp,a:result.agent}));
' 2>/dev/null)
if echo "$T10_OUT" | grep -q "^PASS"; then
  echo "T10: wrapResult timing + metadata — PASS"
  PASS=$((PASS+1))
else
  echo "T10: wrapResult timing — FAIL: $T10_OUT"
  FAIL=$((FAIL+1))
fi

# T11: Threema check in smokeTestRunner
TOTAL=$((TOTAL+1))
T11_OUT=$(node --input-type=module -e '
  import smokeTestRunner from "./src/services/agents/healthMonitor/smokeTestRunner.js";
  if (typeof smokeTestRunner.checkThreemaConfiguration === "function") console.log("PASS");
  else console.log("FAIL");
' 2>/dev/null)
if echo "$T11_OUT" | grep -q "^PASS"; then
  echo "T11: smokeTestRunner has checkThreemaConfiguration — PASS"
  PASS=$((PASS+1))
else
  echo "T11: smokeTestRunner.checkThreemaConfiguration — FAIL"
  FAIL=$((FAIL+1))
fi

# T12: Threema check returns valid status
TOTAL=$((TOTAL+1))
T12_OUT=$(node --input-type=module -e '
  import smokeTestRunner from "./src/services/agents/healthMonitor/smokeTestRunner.js";
  const result = await smokeTestRunner.checkThreemaConfiguration();
  if (result.status === "NOT_CONFIGURED" || result.status === "CONFIGURED") console.log("PASS:" + result.status);
  else console.log("FAIL:" + JSON.stringify(result));
' 2>/dev/null)
if echo "$T12_OUT" | grep -q "^PASS:"; then
  STATUS=$(echo "$T12_OUT" | grep "^PASS:" | cut -d: -f2)
  echo "T12: Threema check status — PASS ($STATUS)"
  PASS=$((PASS+1))
else
  echo "T12: Threema check — FAIL: $T12_OUT"
  FAIL=$((FAIL+1))
fi

# T13: dailyBriefing has threema_status field
TOTAL=$((TOTAL+1))
if grep -q "threema_status" /var/www/api.holidaibutler.com/platform-core/src/services/orchestrator/ownerInterface/dailyBriefing.js; then
  echo "T13: dailyBriefing has threema_status field — PASS"
  PASS=$((PASS+1))
else
  echo "T13: dailyBriefing threema_status — FAIL"
  FAIL=$((FAIL+1))
fi

# T14: dailyBriefing has alert_items field
TOTAL=$((TOTAL+1))
if grep -q "alert_items" /var/www/api.holidaibutler.com/platform-core/src/services/orchestrator/ownerInterface/dailyBriefing.js; then
  echo "T14: dailyBriefing has alert_items field — PASS"
  PASS=$((PASS+1))
else
  echo "T14: dailyBriefing alert_items — FAIL"
  FAIL=$((FAIL+1))
fi

# T15: All registered agents have run()
TOTAL=$((TOTAL+1))
T15_OUT=$(node --input-type=module -e '
  import { getAllAgents } from "./src/services/agents/base/agentRegistry.js";
  const all = getAllAgents();
  let missing = [];
  for (const [k, agent] of Object.entries(all)) {
    if (typeof agent.run !== "function") missing.push(k);
  }
  if (missing.length === 0) console.log("PASS");
  else console.log("FAIL:" + missing.join(","));
' 2>/dev/null)
if echo "$T15_OUT" | grep -q "^PASS"; then
  echo "T15: All registered agents have run() — PASS"
  PASS=$((PASS+1))
else
  echo "T15: Agents missing run() — FAIL: $T15_OUT"
  FAIL=$((FAIL+1))
fi

# T16: Category A agents have runForDestination()
TOTAL=$((TOTAL+1))
T16_OUT=$(node --input-type=module -e '
  import { getDestinationAwareAgents } from "./src/services/agents/base/agentRegistry.js";
  const agents = getDestinationAwareAgents();
  let missing = [];
  for (const [k, agent] of Object.entries(agents)) {
    if (typeof agent.runForDestination !== "function") missing.push(k);
  }
  if (missing.length === 0) console.log("PASS:" + Object.keys(agents).length);
  else console.log("FAIL:" + missing.join(","));
' 2>/dev/null)
if echo "$T16_OUT" | grep -q "^PASS:"; then
  COUNT=$(echo "$T16_OUT" | grep "^PASS:" | cut -d: -f2)
  echo "T16: All dest-aware agents have runForDestination() — PASS ($COUNT agents)"
  PASS=$((PASS+1))
else
  echo "T16: Missing runForDestination — FAIL: $T16_OUT"
  FAIL=$((FAIL+1))
fi

# T17: Category B agents have execute()
TOTAL=$((TOTAL+1))
T17_OUT=$(node --input-type=module -e '
  import { getSharedAgents } from "./src/services/agents/base/agentRegistry.js";
  const agents = getSharedAgents();
  let missing = [];
  for (const [k, agent] of Object.entries(agents)) {
    if (typeof agent.execute !== "function") missing.push(k);
  }
  if (missing.length === 0) console.log("PASS:" + Object.keys(agents).length);
  else console.log("FAIL:" + missing.join(","));
' 2>/dev/null)
if echo "$T17_OUT" | grep -q "^PASS:"; then
  COUNT=$(echo "$T17_OUT" | grep "^PASS:" | cut -d: -f2)
  echo "T17: All shared agents have execute() — PASS ($COUNT agents)"
  PASS=$((PASS+1))
else
  echo "T17: Missing execute — FAIL: $T17_OUT"
  FAIL=$((FAIL+1))
fi

# T18: BullMQ jobs >= 40
TOTAL=$((TOTAL+1))
T18_OUT=$(node --input-type=module -e '
  import { Queue } from "bullmq";
  import Redis from "ioredis";
  const conn = new Redis();
  const q = new Queue("scheduled-tasks", { connection: conn });
  const jobs = await q.getRepeatableJobs();
  console.log(jobs.length);
  await q.close();
  await conn.quit();
' 2>/dev/null)
if [ "$T18_OUT" -ge 40 ] 2>/dev/null; then
  echo "T18: Scheduled jobs count: $T18_OUT — PASS"
  PASS=$((PASS+1))
else
  echo "T18: Scheduled jobs count: $T18_OUT — FAIL (expected >= 40)"
  FAIL=$((FAIL+1))
fi

# T19: API health check (Calpe)
TOTAL=$((TOTAL+1))
T19_CODE=$(curl -s -o /dev/null -w "%{http_code}" -H "X-Destination-ID: calpe" http://127.0.0.1:3001/health)
if [ "$T19_CODE" = "200" ]; then
  echo "T19: API health Calpe — PASS (HTTP $T19_CODE)"
  PASS=$((PASS+1))
else
  echo "T19: API health Calpe — FAIL (HTTP $T19_CODE)"
  FAIL=$((FAIL+1))
fi

# T20: API health check (Texel)
TOTAL=$((TOTAL+1))
T20_CODE=$(curl -s -o /dev/null -w "%{http_code}" -H "X-Destination-ID: texel" http://127.0.0.1:3001/health)
if [ "$T20_CODE" = "200" ]; then
  echo "T20: API health Texel — PASS (HTTP $T20_CODE)"
  PASS=$((PASS+1))
else
  echo "T20: API health Texel — FAIL (HTTP $T20_CODE)"
  FAIL=$((FAIL+1))
fi

# T21: POI API Calpe
TOTAL=$((TOTAL+1))
T21_CODE=$(curl -s -o /dev/null -w "%{http_code}" -H "X-Destination-ID: calpe" "http://127.0.0.1:3001/api/v1/pois?destination_id=1&limit=2")
if [ "$T21_CODE" = "200" ]; then
  echo "T21: POI API Calpe — PASS (HTTP $T21_CODE)"
  PASS=$((PASS+1))
else
  echo "T21: POI API Calpe — FAIL (HTTP $T21_CODE)"
  FAIL=$((FAIL+1))
fi

# T22: POI API Texel
TOTAL=$((TOTAL+1))
T22_CODE=$(curl -s -o /dev/null -w "%{http_code}" -H "X-Destination-ID: texel" "http://127.0.0.1:3001/api/v1/pois?destination_id=2&limit=2")
if [ "$T22_CODE" = "200" ]; then
  echo "T22: POI API Texel — PASS (HTTP $T22_CODE)"
  PASS=$((PASS+1))
else
  echo "T22: POI API Texel — FAIL (HTTP $T22_CODE)"
  FAIL=$((FAIL+1))
fi

echo ""
echo "=== RESULTAAT: $PASS/$TOTAL PASS, $FAIL FAIL ==="
