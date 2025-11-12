# CTRF Report Receiver Updates Required

## Overview
CTRF reports now include an `environment` object with CI/CD and git metadata. The report receiver needs to parse and store this information.

## CTRF Format Changes

### New Field: `results.environment`
The `environment` object is **optional** and contains CI/CD context:

```json
{
  "results": {
    "tool": { "name": "vitest" },
    "summary": { ... },
    "tests": [ ... ],
    "environment": {
      "appName": "string (optional)",
      "buildName": "string (optional)",
      "buildNumber": "string (optional)",
      "buildUrl": "string (optional)",
      "repositoryName": "string (optional)",
      "repositoryUrl": "string (optional)",
      "branchName": "string (optional)",
      "testEnvironment": "string (optional)",
      "extra": "Record<string, unknown> (optional)"
    }
  }
}
```

### Environment Field Definitions

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `appName` | string | Application name | "my-app" |
| `buildName` | string | Build/workflow name | "CI", "Test Pipeline" |
| `buildNumber` | string | Build number/ID | "123", "42" |
| `buildUrl` | string | Link to build execution | "https://github.com/owner/repo/actions/runs/456" |
| `repositoryName` | string | Repository identifier | "owner/repo", "group/project" |
| `repositoryUrl` | string | Repository URL | "https://github.com/owner/repo" |
| `branchName` | string | Git branch name | "main", "feat/test" |
| `testEnvironment` | string | Test environment | "staging", "production" |
| `extra` | object | Custom key-value pairs | `{"region": "us-east-1"}` |

### Auto-Detection Support

The CLI automatically detects environment from these CI systems:
- **GitHub Actions**: workflow, run number, repository, branch
- **GitLab CI**: project name, pipeline ID, repository, branch
- **Jenkins**: job name, build number, branch
- **Azure DevOps**: build definition, build number, repository, branch

Fallback to `GIT_*` environment variables if no CI system detected.

## Required Changes in Report Receiver

### 1. Database Schema Updates

**Add new table or columns to store environment metadata:**

```sql
-- Option A: Separate table
CREATE TABLE test_run_environments (
  id SERIAL PRIMARY KEY,
  test_run_id INTEGER REFERENCES test_runs(id),
  app_name VARCHAR(255),
  build_name VARCHAR(255),
  build_number VARCHAR(100),
  build_url TEXT,
  repository_name VARCHAR(255),
  repository_url TEXT,
  branch_name VARCHAR(255),
  test_environment VARCHAR(100),
  extra JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Option B: Add columns to existing test_runs table
ALTER TABLE test_runs ADD COLUMN build_name VARCHAR(255);
ALTER TABLE test_runs ADD COLUMN build_number VARCHAR(100);
ALTER TABLE test_runs ADD COLUMN build_url TEXT;
ALTER TABLE test_runs ADD COLUMN repository_name VARCHAR(255);
ALTER TABLE test_runs ADD COLUMN repository_url TEXT;
ALTER TABLE test_runs ADD COLUMN branch_name VARCHAR(255);
ALTER TABLE test_runs ADD COLUMN test_environment VARCHAR(100);
ALTER TABLE test_runs ADD COLUMN environment_extra JSONB;
```

### 2. API/Parser Updates

**Parse the `environment` field from CTRF reports:**

```typescript
interface CTRFEnvironment {
  appName?: string;
  buildName?: string;
  buildNumber?: string;
  buildUrl?: string;
  repositoryName?: string;
  repositoryUrl?: string;
  branchName?: string;
  testEnvironment?: string;
  extra?: Record<string, unknown>;
}

interface CTRFReport {
  results: {
    tool: { name: string; version?: string };
    summary: { ... };
    tests: Array<...>;
    environment?: CTRFEnvironment; // NEW FIELD
    extra?: Record<string, unknown>;
  };
}
```

**Update report ingestion logic:**

```typescript
async function ingestCTRFReport(report: CTRFReport) {
  const { tool, summary, tests, environment } = report.results;

  // Create test run
  const testRun = await createTestRun({
    framework: tool.name,
    summary,
    // NEW: Add environment data
    buildName: environment?.buildName,
    buildNumber: environment?.buildNumber,
    buildUrl: environment?.buildUrl,
    repositoryName: environment?.repositoryName,
    repositoryUrl: environment?.repositoryUrl,
    branchName: environment?.branchName,
    testEnvironment: environment?.testEnvironment,
    environmentExtra: environment?.extra,
  });

  // Process tests...
}
```

### 3. UI Display Updates

**Show environment context in test run details:**

- Display build/CI information in test run header
- Link to build URL if available
- Show repository and branch information
- Filter test runs by branch, build number, or environment

**Suggested UI Layout:**

```
Test Run #123 - vitest
─────────────────────────────────────
CI/CD Context:
  Build: TestCI #42 → [View in GitHub]
  Repository: owner/test-repo (feat/test)
  Environment: staging

Summary:
  4 tests | 2 passed | 1 failed | 1 pending
```

### 4. API Endpoints (Optional)

**Add filtering/querying by environment fields:**

```
GET /api/test-runs?branch=main
GET /api/test-runs?repository=owner/repo
GET /api/test-runs?buildNumber=42
GET /api/test-runs?environment=staging
```

### 5. Backward Compatibility

**Handle reports without `environment` field:**

```typescript
// Environment is optional - handle gracefully
const environment = report.results.environment || {};

// All fields within environment are optional
const buildName = environment.buildName || null;
```

Reports from older versions or without CI detection will have:
- `environment` = `{}` (empty object) or undefined
- All fields should be nullable in database

## Migration Path

1. **Phase 1**: Add database schema changes with nullable columns
2. **Phase 2**: Update parser to read and store environment data
3. **Phase 3**: Add UI components to display environment info
4. **Phase 4**: Add filtering/search by environment fields

## Example CTRF Reports

### With GitHub Actions Environment
```json
{
  "results": {
    "tool": { "name": "vitest" },
    "summary": { "tests": 4, "passed": 2, "failed": 1, "pending": 1, "skipped": 0, "other": 0, "start": 1761646529949, "stop": 1761646529953 },
    "tests": [...],
    "environment": {
      "buildName": "CI",
      "buildNumber": "123",
      "buildUrl": "https://github.com/owner/repo/actions/runs/456",
      "repositoryName": "owner/repo",
      "repositoryUrl": "https://github.com/owner/repo",
      "branchName": "main"
    }
  }
}
```

### Without Environment (Legacy)
```json
{
  "results": {
    "tool": { "name": "vitest" },
    "summary": { "tests": 4, "passed": 2, "failed": 1, "pending": 1, "skipped": 0, "other": 0, "start": 1761646529949, "stop": 1761646529953 },
    "tests": [...],
    "environment": {}
  }
}
```

## Testing Checklist

- [ ] Parse CTRF with environment data
- [ ] Parse CTRF without environment data (backward compatibility)
- [ ] Store environment data in database
- [ ] Display environment data in UI
- [ ] Filter test runs by branch/build/environment
- [ ] Handle nullable/optional fields gracefully
- [ ] Test with all supported CI systems (GitHub Actions, GitLab, Jenkins, Azure)

## References

- CTRF Schema: `src/types/ctrf.ts` (lines 51-63)
- Environment Detection: `src/utils/environment.ts`
- Converter Integration: `src/utils/ctrf-converter.ts` (line 51, 76)
