// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { z } from 'zod';

export const TestStatusSchema = z.enum([
  'passed',
  'failed',
  'skipped',
  'pending',
  'other',
]);

export type TestStatus = z.infer<typeof TestStatusSchema>;

export const CTRFToolSchema = z.object({
  name: z.string(),
  version: z.string().optional(),
});

export type CTRFTool = z.infer<typeof CTRFToolSchema>;

export const CTRFSummarySchema = z.object({
  tests: z.number(),
  passed: z.number(),
  failed: z.number(),
  pending: z.number(),
  skipped: z.number(),
  other: z.number(),
  start: z.number(),
  stop: z.number(),
});

export type CTRFSummary = z.infer<typeof CTRFSummarySchema>;

export const CTRFTestPortalErrorSchema = z.object({
  index: z.number().int().nonnegative(),
  message: z.string().optional(),
  stack: z.string().optional(),
  location: z
    .object({
      file: z.string(),
      line: z.number().int(),
      column: z.number().int().optional(),
    })
    .optional(),
  rawLogs: z.array(z.string()).optional(),
  sourceSnippet: z
    .object({
      path: z.string(),
      text: z.string(),
      startLine: z.number().int(),
      failingLine: z.number().int(),
    })
    .optional(),
  generatedTestCase: z.string().optional(),
});

export const CTRFTestPortalExtraSchema = z.object({
  version: z.literal(1),
  errors: z.array(CTRFTestPortalErrorSchema),
});

export const CTRFRetryAttemptSchema = z.object({
  attempt: z.number().int().positive(),
  status: TestStatusSchema,
  duration: z.number().int().nonnegative().optional(),
  message: z.string().optional(),
  trace: z.string().optional(),
  line: z.number().int().optional(),
  snippet: z.string().optional(),
  stdout: z.array(z.string()).optional(),
  stderr: z.array(z.string()).optional(),
  start: z.number().int().optional(),
  stop: z.number().int().optional(),
  extra: z
    .object({ testPortal: CTRFTestPortalExtraSchema })
    .passthrough()
    .optional(),
});

export const CTRFTestSchema = z.object({
  name: z.string(),
  status: TestStatusSchema,
  duration: z.number(),
  start: z.number().int().optional(),
  stop: z.number().int().optional(),
  message: z.string().optional(),
  trace: z.string().optional(),
  rawStatus: z.string().optional(),
  type: z.string().optional(),
  filePath: z.string().optional(),
  retries: z.number().int().nonnegative().optional(),
  retryAttempts: z.array(CTRFRetryAttemptSchema).optional(),
  flaky: z.boolean().optional(),
  suite: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  snippet: z.string().optional(),
  line: z.number().int().optional(),
  stdout: z.array(z.string()).optional(),
  stderr: z.array(z.string()).optional(),
  extra: z
    .object({ testPortal: CTRFTestPortalExtraSchema })
    .passthrough()
    .optional(),
  meta: z.record(z.unknown()).optional(),
});

export type CTRFTest = z.infer<typeof CTRFTestSchema>;

export const CTRFEnvironmentSchema = z.object({
  appName: z.string().optional(),
  buildName: z.string().optional(),
  buildNumber: z.string().optional(),
  buildUrl: z.string().optional(),
  repositoryName: z.string().optional(),
  repositoryUrl: z.string().optional(),
  branchName: z.string().optional(),
  testEnvironment: z.string().optional(),
  executionType: z.string().optional(),
  extra: z.record(z.unknown()).optional(),
});

export type CTRFEnvironment = z.infer<typeof CTRFEnvironmentSchema>;

export const CTRFResultsSchema = z.object({
  tool: CTRFToolSchema,
  summary: CTRFSummarySchema,
  tests: z.array(CTRFTestSchema),
  environment: CTRFEnvironmentSchema.optional(),
  extra: z.record(z.unknown()).optional(),
});

export type CTRFResults = z.infer<typeof CTRFResultsSchema>;

export const CTRFReportSchema = z.object({
  reportFormat: z.literal('CTRF'),
  specVersion: z.literal('0.0.0'),
  results: CTRFResultsSchema,
});

export type CTRFReport = z.infer<typeof CTRFReportSchema>;
