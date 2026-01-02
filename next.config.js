/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  // For Pages API routes, body parser is configured per-route
  // For App Router, use serverActions config
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  // Ensure static files are generated and served correctly
  generateBuildId: async () => {
    // Use a consistent build ID or generate one
    return process.env.BUILD_ID || `build-${Date.now()}`;
  },
  // Ensure proper static file handling
  poweredByHeader: false,
  compress: true,
  webpack: (config) => {
    config.resolve.extensionAlias = {
      '.js': ['.js', '.ts', '.tsx'],
    };
    
    // Ensure path aliases are resolved correctly
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname),
    };
    
    return config;
  },
};

module.exports = nextConfig;

