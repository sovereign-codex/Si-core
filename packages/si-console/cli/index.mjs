#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import http from "node:http";

function log(message) {
  process.stdout.write(`${message}\n`);
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

  throw new Error(`Unknown command: ${command}`);
}
