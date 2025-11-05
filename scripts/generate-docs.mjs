#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packagesRoot = path.join(workspaceRoot, "packages");
const outputDir = path.join(workspaceRoot, "docs", "reference");

async function readJson(filePath) {
  const contents = await fs.readFile(filePath, "utf8");
  return JSON.parse(contents);
}

async function collectPackages() {
  const entries = await fs.readdir(packagesRoot, { withFileTypes: true });
  const packageDirs = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const baseDir = path.join(packagesRoot, entry.name);
    const packageJsonPath = path.join(baseDir, "package.json");
    try {
      await fs.access(packageJsonPath);
      packageDirs.push(baseDir);
    } catch {
      // Directory may contain nested packages (e.g., avot agents)
    }

    const nested = await fs.readdir(baseDir, { withFileTypes: true }).catch(() => []);
    for (const child of nested) {
      if (!child.isDirectory()) continue;
      const nestedDir = path.join(baseDir, child.name);
      const nestedPackageJson = path.join(nestedDir, "package.json");
      try {
        await fs.access(nestedPackageJson);
        packageDirs.push(nestedDir);
      } catch {
        // ignore
      }
    }
  }

  return packageDirs;
}

function extractDocBlocks(source) {
  const docs = [];
  const regex = /\/\*\*([\s\S]*?)\*\/\s*export\s+(?:async\s+)?(?:function|class|const|type|interface)\s+([A-Za-z0-9_]+)/g;
  let match;
  while ((match = regex.exec(source))) {
    const [, comment, name] = match;
    const formatted = comment
      .split("\n")
      .map((line) => line.replace(/^\s*\* ?/, "").trimEnd())
      .join("\n")
      .trim();
    docs.push({ name, comment: formatted });
  }
  return docs;
}

async function gatherSourceDocs(packageDir) {
  const srcDir = path.join(packageDir, "src");
  const docs = [];
  const stack = [srcDir];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;
    let entries;
    try {
      entries = await fs.readdir(current, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      const entryPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(entryPath);
      } else if (entry.isFile() && entry.name.endsWith(".ts")) {
        const source = await fs.readFile(entryPath, "utf8");
        docs.push(...extractDocBlocks(source));
      }
    }
  }

  return docs;
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

function slugifyPackageName(name) {
  return name.replace(/@/g, "").replace(/[\/]/g, "-");
}

async function generate() {
  await ensureDir(outputDir);
  const packageDirs = await collectPackages();
  const indexLines = ["# Sovereign Codex Reference", ""];

  for (const dir of packageDirs.sort()) {
    const pkg = await readJson(path.join(dir, "package.json"));
    const docs = await gatherSourceDocs(dir);
    const slug = slugifyPackageName(pkg.name);
    const filePath = path.join(outputDir, `${slug}.md`);
    const lines = [`# ${pkg.name}`, ""];
    if (pkg.description) {
      lines.push(pkg.description, "");
    }
    if (docs.length === 0) {
      lines.push("No exported documentation comments were found.");
    } else {
      for (const doc of docs) {
        lines.push(`## ${doc.name}`, "", doc.comment || "No description provided.", "");
      }
    }
    await fs.writeFile(filePath, lines.join("\n").trimEnd() + "\n");
    indexLines.push(`- [${pkg.name}](./${slug}.md)`);
  }

  await fs.writeFile(path.join(outputDir, "index.md"), indexLines.join("\n") + "\n");
  console.log(`Generated documentation for ${packageDirs.length} packages.`);
}

generate().catch((error) => {
  console.error("Failed to generate docs:", error);
  process.exitCode = 1;
});
