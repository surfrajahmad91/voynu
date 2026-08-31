/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  experimental: {
    externalDir: true,
  },
  outputFileTracingRoot: path.join(__dirname, '../../'),
  webpack: (config) => {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      '@supabase/supabase-js': path.join(__dirname, 'node_modules/@supabase/supabase-js'),
    };
    return config;
  },
};

module.exports = nextConfig;
