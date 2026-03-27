module.exports = {
  apps: [
    {
      name: "rps-backend",
      cwd: "./rps-backend/rps-backend",
      script: "npm",
      args: "run start:prod",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
    },
    {
      name: "rps-frontend",
      cwd: "./rps-frontend/nextjs-app",
      script: "npm",
      args: "run start",
      env: {
        NODE_ENV: "production",
        PORT: 3001,
      },
    },
  ],
};
