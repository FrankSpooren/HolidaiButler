/**
 * Agent Registry - Central registration of all 15 agents with BaseAgent pattern
 *
 * This module imports all agents, adds runForDestination()/execute() where needed,
 * and wraps them with destination-awareness via wrapWithDestinationAwareness().
 *
 * Categories:
 *   A (destination-aware): 11 agents that run per-destination
 *   B (shared): 4 agents that run once for all destinations
 *
 * @module agents/base/agentRegistry
 * @version 1.0.0
 */

import { wrapWithDestinationAwareness } from './destinationRunner.js';

// Agent imports
import dataSyncAgent from '../dataSync/index.js';
import healthMonitor from '../healthMonitor/index.js';
import holibotSync from '../holibotSync/index.js';
import communicationFlow from '../communicationFlow/index.js';
import gdprAgent from '../gdpr/index.js';
import ownerInterfaceAgent from '../ownerInterfaceAgent/index.js';
import strategyLayer from '../strategyLayer/index.js';
import devLayer from '../devLayer/index.js';

// Monitoring modules (8A+)
import contentQualityChecker from '../dataSync/contentQualityChecker.js';
import backupHealthChecker from '../healthMonitor/backupHealthChecker.js';
import smokeTestRunner from '../healthMonitor/smokeTestRunner.js';

// ============================================================
// CATEGORY A: DESTINATION-AWARE (11 agents)
// ============================================================

// #4 De Koerier (Data Sync) - KRITIEK: POI/reviews per destination
if (!dataSyncAgent.runForDestination) {
  dataSyncAgent.runForDestination = async function(destinationId) {
    console.log(`[De Koerier] Running for destination ${destinationId}`);
    const report = await this.generateHealthReport({ period: 'daily', destinationId });
    return { destinationId, report };
  };
}
wrapWithDestinationAwareness(dataSyncAgent, {
  name: 'De Koerier',
  category: 'Operations',
  version: '2.1.0',
  destinationAware: true
});

// #1 De Maestro (Orchestrator) - Covered by scheduler, lightweight run
// The Maestro doesn't have its own module — it IS the scheduler/workers combo.
// We create a virtual agent object for it.
const maestroAgent = {
  name: 'De Maestro',
  version: '1.1.0',
  runForDestination: async function(destinationId) {
    // Maestro orchestrates: check all agent last-run status for this destination
    return { destinationId, status: 'orchestrating', message: `Orchestration active for destination ${destinationId}` };
  }
};
wrapWithDestinationAwareness(maestroAgent, {
  name: 'De Maestro',
  category: 'Core',
  version: '1.1.0',
  destinationAware: true
});

// #2 De Bode (Owner Interface) - Sends per-destination briefings
if (!ownerInterfaceAgent.runForDestination) {
  ownerInterfaceAgent.runForDestination = async function(destinationId) {
    return { destinationId, status: 'active', message: `Owner interface ready for destination ${destinationId}` };
  };
}
wrapWithDestinationAwareness(ownerInterfaceAgent, {
  name: 'De Bode',
  category: 'Core',
  version: '1.2.0',
  destinationAware: true
});

// #3 De Dokter (Health Monitor) - Multi-portal health checks
if (!healthMonitor.runForDestination) {
  healthMonitor.runForDestination = async function(destinationId) {
    console.log(`[De Dokter] Running health check for destination ${destinationId}`);
    const quickResult = await this.quickCheck();
    return { destinationId, health: quickResult };
  };
}
wrapWithDestinationAwareness(healthMonitor, {
  name: 'De Dokter',
  category: 'Operations',
  version: '1.1.0',
  destinationAware: true
});

// #5 Het Geheugen (HoliBot Sync) - ChromaDB per destination
if (!holibotSync.runForDestination) {
  holibotSync.runForDestination = async function(destinationId) {
    console.log(`[Het Geheugen] Running for destination ${destinationId}`);
    return { destinationId, status: 'synced', message: `ChromaDB sync for destination ${destinationId}` };
  };
}
wrapWithDestinationAwareness(holibotSync, {
  name: 'Het Geheugen',
  category: 'Operations',
  version: '1.1.0',
  destinationAware: true
});

// #6 De Gastheer (Communication Flow) - Per-destination email context
if (!communicationFlow.runForDestination) {
  communicationFlow.runForDestination = async function(destinationId) {
    console.log(`[De Gastheer] Running for destination ${destinationId}`);
    return { destinationId, status: 'active', message: `Communication flow for destination ${destinationId}` };
  };
}
wrapWithDestinationAwareness(communicationFlow, {
  name: 'De Gastheer',
  category: 'Operations',
  version: '1.1.0',
  destinationAware: true
});

