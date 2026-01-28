/**
 * HolidaiButler Multi-Destination Configuration Index
 * 
 * @version 1.0.0
 * @lastUpdated 2026-01-28
 */

import calpeConfig from './calpe.config.js';
import texelConfig from './texel.config.js';
import alicanteConfig from './alicante.config.js';

// All destination configurations
export const destinations = {
  calpe: calpeConfig,
  texel: texelConfig,
  alicante: alicanteConfig
};

// Default destination
export const DEFAULT_DESTINATION = 'calpe';

/**
 * Get destination configuration by code
 * @param {string} destinationCode - Destination code (e.g., 'calpe', 'texel', 'alicante')
 * @returns {object} Destination configuration
 */
export function getDestinationConfig(destinationCode) {
  const code = destinationCode?.toLowerCase() || DEFAULT_DESTINATION;
  
  if (!destinations[code]) {
    console.warn(`Unknown destination: ${code}, falling back to ${DEFAULT_DESTINATION}`);
    return destinations[DEFAULT_DESTINATION];
  }
  
  return destinations[code];
}

/**
 * Get destination by ID
 * @param {number} destinationId - Destination database ID
 * @returns {object} Destination configuration
 */
export function getDestinationById(destinationId) {
  const destination = Object.values(destinations).find(d => d.destination.id === destinationId);
  
  if (!destination) {
    console.warn(`Unknown destination ID: ${destinationId}, falling back to ${DEFAULT_DESTINATION}`);
    return destinations[DEFAULT_DESTINATION];
  }
  
  return destination;
}

/**
 * Get all active destinations
 * @returns {array} Array of active destination configurations
 */
export function getActiveDestinations() {
  // For now, only Calpe is active. Others will be activated when ready.
  return [calpeConfig];
}

/**
 * Get all destinations (including inactive)
 * @returns {array} Array of all destination configurations
 */
export function getAllDestinations() {
  return Object.values(destinations);
}

/**
 * Check if a feature is enabled for a destination
 * @param {string} destinationCode - Destination code
 * @param {string} featureName - Feature name
 * @returns {boolean} Whether the feature is enabled
 */
export function isFeatureEnabled(destinationCode, featureName) {
  const config = getDestinationConfig(destinationCode);
  return config.features?.[featureName] === true;
}

/**
 * Get destination by domain
 * @param {string} domain - Domain name (e.g., 'holidaibutler.com', 'texelmaps.nl')
 * @returns {object|null} Destination configuration or null
 */
export function getDestinationByDomain(domain) {
  const normalizedDomain = domain?.toLowerCase().replace(/^www\./, '');
  
  for (const config of Object.values(destinations)) {
    const domains = config.domains;
    
    // Check all environment domains
    for (const env of ['production', 'test', 'dev']) {
      if (domains[env]) {
        const envDomains = Object.values(domains[env]);
        if (envDomains.includes(normalizedDomain)) {
          return config;
        }
      }
    }
  }
  
  return null;
}

export default {
  destinations,
  DEFAULT_DESTINATION,
  getDestinationConfig,
  getDestinationById,
  getActiveDestinations,
  getAllDestinations,
  isFeatureEnabled,
  getDestinationByDomain
};
