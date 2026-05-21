module.exports = {
  apps: [
    {
      name: "ai-rpg",
      script: "server.js",
      cwd: __dirname,
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_restarts: 10,
      min_uptime: "10s",
      max_memory_restart: "300M",
      env: {
        NODE_ENV: "production",
        PORT: "3002",
      },
    },
  ],
};
