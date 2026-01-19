#!/usr/bin/env node
/**
 * Start backend dev server for E2E tests
 * Builds frontend once, then starts backend dev mode
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const frontendDir = path.join(__dirname, '../frontend');
const frontendDist = path.join(frontendDir, 'dist');

console.log('🔨 Building frontend for E2E tests...');

// Build frontend
const buildProcess = spawn('npm', ['run', 'build'], {
  cwd: frontendDir,
  stdio: 'inherit',
  shell: true,
});

buildProcess.on('exit', (code) => {
  if (code !== 0) {
    console.error('❌ Frontend build failed');
    process.exit(code);
  }

  // Verify dist exists
  if (!fs.existsSync(path.join(frontendDist, 'index.html'))) {
    console.error('❌ Frontend dist/index.html not found after build');
    process.exit(1);
  }

  console.log('✅ Frontend built successfully');
  console.log('🚀 Starting backend dev server...');

  // Start backend dev server
  const backendProcess = spawn('npm', ['run', 'dev'], {
    cwd: __dirname,
    stdio: 'inherit',
    shell: true,
  });

  // Forward signals
  process.on('SIGINT', () => {
    backendProcess.kill('SIGINT');
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    backendProcess.kill('SIGTERM');
    process.exit(0);
  });

  backendProcess.on('exit', (code) => {
    process.exit(code);
  });
});
