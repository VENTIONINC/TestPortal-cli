## 1. Baseline And Test Infrastructure

- [x] 1.1 Review current Jest coverage configuration and decide which type-only files should be excluded from coverage collection.
- [x] 1.2 Add shared test helpers for temporary report files, temporary output directories, stdout spying, stderr spying, and dynamic CTRF field normalization.
- [x] 1.3 Add reusable fixture helpers for converting source reports through `Converter.convertAndSave()` and reading the resulting CTRF JSON.

## 2. Provider Coverage

- [x] 2.1 Add `tests/nunit-provider.test.ts` covering NUnit validation, nested suite conversion, statuses, durations, assertions, failure extraction, and calculated stats.
- [x] 2.2 Add or adjust provider tests so each registered provider has at least one representative fixture conversion test.
- [x] 2.3 Add focused provider tests for uncovered business branches in Playwright final status mapping, Vitest error/location fallback behavior, Mocha fallback status behavior, and CTRF status mapping.

## 3. End-To-End CTRF Pipeline Coverage

- [x] 3.1 Add fixture-to-CTRF pipeline tests for Playwright, Cypress, Jest, JUnit, Vitest, NUnit, Mocha, Pytest, and TestNG.
- [x] 3.2 Assert stable CTRF contract fields for each provider: tool name, summary counts, suite names, test names, statuses, durations, file paths, retry/flaky data, tags, and failure details where applicable.
- [x] 3.3 Normalize or matcher-assert dynamic CTRF fields such as timestamps, environment data, generated IDs, and fallback stop times.

## 4. Converter Orchestration Coverage

- [x] 4.1 Add tests for `Converter.convertAndSave()` stdout output, explicit file output, default file output, webhook-only behavior, and webhook-plus-output behavior.
- [x] 4.2 Add tests proving missing files, non-file input paths, unsupported providers, and provider validation failures stop before output or webhook work.
- [x] 4.3 Add a regression test proving output write failures reject instead of being swallowed.
- [x] 4.4 Fix `Converter.convertAndSave()` failure propagation if the new regression test exposes the current swallowed output error.

## 5. Public API And CLI Coverage

- [x] 5.1 Add tests for the exported library `convert()` function covering conversion-only, output, and webhook option behavior.
- [x] 5.2 Fix the exported library `convert()` implementation if tests confirm output options are ignored or conversion runs twice.
- [x] 5.3 Add CLI tests for option parsing into `ConvertOptions` and `WebhookConfig`, including env webhook fallback, headers, method, timeout, retries, retry delay, and SSL verification.
- [x] 5.4 Add CLI tests for malformed `--headers` JSON and conversion failure exit behavior.

## 6. Coverage Thresholds And Validation

- [x] 6.1 Update Jest coverage collection and thresholds so provider, core, and utility business logic gaps fail coverage checks.
- [x] 6.2 Run `npm run typecheck` and fix any TypeScript issues.
- [x] 6.3 Run `npm test` and fix failing tests.
- [x] 6.4 Run `npm run test:coverage` and verify the new thresholds pass.
- [x] 6.5 Run `npm run build` and verify the package still compiles.
