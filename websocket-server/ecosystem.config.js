/**
 * PM2 Ecosystem Configuration
 * Cluster mode with auto-scaling for optimal performance
 */

module.exports = {
  apps: [{
    name: 'dnd-quiz-ws',
    script: './server.js',
    
    // Single instance mode
    instances: 1,
    exec_mode: 'fork',
    
    // Logging
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    
    // Process management
    max_memory_restart: '500M',
    min_uptime: '10s',
    max_restarts: 10,
    autorestart: true,
    
    // Graceful shutdown
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 3000,
    
    // Performance monitoring
    pmx: true,
    
    // Auto-restart on file changes (dev only)
    watch: false,
    ignore_watch: ['node_modules', 'logs'],
    
    // Exponential backoff restart delay
    exp_backoff_restart_delay: 100,
  }],
  
  // Deployment configuration (optional)
  deploy: {
    production: {
      user: 'nodejs',
      host: 'localhost',
      ref: 'origin/main',
      repo: 'git@github.com:your-repo/dnd-quiz.git',
      path: '/var/www/websocket-server',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production',
    },
  },
};
