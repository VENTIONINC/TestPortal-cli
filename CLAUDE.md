# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is test-report-ctrfer, a TypeScript CLI tool and library that converts test reports from various testing frameworks to CTRF (Common Test Results Format). The tool supports both local file output and remote webhook delivery with authentication and retry logic.

## Development Commands

**Build and Development:**

- `npm run build` - Compile TypeScript and resolve aliases
- `npm run dev` - Run CLI in development mode with ts-node
- `npm run clean` - Remove dist directory

**Testing:**

- `npm test` - Run all tests with Jest
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report

**Code Quality:**

- `npm run lint` - Lint TypeScript files
- `npm run lint:fix` - Auto-fix linting issues
- `npm run typecheck` - Type checking without emitting files
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check formatting without fixing
- `npm run headers:add` - Backfill the standard Apache 2.0 source header across `src` and `tests`
- `npm run new:file -- <path>` - Create a supported source file with the standard header

**Releasing:**

- See [docs/RELEASING.md](docs/RELEASING.md) for the full release flow (merge to main, bump version, tag, and push).

**CLI Testing:**
Use `npm run dev` to test CLI functionality during development:

```bash
npm run dev -- -i examples/playwright-example.json -t playwright -o output.json
```

## Architecture

### Core Components

**Converter System (`src/core/`):**

- `Converter` - Main orchestrator that handles conversion flow, output, and webhook delivery
- `ProviderRegistry` - Registry pattern for managing test framework providers

**Provider Pattern (`src/providers/`):**

- `BaseProvider` interface defines the contract for all providers
- Each provider implements `validate()` and `convert()` methods
- Currently supports Playwright, with extensible design for additional frameworks

**Type System (`src/types/`):**

- `ctrf.ts` - CTRF format schemas with Zod validation
- `providers.ts` - Provider interfaces and configuration types
- `webhook.ts` - Webhook configuration types
- Framework-specific types (e.g., `playwright.ts`)

**Utilities (`src/utils/`):**

- `http-client.ts` - HTTP client with retry logic and authentication
- `environment.ts` - CI/CD environment detection (GitHub Actions, GitLab, etc.)

### Path Aliases

The project uses TypeScript path aliases configured in `tsconfig.json`:

- `@/*` maps to `src/*`
- `@/types/*` maps to `src/types/*`
- `@/core/*` maps to `src/core/*`
- `@/providers/*` maps to `src/providers/*`
- `@/utils/*` maps to `src/utils/*`

Always use these aliases for imports within the codebase.

### Key Design Patterns

**Provider Pattern:** Each test framework is implemented as a provider that validates input format and converts to CTRF. New providers must implement `BaseProvider` interface.

**Registry Pattern:** The `ProviderRegistry` manages available providers and handles provider lookup by name.

**Async Orchestration:** The `Converter` class handles parallel execution of file output and webhook delivery using `Promise.allSettled()`.

**Validation Strategy:** Input validation happens at two levels - file existence/format validation and provider-specific format validation.

## Adding New Test Framework Providers

1. Create provider class in `src/providers/` implementing `BaseProvider` with `npm run new:file -- <path>`
2. Add framework-specific types in `src/types/`
3. Register provider in `ProviderRegistry.registerDefaultProviders()`
4. Add comprehensive tests following existing patterns
5. Update `SupportedProvider` type in `src/types/providers.ts`

## Testing Strategy

- **Unit Tests:** Each provider, converter, and utility is unit tested
- **Integration Tests:** End-to-end conversion testing with real test report examples
- **Mock Strategy:** HTTP client uses axios with mocked responses for webhook testing
- **Test Data:** Example files in `examples/` directory serve as test fixtures

Coverage threshold is set to 50% minimum across all metrics.

## CLI Binary

The CLI is built as `ctrf-convert` and entry point is `src/cli.ts`. The binary uses Commander.js for argument parsing and supports:

- Required: input file path and provider type
- Optional: output file, webhook URL, authentication, retry configuration
- Multiple output modes: file, stdout, webhook (can be combined)

## Dependencies

**Runtime:**

- `commander` - CLI argument parsing
- `axios` - HTTP client for webhooks
- `zod` - Runtime type validation and schema definition

**Development:**

- TypeScript with strict configuration
- Jest for testing with ts-jest preset
- ESLint + Prettier for code formatting
- `tsc-alias` for path alias resolution in build output
