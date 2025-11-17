# API Documentation

This document provides detailed API documentation for all classes, interfaces, and functions available in the test-report-converter library.

## Table of Contents

- [Functions](#functions)
  - [convert()](#convert)
- [Classes](#classes)
  - [Converter](#converter)
  - [HttpClient](#httpclient)
- [Interfaces](#interfaces)
  - [UnifiedReport](#unifiedreport)
  - [ConvertOptions](#convertoptions)
  - [WebhookConfig](#webhookconfig)

## Functions

### `convert()`

The primary function for converting test reports to unified format.

```typescript
function convert(options: ConvertOptions): Promise<UnifiedReport>;
```

**Parameters:**

- `options` (ConvertOptions): Configuration object for conversion

**Returns:** `Promise<UnifiedReport>` - The converted unified report

**Example:**

```typescript
import { convert } from 'test-report-converter';

const report = await convert({
  input: './playwright-results.json',
  provider: 'playwright',
  output: './unified-report.json',
  webhook: {
    url: 'https://api.example.com/reports',
    authToken: 'your-token',
  },
});
```

## Classes

### `Converter`

Main converter class that handles the conversion process.

#### Constructor

```typescript
new Converter();
```

Creates a new Converter instance with default configuration.

#### Methods

##### `convert(options: ConvertOptions): Promise<UnifiedReport>`

Converts a test report to unified format.

**Parameters:**

- `options` (ConvertOptions): Configuration for the conversion

**Returns:** `Promise<UnifiedReport>` - The converted report

**Example:**

```typescript
import { Converter } from 'test-report-converter';

const converter = new Converter();
const report = await converter.convert({
  input: './test-results.json',
  provider: 'playwright',
  output: './unified-report.json',
});
```

##### `convertAndSave(options: ConvertOptions): Promise<void>`

Converts a test report and saves/sends it according to the options.

**Parameters:**

- `options` (ConvertOptions): Configuration including output and webhook options

**Returns:** `Promise<void>`

**Example:**

```typescript
const converter = new Converter();
await converter.convertAndSave({
  input: './test-results.json',
  provider: 'playwright',
  output: './unified-report.json',
  webhook: {
    url: 'https://api.example.com/webhook',
  },
});
```

##### `getAvailableProviders(): string[]`

Returns a list of available test framework providers.

**Returns:** `string[]` - Array of provider names

**Example:**

```typescript
const converter = new Converter();
const providers = converter.getAvailableProviders();
console.log(providers); // ['jest', 'playwright', 'cypress', 'junit', 'vitest', 'nunit']
```

### `HttpClient`

HTTP client for webhook delivery with retry logic.

#### Constructor

```typescript
new HttpClient();
```

#### Methods

##### `sendWebhook(report: UnifiedReport, config: WebhookConfig): Promise<WebhookResponse>`

Sends a unified report to a webhook endpoint.

**Parameters:**

- `report` (UnifiedReport): The unified report to send
- `config` (WebhookConfig): Webhook configuration

**Returns:** `Promise<WebhookResponse>` - Response from the webhook

**Example:**

```typescript
import { HttpClient } from 'test-report-converter';

const client = new HttpClient();
const response = await client.sendWebhook(report, {
  url: 'https://api.example.com/webhook',
  method: 'POST',
  authToken: 'your-token',
  retries: 3,
});
```

## Interfaces

### `UnifiedReport`

The main unified report structure.

```typescript
interface UnifiedReport {
  id: string;
  runId?: string;
  framework: 'jest' | 'cypress' | 'playwright' | 'other';
  frameworkVersion?: string;
  toolVersion?: string;
  stats: UnifiedTestStats;
  suites: UnifiedTestSuite[];
  coverage?: UnifiedCoverage;
  createdAt: string;
  updatedAt?: string;
}

interface UnifiedTestStats {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  pending?: number;
  todo?: number;
  timeout?: number;
  interrupted?: number;
  suites?: number;
  duration: number;
  startTime: string;
  endTime?: string;
}

interface UnifiedTestSuite {
  id: string;
  name: string;
  file?: string;
  path?: string;
  tests: UnifiedTestResult[];
  duration?: number;
}

interface UnifiedTestResult {
  id: string;
  name: string;
  fullName: string;
  status: UnifiedTestStatus;
  duration?: number;
  startTime?: string;
  endTime?: string;
  tags?: string[];
  assertions?: number;
  results: UnifiedTestAttempt[];
}

type UnifiedTestStatus =
  | 'passed'
  | 'failed'
  | 'skipped'
  | 'pending'
  | 'todo'
  | 'timeout'
  | 'interrupted';

interface UnifiedTestAttempt {
  attemptNumber: number;
  status: UnifiedTestStatus;
  duration?: number;
  startTime?: string;
  errors?: UnifiedError[];
}

interface UnifiedError {
  message: string;
  stack?: string;
  location?: {
    file: string;
    line: number;
    column: number;
  };
  diff?: string;
  snippet?: string;
}
```

### `ConvertOptions`

Configuration options for conversion.

```typescript
interface ConvertOptions {
  input: string; // Path to input test report file
  output?: string; // Path for output file (optional)
  provider: string; // Test framework provider name
  stdout?: boolean; // Output to console instead of file
  webhook?: WebhookConfig; // Webhook configuration (optional)
}
```

### `WebhookConfig`

Configuration for webhook delivery.

```typescript
interface WebhookConfig {
  url: string; // Webhook URL
  method?: 'POST' | 'PUT' | 'PATCH'; // HTTP method (default: POST)
  headers?: Record<string, string>; // Custom headers
  authToken?: string; // Authentication token
  authHeader?: string; // Custom auth header name
  timeout?: number; // Request timeout in ms
  retries?: number; // Number of retry attempts
  retryDelay?: number; // Delay between retries in ms
  verifySSL?: boolean; // Verify SSL certificates
}
```

### `WebhookResponse`

Response from webhook delivery.

```typescript
interface WebhookResponse {
  success: boolean; // Whether the request succeeded
  status: number; // HTTP status code
  statusText: string; // HTTP status text
  data?: any; // Response data
  error?: string; // Error message if failed
}
```

## Provider Support

### Supported Providers

- **jest**: Jest test framework reports
- **playwright**: Playwright test framework reports
- **cypress**: Cypress test framework reports
- **junit**: JUnit XML format reports
- **vitest**: Vitest test framework reports
- **nunit**: NUnit XML format reports

### Provider-Specific Notes

#### Jest Provider

- Supports Jest JSON reports
- Includes coverage information when available
- Maps Jest-specific statuses (todo, pending)

#### Playwright Provider

- Supports Playwright JSON reporter output
- Handles retry attempts and flaky tests
- Includes project and browser information
- Extracts runId when available

#### Cypress Provider

- Supports mochawesome JSON format
- Includes basic test information
- Maps Cypress-specific statuses

#### JUnit Provider

- Supports standard JUnit XML format
- Handles both single testsuite and testsuites formats
- Maps XML attributes to unified format

#### Vitest Provider

- Supports Vitest JSON reports (Jest-compatible format)
- Maps Vitest-specific statuses (passed, failed, skipped, pending, todo)
- Extracts error messages and stack traces

#### NUnit Provider

- Supports NUnit XML format
- Handles NUnit test result files
- Maps NUnit-specific statuses

## Error Handling

### Common Errors

- **FileNotFoundError**: Input file doesn't exist
- **InvalidProviderError**: Unsupported provider specified
- **InvalidFormatError**: Input file format incompatible with provider
- **WebhookError**: Webhook delivery failed
- **ValidationError**: Report data validation failed

### Error Examples

```typescript
try {
  const report = await convert({
    input: './results.json',
    provider: 'playwright',
  });
} catch (error) {
  if (error.message.includes('Input file not found')) {
    console.error('File not found:', error.message);
  } else if (error.message.includes('Unsupported provider')) {
    console.error('Invalid provider:', error.message);
  } else {
    console.error('Conversion failed:', error.message);
  }
}
```

## Examples

### Basic File Conversion

```typescript
import { convert } from 'test-report-converter';

// Convert Playwright results
const report = await convert({
  input: './playwright-results.json',
  provider: 'playwright',
  output: './unified-report.json',
});

console.log(`Converted ${report.stats.total} tests`);
```

### Webhook Integration

```typescript
import { convert } from 'test-report-converter';

// Send results to webhook
await convert({
  input: './test-results.json',
  provider: 'jest',
  webhook: {
    url: 'https://api.example.com/test-results',
    method: 'POST',
    authToken: 'Bearer your-token',
    headers: {
      'X-Team': 'qa',
      'X-Environment': 'production',
    },
    retries: 3,
    timeout: 30000,
  },
});
```

### Advanced Usage with Error Handling

```typescript
import { Converter } from 'test-report-converter';

const converter = new Converter();

try {
  // Check available providers
  const providers = converter.getAvailableProviders();
  console.log('Available providers:', providers);

  // Convert with full configuration
  await converter.convertAndSave({
    input: './test-results.json',
    provider: 'playwright',
    output: './unified-report.json',
    webhook: {
      url: 'https://webhook.example.com/reports',
      authToken: 'your-api-token',
      retries: 5,
      retryDelay: 2000,
      timeout: 60000,
      verifySSL: false,
    },
  });

  console.log('✅ Conversion and delivery completed');
} catch (error) {
  console.error('❌ Error:', error.message);
}
```

## TypeScript Support

The library is written in TypeScript and provides full type definitions. All interfaces and types are exported for use in TypeScript projects.

```typescript
import type {
  UnifiedReport,
  ConvertOptions,
  WebhookConfig,
  UnifiedTestResult,
  UnifiedTestStatus,
} from 'test-report-converter';
```
