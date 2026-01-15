#!/usr/bin/env bash
set -euo pipefail

root="$(git rev-parse --show-toplevel 2>/dev/null || echo .)"

mkdir -p "$root/codex/eir/tools" "$root/codex/eir/memory" "$root/codex/plans" "$root/scripts"

# 1) package.json
cat > "$root/codex/eir/package.json" <<'JSON'
{
  "name": "@si/eir",
  "private": true,
  "type": "module",
  "version": "0.1.0",
  "scripts": {
    "run": "node index.mjs",
    "plan": "node index.mjs --plan ../plans/phase3-import.eip.json",
    "dry": "node index.mjs --plan ../plans/phase3-import.eip.json --dry"
  },
  "dependencies": {}
}
JSON

# 2) policy.mjs
cat > "$root/codex/eir/policy.mjs" <<'JS'
export const POLICY = {
  allowTools: [
    "fs.write",
    "git.exec",
    "git.subtreeAdd",
    "git.commitPush",
    "github.listOrgRepos",
    "github.createPr"
  ],
  rules: {
    "git.exec": ({ args }) => {
      const cmd = (args || []).join(" ");
      if (/(reset\s+--hard|push\s+--force(?!-with-lease))/i.test(cmd)) {
        throw new Error(`policy: forbidden git command: ${cmd}`);
      }
    }
  }
};

export const SIGNING = {
  requireSignedPlans: false
};
JS

# 3) tools/git.mjs
cat > "$root/codex/eir/tools/git.mjs" <<'JS'
import { spawnSync } from "node:child_process";

export function sh(cmd, opts = {}) {
  const res = spawnSync(cmd, { shell: true, stdio: "pipe", encoding: "utf8", ...opts });
  if (res.status !== 0) throw new Error(`sh failed: ${cmd}\n${res.stdout}\n${res.stderr}`);
  return res.stdout.trim();
}

export const git = {
  exec(args = [], cwd = ".") { return sh(`git ${args.join(" ")}`, { cwd }); },
  ensureClean(cwd = ".") {
    const out = this.exec(["status", "--porcelain"], cwd);
    if (out) throw new Error(`git: working tree not clean in ${cwd}`);
  },
  subtreeAdd({ prefix, repoUrl, branch = "main", squash = true }, cwd = ".") {
    const flags = squash ? " --squash" : "";
    return this.exec(["subtree","add","--prefix",prefix,repoUrl,branch, ...(squash?["--squash"]:[])], cwd);
  },
  commitPush({ message, branch = "work" }, cwd = ".") {
    this.exec(["add","-A"], cwd);
    try { this.exec(["commit","-m",message], cwd); } catch {}
    this.exec(["push","origin",branch], cwd);
  }
};
JS

# 4) tools/github.mjs
cat > "$root/codex/eir/tools/github.mjs" <<'JS'
const API = "https://api.github.com";

function getToken() {
  const t = process.env.GH_PAT || process.env.GITHUB_TOKEN;
  if (!t) throw new Error("Missing GH_PAT (or GITHUB_TOKEN) in env");
  return t;
}

async function gh(path, init = {}) {
  const token = getToken();
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      "Authorization": `Bearer ${token}`,
      "Accept": "application/vnd.github+json",
      "User-Agent": "si-eir/0.1",
      ...(init.headers || {})
    }
  });
  if (!res.ok) throw new Error(`GitHub ${res.status}: ${path}\n${await res.text()}`);
  return res.json();
}

export const github = {
  async listOrgRepos(org, options = {}) {
    const { per_page = 100, type = "all" } = options;
    const repos = [];
    let page = 1;
    for (;;) {
      const data = await gh(`/orgs/${org}/repos?per_page=${per_page}&page=${page}&type=${type}`);
      repos.push(...data);
      if (data.length < per_page) break;
      page++;
    }
    return repos;
  },
  async createPr({ owner, repo, title, head, base = "main", body }) {
    return gh(`/repos/${owner}/${repo}/pulls`, {
      method: "POST",
      body: JSON.stringify({ title, head, base, body })
    });
  }
};
JS

# 5) tools/fs.mjs
cat > "$root/codex/eir/tools/fs.mjs" <<'JS'
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
export const fsx = { write({ path, content }) { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, content, "utf8"); } };
JS

