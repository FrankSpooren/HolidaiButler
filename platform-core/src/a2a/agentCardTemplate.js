/**
 * A2A v1.2 AgentCard Generator + Cryptographic Signer
 * Generates signed AgentCards for all registered agents
 */
import fs from 'fs';
import crypto from 'crypto';

const SIGNING_KEY_PATH = '/etc/holidaibutler/a2a/agent-signing.key';
const PUBLIC_KEY_PATH = '/etc/holidaibutler/a2a/agent-signing.pub';

/**
 * Generate an A2A v1.2 compliant AgentCard
 */
export function generateAgentCard(agentId, agent) {
  const name = agent.name || agentId;
  const category = agent.category || 'Operations';
  const version = agent.version || '1.0.0';
  const destinationAware = agent.destinationAware ?? false;

  return {
    schemaVersion: '1.2',
    name,
    description: `HolidaiButler ${category} agent: ${name}`,
    url: `https://api.holidaibutler.com/a2a/agents/${agentId}`,
    provider: {
      name: 'HolidaiButler',
      organization: 'HolidaiButler B.V.',
      url: 'https://holidaibutler.com'
    },
    version,
    capabilities: {
      streaming: false,
      pushNotifications: true,
      stateTransitionHistory: true
    },
    authentication: {
      schemes: ['bearer'],
      credentials: {
        bearer: {
          headerName: 'X-A2A-Token'
        }
      }
    },
    skills: [{
      id: `${agentId}-execute`,
      name: `${name} execute`,
      description: `Run ${name} ${destinationAware ? 'for a specific destination' : 'across all destinations'}`,
      tags: [category.toLowerCase(), destinationAware ? 'destination-aware' : 'shared'],
      inputModes: ['application/json'],
      outputModes: ['application/json']
    }],
    defaultInputModes: ['application/json'],
    defaultOutputModes: ['application/json'],
    metadata: {
      category,
      destinationAware,
      platform: 'hb-platform-core'
    }
  };
}

/**
 * Sign an AgentCard with RSA-SHA256
 */
export function signAgentCard(card) {
  try {
    const privateKey = fs.readFileSync(SIGNING_KEY_PATH);
    const { signatures: _, ...unsigned } = card;
    const cardJson = JSON.stringify(unsigned);
    const signature = crypto.sign('sha256', Buffer.from(cardJson), privateKey);
    return {
      ...unsigned,
      signatures: [{
        algorithm: 'sha256-rsa',
        signature: signature.toString('base64'),
        keyId: 'hb-agent-signing-key-v1'
      }]
    };
  } catch (error) {
    // Return unsigned card if signing fails (e.g., key not available)
    return { ...card, signatures: [] };
  }
}

/**
 * Verify an AgentCard signature
 */
export function verifyAgentCard(card) {
  try {
    const pubKey = fs.readFileSync(PUBLIC_KEY_PATH);
    const { signatures, ...unsigned } = card;
    if (!signatures?.length) return false;
    const sigBuf = Buffer.from(signatures[0].signature, 'base64');
    return crypto.verify('sha256', Buffer.from(JSON.stringify(unsigned)), pubKey, sigBuf);
  } catch {
    return false;
  }
}

export default { generateAgentCard, signAgentCard, verifyAgentCard };
