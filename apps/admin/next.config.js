/** @type {import('next').NextConfig} */
const path = require('path');

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(self), payment=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
];

const nextConfig = {
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
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
