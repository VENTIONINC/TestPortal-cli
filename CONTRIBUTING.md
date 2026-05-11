# Contributing

## License

This project is licensed under the Apache License 2.0. By submitting a contribution, you agree that your contribution will be licensed under Apache-2.0.

See [LICENSE](LICENSE) for the full terms.

## Development Workflow

1. Install dependencies with `npm install`.
2. Use `npm run dev` for local development.
3. Use `npm run new:file -- <path>` when creating a new supported source file so the standard license header is applied automatically.
4. Use `npm run headers:add` when you need to backfill the standard header across existing supported files in `src` and `tests`.

Supported file types for `npm run new:file`:
- `.ts`
- `.tsx`
- `.js`
- `.jsx`
- `.mjs`
- `.cjs`

Unsupported extensions fail with a clear error. For formats such as Markdown, JSON, YAML, or shell scripts, create the file manually until explicit support is added.

## Validation

Before opening a pull request, run:

1. `npm run format`
2. `npm run typecheck`
3. `npm run lint`
4. `npm test`
5. `npm run build`

## Code Style

- Prefer the repository path aliases such as `@/core/*`, `@/providers/*`, `@/types/*`, and `@/utils/*` where they improve clarity.
- Keep strict TypeScript compatibility and avoid introducing new `any` usage unless there is a clear reason.
- When adding a new provider, register it in `src/core/provider-registry.ts` and include accompanying tests under `tests/`.
