/**
 * HolidaiButler - Centrale Environment Loader
 *
 * Dit script laadt de centrale .env uit de project root.
 * Gebruik: require('../../scripts/env-loader'); (pas pad aan per module)
 *
 * OF importeer voordat je andere modules laadt:
 * require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
 */

const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// Zoek de project root door omhoog te navigeren tot we .env of .git vinden
function findProjectRoot(startDir) {
  let currentDir = startDir;
  const maxLevels = 10; // Veiligheid: max 10 niveaus omhoog

  for (let i = 0; i < maxLevels; i++) {
    // Check voor .env of .git in huidige directory
    const envPath = path.join(currentDir, '.env');
    const gitPath = path.join(currentDir, '.git');

    if (fs.existsSync(envPath) || fs.existsSync(gitPath)) {
      return currentDir;
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      // We zijn bij de root van het filesystem
      break;
    }
    currentDir = parentDir;
  }

  return null;
}

// Laad .env met Windows BOM workaround
function loadEnvWithBomWorkaround(envPath) {
  try {
    let content = fs.readFileSync(envPath, 'utf8');

    // Remove BOM if present (common issue on Windows)
    if (content.charCodeAt(0) === 0xFEFF) {
      content = content.slice(1);
      console.log('[ENV Loader] Removed BOM from .env file');
    }

    // Parse and set environment variables
    const lines = content.split(/\r?\n/);
    let loadedCount = 0;

    for (const line of lines) {
      // Skip comments and empty lines
      if (!line || line.trim().startsWith('#')) continue;

      const match = line.match(/^([^#=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        let value = match[2].trim();

        // Remove surrounding quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }

        // Only set if not already set (allows local overrides)
        if (!process.env[key]) {
          process.env[key] = value;
          loadedCount++;
        }
      }
    }

    return loadedCount;
  } catch (err) {
    console.error('[ENV Loader] Error reading .env:', err.message);
    return 0;
  }
}

// Main loader function
function loadEnv(callerDir) {
  const startDir = callerDir || process.cwd();

  // Probeer eerst lokale .env (voor overrides)
  const localEnvPath = path.join(startDir, '.env');
  if (fs.existsSync(localEnvPath)) {
    console.log('[ENV Loader] Loading local .env:', localEnvPath);
    dotenv.config({ path: localEnvPath });
  }

  // Vind project root en laad centrale .env
  const projectRoot = findProjectRoot(startDir);

  if (projectRoot) {
    const rootEnvPath = path.join(projectRoot, '.env');

    if (fs.existsSync(rootEnvPath)) {
      console.log('[ENV Loader] Loading root .env:', rootEnvPath);

      // Probeer eerst met dotenv
      const result = dotenv.config({ path: rootEnvPath });

      if (result.error) {
        console.log('[ENV Loader] dotenv failed, trying manual parse...');
        const count = loadEnvWithBomWorkaround(rootEnvPath);
        console.log(`[ENV Loader] Manually loaded ${count} variables`);
      } else {
        console.log('[ENV Loader] Successfully loaded root .env');
      }

      return true;
    }
  }

  console.warn('[ENV Loader] No root .env found');
  return false;
}

// Auto-load wanneer dit bestand wordt required
const callerDir = path.dirname(require.main?.filename || process.cwd());
loadEnv(callerDir);

module.exports = { loadEnv, findProjectRoot };
