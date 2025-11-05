#!/usr/bin/env node
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs/promises";

const [, , rawName] = process.argv;

if (!rawName) {
  console.error("Usage: pnpm bootstrap:avot <name>");
  process.exit(1);
}

const slug = rawName
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9-]+/g, "-")
  .replace(/-{2,}/g, "-")
  .replace(/^-+|-+$/g, "");

if (!slug) {
  console.error(`Cannot derive a package name from "${rawName}".`);
  process.exit(1);
}

const __filename = fileURLToPath(import.meta.url);
const workspaceRoot = path.resolve(path.dirname(__filename), "..");
const packageDir = path.join(workspaceRoot, "packages", "avot", slug);

try {
  await fs.access(packageDir);
  console.error(`Directory already exists: ${packageDir}`);
  process.exit(1);
} catch {
  // Directory does not exist; continue
}

await fs.mkdir(packageDir, { recursive: true });
await fs.mkdir(path.join(packageDir, "src"), { recursive: true });

const packageJson = {
  name: `@sovereign-intelligence/avot-${slug}`,
  version: "0.1.0",
  private: true,
  type: "module",
  main: "dist/index.js",
  types: "dist/index.d.ts",
  scripts: {
    build: "tsc -p tsconfig.json",
    lint: "echo \"lint not yet configured for this AVOT package\"",
    test: "echo \"tests not yet implemented for this AVOT package\""
  },
  dependencies: {
    "@sovereign-intelligence/shared": "workspace:*"
  },
  devDependencies: {
    typescript: "^5.4.5"
  }
};

const tsconfig = {
  extends: "../../../tsconfig.base.json",
  compilerOptions: {
    outDir: "dist"
  },
  include: ["src/**/*"],
  exclude: ["dist", "node_modules"]
};

const readme = `# @sovereign-intelligence/avot-${slug}\n\nGenerated via \`pnpm bootstrap:avot ${rawName}\`. Add service-specific AVOT logic here.\n`;

const source = `import { isoDate } from "@sovereign-intelligence/shared";\n\nexport function describe() {\n  return \"${slug} AVOT package generated at \" + isoDate(new Date());\n}\n`;

await Promise.all([
  fs.writeFile(path.join(packageDir, "package.json"), JSON.stringify(packageJson, null, 2) + "\n"),
  fs.writeFile(path.join(packageDir, "tsconfig.json"), JSON.stringify(tsconfig, null, 2) + "\n"),
  fs.writeFile(path.join(packageDir, "README.md"), readme),
  fs.writeFile(path.join(packageDir, "src", "index.ts"), source)
]);

console.log(`Created AVOT package @sovereign-intelligence/avot-${slug}`);
console.log(`Location: ${path.relative(workspaceRoot, packageDir)}`);
console.log("Run 'pnpm install' to link dependencies if necessary.");
