## Why

The current test suite has broad provider-level coverage but does not fully protect the business-critical conversion path from source reports to final CTRF output. This matters now because recent attempts to remove an unnecessary transformation layer still introduced migration issues despite passing tests.

## What Changes

- Add coverage requirements for the complete conversion pipeline: provider input, unified report generation, CTRF serialization, and output behavior.
- Add golden or fixture-based tests that use real example reports for every supported provider.
- Add missing NUnit provider tests because NUnit is registered and shipped but currently has almost no executable coverage.
- Add converter orchestration tests for stdout, file output, webhook-only, webhook-plus-output, default output paths, invalid input, and output failure behavior.
- Add public API and CLI behavior coverage for user-visible conversion entry points.
- Raise the expected coverage bar around business logic while keeping type-only files and generated artifacts from distorting the signal.

## Capabilities

### New Capabilities
- `conversion-coverage`: Defines the expected test coverage for provider conversion, CTRF output, converter orchestration, CLI/API entry points, and regression protection around transformation-layer changes.

### Modified Capabilities

## Impact

- Affected code: `src/providers/*`, `src/core/converter.ts`, `src/utils/ctrf-converter.ts`, `src/utils/http-client.ts`, `src/index.ts`, and `src/cli.ts`.
- Affected tests: provider tests under `tests/`, new end-to-end conversion tests, NUnit tests, converter orchestration tests, API tests, and CLI tests.
- Affected configuration: Jest coverage collection and thresholds may need refinement so coverage reflects business logic rather than type definitions.
- No breaking API changes are intended.
