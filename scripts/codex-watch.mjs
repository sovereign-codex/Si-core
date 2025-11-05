#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const registryPath = path.join(workspaceRoot, "lattice", "registry.json");
const codexPath = path.join(workspaceRoot, "CODEX.md");

async function loadJson(filePath, fallback = {}) {
  try {
    const contents = await fs.readFile(filePath, "utf8");
    return JSON.parse(contents);
  } catch (error) {
    if (error && error.code !== "ENOENT") {
      throw error;
    }
    return fallback;
  }
}

async function listAgentPackages() {
  const agentsRoot = path.join(workspaceRoot, "packages", "avot");
  let entries = [];
  try {
    entries = await fs.readdir(agentsRoot, { withFileTypes: true });
  } catch {
    return [];
  }

  const agents = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const manifestPath = path.join(agentsRoot, entry.name, "manifest.json");
    try {
      const manifest = await loadJson(manifestPath, null);
      if (manifest) {
        agents.push({
          slug: entry.name,
          id: manifest.id,
          name: manifest.name,
          version: manifest.version,
          description: manifest.description ?? "",
          tags: manifest.tags ?? []
        });
      }
    } catch {
      // ignore invalid manifest files
    }
  }
  return agents;
}

async function writeSnapshot() {
  const registry = await loadJson(registryPath, { agents: [] });
  const agents = await listAgentPackages();
  const timestamp = new Date().toISOString();
  const lines = [];
  lines.push(`## Snapshot ${timestamp}`);
  lines.push("");
  lines.push("### Registry Agents");
  lines.push("");
  if (registry.agents?.length) {
    for (const agent of registry.agents) {
      lines.push(`- ${agent.id} (${agent.version}) — ${agent.status ?? "unknown"}`);
    }
  } else {
    lines.push("- No registry entries found.");
  }
  lines.push("");
  lines.push("### Discovered Agent Packages");
  lines.push("");
  if (agents.length) {
    for (const agent of agents) {
      const tags = agent.tags.length ? ` [${agent.tags.join(", ")}]` : "";
      lines.push(`- ${agent.id} (${agent.version})${tags}`);
      if (agent.description) {
        lines.push(`  - ${agent.description}`);
      }
    }
  } else {
    lines.push("- No agent packages discovered in packages/avot");
  }
  lines.push("");

  const snapshot = lines.join("\n");
  try {
    await fs.access(codexPath);
  } catch {
    await fs.writeFile(codexPath, `# Sovereign Codex Watch\n\n${snapshot}`);
    return;
  }
  await fs.appendFile(codexPath, `\n${snapshot}`);
}

writeSnapshot().catch((error) => {
  console.error("Failed to update CODEX.md:", error);
  process.exitCode = 1;
});
