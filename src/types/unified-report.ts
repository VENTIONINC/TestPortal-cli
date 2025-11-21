import { z } from 'zod';

// Unified test status that maps to all framework statuses
export const UnifiedTestStatusSchema = z.enum([
  'passed',
  'failed',
  'skipped',
  'pending',
  'todo',
  'timeout',
  'interrupted',
]);

export type UnifiedTestStatus = z.infer<typeof UnifiedTestStatusSchema>;

// Error information unified across frameworks
export const UnifiedErrorSchema = z.object({
  message: z.string(),
  stack: z.string().optional(),
  location: z
    .object({
      file: z.string(),
      line: z.number(),
      column: z.number(),
    })
    .optional(),
  diff: z.string().optional(),
  snippet: z.string().optional(),
});

export type UnifiedError = z.infer<typeof UnifiedErrorSchema>;

// Individual test attempt result
export const UnifiedTestAttemptSchema = z.object({
  attemptNumber: z.number(),
  status: UnifiedTestStatusSchema,
  duration: z.number().optional(),
  startTime: z.string().optional(),
  errors: z.array(UnifiedErrorSchema).optional(),
});

export type UnifiedTestAttempt = z.infer<typeof UnifiedTestAttemptSchema>;

// Individual test result
export const UnifiedTestResultSchema = z.object({
  id: z.string(),
  name: z.string(),
  fullName: z.string(),
  status: UnifiedTestStatusSchema, // Overall final status
  duration: z.number().optional(), // Total duration across all attempts
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  tags: z.array(z.string()).optional(),
  assertions: z.number().optional(),
  results: z.array(UnifiedTestAttemptSchema), // ALL execution attempts
});

export type UnifiedTestResult = z.infer<typeof UnifiedTestResultSchema>;

// Test suite/group container - flattened structure
export interface UnifiedTestSuite {
  id: string;
  name: string;
  file?: string | undefined;
  path?: string | undefined;
  tests: UnifiedTestResult[];
  duration?: number | undefined;
}

export const UnifiedTestSuiteSchema = z.lazy(() =>
  z.object({
    id: z.string(),
    name: z.string(),
    file: z.string().optional(),
    path: z.string().optional(),
    tests: z.array(UnifiedTestResultSchema),
    duration: z.number().optional(),
  })
);

// Overall test statistics
export const UnifiedTestStatsSchema = z.object({
  total: z.number(),
  passed: z.number(),
  failed: z.number(),
  skipped: z.number(),
  pending: z.number().optional(),
  todo: z.number().optional(),
  timeout: z.number().optional(),
  interrupted: z.number().optional(),
  suites: z.number().optional(),
  duration: z.number(),
  startTime: z.string(),
  endTime: z.string().optional(),
});

export type UnifiedTestStats = z.infer<typeof UnifiedTestStatsSchema>;

// Coverage information (mainly from Jest)
export const UnifiedCoverageSchema = z.object({
  statements: z
    .object({
      total: z.number(),
      covered: z.number(),
      percentage: z.number(),
    })
    .optional(),
  branches: z
    .object({
      total: z.number(),
      covered: z.number(),
      percentage: z.number(),
    })
    .optional(),
  functions: z
    .object({
      total: z.number(),
      covered: z.number(),
      percentage: z.number(),
    })
    .optional(),
  lines: z
    .object({
      total: z.number(),
      covered: z.number(),
      percentage: z.number(),
    })
    .optional(),
});

export type UnifiedCoverage = z.infer<typeof UnifiedCoverageSchema>;

// Main unified report structure
export const UnifiedReportSchema = z.object({
  id: z.string(),
  runId: z.string().optional(),
  framework: z.enum([
    'jest',
    'cypress',
    'playwright',
    'junit',
    'vitest',
    'nunit',
    'pytest',
    'other',
  ]),
  frameworkVersion: z.string().optional(),
  toolVersion: z.string().optional(),
  stats: UnifiedTestStatsSchema,
  suites: z.array(UnifiedTestSuiteSchema),
  coverage: UnifiedCoverageSchema.optional(),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
});

export type UnifiedReport = z.infer<typeof UnifiedReportSchema>;
