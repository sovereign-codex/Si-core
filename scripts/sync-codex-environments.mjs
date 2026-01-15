#!/usr/bin/env node
/* eslint-disable no-console */
import fs from 'node:fs/promises';
import path from 'node:path';

const fetchImpl = globalThis.fetch ?? (await import('node-fetch')).default;

const ORG = process.env.GITHUB_ORG || 'sovereign-codex';
const TOKEN = process.env.GITHUB_TOKEN;
const API_URL = `https://api.github.com`;
const OUTPUT_MD = path.resolve('CODEX_ENVIRONMENTS.md');
const OUTPUT_JSON = path.resolve('manifests/codex-environments.json');
const OVERRIDES_PATH = path.resolve('manifests/codex-environment-overrides.json');

const DEFAULT_CATEGORY = 'modules';
const CATEGORY_RULES = [
  {
    category: 'core',
    patterns: [
      /\bsi-core\b/i,
      /\bcore\b/i,
      /manifest/i,
      /shared/i,
      /infra/i,
      /kernel/i,
    ],
  },
  {
    category: 'archives',
    patterns: [
      /archive/i,
      /deprecated/i,
      /legacy/i,
      /prototype/i,
      /experiment/i,
      /old/i,
    ],
  },
];

const DEFAULT_ENABLE_STATUSES = new Set(['active']);

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    dryRun: false,
    output: OUTPUT_MD,
    json: OUTPUT_JSON,
    org: ORG,
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    switch (arg) {
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--org':
        options.org = args[++i] ?? options.org;
        break;
      case '--output':
        options.output = path.resolve(args[++i] ?? options.output);
        break;
      case '--json':
        options.json = path.resolve(args[++i] ?? options.json);
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

async function readOverrides() {
  try {
    const raw = await fs.readFile(OVERRIDES_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return {};
    }
    throw error;
  }
}

function applyCategory(repoName, repoDescription = '', overrideCategory) {
  if (overrideCategory) {
    return overrideCategory;
  }

  for (const { category, patterns } of CATEGORY_RULES) {
    if (patterns.some((pattern) => pattern.test(repoName) || pattern.test(repoDescription))) {
      return category;
    }
  }

  return DEFAULT_CATEGORY;
}

function applyStatus(repo, overrideStatus) {
  if (overrideStatus) {
    return overrideStatus;
  }

  if (repo.archived) {
    return 'archived';
  }

  const pushedAt = repo.pushed_at ? new Date(repo.pushed_at) : null;
  if (pushedAt) {
    const ninetyDaysAgo = new Date(Date.now() - 1000 * 60 * 60 * 24 * 90);
    if (pushedAt < ninetyDaysAgo) {
      return 'dormant';
    }
  }

  return 'active';
}

function applyDefaultEnabled(status, overrideValue) {
  if (typeof overrideValue === 'boolean') {
    return overrideValue;
  }

  return DEFAULT_ENABLE_STATUSES.has(status);
}

async function fetchAllRepos(org) {
  const repos = [];
  let page = 1;
  const perPage = 100;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const url = new URL(`${API_URL}/orgs/${org}/repos`);
    url.searchParams.set('per_page', perPage);
    url.searchParams.set('page', page);
    url.searchParams.set('type', 'all');

    const response = await fetchImpl(url, {
      headers: {
        'User-Agent': 'codex-sync-script',
        Accept: 'application/vnd.github+json',
        ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
      },
    });

    if (response.status === 404) {
      throw new Error(`GitHub organization "${org}" was not found or is inaccessible.`);
    }

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`GitHub API responded with ${response.status}: ${body}`);
    }

    const data = await response.json();
    repos.push(...data);

    if (data.length < perPage) {
      break;
    }

    page += 1;
  }

  return repos;
}

function formatMarkdown(repos) {
  const header = `# Codex Environments\n\n` +
    `> Generated automatically. Run \`node scripts/sync-codex-environments.mjs\` to refresh.\n\n` +
    `| Repository | URL | Category | Status | Default Enabled |\n` +
    `| --- | --- | --- | --- | --- |\n`;

  const rows = repos
    .map((repo) => {
      const defaultEnabled = repo.defaultEnabled ? 'yes' : 'no';
      return `| ${repo.name} | ${repo.html_url} | ${repo.category} | ${repo.status} | ${defaultEnabled} |`;
    })
    .join('\n');

  return header + rows + (rows ? '\n' : '');
}

async function writeFileIfChanged(filePath, content) {
  try {
    const existing = await fs.readFile(filePath, 'utf8');
    if (existing === content) {
      return false;
    }
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }

  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, 'utf8');
  return true;
}

async function syncWithCodex(environments) {
  const endpoint = process.env.CODEX_API_URL;
  const token = process.env.CODEX_API_TOKEN;

  if (!endpoint || !token) {
    return { skipped: true };
  }

  const url = new URL('/environments/sync', endpoint);
  const response = await fetchImpl(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ environments }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to sync environments with Codex: ${response.status} ${text}`);
  }

  return { skipped: false };
}

function sortEnvironments(a, b) {
  if (a.category !== b.category) {
    return a.category.localeCompare(b.category);
  }

  if (a.status !== b.status) {
    return a.status.localeCompare(b.status);
  }

  return a.name.localeCompare(b.name);
}

async function main() {
  const options = parseArgs();
  const overrides = await readOverrides();
  const repos = await fetchAllRepos(options.org);

  const environments = repos.map((repo) => {
    const override = overrides[repo.name] ?? {};
    const category = applyCategory(repo.name, repo.description, override.category);
    const status = applyStatus(repo, override.status);
    const defaultEnabled = applyDefaultEnabled(status, override.defaultEnabled);

    return {
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      html_url: repo.html_url,
      description: repo.description,
      archived: repo.archived,
      pushedAt: repo.pushed_at,
      category,
      status,
      defaultEnabled,
    };
  }).sort(sortEnvironments);

  const markdown = formatMarkdown(environments);
  const json = `${JSON.stringify({ generatedAt: new Date().toISOString(), org: options.org, environments }, null, 2)}\n`;

  if (!options.dryRun) {
    const mdUpdated = await writeFileIfChanged(options.output, markdown);
    const jsonUpdated = await writeFileIfChanged(options.json, json);

    console.log(mdUpdated ? `Updated ${options.output}` : `${options.output} already up to date.`);
    console.log(jsonUpdated ? `Updated ${options.json}` : `${options.json} already up to date.`);

    const syncResult = await syncWithCodex(environments);
    if (syncResult.skipped) {
      console.log('Skipped Codex sync (CODEX_API_URL or CODEX_API_TOKEN not configured).');
    } else {
      console.log('Codex environments synced successfully.');
    }
  } else {
    console.log(markdown);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
