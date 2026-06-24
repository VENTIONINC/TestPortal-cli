// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { z } from 'zod';

export const VitestTestStatusSchema = z.enum([
  'passed',
  'failed',
  'skipped',
  'pending',
  'todo',
]);

export type VitestTestStatus = z.infer<typeof VitestTestStatusSchema>;

export const VitestAssertionResultSchema = z.object({
  ancestorTitles: z.array(z.string()),
  fullName: z.string(),
  status: VitestTestStatusSchema,
  title: z.string(),
  duration: z.number().optional(),
  failureMessages: z.array(z.string()),
  meta: z.record(z.unknown()).optional(),
});

export type VitestAssertionResult = z.infer<typeof VitestAssertionResultSchema>;

export const VitestTestResultSchema = z.object({
  assertionResults: z.array(VitestAssertionResultSchema),
  startTime: z.number(),
  endTime: z.number(),
  status: z.string(),
  message: z.string(),
  name: z.string(),
});

export type VitestTestResult = z.infer<typeof VitestTestResultSchema>;

export const VitestSnapshotSummarySchema = z.object({
  added: z.number(),
  failure: z.boolean(),
  filesAdded: z.number(),
  filesRemoved: z.number(),
  filesRemovedList: z.array(z.string()),
  filesUnmatched: z.number(),
  filesUpdated: z.number(),
  matched: z.number(),
  total: z.number(),
  unchecked: z.number(),
  uncheckedKeysByFile: z.array(z.unknown()),
  unmatched: z.number(),
  updated: z.number(),
  didUpdate: z.boolean(),
});

export type VitestSnapshotSummary = z.infer<typeof VitestSnapshotSummarySchema>;

export const VitestReportSchema = z.object({
  numTotalTestSuites: z.number(),
  numPassedTestSuites: z.number(),
  numFailedTestSuites: z.number(),
  numPendingTestSuites: z.number(),
  numTotalTests: z.number(),
  numPassedTests: z.number(),
  numFailedTests: z.number(),
  numPendingTests: z.number(),
  numTodoTests: z.number(),
  snapshot: VitestSnapshotSummarySchema,
  startTime: z.number(),
  success: z.boolean(),
  testResults: z.array(VitestTestResultSchema),
});

export type VitestReport = z.infer<typeof VitestReportSchema>;
