#!/usr/bin/env node

import { promises as fs } from 'fs';
import { constants as fsConstants } from 'fs';
import path from 'path';
import process from 'process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const MANIFEST_TEMPLATE_DIR = path.join(ROOT_DIR, 'manifests', 'templates', 'package');
const PACKAGES_DIR = path.join(ROOT_DIR, 'packages');

async function ensureTemplateDirectory() {
  try {
    await fs.access(MANIFEST_TEMPLATE_DIR, fsConstants.R_OK);
  } catch (error) {
    throw new Error(
      `Template directory not found at ${MANIFEST_TEMPLATE_DIR}. Make sure manifests/templates/package exists.`
    );
  }
}

function toCamelCase(value) {
  return value
    .split(/[-_\s]+/g)
    .filter(Boolean)
    .map((segment, index) => {
      const lower = segment.toLowerCase();
      if (index === 0) {
        return lower;
      }
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join('');
}

function toPascalCase(value) {
  const camel = toCamelCase(value);
  if (!camel) return camel;
  return camel.charAt(0).toUpperCase() + camel.slice(1);
}

async function copyTemplateDirectory(sourceDir, destinationDir, context) {
  await fs.mkdir(destinationDir, { recursive: true });
  const entries = await fs.readdir(sourceDir, { withFileTypes: true });

  for (const entry of entries) {
    const sourcePath = path.join(sourceDir, entry.name);
    const destinationName = entry.name.endsWith('.hbs')
      ? entry.name.slice(0, -4)
      : entry.name;
    const destinationPath = path.join(destinationDir, destinationName);

    if (entry.isDirectory()) {
      await copyTemplateDirectory(sourcePath, destinationPath, context);
      continue;
    }

    if (entry.isFile()) {
      const raw = await fs.readFile(sourcePath, 'utf8');
      const rendered = raw.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (match, key) => {
        if (!(key in context)) {
          throw new Error(`Unknown template variable {{${key}}} in ${sourcePath}`);
        }
        return context[key];
      });

      await fs.writeFile(destinationPath, rendered, 'utf8');
    }
  }
}

function validatePackageName(name) {
  if (!name) {
    throw new Error('A package name is required. Usage: pnpm si new <name>');
  }

  const valid = /^[a-z0-9]+(?:[\-_][a-z0-9]+)*$/;
  if (!valid.test(name)) {
    throw new Error(
      'Package name must be lowercase alphanumeric and may include hyphens or underscores between segments.'
    );
  }
}

async function createPackage(packageName) {
  validatePackageName(packageName);
  await ensureTemplateDirectory();
  await fs.mkdir(PACKAGES_DIR, { recursive: true });

  const packageDir = path.join(PACKAGES_DIR, packageName);
  try {
    await fs.access(packageDir);
    throw new Error(`Package directory already exists: ${path.relative(ROOT_DIR, packageDir)}`);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }

  const context = {
    name: packageName,
    packageName: `@si/${packageName}`,
    camelName: toCamelCase(packageName),
    pascalName: toPascalCase(packageName),
    upperName: packageName.toUpperCase()
  };

  await copyTemplateDirectory(MANIFEST_TEMPLATE_DIR, packageDir, context);

  const relativePath = path.relative(ROOT_DIR, packageDir);
  console.log(`Created new package at ${relativePath}`);
}

async function main() {
  const [, , command, ...args] = process.argv;

  if (!command || command === '--help' || command === '-h') {
    console.log('Usage: pnpm si <command> [options]');
    console.log('Commands:');
    console.log('  new <name>    Scaffold a new package in packages/<name>');
    return;
  }

  if (command === 'new') {
    const [packageName] = args;
    try {
      await createPackage(packageName);
    } catch (error) {
      console.error(error.message ?? error);
      process.exitCode = 1;
    }
    return;
  }

  console.error(`Unknown command: ${command}`);
  process.exitCode = 1;
}

main();
