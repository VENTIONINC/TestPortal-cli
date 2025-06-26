# 📚 API Documentation

This document provides detailed API documentation for all classes, interfaces, and functions available in the test-report-ctrfer library.

## Table of Contents

- [Main Functions](#main-functions)
- [Core Classes](#core-classes)
- [Type Definitions](#type-definitions)
- [Provider System](#provider-system)
- [Webhook Configuration](#webhook-configuration)
- [Error Handling](#error-handling)

## Main Functions

### `convert(options)`

The primary function for converting test reports to CTRF format.

**Parameters:**
- `options` (object): Configuration options for conversion
  - `input` (string, required): Path to the source test report file
  - `provider` (string, required): Test framework provider name
  - `output` (string, optional): Output file path
  - `webhook` (WebhookConfig, optional): Webhook configuration for remote delivery

**Returns:** `Promise<CTRFReport>` - The converted CTRF report

**Example:**
```typescript
import { convert } from 'test-report-ctrfer';

const report = await convert({
  input: './playwright-results.json',
  provider: 'playwright',
  output: './ctrf-report.json',
  webhook: {
    url: 'https://api.example.com/reports',
    authToken: 'Bearer token'
  }
});
```

## Core Classes

### `Converter`

The main converter class that handles test report conversion and delivery.

#### Constructor

```typescript
const converter = new Converter();
```

#### Methods

##### `convert(options: ConvertOptions): Promise<CTRFReport>`

Converts a test report to CTRF format.

**Parameters:**
- `options` (ConvertOptions): Conversion configuration

**Returns:** `Promise<CTRFReport>` - The converted report

**Example:**
```typescript
const report = await converter.convert({
  input: './test-results.json',
  provider: 'playwright'
});
```

##### `convertAndSave(options: ConvertOptions): Promise<void>`

Converts a test report and handles output (file, stdout, webhook).

**Parameters:**
- `options` (ConvertOptions): Complete conversion and output configuration

**Example:**
```typescript
await converter.convertAndSave({
  input: './test-results.json',
  provider: 'playwright',
  output: './ctrf-report.json',
  webhook: {
    url: 'https://api.example.com/webhook'
  }
});
```

##### `getAvailableProviders(): string[]`

Returns a list of available test framework providers.

**Returns:** `string[]` - Array of provider names

**Example:**
```typescript
const providers = converter.getAvailableProviders();
console.log(providers); // ['playwright']
```

### `HttpClient`

HTTP client for sending webhook requests with retry logic and authentication.

#### Constructor

```typescript
const httpClient = new HttpClient();
```

#### Methods

##### `sendWebhook(report: CTRFReport, config: WebhookConfig): Promise<WebhookResponse>`

Sends a CTRF report to a webhook endpoint.

**Parameters:**
- `report` (CTRFReport): The CTRF report to send
- `config` (WebhookConfig): Webhook configuration

**Returns:** `Promise<WebhookResponse>` - Response details

**Example:**
```typescript
const response = await httpClient.sendWebhook(report, {
  url: 'https://api.example.com/webhook',
  method: 'POST',
  authToken: 'Bearer token',
  retries: 3
});

if (response.success) {
  console.log('Webhook sent successfully');
}
```

## Type Definitions

### `ConvertOptions`

Configuration options for test report conversion.

```typescript
interface ConvertOptions {
  input: string;           // Source report file path
  output?: string;         // Output file path (optional)
  provider: string;        // Test framework provider
  stdout?: boolean;        // Output to console
  webhook?: WebhookConfig; // Webhook configuration
}
```

### `CTRFReport`

The main CTRF report structure.

```typescript
interface CTRFReport {
  results: CTRFResults;
}

interface CTRFResults {
  tool: CTRFTool;
  summary: CTRFSummary;
  tests: CTRFTest[];
  environment?: CTRFEnvironment;
  extra?: Record<string, unknown>;
}
```

### `CTRFTest`

Individual test result in CTRF format.

```typescript
interface CTRFTest {
  name: string;           // Test name
  status: TestStatus;     // Test result status
  duration: number;       // Test duration in milliseconds
  message?: string;       // Error message (if failed)
  trace?: string;         // Stack trace (if failed)
  rawStatus?: string;     // Original status from source
  type?: string;          // Test type
  filePath?: string;      // Source file path
  retry?: number;         // Retry attempt number
  flaky?: boolean;        // Flaky test indicator
  suite?: string;         // Test suite name
  tags?: string[];        // Test tags
  meta?: Record<string, unknown>; // Additional metadata
}
```

### `CTRFSummary`

Test execution summary.

```typescript
interface CTRFSummary {
  tests: number;    // Total number of tests
  passed: number;   // Number of passed tests
  failed: number;   // Number of failed tests
  pending: number;  // Number of pending tests
  skipped: number;  // Number of skipped tests
  other: number;    // Number of other status tests
  start: number;    // Start timestamp
  stop: number;     // End timestamp
}
```

### `TestStatus`

Valid test status values.

```typescript
type TestStatus = 'passed' | 'failed' | 'skipped' | 'pending' | 'other';
```

## Provider System

### `BaseProvider`

Interface that all test framework providers must implement.

```typescript
interface BaseProvider {
  validate(inputPath: string): Promise<boolean>;
  convert(inputPath: string): Promise<CTRFReport>;
}
```

### `PlaywrightProvider`

Provider for converting Playwright JSON reports.

#### Methods

##### `validate(inputPath: string): Promise<boolean>`

Validates that the input file is a valid Playwright report.

##### `convert(inputPath: string): Promise<CTRFReport>`

Converts a Playwright JSON report to CTRF format.

**Supported Playwright Features:**
- Test status mapping
- Duration and retry information
- Error messages and stack traces
- File paths and line numbers
- Test tags and annotations
- Flaky test detection

## Webhook Configuration

### `WebhookConfig`

Configuration for webhook delivery.

```typescript
interface WebhookConfig {
  url: string;                                    // Webhook URL
  method?: 'POST' | 'PUT' | 'PATCH';             // HTTP method
  headers?: Record<string, string>;               // Custom headers
  authToken?: string;                             // Authentication token
  authHeader?: string;                            // Auth header name
  timeout?: number;                               // Request timeout (ms)
  retries?: number;                               // Retry attempts
  retryDelay?: number;                            // Retry delay (ms)
  verifySSL?: boolean;                            // SSL verification
}
```

### `WebhookResponse`

Response from webhook request.

```typescript
interface WebhookResponse {
  success: boolean;         // Request success status
  status: number;           // HTTP status code
  statusText: string;       // HTTP status text
  data?: any;              // Response data
  error?: string;          // Error message (if failed)
}
```

### Authentication Methods

#### Bearer Token
```typescript
{
  authToken: 'Bearer your-token-here'
}
```

#### API Key
```typescript
{
  authToken: 'your-api-key',
  authHeader: 'X-API-Key'
}
```

#### Custom Header
```typescript
{
  authToken: 'custom-value',
  authHeader: 'X-Custom-Auth'
}
```

## Error Handling

### Common Error Types

#### File Not Found
```typescript
try {
  await convert({ input: './missing.json', provider: 'playwright' });
} catch (error) {
  console.error(error.message); // "Input file not found: ./missing.json"
}
```

#### Invalid Provider
```typescript
try {
  await convert({ input: './report.json', provider: 'invalid' });
} catch (error) {
  console.error(error.message); // "Unsupported provider: invalid"
}
```

#### Webhook Failures
Webhook failures are non-blocking and reported separately:

```typescript
await converter.convertAndSave({
  input: './report.json',
  provider: 'playwright',
  output: './ctrf.json',
  webhook: { url: 'https://invalid-url.com' }
});

// Output:
// ❌ Webhook failed: Request failed with status 404
// ✅ Successfully converted ./report.json to CTRF format
```

### Error Handling Best Practices

1. **Always wrap convert calls in try-catch**:
```typescript
try {
  const report = await convert(options);
  console.log('Conversion successful');
} catch (error) {
  console.error('Conversion failed:', error.message);
  process.exit(1);
}
```

2. **Check webhook responses**:
```typescript
const response = await httpClient.sendWebhook(report, config);
if (!response.success) {
  console.warn('Webhook failed:', response.error);
}
```

3. **Validate inputs before conversion**:
```typescript
import { existsSync } from 'fs';

if (!existsSync(inputPath)) {
  throw new Error(`Input file not found: ${inputPath}`);
}
```

## Environment Detection

The library automatically detects and includes environment information:

### CI Environment
- GitHub Actions
- GitLab CI
- Jenkins
- Travis CI
- CircleCI

### Git Information
- Repository URL
- Branch name
- Commit hash

### System Information
- Operating system
- Node.js version
- Architecture

## Usage Examples

### Basic CLI Wrapper
```typescript
import { convert } from 'test-report-ctrfer';

async function convertReport(inputFile: string) {
  try {
    const report = await convert({
      input: inputFile,
      provider: 'playwright',
      output: './ctrf-report.json'
    });
    
    console.log(`✅ Converted ${report.results.summary.tests} tests`);
    return report;
  } catch (error) {
    console.error('❌ Conversion failed:', error.message);
    throw error;
  }
}
```

### Webhook Integration
```typescript
import { convert } from 'test-report-ctrfer';

async function sendTestResults(inputFile: string, webhookUrl: string) {
  const report = await convert({
    input: inputFile,
    provider: 'playwright',
    webhook: {
      url: webhookUrl,
      method: 'POST',
      authToken: process.env.API_TOKEN,
      retries: 3,
      timeout: 30000,
      headers: {
        'X-Team': 'qa',
        'X-Environment': process.env.NODE_ENV
      }
    }
  });
  
  return report;
}
```

### Custom Provider Implementation
```typescript
import { BaseProvider, CTRFReport } from 'test-report-ctrfer';

class CustomProvider implements BaseProvider {
  async validate(inputPath: string): Promise<boolean> {
    // Implement validation logic
    return true;
  }
  
  async convert(inputPath: string): Promise<CTRFReport> {
    // Implement conversion logic
    return {
      results: {
        tool: { name: 'custom-tool' },
        summary: { /* ... */ },
        tests: [ /* ... */ ]
      }
    };
  }
}
``` 