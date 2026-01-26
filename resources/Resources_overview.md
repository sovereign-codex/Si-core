# Resources

This directory will store shared static assets, templates, seed data, and other non-code resources as they are imported into the monorepo. Repositories that primarily contain design systems, media, or configuration snapshots will land under `/resources/<repo>` when Phase 2 imports begin.

## Guidelines

- Keep large binary assets out of Git LFS until the import process confirms size requirements.
- Organise resources by source repository to retain provenance.
- Document any build or publishing steps in a local `README.md` inside each imported folder.
