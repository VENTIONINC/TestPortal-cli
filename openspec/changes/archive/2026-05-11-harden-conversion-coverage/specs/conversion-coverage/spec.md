## ADDED Requirements

### Requirement: Provider fixture coverage
The test suite SHALL cover each registered provider with at least one fixture-driven conversion test that validates business-relevant `UnifiedReport` fields.

#### Scenario: Registered provider has fixture coverage
- **WHEN** a provider is registered in the provider registry
- **THEN** there MUST be a provider test that converts a representative source report for that provider and verifies framework identity, suites, test counts, statuses, durations, and error details where applicable

#### Scenario: NUnit provider coverage parity
- **WHEN** NUnit remains a registered provider
- **THEN** the test suite MUST include NUnit validation and conversion tests covering nested suites, passed tests, failed tests, skipped tests, pending-like statuses, durations, assertions, and failure messages

### Requirement: End-to-end CTRF pipeline coverage
The test suite SHALL cover the complete business conversion path from source report fixture to final CTRF output for every supported provider.

#### Scenario: Provider fixture converts to CTRF output
- **WHEN** a supported provider fixture is converted through the converter output path
- **THEN** the resulting CTRF report MUST preserve the provider tool name, summary counts, suite names, test names, statuses, durations, file paths, tags, retry/flaky indicators, and failure message or trace fields where applicable

#### Scenario: Dynamic CTRF fields are normalized
- **WHEN** a pipeline test asserts CTRF output
- **THEN** dynamic fields such as generated IDs, timestamps, stop time fallbacks, and environment details MUST be normalized or asserted with stable matchers

### Requirement: Converter orchestration coverage
The test suite SHALL cover converter orchestration behavior for validation, provider selection, output modes, webhook modes, and failure propagation.

#### Scenario: Output modes are covered
- **WHEN** `Converter.convertAndSave()` is called with stdout, explicit output, default output, webhook-only, and webhook-plus-output options
- **THEN** tests MUST verify the expected write, log, skip, and webhook behavior for each mode

#### Scenario: Output failure propagates
- **WHEN** writing CTRF output fails
- **THEN** `Converter.convertAndSave()` MUST reject with the output failure instead of reporting success

#### Scenario: Validation failures are covered
- **WHEN** the input file is missing, the input path is not a file, the provider is unsupported, or provider validation fails
- **THEN** converter tests MUST verify that a clear error is thrown before output or webhook work is attempted

### Requirement: Public entry point coverage
The test suite SHALL cover user-facing API and CLI behavior that can change conversion results or process outcomes.

#### Scenario: Library API honors output options
- **WHEN** the exported library conversion function is called with output or webhook options
- **THEN** tests MUST verify whether it performs conversion-only or conversion-and-save behavior according to the documented contract

#### Scenario: CLI parses user options
- **WHEN** the CLI receives input, provider type, output, stdout, webhook URL, headers, method, timeout, retries, retry delay, and SSL verification options
- **THEN** tests MUST verify the corresponding `ConvertOptions` and `WebhookConfig` values passed to the converter

#### Scenario: CLI reports invalid headers
- **WHEN** the CLI receives malformed JSON in `--headers`
- **THEN** it MUST print a clear error and exit with a non-zero status without attempting conversion

### Requirement: Coverage signal quality
Coverage configuration SHALL measure business logic meaningfully and enforce thresholds that prevent critical conversion gaps from returning.

#### Scenario: Type-only files do not dilute coverage
- **WHEN** coverage is collected
- **THEN** type-only files and generated artifacts MUST be excluded from threshold calculations unless they contain executable business logic

#### Scenario: Business logic thresholds are enforced
- **WHEN** the test suite runs with coverage
- **THEN** providers, core converter logic, and utility conversion logic MUST meet explicit thresholds high enough to catch missing provider or orchestration coverage

#### Scenario: Required validation commands pass
- **WHEN** the coverage hardening change is complete
- **THEN** `npm run typecheck`, `npm test`, `npm run test:coverage`, and `npm run build` MUST pass
