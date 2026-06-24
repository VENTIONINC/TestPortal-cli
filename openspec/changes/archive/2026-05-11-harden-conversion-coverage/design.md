## Context

The repository converts reports from multiple test frameworks into `UnifiedReport`, then serializes that representation to CTRF for output and webhook delivery. Existing tests cover many individual provider mappings, but the highest-risk path crosses several modules: provider selection, validation, source report conversion, CTRF conversion, output handling, and public entry points.

Recent migration work showed that provider-level tests alone can pass while business behavior regresses. The current coverage report also hides important gaps: `NUnitProvider` is registered but barely covered, `Converter.convertAndSave()` is under-tested, and `src/index.ts` and `src/cli.ts` have no executable coverage.

## Goals / Non-Goals

**Goals:**

- Protect every supported provider with at least one real fixture-to-CTRF pipeline test.
- Add focused tests for uncovered business logic in `NUnitProvider`, `Converter`, public API exports, and CLI option handling.
- Verify output behavior, including stdout, explicit file output, default file output, webhook-only behavior, and failure propagation.
- Make coverage reporting reflect business logic by excluding type-only files where appropriate and raising meaningful thresholds.
- Create a regression safety net before changing or removing transformation-layer code.

**Non-Goals:**

- Redesign the report model or remove the transformation layer in this change.
- Add new providers or change provider output semantics except where tests reveal an existing bug.
- Commit generated `coverage/`, `dist/`, or fixture output files.
- Replace Jest or introduce a new test runner.

## Decisions

1. Use fixture-driven pipeline tests for conversion correctness.

   Real example reports in `examples/` and small dedicated fixtures will feed `Converter.convertAndSave()` and assert final CTRF JSON. This protects the user-visible output contract better than testing only intermediate `UnifiedReport` structures.

   Alternative considered: unit-test each private mapper more exhaustively. That would increase line coverage but still leave orchestration and final output behavior weak.

2. Keep provider unit tests, but add missing and targeted edge coverage.

   Existing provider tests remain valuable because they isolate status mapping, grouping, retries, duration parsing, and error extraction. NUnit needs parity with the other providers, and selected uncovered branches in Playwright, Vitest, Mocha, CTRF conversion, and HTTP error handling should be covered where they reflect business behavior.

   Alternative considered: rely only on golden end-to-end tests. That would catch output regressions but make failures harder to diagnose.

3. Test the public entry points as behavior, not implementation.

   `src/index.ts` should be tested through exported functions and types where possible. CLI tests should invoke the compiled or ts-jest-loaded CLI in controlled subprocesses or by isolating commander behavior, while mocking network calls and avoiding real external services.

   Alternative considered: leave CLI untested because it is thin. The CLI contains env fallback, JSON parsing, option coercion, and process exit behavior, so it is business-facing enough to warrant tests.

4. Treat output failures as required behavior.

   `convertAndSave()` should fail when output writing fails. Tests should pin this behavior before or alongside implementation fixes, because silently swallowing output failures can make successful CLI runs lose reports.

   Alternative considered: log output failures and continue when webhook succeeds. That makes automation harder to trust and should only be introduced as an explicit product decision.

5. Refine coverage thresholds around source behavior.

   Coverage collection should exclude type-only files and avoid counting generated artifacts. Thresholds should be raised for providers, core, and utils after the new tests land. Global thresholds alone are too blunt for this repository.

   Alternative considered: only raise the global threshold. That can still hide gaps in core orchestration if provider tests dominate the total.

## Risks / Trade-offs

- Golden tests can become brittle when CTRF output intentionally changes -> Keep assertions focused on contract fields and normalize dynamic fields such as IDs, timestamps, and environment data.
- CLI tests can be slow or flaky if they spawn unnecessary processes -> Prefer narrow subprocess tests and mock webhook/network behavior.
- Raising thresholds too early can block unrelated work -> Raise thresholds after new tests are committed and choose per-directory thresholds that match actual business risk.
- Real fixtures may not cover enough provider edge cases -> Combine one pipeline test per provider with focused unit tests for high-risk status, duration, error, retry, and grouping logic.
- Tests may reveal existing behavior bugs -> Fix bugs when the expected behavior is clear; otherwise capture them as explicit follow-up tasks before changing semantics.
