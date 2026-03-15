/**
 * Platform Client Factory
 * Returns the appropriate social platform client for publishing.
 */

import MetaClient from './metaClient.js';
import LinkedInClient from './linkedinClient.js';
import XClient from './xClient.js';
import PinterestClient from './pinterestClient.js';

const clients = {
  facebook: new MetaClient('facebook'),
  instagram: new MetaClient('instagram'),
  linkedin: new LinkedInClient(),
  x: new XClient(),
  pinterest: new PinterestClient(),
};

/**
 * Get a platform client by platform name
 * @param {string} platform - 'facebook', 'instagram', 'linkedin', etc.
 * @returns {Object} Platform client instance
 */
export function getClient(platform) {
  const client = clients[platform];
  if (!client) {
    throw new Error(`No client available for platform '${platform}'. Supported: ${Object.keys(clients).join(', ')}`);
  }
  return client;
}

export default { getClient };
