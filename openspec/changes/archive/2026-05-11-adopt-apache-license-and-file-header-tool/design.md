## Context

The CLI repository currently uses MIT licensing and does not have contributor-facing automation for standard Apache 2.0 file headers. The backend repository now has an Apache 2.0 `LICENSE`, contributor guidance, a `new:file` command, and a scoped bulk header backfill command. The CLI repo should adopt the same overall workflow while respecting its different folder layout (`src` and `tests`).

## Goals / Non-Goals

**Goals:**
- Establish Apache 2.0 as the canonical CLI repository license in source control, package metadata, and contributor-facing docs.
- Provide `npm run new:file -- <path>` for creating supported source files with the standard header.
- Provide `npm run headers:add` for backfilling supported files in `src` and `tests`.
- Document the contribution and header workflow in `README.md`, `CONTRIBUTING.md`, and `AGENTS.md`.

**Non-Goals:**
- Retroactively adding headers to generated output such as `dist/`.
- Expanding header support to non-source formats like Markdown, JSON, or YAML.
- Changing CLI runtime features, provider behavior, or release automation.

## Decisions

### Adopt standard Apache 2.0 repository artifacts

The repository will replace the current MIT `LICENSE` text with the standard Apache License 2.0 text, update `package.json` and `package-lock.json` to `Apache-2.0`, and update `README.md` to reference the root `LICENSE` file.

### Reuse the backend-style lightweight Node scripts

The repository will add `scripts/license-header-utils.js`, `scripts/new-file.js`, and `scripts/add-license-headers.js`. This mirrors the backend setup so future maintenance stays consistent across repos.

### Scope bulk header backfill to CLI source and tests

The CLI bulk header command will scan only `src` and `tests`, because those are the repository's supported source and test directories. It will skip `dist`, `docs`, `examples`, and other non-source locations.

### Add explicit contributor and agent guidance

`CONTRIBUTING.md` and `AGENTS.md` will be updated to mention Apache 2.0, `npm run new:file`, and `npm run headers:add`, so both human contributors and coding agents follow the same workflow.

## Risks / Trade-offs

- [Header scope is too broad] → Limit the bulk command to `src` and `tests`.
- [Docs drift across repos] → Mirror the backend structure and wording where practical.
- [Generated files receive headers accidentally] → Keep `dist/` and other non-source directories out of scope.

## Migration Plan

1. Update root licensing artifacts and package metadata to Apache 2.0.
2. Add contributor and agent documentation for the new workflow.
3. Add `new:file` and `headers:add` scripts.
4. Run the bulk header backfill against `src` and `tests`.
5. Validate the new commands and existing repo checks.

## Open Questions

- None for this aligned rollout.
