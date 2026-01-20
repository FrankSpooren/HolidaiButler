/**
 * PM2 Ecosystem Configuration
 * 
 * This file configures PM2 to run the chatbot API in production.
 * 
 * Usage:
 *   pm2 start ecosystem.config.js
 *   pm2 save
 *   pm2 startup
 */

module.exports = {
  apps: [{
    name: 'chatbot-api',
    script: './dist/server.js',
    instances: 1,  // Use 'max' for cluster mode (one instance per CPU core)
    exec_mode: 'fork',  // Use 'cluster' with instances: 'max'
    
    // Environment variables
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    
    // Logging
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    
    // Auto-restart configuration
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',
    max_memory_restart: '1G',
    
    // Watch mode (disable in production)
    watch: false,
    
    // Ignore watch patterns
    ignore_watch: [
      'node_modules',
      'logs',
      '.git'
    ]
  }]
};

