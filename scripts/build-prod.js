#!/usr/bin/env node

/**
 * Production build script for SkriptPanda Studio
 * Optimizes the build for Netlify deployment
 */

import { execSync } from 'child_process';
import { existsSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';

const log = (message) => console.log(`🔧 ${message}`);
const error = (message) => console.error(`❌ ${message}`);
const success = (message) => console.log(`✅ ${message}`);

async function buildForProduction() {
  try {
    log('Starting production build for SkriptPanda Studio...');

    // 1. Clean previous builds
    log('Cleaning previous builds...');
    try {
      execSync('rm -rf dist', { stdio: 'inherit' });
    } catch (e) {
      // Ignore if dist doesn't exist
    }

    // 2. Install dependencies
    log('Installing dependencies...');
    execSync('npm ci', { stdio: 'inherit' });

    // 3. Run type checking
    log('Running type checking...');
    try {
      execSync('npx tsc --noEmit', { stdio: 'inherit' });
      success('Type checking passed');
    } catch (e) {
      error('Type checking failed');
      process.exit(1);
    }

    // 4. Run linting
    log('Running linting...');
    try {
      execSync('npx eslint src --ext .ts,.tsx --max-warnings 0', { stdio: 'inherit' });
      success('Linting passed');
    } catch (e) {
      console.warn('⚠️ Linting warnings found, continuing build...');
    }

    // 5. Build the application
    log('Building application...');
    execSync('npm run build', { stdio: 'inherit' });

    // 6. Create _redirects file for Netlify SPA routing
    log('Creating Netlify redirects...');
    const redirectsContent = '/*    /index.html   200\n';
    writeFileSync(join('dist', '_redirects'), redirectsContent);

    // 7. Create _headers file for security
    log('Creating security headers...');
    const headersContent = `/*
  X-Frame-Options: DENY
  X-XSS-Protection: 1; mode=block
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()

/static/*
  Cache-Control: public, max-age=31536000, immutable

/*.js
  Cache-Control: public, max-age=31536000, immutable

/*.css
  Cache-Control: public, max-age=31536000, immutable
`;
    writeFileSync(join('dist', '_headers'), headersContent);

    // 8. Generate build info
    log('Generating build info...');
    const buildInfo = {
      version: '1.0.0',
      buildTime: new Date().toISOString(),
      commit: process.env.COMMIT_REF || 'unknown',
      branch: process.env.BRANCH || 'main',
    };
    writeFileSync(join('dist', 'build-info.json'), JSON.stringify(buildInfo, null, 2));

    success('Production build completed successfully!');
    log('Build artifacts are in the dist/ directory');
    log('Ready for Netlify deployment');

  } catch (error) {
    error(`Build failed: ${error.message}`);
    process.exit(1);
  }
}

buildForProduction();