# 6) memory/db.mjs
cat > "$root/codex/eir/memory/db.mjs" <<'JS'
import { writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
const LOG_DIR = ".codex/logs";
const LOG_FILE = join(LOG_DIR, "eir.jsonl");
export function logEvent(event) {
  try { mkdirSync(LOG_DIR, { recursive: true }); writeFileSync(LOG_FILE, JSON.stringify({ ts: new Date().toISOString(), ...event }) + "\n", { flag: "a" }); } catch {}
}
export function readEvents() {
  if (!existsSync(LOG_FILE)) return [];
  return readFileSync(LOG_FILE, "utf8").split("\n").filter(Boolean).map(l => JSON.parse(l));
}
JS

# 7) index.mjs
cat > "$root/codex/eir/index.mjs" <<'JS'
import { fsx } from "./tools/fs.mjs";
import { git } from "./tools/git.mjs";
import { github } from "./tools/github.mjs";
import { POLICY } from "./policy.mjs";
import { logEvent } from "./memory/db.mjs";
import { readFileSync } from "node:fs";
function argvFlag(n){return process.argv.includes(`--${n}`)}
function argvVal(n,d){const i=process.argv.indexOf(`--${n}`);return i>-1?process.argv[i+1]:d}
function checkToolAllowed(name,args){ if(!POLICY.allowTools.includes(name)) throw new Error(`policy: tool not allowed: ${name}`); const r=POLICY.rules[name]; if(r) r({args}); }
async function callTool(tool,args,ctx){ checkToolAllowed(tool,args); logEvent({kind:"tool",tool,args,ctx}); switch(tool){
  case "fs.write": return fsx.write(args);
  case "git.exec": return git.exec(args.args, ctx.cwd);
  case "git.subtreeAdd": return git.subtreeAdd(args, ctx.cwd);
  case "git.commitPush": return git.commitPush(args, ctx.cwd);
  case "github.listOrgRepos": return github.listOrgRepos(args.org, args.options);
  case "github.createPr": return github.createPr(args);
  default: throw new Error(`unknown tool: ${tool}`);
}}
function loadPlan(p){ return JSON.parse(readFileSync(new URL(p, import.meta.url).pathname, "utf8")); }
async function run(){
  const planPath = argvVal("plan","../plans/phase3-import.eip.json");
  const dry = argvFlag("dry");
  const cwd = argvVal("cwd",".");
  const plan = loadPlan(planPath);
  const ctx = { cwd, dry, meta: plan.meta };
  logEvent({kind:"plan:start", id: plan.meta.id, title: plan.meta.title, dry});
  for (const step of plan.steps){
    if (step.when==="dry-only" && !dry) continue;
    if (step.when==="live-only" && dry) continue;
    if (step.kind==="tool") {
      if (dry && String(step.tool).startsWith("git.")) { console.log("[dry]", step.tool, step.args||{}); continue; }
      await callTool(step.tool, step.args||{}, ctx);
    }
    if (step.kind==="for-each") {
      const list = await callTool(step.source.tool, step.source.args||{}, ctx);
      for (const item of list) {
        if (step.filter && !eval(step.filter)) continue;
        for (const t of step.do) {
          const templated = JSON.parse(JSON.stringify(t).replaceAll(/\{\{([^}]+)\}\}/g,(_,e)=>eval(e)));
          if (dry && String(templated.tool).startsWith("git.")) { console.log("[dry]", templated.tool, templated.args||{}); continue; }
          await callTool(templated.tool, templated.args||{}, ctx);
        }
      }
    }
  }
  logEvent({kind:"plan:end", id: plan.meta.id});
}
run().catch(e=>{ console.error(e.stack||e); process.exit(1); });
JS

# 8) plan file
cat > "$root/codex/plans/phase3-import.eip.json" <<'JSON'
{
  "meta": {
    "id": "phase3-import-001",
    "title": "Phase 3 — Sovereign import (ARCHIVE optional)",
    "createdBy": "Tyme",
    "createdAt": "2025-11-06T00:00:00Z",
    "archive": true,
    "defaultBranch": "work"
  },
  "steps": [
    { "kind": "tool", "tool": "git.exec", "args": { "args": ["checkout","-B","work"] } },
    {
      "kind": "for-each",
      "source": { "tool": "github.listOrgRepos", "args": { "org": "sovereign-codex" } },
      "filter": "(item.archived && meta.archive) || (!item.archived && !meta.archive) || true",
      "do": [
        {
          "tool": "git.subtreeAdd",
          "args": {
            "prefix": "archive/{{item.name}}",
            "repoUrl": "{{item.clone_url}}",
            "branch": "{{item.default_branch || 'main'}}",
            "squash": true
          }
        }
      ]
    },
    { "kind": "tool", "tool": "git.commitPush", "args": { "message": "Phase 3: imported sovereign-codex repositories", "branch": "work" } },
    { "kind": "tool", "tool": "github.createPr", "args": { "owner": "sovereign-codex", "repo": "Si-core", "title": "Phase 3: Sovereign imports (auto)", "head": "work", "base": "main", "body": "Created by EIR." } }
  ]
}
JSON

# 9) README
cat > "$root/codex/README-EIR.md" <<'MD'
# Executable Intelligence Runtime (EIR)

### Run
```bash
cd codex/eir
node -v
export GH_PAT="YOUR_FINE_GRAINED_TOKEN"
npm run dry     # preview
npm run plan    # execute
