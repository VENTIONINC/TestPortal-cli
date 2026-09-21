# TestPortal CLI

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)

TestPortal helps teams centralize test results, investigate failures, and track issues across projects. This repository contains its TypeScript command-line tool and Node.js library for converting test reports and delivering them to TestPortal.

## What you can do

- Convert reports from nine testing frameworks and report formats.
- Write Common Test Report Format (CTRF) JSON to a file or the console.
- Upload CTRF reports to TestPortal or compatible custom webhooks with configurable retries and headers.
- Include CI, execution type, and test environment metadata in reports.
- Use the conversion library directly from Node.js.

## TestPortal ecosystem

| Repository                                                       | Role                                                                             |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| [Frontend](https://github.com/VENTIONINC/TestPortal-client)      | Web interface for results, issues, and dashboards.                               |
| [Backend](https://github.com/VENTIONINC/TestPortal-backend)      | REST API, MCP server, authentication, and data storage.                          |
| [CLI](https://github.com/VENTIONINC/TestPortal-cli)              | Report conversion and delivery from local runs or CI pipelines; this repository. |
| [Infrastructure](https://github.com/VENTIONINC/TestPortal-infra) | Infrastructure configuration for TestPortal deployments.                         |

```text
Framework report → TestPortal CLI → CTRF file / console
                                 → TestPortal backend → Web frontend
```

## Installation

Requires Node.js 18 or later. The repository currently configures package distribution through GitHub Packages.

Configure the package scope in your project's `.npmrc`:

```ini
@vention-test-portal:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

Set `NODE_AUTH_TOKEN` to a GitHub token with package read access, then install:

```bash
npm install --save-dev @vention-test-portal/test-portal-integration-cli
```

For a Node.js application that uses the library at runtime, install without `--save-dev`. To try conversion from source, follow [Development](#development).

## Usage

Both `--input` and `--type` are required. For a Playwright JSON report:

```bash
npx test-portal-cli --input playwright-report.json --type playwright --output ctrf-report.json
```

The output file contains CTRF JSON with `results.tool`, `results.summary`, and `results.tests`. See the [CTRF structure guide](docs/CTRF_STRUCTURE_REPORT.md) and [example output](examples/ctrf-output-schema-example.json).

### Upload to TestPortal

Configure a project upload API key in TestPortal, then set these values in your shell or a local `.env` file:

```dotenv
TEST_PORTAL_URL=http://localhost:3001/api/v2/upload-ctrf-report-api-key
TEST_PORTAL_API_KEY=your-project-upload-api-key
EXECUTION_TYPE=release
TEST_ENVIRONMENT=develop
```

```bash
npx test-portal-cli --input playwright-report.json --type playwright
```

`TEST_PORTAL_API_KEY` is sent as the `X-API-Key` header. `EXECUTION_TYPE` and `TEST_ENVIRONMENT` populate `results.environment.executionType` and `results.environment.testEnvironment`. The test environment defaults to `ci` when a supported CI system is detected and the variable is unset.

### Output and delivery behavior

| Configuration                         | Behavior                                                                      |
| ------------------------------------- | ----------------------------------------------------------------------------- |
| `--output path`                       | Write CTRF JSON to that file.                                                 |
| `--stdout`                            | Print CTRF JSON; takes precedence over `--output`.                            |
| No output option or webhook           | Write next to the input with a `.unified.json` suffix; the contents are CTRF. |
| Webhook configured, no output option  | Upload only.                                                                  |
| Webhook plus `--output` or `--stdout` | Upload and also produce the requested output.                                 |

`--webhook` overrides `TEST_PORTAL_URL`. Neither `--stdout` nor `--output` disables upload: unset `TEST_PORTAL_URL` and omit `--webhook` for local-only conversion.

Webhooks receive a multipart form containing a JSON file in the `report` field. A custom endpoint must accept that format. The CLI logs webhook failures but currently does not make them a failing exit status; a successful process exit alone does not confirm delivery.

### Supported providers

| `--type`     | Input format                     |
| ------------ | -------------------------------- |
| `playwright` | Playwright JSON reporter output. |
| `jest`       | Jest JSON results.               |
| `vitest`     | Vitest JSON results.             |
| `cypress`    | Mochawesome JSON reports.        |
| `junit`      | JUnit XML.                       |
| `nunit`      | NUnit XML.                       |
| `mocha`      | Mocha JSON reporter output.      |
| `pytest`     | pytest-json-report JSON.         |
| `testng`     | TestNG XML results.              |

Sample inputs are available in [examples](examples). See also the [TestNG structure guide](docs/TESTNG_STRUCTURE.md).

### Delivery options

| Option               | Purpose / default                                              |
| -------------------- | -------------------------------------------------------------- |
| `--webhook <url>`    | Override the upload URL.                                       |
| `--headers <json>`   | Add custom request headers.                                    |
| `--method <method>`  | `POST`, `PUT`, or `PATCH`; default `POST`.                     |
| `--timeout <ms>`     | Request timeout; default `30000`.                              |
| `--retries <count>`  | Total delivery attempts, including the first; default `3`.     |
| `--retry-delay <ms>` | Initial retry delay; default `1000`, with exponential backoff. |

Use `npx test-portal-cli --help` for the complete option list.

## CI integration

After your CI job installs the CLI and generates a report, run:

```bash
npx test-portal-cli --input report.json --type jest --output ctrf-report.json
```

Supply `TEST_PORTAL_URL` and `TEST_PORTAL_API_KEY` through your CI configuration. Use a provider matching the report, and arrange for this step to run even when tests fail if you want failed results uploaded. Keep `ctrf-report.json` as a CI artifact for inspection.

For GitHub Actions, the package installation step needs registry authentication and package access. An example setup is:

```yaml
permissions:
  contents: read
  packages: read

steps:
  - uses: actions/checkout@v4
  - uses: actions/setup-node@v4
    with:
      node-version: '22'
      registry-url: 'https://npm.pkg.github.com'
      scope: '@vention-test-portal'
  - name: Install TestPortal CLI
    run: npm install --no-save @vention-test-portal/test-portal-integration-cli
    env:
      NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

The consuming repository must have access to the package for its `GITHUB_TOKEN` to work. Add your test and report-upload steps after this setup.

## Node.js library

```typescript
import { convert } from '@vention-test-portal/test-portal-integration-cli';

// Return an internal UnifiedReport without writing a file or uploading.
const report = await convert({
  input: './playwright-report.json',
  provider: 'playwright',
});

console.log(report.stats);

// Return UnifiedReport and also write a CTRF file.
await convert({
  input: './playwright-report.json',
  provider: 'playwright',
  output: './ctrf-report.json',
});
```

The return value is the internal `UnifiedReport`; file, console, and webhook output is CTRF. Unlike the CLI, the library requires an explicit `webhook` option to upload. Load `.env` yourself if your application needs it. See the [API guide](docs/API.md) for conversion options and exported types.

## Development

```bash
git clone https://github.com/VENTIONINC/TestPortal-cli.git
cd TestPortal-cli
npm ci
npm run build
node dist/cli.js --input examples/playwright-example.json --type playwright --output /tmp/testportal-ctrf-report.json
```

The final command creates a CTRF report from the included fixture. Run it without `TEST_PORTAL_URL` configured for a local-only example.

| Command             | Purpose                                   |
| ------------------- | ----------------------------------------- |
| `npm run format`    | Format TypeScript source.                 |
| `npm run typecheck` | Check TypeScript without emitting output. |
| `npm run lint`      | Run ESLint.                               |
| `npm test`          | Run the Jest suite.                       |
| `npm run build`     | Compile the CLI and library to `dist/`.   |

## Feedback, contributions, and releases

- [Report a bug or request a feature](https://github.com/VENTIONINC/TestPortal-cli/issues). Include the provider, command, and a sanitized report sample when relevant.
- [Contributing guide](CONTRIBUTING.md).
- [Release process](docs/RELEASING.md).
- [Published releases](https://github.com/VENTIONINC/TestPortal-cli/releases).

## License

Licensed under the Apache License 2.0. See [LICENSE](LICENSE) for the full terms and [NOTICE](NOTICE) for copyright attribution.
