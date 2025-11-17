/**
 * PM2 Ecosystem Configuration
 * Voor het beheren van alle HolidaiButler services
 */

module.exports = {
  apps: [
    // Platform Core - Central Integration Hub
    {
      name: 'holidaibutler-core',
      script: './platform-core/src/index.js',
      cwd: '/home/user/HolidaiButler/platform-core',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      error_file: './platform-core/logs/pm2-error.log',
      out_file: './platform-core/logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '500M',
      watch: false,
    },

    // Admin Module Backend
    {
      name: 'holidaibutler-admin',
      script: './admin-module/backend/server.js',
      cwd: '/home/user/HolidaiButler/admin-module/backend',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3003,
      },
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '300M',
      watch: false,
    },

    // Ticketing Module Backend
    {
      name: 'holidaibutler-ticketing',
      script: './ticketing-module/backend/server.js',
      cwd: '/home/user/HolidaiButler/ticketing-module/backend',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3004,
      },
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '500M',
      watch: false,
    },

    // Payment Module Backend
    {
      name: 'holidaibutler-payment',
      script: './payment-module/backend/server.js',
      cwd: '/home/user/HolidaiButler/payment-module/backend',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3005,
      },
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '400M',
      watch: false,
    },
  ],
};
