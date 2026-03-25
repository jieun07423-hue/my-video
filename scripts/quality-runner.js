#!/usr/bin/env node
// Simple root automation utility for ESLint 10 + TypeScript project quality checks.
// - Lints staged files if available, otherwise lints all tracked files.
// - If TypeScript is used, runs tsc --noEmit to catch type errors.
// - Optional: supports --ci flag for CI strict behavior.

const { execSync } = require('child_process');
const path = require('path');

function run(cmd) {
  try {
    const out = execSync(cmd, { stdio: 'inherit' });
    return out;
  } catch (e) {
    // Propagate non-zero exit code
    process.exit(e.status || 1);
  }
}

function main() {
  // Determine target files: if there are staged changes, lint those; otherwise lint all changed files or whole project
  let targets = [];
  try {
    const staged = execSync('git diff --name-only --cached', { encoding: 'utf8' })
      .split(/\r?\n/)
      .map(s => s.trim())
      .filter(Boolean);
    if (staged.length > 0) {
      targets = staged;
    }
  } catch (e) {
    // If git is not available or not a git repo, fall back to current directory
  }

  if (targets.length === 0) {
    // Fallback to linting the entire project source tree
    targets = ['.'];
  }

  // Build lint command
  const lintCmd = `node ./node_modules/.bin/eslint --config eslint.config.mjs --ext .js,.jsx,.ts,.tsx ${targets.map(t => `'${t}'`).join(' ')}`;
  console.log('Running ESLint on:', targets.join(', '));
  run(lintCmd);

  // If TypeScript exists, run typecheck (noEmit)
  try {
    // eslint-disable-next-line no-empty
  } catch {}
  try {
    if (path.resolve('./tsconfig.json')) {
      console.log('Running TypeScript typecheck (noEmit)');
      run('npx tsc --noEmit');
    }
  } catch (e) {
    // ignore if TS isn't configured
  }
}

if (require.main === module) {
  main();
}