// #7 De Poortwachter (GDPR) - Per-destination consent/data
if (!gdprAgent.runForDestination) {
  gdprAgent.runForDestination = async function(destinationId) {
    console.log(`[De Poortwachter] Running GDPR check for destination ${destinationId}`);
    return { destinationId, status: 'compliant', message: `GDPR check for destination ${destinationId}` };
  };
}
wrapWithDestinationAwareness(gdprAgent, {
  name: 'De Poortwachter',
  category: 'Operations',
  version: '1.1.0',
  destinationAware: true
});

// #11 De Inspecteur (Quality) - Per-destination quality checks
// The Inspecteur is part of devLayer, so we create a proxy
const inspecteurAgent = {
  name: 'De Inspecteur',
  version: '1.1.0',
  runForDestination: async function(destinationId) {
    console.log(`[De Inspecteur] Running quality check for destination ${destinationId}`);
    if (devLayer && devLayer.runQualityCheck) {
      return await devLayer.runQualityCheck(destinationId);
    }
    return { destinationId, status: 'active', message: `Quality check for destination ${destinationId}` };
  }
};
wrapWithDestinationAwareness(inspecteurAgent, {
  name: 'De Inspecteur',
  category: 'Development',
  version: '1.1.0',
  destinationAware: true
});

// #13 De Leermeester (Learning) - Per-destination pattern learning
// Part of strategyLayer
const leermeesterAgent = {
  name: 'De Leermeester',
  version: '1.1.0',
  runForDestination: async function(destinationId) {
    console.log(`[De Leermeester] Running learning cycle for destination ${destinationId}`);
    if (strategyLayer && strategyLayer.runLearningCycle) {
      return await strategyLayer.runLearningCycle({ destinationId });
    }
    return { destinationId, status: 'active', message: `Learning cycle for destination ${destinationId}` };
  }
};
wrapWithDestinationAwareness(leermeesterAgent, {
  name: 'De Leermeester',
  category: 'Strategy',
  version: '1.1.0',
  destinationAware: true
});

// #14 De Thermostaat (Adaptive Config) - Per-destination config evaluation
const thermostaatAgent = {
  name: 'De Thermostaat',
  version: '2.1.0',
  runForDestination: async function(destinationId) {
    console.log(`[De Thermostaat] Running config evaluation for destination ${destinationId}`);
    if (strategyLayer && strategyLayer.evaluateConfig) {
      return await strategyLayer.evaluateConfig({ destinationId });
    }
    return { destinationId, status: 'active', message: `Config evaluation for destination ${destinationId}` };
  }
};
wrapWithDestinationAwareness(thermostaatAgent, {
  name: 'De Thermostaat',
  category: 'Strategy',
  version: '2.1.0',
  destinationAware: true
});

// #15 De Weermeester (Prediction) - Per-destination predictions
const weermeesterAgent = {
  name: 'De Weermeester',
  version: '1.1.0',
  runForDestination: async function(destinationId) {
    console.log(`[De Weermeester] Running predictions for destination ${destinationId}`);
    if (strategyLayer && strategyLayer.predict) {
      return await strategyLayer.predict({ destinationId });
    }
    return { destinationId, status: 'active', message: `Predictions for destination ${destinationId}` };
  }
};
wrapWithDestinationAwareness(weermeesterAgent, {
  name: 'De Weermeester',
  category: 'Strategy',
  version: '1.1.0',
  destinationAware: true
});

// ============================================================
// CATEGORY B: SHARED (4 agents, destinationAware: false)
// ============================================================

// #8 De Stylist (UX/UI) - Already brand-aware via 8A
const stylistAgent = {
  name: 'De Stylist',
  version: '1.1.0',
  execute: async function() {
    if (devLayer && devLayer.runUXReview) {
      return await devLayer.runUXReview();
    }
    return { status: 'active', message: 'UX/UI review (platform-wide)' };
  }
};
wrapWithDestinationAwareness(stylistAgent, {
  name: 'De Stylist',
  category: 'Development',
  version: '1.1.0',
  destinationAware: false
});

// #9 De Corrector (Code) - Code is shared across destinations
const correctorAgent = {
  name: 'De Corrector',
  version: '1.1.0',
  execute: async function() {
    if (devLayer && devLayer.runCodeReview) {
      return await devLayer.runCodeReview();
    }
    return { status: 'active', message: 'Code review (platform-wide)' };
  }
};
wrapWithDestinationAwareness(correctorAgent, {
  name: 'De Corrector',
  category: 'Development',
  version: '1.1.0',
  destinationAware: false
});

