#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import http from "node:http";

function log(message) {
  process.stdout.write(`${message}\n`);
}

function parseRunFlags(args) {
  const flags = {
    enableAutoSync: false,
    includeDashboard: false,
    openPr: false,
    tokenEnvVar: null
  };

  const unknown = [];

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--enable-auto-sync") {
      flags.enableAutoSync = true;
      continue;
    }

    if (arg === "--include-dashboard") {
      flags.includeDashboard = true;
      continue;
    }

    if (arg === "--open-pr") {
      flags.openPr = true;
      continue;
    }

    if (arg === "--token") {
      const value = args[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error("Missing value for --token option.");
      }
      flags.tokenEnvVar = value;
      index += 1;
      continue;
    }

    if (arg.startsWith("--token=")) {
      const [, value] = arg.split("=", 2);
      if (!value) {
        throw new Error("Missing value for --token option.");
      }
      flags.tokenEnvVar = value;
      continue;
    }

    unknown.push(arg);
  }

  if (unknown.length > 0) {
    throw new Error(`Unknown options: ${unknown.join(", ")}`);
  }

  return flags;
}

async function loadPhaseTwoConfig(configPath) {
  try {
    const contents = await fs.readFile(configPath, "utf8");
    const parsed = JSON.parse(contents);
    if (!parsed || typeof parsed !== "object") {
      return { task: "create-monorepo-phase-2", history: [], lastRun: null };
    }
    parsed.history = Array.isArray(parsed.history) ? parsed.history : [];
    parsed.task = parsed.task ?? "create-monorepo-phase-2";
    return parsed;
  } catch (error) {
    if (error && error.code !== "ENOENT") {
      throw error;
    }
    return { task: "create-monorepo-phase-2", history: [], lastRun: null };
  }
}

async function savePhaseTwoConfig(configPath, config) {
  await fs.mkdir(path.dirname(configPath), { recursive: true });
  await fs.writeFile(configPath, JSON.stringify(config, null, 2) + "\n");
}

async function runCreateMonorepoPhaseTwo({ workspaceRoot, flags }) {
  const configPath = path.join(workspaceRoot, "manifests", "monorepo-phase-2.config.json");
  const config = await loadPhaseTwoConfig(configPath);

  const tokenEnvVar = flags.tokenEnvVar ?? "SOVEREIGN_IMPORT_TOKEN";
  const tokenAvailable = Boolean(process.env[tokenEnvVar]);

  const runAt = new Date().toISOString();
  const record = {
    runAt,
    autoSyncEnabled: Boolean(flags.enableAutoSync),
    includeDashboard: Boolean(flags.includeDashboard),
    openPrRequested: Boolean(flags.openPr),
    tokenEnvVar,
    tokenDetected: tokenAvailable
  };

  if (!tokenAvailable) {
    record.warnings = [`Environment variable ${tokenEnvVar} is not set.`];
  }

  const history = Array.isArray(config.history) ? [...config.history, record] : [record];
  const MAX_HISTORY = 20;
  while (history.length > MAX_HISTORY) {
    history.shift();
  }

  config.history = history;
  config.lastRun = record;

  await savePhaseTwoConfig(configPath, config);

  log("Monorepo Phase 2 automation configured:");
  log(`  auto sync: ${record.autoSyncEnabled ? "enabled" : "disabled"}`);
  log(`  dashboard: ${record.includeDashboard ? "included" : "skipped"}`);
  log(`  open PR: ${record.openPrRequested ? "requested" : "not requested"}`);
  log(`  token env: ${tokenEnvVar} (${tokenAvailable ? "detected" : "missing"})`);
  if (record.includeDashboard) {
    log("  hint: run `pnpm si ui` in a separate terminal to launch the dashboard.");
  }
  if (record.openPrRequested) {
    log("  hint: use your git provider CLI to open a PR after imports complete.");
  }
  if (!tokenAvailable) {
    log(`Warning: environment variable ${tokenEnvVar} is not defined. Imports may fail.`);
  }
  log("");
  log(`Configuration written to ${path.relative(workspaceRoot, configPath)}`);
}

async function runAutomationTask({ task, args, workspaceRoot }) {
  if (!task || task === "help" || task === "--help" || task === "-h") {
    log("Automation tasks:");
    log("  create-monorepo-phase-2  Configure the Phase 2 monorepo import workflow.");
    log("");
    log("Flags:");
    log("  --enable-auto-sync      Mark auto-sync as enabled for subsequent runs.");
    log("  --include-dashboard     Record that the dashboard should be launched.");
    log("  --open-pr               Indicate that a follow-up PR should be opened.");
    log("  --token <ENV>           Name of the env var providing the GitHub token.");
    return;
  }

  if (task === "create-monorepo-phase-2") {
    const flags = parseRunFlags(args);
    await runCreateMonorepoPhaseTwo({ workspaceRoot, flags });
    return;
  }

  throw new Error(`Unknown automation task: ${task}`);
}

