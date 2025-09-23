# 🧪 Test Report Converter

[![npm version](https://badge.fury.io/js/test-report-converter.svg)](https://badge.fury.io/js/test-report-converter)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Tests](https://github.com/user/test-report-converter/workflows/Tests/badge.svg)](https://github.com/user/test-report-converter/actions)

A powerful CLI tool and programmatic library for converting test reports from popular testing frameworks to unified format. Supports both local file output and remote webhook delivery with comprehensive retry logic and authentication.

## ✨ Features

- 🔄 **Multi-framework support**: Jest, Playwright, Cypress, JUnit
- 📊 **Unified format**: Consistent structure across all frameworks
- 🚀 **CLI & Programmatic**: Use as command-line tool or Node.js library
- 🌐 **Webhook delivery**: Send reports to remote endpoints with retry logic
- 🔒 **Authentication**: Support for Bearer tokens and custom headers
- ⚡ **Fast & reliable**: Built with TypeScript for type safety
- 📝 **Detailed output**: Comprehensive test results with error details

## 🚀 Installation

### Global Installation (CLI)

```bash
npm install -g test-report-converter
```

### Local Installation (Library)

```bash
npm install test-report-converter
```

## 📖 Usage

### CLI Examples

```bash
# Convert Playwright results to unified format
test-convert -i playwright-results.json -t playwright -o unified-report.json

# Send report directly to webhook
test-convert -i playwright-results.json -t playwright --webhook https://api.example.com/reports

# Output to console
test-convert -i playwright-results.json -t playwright --stdout
```

### Programmatic Usage

```typescript
import { convert } from 'test-report-converter';

const report = await convert({
  input: './playwright-results.json',
  provider: 'playwright',
  output: './unified-report.json'
});

console.log('Conversion complete!', report);
```

## 🛠️ CLI Options

- `-i, --input <path>` - Path to source report file (required)
- `-t, --type <provider>` - Provider type: jest, playwright, cypress, junit (required)
- `-o, --output <path>` - Write unified report to file
- `--stdout` - Output to console instead of file
- `--webhook <url>` - Send report to webhook URL

### Webhook Options

- `--headers <json>` - Custom headers as JSON string
- `--auth-token <token>` - Authentication token
- `--auth-header <name>` - Custom auth header name (default: Authorization)
- `--method <method>` - HTTP method: POST, PUT, PATCH (default: POST)
- `--timeout <ms>` - Request timeout in milliseconds (default: 30000)
- `--retries <count>` - Number of retry attempts (default: 3)
- `--retry-delay <ms>` - Delay between retries in milliseconds (default: 1000)
- `--verify-ssl` / `--no-verify-ssl` - SSL certificate verification

## 🔗 Advanced Webhook Usage

### With Authentication

```bash
test-convert -i results.json -t playwright \
  --webhook https://api.example.com/reports \
  --auth-token "your-api-token" \
  --method POST
```

### With Custom Headers

```bash
test-convert -i results.json -t playwright \
  --webhook https://api.example.com/reports \
  --headers '{"X-API-Key": "your-key", "X-Team": "qa"}'
```

### With Retry Configuration

```bash
test-convert -i results.json -t playwright \
  --webhook https://api.example.com/reports \
  --retries 5 \
  --retry-delay 2000 \
  --timeout 60000
```

### Custom Authentication Header

```bash
test-convert -i results.json -t playwright \
  --webhook https://api.example.com/reports \
  --auth-token "your-token" \
  --auth-header "X-API-Token"
```

### Skip SSL Verification

```bash
test-convert -i results.json -t playwright \
  --webhook https://internal-api.company.com/reports \
  --no-verify-ssl
```

## 💻 Programmatic API

### Basic Conversion

```typescript
import { convert } from 'test-report-converter';

const report = await convert({
  input: './test-results.json',
  provider: 'playwright',
  output: './unified-report.json'
});
```

### With Webhook

```typescript
import { convert } from 'test-report-converter';

const report = await convert({
  input: './test-results.json',
  provider: 'playwright',
  webhook: {
    url: 'https://api.example.com/reports',
    authToken: 'your-api-token',
    retries: 3
  }
});
```

### Advanced Usage

```typescript
import { convert, Converter } from 'test-report-converter';

const converter = new Converter();

// Check available providers
console.log(converter.getAvailableProviders()); // ['jest', 'playwright', 'cypress', 'junit']

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
      'X-API-Key': 'your-key'
    }
  }
});
```

## 📋 Provider Support

### Status Mapping

| Framework | Unified Status | Notes |
|-----------|----------------|-------|
| Jest | passed, failed, pending, todo | Standard Jest statuses |
| Playwright | passed, failed, skipped, timeout, interrupted | Includes flaky test handling |
| Cypress | passed, failed, pending | Basic Cypress statuses |
| JUnit | passed, failed, skipped | XML format support |

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

## 📝 Example Output

```bash
✅ Successfully converted ./results.json to unified format
✅ Successfully sent to webhook: https://api.example.com/reports
```

## 🚀 CI/CD Integration

### GitHub Actions

```yaml
- name: Convert Test Results
  run: |
    npx test-report-converter -i test-results.json -t playwright \
      --webhook ${{ secrets.WEBHOOK_URL }} \
      --auth-token ${{ secrets.API_TOKEN }}
```

### With File Output

```yaml
- name: Convert and Save Test Results
  run: |
    npx test-report-converter -i test-results.json -t playwright \
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
  script:
    - npx test-report-converter -i test-results.json -t playwright \
        --webhook $WEBHOOK_URL \
        --auth-token $API_TOKEN
```

## 🛠️ Development

```bash
git clone https://github.com/user/test-report-converter.git
cd test-report-converter
npm install
npm run build
npm test
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

- [Create an issue](https://github.com/user/test-report-converter/issues)
- [View existing issues](https://github.com/user/test-report-converter/issues)
- [Check documentation](https://github.com/user/test-report-converter/wiki)

## 🙏 Acknowledgments

- TypeScript community for excellent tooling
- Test framework maintainers for consistent reporting formats
