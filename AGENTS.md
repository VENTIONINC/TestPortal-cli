# AI Development Guidelines

This project is a Node.js CLI and TypeScript library for converting test reports
into unified format.

## Setup
- Requires **Node.js v18** or newer.
- Install dependencies with `npm install`.

## Development
- Source files are in `src/` and tests are in `tests/`.
- Use `npm run build` to compile TypeScript to `dist/`.
- Keep code style consistent by running `npm run format` and `npm run lint` before
  committing.
- Run the test suite with `npm test` and ensure it passes.

## Contributing
- When adding a new provider, register it in `src/core/provider-registry.ts` and
  include accompanying tests under `tests/`.
- Update documentation in `README.md` and `docs/` when functionality changes.
- Do not commit generated files such as `dist/` or `node_modules/`.

## Commit Guidance
- Follow clear commit messages summarizing your change.
- Keep pull requests focused and include relevant tests and documentation.

