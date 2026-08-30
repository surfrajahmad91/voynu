/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  experimental: {
    externalDir: true,
  },
  outputFileTracingRoot: path.join(__dirname, '../../'),
  webpack: (config) => {
    // The customer app intentionally reuses the shared legacy app code from
    // ../../app. Because that code lives outside this Next.js app root,
    // webpack otherwise resolves bare packages from the shared source tree
    // instead of the customer app's node_modules. Keep the separation while
    // making shared code resolve this app's installed dependencies.
    config.resolve.modules = [
      path.join(__dirname, 'node_modules'),
      ...(config.resolve.modules || []),
    ];

    return config;
  },
};

module.exports = nextConfig;
