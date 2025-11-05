#!/usr/bin/env node
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);

async function loadConsoleCli() {
  const candidateModules = [
    "@sovereign-codex/si-console/cli",
    "@sovereign-codex/si-console/dist/cli.js",
    "@sovereign-codex/si-console/dist/cli/index.js"
  ];

  for (const id of candidateModules) {
    try {
      return await import(id);
    } catch (error) {
      if (error && error.code !== "ERR_MODULE_NOT_FOUND") {
        console.warn(`Failed to load ${id}:`, error.message ?? error);
      }
    }
  }

  const fallbackPaths = [
    path.join(workspaceRoot, "packages", "si-console", "dist", "cli.js"),
    path.join(workspaceRoot, "packages", "si-console", "dist", "cli", "index.js"),
    path.join(workspaceRoot, "packages", "si-console", "cli", "index.mjs")
  ];

  for (const fallback of fallbackPaths) {
    try {
      const resolved = pathToFileURL(fallback).href;
      return await import(resolved);
    } catch (error) {
      if (error && error.code !== "ERR_MODULE_NOT_FOUND") {
        console.warn(`Failed to load fallback ${fallback}:`, error.message ?? error);
      }
    }
  }

  throw new Error(
    "Unable to locate @sovereign-codex/si-console CLI. Ensure dependencies are installed or build the console package."
  );
}

const { runConsole } = await loadConsoleCli();

try {
  await runConsole({ args, workspaceRoot });
} catch (error) {
  console.error(error?.message ?? error);
  process.exitCode = 1;
}