function toSlug(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toTitle(value) {
  return value
    .trim()
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

async function readTemplate(workspaceRoot) {
  const templatePath = path.join(
    workspaceRoot,
    "packages",
    "manifests",
    "templates",
    "agent",
    "manifest.template.json"
  );
  const contents = await fs.readFile(templatePath, "utf8");
  return JSON.parse(contents);
}

async function generateAgentPackage({
  name,
  workspaceRoot
}) {
  const slug = toSlug(name);
  if (!slug) {
    throw new Error(`Unable to derive a slug from "${name}".`);
  }

  const packageDir = path.join(workspaceRoot, "packages", "avot", slug);
  try {
    await fs.access(packageDir);
    throw new Error(`Package already exists at ${path.relative(workspaceRoot, packageDir)}`);
  } catch (error) {
    if (error && error.code !== "ENOENT") {
      throw error;
    }
  }

  await fs.mkdir(packageDir, { recursive: true });
  await fs.mkdir(path.join(packageDir, "src"), { recursive: true });

  const title = toTitle(name);
  const packageName = `@sovereign-codex/avot-${slug}`;
  const manifestTemplate = await readTemplate(workspaceRoot);
  const manifest = {
    ...manifestTemplate,
    id: `avot:${slug}`,
    name: title,
    version: manifestTemplate.version ?? "0.1.0",
    entry: "./dist/index.js",
    description: manifestTemplate.description?.replace("{{name}}", title) ?? `${title} agent`,
    tags: manifestTemplate.tags ?? ["agent"],
    metadata: {
      ...(manifestTemplate.metadata ?? {}),
      generatedAt: new Date().toISOString()
    }
  };

  const packageJson = {
    name: packageName,
    version: "0.1.0",
    private: true,
    type: "module",
    main: "dist/index.js",
    types: "dist/index.d.ts",
    files: ["dist", "manifest.json", "README.md"],
    scripts: {
      build: "tsc -p tsconfig.json",
      lint: 'echo "lint not yet configured for this agent"',
      test: 'echo "tests not yet implemented for this agent"',
      typecheck: "tsc -p tsconfig.json --noEmit"
    },
    dependencies: {
      "@sovereign-codex/shared-utils": "workspace:*",
      "@sovereign-codex/avot": "workspace:*"
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

  const readme = `# ${packageName}\n\nGenerated via \`pnpm si new ${name}\`. Customize the agent implementation in \`src/index.ts\`.\n`;

  const source = `import { isoDate } from "@sovereign-codex/shared-utils";\n\nexport function describe() {\n  return "${title} agent initialized at " + isoDate(new Date());\n}\n`;

  const manifestPath = path.join(packageDir, "manifest.json");
  manifest["$schema"] = "../../../manifests/avot.schema.json";

  await Promise.all([
    fs.writeFile(path.join(packageDir, "package.json"), JSON.stringify(packageJson, null, 2) + "\n"),
    fs.writeFile(path.join(packageDir, "tsconfig.json"), JSON.stringify(tsconfig, null, 2) + "\n"),
    fs.writeFile(path.join(packageDir, "README.md"), readme),
    fs.writeFile(path.join(packageDir, "src", "index.ts"), source),
    fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n")
  ]);

  log(`Created agent package ${packageName}`);
  log(`Location: ${path.relative(workspaceRoot, packageDir)}`);
}

async function startUi({ workspaceRoot }) {
  const registryPath = path.join(workspaceRoot, "lattice", "registry.json");
  let registry = { agents: [] };
  try {
    const contents = await fs.readFile(registryPath, "utf8");
    registry = JSON.parse(contents);
  } catch (error) {
    if (error && error.code !== "ENOENT") {
      throw error;
    }
  }

  const server = http.createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    const body = `<!doctype html><html><head><title>Sovereign Codex</title>
<style>body{font-family:system-ui;padding:2rem;background:#0f172a;color:#e2e8f0;}table{border-collapse:collapse;width:100%;margin-top:1rem;}th,td{border:1px solid #1e293b;padding:0.5rem;text-align:left;}th{background:#1e293b;}a{color:#38bdf8;}</style></head><body>
<h1>Agent & Lattice Dashboard</h1>
<p>Snapshot generated at ${new Date().toISOString()}</p>
<table><thead><tr><th>ID</th><th>Name</th><th>Version</th><th>Status</th></tr></thead><tbody>
${registry.agents
  .map(
    (agent) =>
      `<tr><td>${agent.id}</td><td>${agent.name}</td><td>${agent.version}</td><td>${agent.status ?? "unknown"}</td></tr>`
  )
  .join("")}
</tbody></table>
</body></html>`;
    res.end(body);
  });

  await new Promise((resolve) => {
    server.listen(0, resolve);
  });

  const address = server.address();
  if (address && typeof address === "object") {
    log(`Agent dashboard available at http://localhost:${address.port}`);
  } else {
    log("Agent dashboard listening");
  }

  log("Press Ctrl+C to stop the dashboard.");

  await new Promise(() => {});
}

export async function runConsole({ args, workspaceRoot }) {
  const [command, ...rest] = args;

  if (!command || command === "help" || command === "--help" || command === "-h") {
    log("Sovereign Codex Console\\n");
    log("Commands:");
    log("  new <name>   Create a new AVOT agent package from the manifest template.");
    log("  ui           Launch the local agent/lattice dashboard.");
    log("  run          Execute Codex automation tasks (see `codex run --help`).");
    return;
  }

  if (command === "new") {
    const [name] = rest;
    if (!name) {
      throw new Error("Usage: pnpm si new <name>");
    }

    await generateAgentPackage({ name, workspaceRoot });
    return;
  }

  if (command === "ui") {
    await startUi({ workspaceRoot });
    return;
  }

  if (command === "run") {
    const [task, ...taskArgs] = rest;
    await runAutomationTask({ task, args: taskArgs, workspaceRoot });
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}
