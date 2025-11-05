#!/usr/bin/env node

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const extraArgs = ['console', 'init', ...args];

const candidates = [
  path.join(process.cwd(), 'node_modules', '.bin', 'si'),
  path.join(__dirname, '..', 'node_modules', '.bin', 'si'),
  path.join(__dirname, '..', 'node_modules', '.bin', 'si-console')
];

for (const candidate of candidates) {
  if (!fs.existsSync(candidate)) {
    continue;
  }

  const result = spawnSync(candidate, extraArgs, { stdio: 'inherit' });
  if (typeof result.status === 'number') {
    process.exit(result.status);
  }

  if (result.error) {
    console.warn(`Failed to run local console binary at ${candidate}:`, result.error);
  }
}

console.warn('Unable to locate a local si console binary.');
console.warn('Please install @sovereign-codex/si-console as a dependency to enable offline initialization.');
process.exit(0);
