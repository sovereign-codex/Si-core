# Documentation

The documentation workspace aggregates guides, API references, and internal knowledge for Sovereign Intelligence. Phase 2 imports will map any standalone documentation repositories to `/docs/<repo>` so they can live alongside generated references.

## Structure

- `reference/` — Generated technical references. Avoid manual edits and regenerate via `pnpm docs:generate`.
- Markdown files at the root capture human-authored playbooks, architecture notes, and onboarding material.

## Authoring tips

- Keep content in Markdown and use relative links when referencing other files within the repository.
- Include front-matter metadata when publishing to external sites so downstream tooling can consume it.
- Run `pnpm docs:generate` after updating source schemas to refresh generated artifacts.
- Annotate imports from legacy documentation repos with their original URLs for traceability.
