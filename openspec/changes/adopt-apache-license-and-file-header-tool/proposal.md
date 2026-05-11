## Why

The CLI repository currently declares MIT licensing in multiple places and does not provide a standardized way to create or backfill source-file license headers. We want the CLI repo to align with the backend so repository licensing, contributor guidance, and source-file header workflows stay consistent across the project.

## What Changes

- Adopt Apache 2.0 as the CLI repository's declared license and add the standard license text to the repo.
- Update repository metadata and top-level documentation so contributors can clearly see the active license and contribution expectations.
- Add a lightweight `npm run new:file` command that creates a file with a predefined Apache 2.0 header.
- Add a scoped `npm run headers:add` command that backfills the standard header across supported files in `src` and `tests`.
- Add guidance describing when the file-creation and header-backfill flows should be used and how contributions are accepted under the project license.

## Capabilities

### New Capabilities
- `repository-licensing`: Defines how the CLI repository declares, documents, and distributes its Apache 2.0 licensing information.
- `file-header-scaffolding`: Defines the `npm run new:file` and `npm run headers:add` workflows for creating and backfilling files with the required Apache 2.0 header.
- `contribution-guidance`: Defines the minimum contributor guidance needed to align new contributions with the repository's license and file-header policy.

### Modified Capabilities

None.

## Impact

- Affected files include `package.json`, `package-lock.json`, `README.md`, `AGENTS.md`, `LICENSE`, a new `CONTRIBUTING.md`, new scripts under `scripts/`, and source/test files backfilled with headers.
- The change affects repository governance and developer workflow, but does not change CLI runtime behavior.
- The new commands become part of the expected workflow for creating and maintaining supported source files.
