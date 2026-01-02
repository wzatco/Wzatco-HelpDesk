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
  // Ensure static files are properly generated and served
  generateBuildId: async () => {
    // Use a consistent build ID for better caching
    return process.env.BUILD_ID || `build-${Date.now()}`;
  },
  // Optimize static file serving
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

