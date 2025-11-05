# Documentation

The documentation workspace contains published guides, API references, and internal knowledge for Sovereign Intelligence.

## Structure

- `reference/` — Generated technical references. Avoid manual edits and regenerate via `pnpm docs:generate`.
- Markdown files at the root capture human-authored playbooks, architecture notes, and onboarding material.

## Authoring tips

- Keep content in Markdown and use relative links when referencing other files within the repository.
- Include front-matter metadata when publishing to external sites so downstream tooling can consume it.
- Run `pnpm docs:generate` after updating source schemas to refresh generated artifacts.
