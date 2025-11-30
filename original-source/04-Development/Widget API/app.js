/**
 * Entry point for GreenGeeks hosting
 * 
 * GreenGeeks looks for app.js as the entry point for Node.js applications.
 * This file simply loads dist/server.js, which already:
 * - Loads environment variables (dotenv)
 * - Starts the Express server
 * - Handles graceful shutdown
 */

// Simply require the server - it will start automatically
// The require() executes dist/server.js, which starts the server listening
require('./dist/server.js');

