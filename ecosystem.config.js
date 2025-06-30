module.exports = {
  apps: [
    {
      name: "client",
      script: "npm",
      args: "start",
      cwd: "./client",
      env: {
        PORT: 3000,
        NODE_ENV: "production"
      }
    },
    {
      name: "server",
      script: "npm",
      args: "start",
      cwd: "./server",
      env: {
        PORT: 3001,
        NODE_ENV: "production"
      }
    }
  ]
};