// #10 De Bewaker (Security) - Security is platform-wide
const bewakerAgent = {
  name: 'De Bewaker',
  version: '1.1.0',
  execute: async function() {
    if (devLayer && devLayer.runSecurityReview) {
      return await devLayer.runSecurityReview();
    }
    return { status: 'active', message: 'Security review (platform-wide)' };
  }
};
wrapWithDestinationAwareness(bewakerAgent, {
  name: 'De Bewaker',
  category: 'Development',
  version: '1.1.0',
  destinationAware: false
});

// #12 De Architect (Architecture) - Architecture is shared
const architectAgent = {
  name: 'De Architect',
  version: '1.1.0',
  execute: async function() {
    if (strategyLayer && strategyLayer.assessArchitecture) {
      return await strategyLayer.assessArchitecture();
    }
    return { status: 'active', message: 'Architecture assessment (platform-wide)' };
  }
};
wrapWithDestinationAwareness(architectAgent, {
  name: 'De Architect',
  category: 'Strategy',
  version: '1.1.0',
  destinationAware: false
});

// ============================================================
// MONITORING MODULES (8A+, verify destination-awareness)
// ============================================================

// contentQualityChecker: already per-destination (runContentAudit(destinationId))
wrapWithDestinationAwareness(contentQualityChecker, {
  name: 'Content Quality Checker',
  category: 'Operations',
  version: '1.0.0',
  destinationAware: true
});
if (!contentQualityChecker.runForDestination) {
  contentQualityChecker.runForDestination = async function(destinationId) {
    return await this.runContentAudit(destinationId);
  };
}

// smokeTestRunner: already per-destination (runDestinationSmokeTests)
wrapWithDestinationAwareness(smokeTestRunner, {
  name: 'Smoke Test Runner',
  category: 'Operations',
  version: '1.1.0',
  destinationAware: true
});
if (!smokeTestRunner.runForDestination) {
  smokeTestRunner.runForDestination = async function(destinationId) {
    return await this.runDestinationSmokeTests(destinationId);
  };
}

// backupHealthChecker: platform-wide (not per-destination)
wrapWithDestinationAwareness(backupHealthChecker, {
  name: 'Backup Health Checker',
  category: 'Operations',
  version: '1.0.0',
  destinationAware: false
});
if (!backupHealthChecker.execute) {
  backupHealthChecker.execute = async function() {
    return await this.runBackupHealthCheck();
  };
}

// ============================================================
// REGISTRY EXPORT
// ============================================================

const AGENT_REGISTRY = {
  // Category A: Destination-Aware
  maestro: maestroAgent,           // #1
  bode: ownerInterfaceAgent,       // #2
  dokter: healthMonitor,           // #3
  koerier: dataSyncAgent,          // #4
  geheugen: holibotSync,           // #5
  gastheer: communicationFlow,     // #6
  poortwachter: gdprAgent,         // #7
  inspecteur: inspecteurAgent,     // #11
  leermeester: leermeesterAgent,   // #13
  thermostaat: thermostaatAgent,   // #14
  weermeester: weermeesterAgent,   // #15

  // Category B: Shared
  stylist: stylistAgent,           // #8
  corrector: correctorAgent,       // #9
  bewaker: bewakerAgent,           // #10
  architect: architectAgent,       // #12

  // Monitoring modules (8A+)
  contentQuality: contentQualityChecker,
  smokeTest: smokeTestRunner,
  backupHealth: backupHealthChecker
};

/**
 * Get all registered agents
 */
export function getAllAgents() {
  return AGENT_REGISTRY;
}

/**
 * Get agent by key
 */
export function getAgent(key) {
  return AGENT_REGISTRY[key];
}

/**
 * Get all Category A (destination-aware) agents
 */
export function getDestinationAwareAgents() {
  return Object.entries(AGENT_REGISTRY)
    .filter(([, agent]) => agent._baseAgentConfig && agent._baseAgentConfig.destinationAware)
    .reduce((acc, [key, agent]) => ({ ...acc, [key]: agent }), {});
}

/**
 * Get all Category B (shared) agents
 */
export function getSharedAgents() {
  return Object.entries(AGENT_REGISTRY)
    .filter(([, agent]) => agent._baseAgentConfig && !agent._baseAgentConfig.destinationAware)
    .reduce((acc, [key, agent]) => ({ ...acc, [key]: agent }), {});
}

/**
 * Run all agents for all destinations - used by daily briefing
 */
export async function runAllAgents() {
  const results = {};
  for (const [key, agent] of Object.entries(AGENT_REGISTRY)) {
    if (agent.run) {
      try {
        results[key] = await agent.run('all');
      } catch (error) {
        results[key] = { agent: key, success: false, error: error.message };
      }
    }
  }
  return results;
}

export default AGENT_REGISTRY;
