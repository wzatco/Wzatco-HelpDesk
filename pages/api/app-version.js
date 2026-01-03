/**
 * Application Version API Endpoint
 * 
 * This endpoint returns the current application version/build number.
 * Clients can poll this endpoint to detect when a new deployment has occurred
 * and automatically refresh to get the latest version.
 * 
 * Usage:
 * GET https://help.wzatco.com/api/app-version
 * 
 * Set BUILD_VERSION in your .env file or it will use the timestamp.
 */

import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  // Try to get version from environment variable
  let version = process.env.BUILD_VERSION || process.env.NEXT_PUBLIC_BUILD_VERSION;
  
  // If no version set, try to read from build info file
  if (!version) {
    try {
      const buildInfoPath = path.join(process.cwd(), '.next', 'BUILD_ID');
      if (fs.existsSync(buildInfoPath)) {
        version = fs.readFileSync(buildInfoPath, 'utf8').trim();
      }
    } catch (e) {
      // Ignore errors
    }
  }

  // Fallback to package.json version
  if (!version) {
    try {
      const packageJsonPath = path.join(process.cwd(), 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      version = packageJson.version || '0.1.0';
    } catch (e) {
      version = '0.1.0';
    }
  }

  // Get build timestamp from .next directory creation time
  let buildTimestamp = null;
  try {
    const nextDir = path.join(process.cwd(), '.next');
    if (fs.existsSync(nextDir)) {
      const stats = fs.statSync(nextDir);
      buildTimestamp = stats.mtime.toISOString();
    }
  } catch (e) {
    // Ignore errors
  }

  // Set cache headers (cache for 1 minute to reduce server load)
  res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=60');
  res.setHeader('Content-Type', 'application/json');

  return res.status(200).json({
    success: true,
    version: version,
    buildTimestamp: buildTimestamp,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    message: 'Compare this version with your stored version to detect updates'
  });
}

