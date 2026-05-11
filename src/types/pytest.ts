// Copyright 2026 Vention
// SPDX-License-Identifier: Apache-2.0

import { z } from 'zod';

// Pytest outcome types
export const PytestOutcomeSchema = z.enum([
  'passed',
  'failed',
  'skipped',
  'xfailed', // expected fail
  'xpassed', // unexpected pass
  'error',
]);

export type PytestOutcome = z.infer<typeof PytestOutcomeSchema>;

// Traceback entry
export const PytestTracebackSchema = z.object({
  path: z.string(),
  lineno: z.number(),
  message: z.string().optional(),
});

export type PytestTraceback = z.infer<typeof PytestTracebackSchema>;

// Crash information
export const PytestCrashSchema = z.object({
  path: z.string(),
  lineno: z.number(),
  message: z.string(),
});

export type PytestCrash = z.infer<typeof PytestCrashSchema>;

// Test stage (setup/call/teardown)
export const PytestStageSchema = z.object({
  outcome: PytestOutcomeSchema,
  duration: z.number().optional(),
  stdout: z.string().optional(),
  stderr: z.string().optional(),
  log: z.array(z.unknown()).optional(),
  longrepr: z.string().optional(),
  crash: PytestCrashSchema.optional(),
  traceback: z.array(PytestTracebackSchema).optional(),
});

export type PytestStage = z.infer<typeof PytestStageSchema>;

// Individual test result
export const PytestTestSchema = z.object({
  nodeid: z.string(),
  lineno: z.number(),
  outcome: PytestOutcomeSchema,
  keywords: z.array(z.string()).optional(),
  setup: PytestStageSchema.optional(),
  call: PytestStageSchema.optional(),
  teardown: PytestStageSchema.optional(),
  user_properties: z.array(z.unknown()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type PytestTest = z.infer<typeof PytestTestSchema>;

// Summary statistics
export const PytestSummarySchema = z.object({
  total: z.number(),
  passed: z.number().optional(),
  failed: z.number().optional(),
  skipped: z.number().optional(),
  xpassed: z.number().optional(),
  xfailed: z.number().optional(),
  error: z.number().optional(),
  collected: z.number(),
  deselected: z.number().optional(),
});

export type PytestSummary = z.infer<typeof PytestSummarySchema>;

// Main report structure
export const PytestReportSchema = z.object({
  created: z.number(),
  duration: z.number(),
  exitcode: z.number(),
  root: z.string(),
  environment: z.record(z.unknown()).optional(),
  summary: PytestSummarySchema,
  collectors: z.array(z.unknown()).optional(),
  tests: z.array(PytestTestSchema),
  warnings: z.array(z.unknown()).optional(),
});

export type PytestReport = z.infer<typeof PytestReportSchema>;
