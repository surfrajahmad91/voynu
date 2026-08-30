/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  experimental: {
    externalDir: true,
  },
  outputFileTracingRoot: path.join(__dirname, '../../'),
};

module.exports = nextConfig;
