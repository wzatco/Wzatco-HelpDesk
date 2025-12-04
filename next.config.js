/** @type {import('next').NextConfig} */
const nextConfig = {
  // For Pages API routes, body parser is configured per-route
  // For App Router, use serverActions config
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  webpack: (config) => {
    config.resolve.extensionAlias = {
      '.js': ['.js', '.ts', '.tsx'],
    };
    return config;
  },
};

module.exports = nextConfig;

