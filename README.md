# 🧪 Test Report Converter

[![npm version](https://img.shields.io/npm/v/@vention-test-portal/test-portal-integration-cli)](https://www.npmjs.com/package/@vention-test-portal/test-portal-integration-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Tests](https://github.com/Vention-Test-Portal/test-portal-integration-cli/workflows/Tests/badge.svg)](https://github.com/Vention-Test-Portal/test-portal-integration-cli/actions)

A powerful CLI tool and programmatic library for converting test reports from popular testing frameworks to unified format. Supports both local file output and remote webhook delivery with comprehensive retry logic and authentication.

## ✨ Features

- 🔄 **Multi-framework support**: Jest, Playwright, Cypress, JUnit, Vitest, NUnit, Mocha, Pytest
- 📊 **CTRF format**: Common Test Report Format for consistent structure
- 🚀 **CLI & Programmatic**: Use as command-line tool or Node.js library
- 🌐 **Webhook delivery**: Send reports to remote endpoints with retry logic
- 🔒 **Authentication**: Support for Bearer tokens and custom headers
- ⚡ **Fast & reliable**: Built with TypeScript for type safety
- 📝 **Detailed output**: Comprehensive test results with error details

## 🚀 Installation

### Global Installation (CLI)

```bash
npm install -g @vention-test-portal/test-portal-integration-cli
```

### Local Installation (Library)

```bash
npm install @vention-test-portal/test-portal-integration-cli
```

## 📦 GitHub Actions Usage

To use this CLI in your GitHub Actions workflows to upload test reports:

### 1. Configure Permissions and Secrets

Ensure your workflow has permission to read packages and access the repository.

### 2. Add Workflow Step

Add the following step to your `.github/workflows/test.yml` (or equivalent):

```yaml
steps:
  - name: Checkout
    uses: actions/checkout@v4

  - name: Set up Node
    uses: actions/setup-node@v4
    with:
      node-version: '22'
      registry-url: 'https://npm.pkg.github.com'

  - name: Configure npm auth for GitHub Packages
    run: |
      echo "@vention-test-portal:registry=https://npm.pkg.github.com" >> .npmrc
      echo "//npm.pkg.github.com/:_authToken=${{ secrets.GITHUB_TOKEN }}" >> .npmrc

  - name: Install test reporter CLI
    run: |
      npm install @vention-test-portal/test-portal-integration-cli

  - name: Run tests
    run: |
      # Run your tests and generate a report (e.g., JUnit, JSON)
      npm test -- --json --outputFile=report.json

  - name: Send test report
    env:
      TEST_PORTAL_URL: ${{ secrets.TEST_PORTAL_URL }}
      TEST_PORTAL_API_KEY: ${{ secrets.TEST_PORTAL_API_KEY }}
    run: |
      # Use npx to run the CLI
      npx test-portal-cli report.json
```

### 3. Local Development

To use the package locally:

1. Create a Personal Access Token (PAT) with `read:packages` scope.
2. Add the following to your `~/.npmrc`:
   ```ini
   @vention-test-portal:registry=https://npm.pkg.github.com
   //npm.pkg.github.com/:_authToken=YOUR_PAT
   ```
3. Install and run:
   ```bash
   npm install @vention-test-portal/test-portal-integration-cli
   npx test-portal-cli report.json
   ```

## 📖 Usage

### Environment Configuration

Create a `.env` file in your project root to configure default webhook settings:

### CLI Usage

```bash
# Test Portal URL - Default webhook URL for sending test reports
TEST_PORTAL_URL=http://localhost:3001/api/v2/upload-ctrf-report-api-key

# Test Portal API Key - Used for authenticating webhook requests
TEST_PORTAL_API_KEY=your-api-key-here
```

**Note:** When `TEST_PORTAL_URL` is set, the CLI will automatically send reports to this URL unless `--webhook` is explicitly provided. The `TEST_PORTAL_API_KEY` is automatically added as the `X-API-Key` header for all webhook requests.

### CLI Examples

```bash
# Convert Playwright results to unified format (file only)
test-portal-cli -i playwright-results.json -t playwright -o unified-report.json

# Send report to TEST_PORTAL_URL from .env (automatic)
test-portal-cli -i playwright-results.json -t playwright

# Override .env webhook URL
test-portal-cli -i playwright-results.json -t playwright --webhook https://api.example.com/reports

# Output to console only
test-portal-cli -i playwright-results.json -t playwright --stdout

# File output + webhook to .env URL
test-portal-cli -i playwright-results.json -t playwright -o unified-report.json
```

### Programmatic Usage

```typescript
import { convert } from '@vention-test-portal/test-portal-integration-cli';

const report = await convert({
  input: './playwright-results.json',
  provider: 'playwright',
  output: './unified-report.json',
});

console.log('Conversion complete!', report);
```

## 🛠️ CLI Options

### Required Options

- `-i, --input <path>` - Path to source report file
- `-t, --type <provider>` - Provider type: jest, playwright, cypress, junit, vitest, nunit, mocha, pytest

### Output Options

- `-o, --output <path>` - Write unified report to file
- `--stdout` - Output to console instead of file

### Webhook Options

- `--webhook <url>` - Send report to webhook URL (defaults to `TEST_PORTAL_URL` env var)
- `--headers <json>` - Custom headers as JSON string
- `--method <method>` - HTTP method: POST, PUT, PATCH (default: POST)
- `--timeout <ms>` - Request timeout in milliseconds (default: 30000)
- `--retries <count>` - Number of retry attempts (default: 3)
- `--retry-delay <ms>` - Delay between retries in milliseconds (default: 1000)
- `--verify-ssl` / `--no-verify-ssl` - SSL certificate verification

**Authentication:** The CLI automatically uses `TEST_PORTAL_API_KEY` from `.env` as the `X-API-Key` header for all webhook requests.

## 🔗 Advanced Webhook Usage

### Using Environment Variables (Recommended)

Set up your `.env` file once and all reports are automatically sent:

```bash
# .env
TEST_PORTAL_URL=https://test-portal.example.com/api/v2/upload-ctrf-report-api-key
TEST_PORTAL_API_KEY=your-api-key-here
```

```bash
# Reports are automatically sent to TEST_PORTAL_URL with API key authentication
test-portal-cli -i results.json -t playwright
```

### With Custom Headers

```bash
test-portal-cli -i results.json -t playwright \
  --webhook https://api.example.com/reports \
  --headers '{"X-Team": "qa", "X-Environment": "production"}'
```

**Note:** The `X-API-Key` header is automatically included from `TEST_PORTAL_API_KEY` env var.

### With Retry Configuration

```bash
test-portal-cli -i results.json -t playwright \
  --webhook https://api.example.com/reports \
  --retries 5 \
  --retry-delay 2000 \
  --timeout 60000
```

### Skip SSL Verification (Development Only)

```bash
test-portal-cli -i results.json -t playwright \
  --webhook https://internal-api.company.com/reports \
  --no-verify-ssl
```

## 💻 Programmatic API

### Basic Conversion

```typescript
import { convert } from '@vention-test-portal/test-portal-integration-cli';

const report = await convert({
  input: './test-results.json',
  provider: 'playwright',
  output: './unified-report.json',
});
```

### With Webhook

```typescript
import { convert } from '@vention-test-portal/test-portal-integration-cli';

const report = await convert({
  input: './test-results.json',
  provider: 'playwright',
  webhook: {
    url: 'https://api.example.com/reports',
    authToken: 'your-api-token',
    retries: 3,
  },
});
```

### Advanced Usage

```typescript
import {
  convert,
  Converter,
} from '@vention-test-portal/test-portal-integration-cli';

const converter = new Converter();

// Check available providers
console.log(converter.getAvailableProviders()); // ['jest', 'playwright', 'cypress', 'junit', 'vitest', 'nunit', 'mocha', 'pytest']

// Convert with full options
await converter.convertAndSave({
  input: './test-results.json',
  provider: 'playwright',
  output: './unified-report.json',
  webhook: {
    url: 'https://api.example.com/webhook',
    method: 'PUT',
    timeout: 45000,
    retries: 5,
    retryDelay: 2000,
    headers: {
      'X-API-Key': 'your-key',
    },
  },
});
```

## 📋 Provider Support

### Status Mapping

| Framework  | Unified Status                                | Notes                                         |
| ---------- | --------------------------------------------- | --------------------------------------------- |
| Jest       | passed, failed, pending, todo                 | Standard Jest statuses                        |
| Playwright | passed, failed, skipped, timeout, interrupted | Includes flaky test handling                  |
| Cypress    | passed, failed, pending                       | Basic Cypress statuses                        |
| JUnit      | passed, failed, skipped                       | XML format support                            |
| Vitest     | passed, failed, skipped, pending, todo        | Jest-compatible format                        |
| NUnit      | passed, failed, skipped                       | XML format support                            |
| Pytest     | passed, failed, skipped                       | xfailed→skipped, xpassed→passed, error→failed |

## 📊 Unified Output Format

The tool generates unified format reports with consistent structure:

```json
{
  "id": "unique-report-id",
  "runId": "optional-run-id",
  "framework": "playwright",
  "frameworkVersion": "1.40.0",
  "stats": {
    "total": 10,
    "passed": 8,
    "failed": 1,
    "skipped": 1,
    "duration": 45000,
    "startTime": "2024-01-01T10:00:00.000Z",
    "endTime": "2024-01-01T10:00:45.000Z"
  },
  "suites": [
    {
      "id": "suite-id",
      "name": "Login Tests",
      "file": "tests/login.spec.ts",
      "tests": [
        {
          "id": "test-id",
          "name": "should login with valid credentials",
          "status": "passed",
          "duration": 1500,
          "results": [
            {
              "attemptNumber": 1,
              "status": "passed",
              "duration": 1500,
              "startTime": "2024-01-01T10:00:00.000Z"
            }
          ]
        }
      ]
    }
  ],
  "createdAt": "2024-01-01T10:00:45.000Z"
}
```

## 🔧 Framework Specific Notes

### Playwright

- Supports retry attempts and flaky test detection
- Includes project information and browser details
- Maps unexpected status to failed

### Jest

- Includes coverage information when available
- Maps todo tests to todo status
- Aggregates assertion counts

### Cypress

- Supports mochawesome report format
- Includes screenshot and video references
- Maps pending tests appropriately

### JUnit

- Supports both single testsuite and testsuites formats
- Maps errors to failed status
- Handles skipped tests correctly

### Pytest

- Supports pytest-json-report plugin format
- Maps xfailed (expected failures) to skipped status
- Maps xpassed (unexpected passes) to passed status
- Maps error outcomes to failed status
- Aggregates durations from setup/call/teardown stages
- Extracts errors from stage failures with traceback
- Groups tests by file into suites

## 📝 Example Output

```bash
✅ Successfully converted ./results.json to unified format
✅ Successfully sent to webhook: https://api.example.com/reports
```

## 🚀 CI/CD Integration

### GitHub Actions

Use repository secrets to configure the Test Portal URL and API key:

```yaml
- name: Convert and Send Test Results
  env:
    TEST_PORTAL_URL: ${{ secrets.TEST_PORTAL_URL }}
    TEST_PORTAL_API_KEY: ${{ secrets.TEST_PORTAL_API_KEY }}
  run: |
    npx test-portal-cli -i test-results.json -t playwright
```

### With File Output

```yaml
- name: Convert and Save Test Results
  env:
    TEST_PORTAL_URL: ${{ secrets.TEST_PORTAL_URL }}
    TEST_PORTAL_API_KEY: ${{ secrets.TEST_PORTAL_API_KEY }}
  run: |
    npx test-portal-cli -i test-results.json -t playwright \
      --output artifacts/unified-report.json

- name: Upload Test Results
  uses: actions/upload-artifact@v3
  with:
    name: test-results
    path: artifacts/unified-report.json
```

### GitLab CI

```yaml
test_report_conversion:
  variables:
    TEST_PORTAL_URL: $TEST_PORTAL_URL
    TEST_PORTAL_API_KEY: $TEST_PORTAL_API_KEY
  script:
    - npx test-portal-cli -i test-results.json -t playwright
```

## 🛠️ Development

```bash
git clone https://github.com/Vention-Test-Portal/test-portal-integration-cli.git
cd test-portal-integration-cli
npm install

# Copy .env.example to .env and configure
cp .env.example .env

# Build the project
npm run build

# Run tests
npm test

# Run CLI in development mode (without building)
npm run dev -- -i examples/vitest-report-with-env.json -t vitest -o output.json

# Run CLI after building
node dist/cli.js -i examples/vitest-report-with-env.json -t vitest -o output.json
```

## 📋 Requirements

- Node.js >= 18.0.0
- TypeScript for development

## 🐛 Troubleshooting

### Common Issues

1. **File not found**: Ensure the input file path is correct
2. **Invalid format**: Verify the provider type matches your test framework
3. **Webhook failures**: Check network connectivity and authentication
4. **SSL errors**: Use `--no-verify-ssl` for internal endpoints (not recommended for production)

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🔗 Links

- [Create an issue](https://github.com/Vention-Test-Portal/test-portal-integration-cli/issues)
- [View existing issues](https://github.com/Vention-Test-Portal/test-portal-integration-cli/issues)
- [Check documentation](https://github.com/Vention-Test-Portal/test-portal-integration-cli/wiki)

## 🙏 Acknowledgments

- TypeScript community for excellent tooling
- Test framework maintainers for consistent reporting formats
