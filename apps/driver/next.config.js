/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  experimental: {
    externalDir: true,
  },
  outputFileTracingRoot: path.join(__dirname, '../../'),
  webpack: (config) => {
    // The Saarthi app intentionally reuses the existing VOYNU driver UI and
    // shared server code from the monorepo. Vercel installs dependencies from
    // apps/driver, so make that dependency tree visible to shared files too.
    config.resolve.modules = [path.join(__dirname, 'node_modules'), ...(config.resolve.modules || [])];
    return config;
  },
};

module.exports = nextConfig;
