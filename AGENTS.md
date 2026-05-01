# AI Development Guidelines

This project is a Node.js CLI and TypeScript library for converting test reports
into unified format.

## Setup

- Requires **Node.js v18** or newer.
- Install dependencies with `npm install`.

## Development

- Source files are in `src/` and tests are in `tests/`.
- Use `npm run build` to compile TypeScript to `dist/`.
- Prefer the existing path aliases such as `@/core/*`, `@/providers/*`,
  `@/types/*`, and `@/utils/*` where they improve clarity.
- Keep strict TypeScript compatibility. Avoid introducing new `any` usage unless
  there is a clear reason, but note that some existing code still uses `any`.
- Types are often defined in `src/types/`, but some helper and implementation
  types are intentionally colocated with the code that uses them.
- Organize imports consistently with the surrounding file style rather than
  assuming a globally enforced import-order rule.

## Verification

- Before committing, run `npm run format`, `npm run typecheck`,
  `npm run lint`, `npm test`, and `npm run build`.
- Treat `npm test` and `npm run typecheck` as required validation steps, not
  optional extras.

## Contributing

- When adding a new provider, register it in `src/core/provider-registry.ts` and
  include accompanying tests under `tests/`.
- Update documentation in `README.md` and `docs/` when functionality changes.
- Do not commit generated files such as `dist/` or `node_modules/`.

## Commit Guidance

- Follow clear commit messages summarizing your change.
- Keep pull requests focused and include relevant tests and documentation.

## Releasing

The release process is automated via GitHub Actions triggered by tags. See [docs/RELEASING.md](docs/RELEASING.md) for the full release flow.
