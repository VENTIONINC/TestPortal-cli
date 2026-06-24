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

export const CTRFTestSchema = z.object({
  name: z.string(),
  status: TestStatusSchema,
  duration: z.number(),
  message: z.string().optional(),
  trace: z.string().optional(),
  rawStatus: z.string().optional(),
  type: z.string().optional(),
  filePath: z.string().optional(),
  retry: z.number().optional(),
  flaky: z.boolean().optional(),
  suite: z.string().optional(),
  tags: z.array(z.string()).optional(),
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
  results: CTRFResultsSchema,
});

export type CTRFReport = z.infer<typeof CTRFReportSchema>;
