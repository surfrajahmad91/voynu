/** @type {import('next').NextConfig} */
// Vercel production boundary: VOYNU Customer PWA.
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
  // Deferred features (Rentals, Wallet) stay in the repo but are unreachable for now.
  async redirects() {
    return [
      { source: "/rentals", destination: "/", permanent: false },
      { source: "/rentals/:path*", destination: "/", permanent: false },
      { source: "/wallet", destination: "/account", permanent: false },
    ];
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
  experimental: {
    externalDir: true,
  },
  outputFileTracingRoot: path.join(__dirname, '../../'),
  webpack: (config) => {
    config.resolve.modules = [
      path.join(__dirname, 'node_modules'),
      ...(config.resolve.modules || []),
    ];
    return config;
  },
};

module.exports = nextConfig;
