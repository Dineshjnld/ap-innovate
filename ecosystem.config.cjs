module.exports = {
  apps: [
    {
      name: "ap-innovate",
      script: "server/index.mjs",
      instances: "max",       // 1 worker per CPU core
      exec_mode: "cluster",
      env: {
        NODE_ENV: "production",
        PORT: 3001,
      },
      max_memory_restart: "512M",
      restart_delay: 3000,
      max_restarts: 10,
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      merge_logs: true,
    },
  ],
};
