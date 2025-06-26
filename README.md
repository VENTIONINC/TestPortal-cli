# 🧪 Test Report CTRFER

[![npm version](https://badge.fury.io/js/test-report-ctrfer.svg)](https://badge.fury.io/js/test-report-ctrfer)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Tests](https://github.com/user/test-report-ctrfer/workflows/Tests/badge.svg)](https://github.com/user/test-report-ctrfer/actions)

A powerful CLI tool and programmatic library for converting test reports from popular testing frameworks to [CTRF (Common Test Results Format)](https://ctrf.io). Supports both local file output and remote webhook delivery with comprehensive retry logic and authentication.

## ✨ Features

- 🎯 **Multiple Framework Support**: Convert from Playwright (with more frameworks coming)
- 🌐 **Remote Webhooks**: Send reports to remote servers with retry logic
- 🔐 **Flexible Authentication**: Bearer tokens, API keys, custom headers
- 📁 **Multiple Output Options**: File, stdout, webhook, or concurrent delivery
- 🔧 **Programmatic API**: Use as a library in your Node.js applications
- 🛡️ **Type-Safe**: Full TypeScript support with Zod validation
- ⚡ **Fast & Reliable**: Efficient parsing with comprehensive error handling
- 🧪 **Well-Tested**: 100% test coverage with comprehensive test suite

## 📦 Installation

### Global CLI Installation
```bash
npm install -g test-report-ctrfer
```

### Library Installation
```bash
npm install test-report-ctrfer
```

## 🚀 Quick Start

### CLI Usage
```bash
# Basic conversion
ctrf-convert -i playwright-results.json -t playwright -o ctrf-report.json

# Send to webhook
ctrf-convert -i playwright-results.json -t playwright --webhook https://api.example.com/reports

# Output to console
ctrf-convert -i playwright-results.json -t playwright --stdout
```

### Programmatic Usage
```typescript
import { convert } from 'test-report-ctrfer';

const report = await convert({
  input: './playwright-results.json',
  provider: 'playwright',
  output: './ctrf-report.json'
});

console.log(`Converted ${report.results.summary.tests} tests`);
```

## 📋 CLI Reference

### Required Options
- `-i, --input <path>` - Path to source test report file
- `-t, --type <provider>` - Test framework provider (playwright)

### Output Options
- `-o, --output <path>` - Write CTRF report to file
- `--stdout` - Output report to console

### Webhook Options
- `--webhook <url>` - Send report to webhook URL
- `--method <method>` - HTTP method (POST, PUT, PATCH) [default: POST]
- `--headers <json>` - Custom headers as JSON string
- `--auth-token <token>` - Authentication token
- `--auth-header <name>` - Custom auth header name [default: Authorization]

### Network Options
- `--timeout <ms>` - Request timeout in milliseconds [default: 30000]
- `--retries <count>` - Number of retry attempts [default: 3]
- `--retry-delay <ms>` - Delay between retries [default: 1000]
- `--verify-ssl` - Verify SSL certificates [default: true]
- `--no-verify-ssl` - Skip SSL certificate verification

### Utility Options
- `-V, --version` - Output version number
- `-h, --help` - Display help information

## 🌐 Webhook Integration

### Basic Webhook
```bash
ctrf-convert -i results.json -t playwright \
  --webhook https://api.example.com/test-reports
```

### With Authentication
```bash
ctrf-convert -i results.json -t playwright \
  --webhook https://api.example.com/test-reports \
  --auth-token "Bearer your-token-here"
```

### Custom Headers and Method
```bash
ctrf-convert -i results.json -t playwright \
  --webhook https://api.example.com/test-reports \
  --method PUT \
  --headers '{"Content-Type": "application/json", "X-Team": "qa"}' \
  --auth-token "your-api-key" \
  --auth-header "X-API-Key"
```

### Advanced Configuration
```bash
ctrf-convert -i results.json -t playwright \
  --webhook https://api.example.com/test-reports \
  --retries 5 \
  --retry-delay 2000 \
  --timeout 60000 \
  --no-verify-ssl
```

### Concurrent File and Webhook
```bash
ctrf-convert -i results.json -t playwright \
  --output ./report.json \
  --webhook https://api.example.com/test-reports \
  --auth-token "Bearer token"
```

## 🔧 Programmatic API

### Basic Conversion
```typescript
import { convert } from 'test-report-ctrfer';

// Simple file conversion
const report = await convert({
  input: './playwright-results.json',
  provider: 'playwright',
  output: './ctrf-report.json'
});
```

### Webhook Integration
```typescript
import { convert } from 'test-report-ctrfer';

// Send to webhook with authentication
const report = await convert({
  input: './playwright-results.json',
  provider: 'playwright',
  webhook: {
    url: 'https://api.example.com/test-reports',
    method: 'POST',
    authToken: 'Bearer your-token',
    timeout: 30000,
    retries: 3,
    retryDelay: 1000,
    verifySSL: true,
    headers: {
      'X-Team': 'qa',
      'X-Environment': 'production'
    }
  }
});
```

### Advanced Configuration
```typescript
import { convert, Converter } from 'test-report-ctrfer';

// Using the Converter class directly
const converter = new Converter();

// Get available providers
const providers = converter.getAvailableProviders();
console.log('Supported providers:', providers);

// Convert with full options
await converter.convertAndSave({
  input: './test-results.json',
  provider: 'playwright',
  output: './ctrf-report.json',
  stdout: false,
  webhook: {
    url: 'https://webhook.site/unique-id',
    method: 'POST',
    authToken: 'your-token',
    authHeader: 'X-API-Key',
    retries: 5,
    retryDelay: 2000,
    timeout: 60000
  }
});
```

## 🎭 Supported Test Frameworks

### Playwright
- **Versions**: v1.43+
- **File Format**: JSON reports from `playwright test --reporter=json`
- **Features**: 
  - Test status mapping (passed/failed/skipped/timedOut/interrupted)
  - Duration and retry information
  - Error messages and stack traces
  - File paths and line numbers
  - Test tags and annotations
  - Flaky test detection

#### Playwright Status Mapping
| Playwright Status | CTRF Status |
|------------------|-------------|
| `passed` | `passed` |
| `failed` | `failed` |
| `skipped` | `skipped` |
| `timedOut` | `failed` |
| `interrupted` | `other` |

## 📊 CTRF Output Format

The tool generates CTRF (Common Test Results Format) compliant reports:

```json
{
  "results": {
    "tool": {
      "name": "playwright"
    },
    "summary": {
      "tests": 10,
      "passed": 8,
      "failed": 1,
      "pending": 0,
      "skipped": 1,
      "other": 0,
      "start": 1642678900000,
      "stop": 1642679200000
    },
    "tests": [
      {
        "name": "should load homepage",
        "status": "passed",
        "duration": 1250,
        "filePath": "tests/homepage.spec.ts",
        "retry": 0,
        "flaky": false
      }
    ],
    "environment": {
      "appName": "MyApp",
      "buildName": "main-branch",
      "buildNumber": "123"
    }
  }
}
```

## 🛡️ Error Handling

### CLI Error Handling
- Input file validation
- Provider support validation
- JSON parsing error reporting
- Network error handling with retries
- Graceful webhook failure handling

### Webhook Error Handling
- **Retry Logic**: Exponential backoff with configurable attempts
- **Timeout Handling**: Configurable request timeouts
- **SSL Verification**: Optional SSL certificate validation
- **Error Isolation**: Webhook failures don't prevent file output
- **Status Reporting**: Clear success/failure messaging

### Error Examples
```bash
# File not found
❌ Error: Input file not found: ./missing-file.json

# Invalid provider
❌ Error: Unsupported provider: invalid-provider

# Webhook failure (non-blocking)
❌ Webhook failed: Request timed out after 30000ms
✅ Successfully converted ./results.json to CTRF format
```

## 🧪 Testing

### Running Tests
```bash
npm test                 # Run all tests
npm run test:watch      # Run tests in watch mode
npm run test:coverage   # Run tests with coverage
```

### Test Coverage
- Unit tests for all core functionality
- Integration tests with real test reports
- Webhook integration tests with mocked HTTP
- Error scenario testing
- Edge case validation

## 🚀 CI/CD Integration Examples

### GitHub Actions
```yaml
- name: Run tests and send results
  run: |
    npm test -- --reporter=json --outputFile=test-results.json
    npx test-report-ctrfer -i test-results.json -t playwright \
      --webhook ${{ secrets.TEST_RESULTS_WEBHOOK }} \
      --auth-token "${{ secrets.API_TOKEN }}" \
      --headers '{"X-GitHub-Run": "${{ github.run_id }}"}'
```

### GitLab CI
```yaml
test_and_report:
  script:
    - npm test -- --reporter=json --outputFile=test-results.json
    - npx test-report-ctrfer -i test-results.json -t playwright 
        --webhook $TEST_WEBHOOK_URL 
        --auth-token $API_TOKEN
        --output artifacts/ctrf-report.json
  artifacts:
    paths:
      - artifacts/ctrf-report.json
```

### Jenkins Pipeline
```groovy
pipeline {
  stages {
    stage('Test & Report') {
      steps {
        sh 'npm test -- --reporter=json --outputFile=test-results.json'
        sh '''
          npx test-report-ctrfer -i test-results.json -t playwright \
            --webhook ${env.WEBHOOK_URL} \
            --auth-token ${env.API_TOKEN} \
            --headers '{"X-Build": "${env.BUILD_NUMBER}"}'
        '''
      }
    }
  }
}
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup
```bash
git clone https://github.com/user/test-report-ctrfer.git
cd test-report-ctrfer
npm install
npm run build
npm test
```

### Adding New Providers
1. Create provider class implementing `BaseProvider`
2. Add provider to `ProviderRegistry`
3. Create comprehensive tests
4. Update documentation

## 📝 Changelog

See [CHANGELOG.md](CHANGELOG.md) for release history.

## 🐛 Troubleshooting

### Common Issues

**Q: "Module not found" errors**
A: Ensure you're using Node.js 14+ and have installed dependencies with `npm install`

**Q: Webhook timeouts**
A: Increase timeout with `--timeout 60000` or check network connectivity

**Q: SSL certificate errors**
A: Use `--no-verify-ssl` for development or ensure valid certificates

**Q: Authentication failures**
A: Verify token format and use correct header with `--auth-header`

### Getting Help
- [Create an issue](https://github.com/user/test-report-ctrfer/issues)
- [View existing issues](https://github.com/user/test-report-ctrfer/issues)
- [Check documentation](https://github.com/user/test-report-ctrfer/wiki)

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🙏 Acknowledgments

- [CTRF](https://ctrf.io) - Common Test Results Format specification
- [Playwright](https://playwright.dev) - Web testing framework
- [Commander.js](https://github.com/tj/commander.js) - CLI framework
- [Zod](https://github.com/colinhacks/zod) - TypeScript schema validation
