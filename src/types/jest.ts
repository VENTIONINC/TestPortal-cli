// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { z } from 'zod';

export const JestTestStatusSchema = z.enum([
  'passed',
  'failed',
  'pending',
  'todo',
]);

export type JestTestStatus = z.infer<typeof JestTestStatusSchema>;

export const JestMatcherResultSchema = z.object({
  actual: z.unknown(),
  expected: z.unknown(),
  message: z.string(),
  name: z.string(),
  pass: z.boolean(),
});

export type JestMatcherResult = z.infer<typeof JestMatcherResultSchema>;

export const JestFailureDetailSchema = z.object({
  matcherResult: JestMatcherResultSchema.optional(),
});

export type JestFailureDetail = z.infer<typeof JestFailureDetailSchema>;

export const JestAssertionResultSchema = z.object({
  ancestorTitles: z.array(z.string()),
  duration: z.number().optional(),
  failureDetails: z.array(JestFailureDetailSchema),
  failureMessages: z.array(z.string()),
  fullName: z.string(),
  invocations: z.number(),
  location: z.unknown().nullable(),
  numPassingAsserts: z.number(),
  retryReasons: z.array(z.unknown()),
  status: JestTestStatusSchema,
  title: z.string(),
});

export type JestAssertionResult = z.infer<typeof JestAssertionResultSchema>;

export const JestDisplayNameSchema = z.object({
  color: z.string().optional(),
  name: z.string(),
});

export type JestDisplayName = z.infer<typeof JestDisplayNameSchema>;

export const JestPerfStatsSchema = z.object({
  end: z.number(),
  runtime: z.number(),
  slow: z.boolean(),
  start: z.number(),
});

export type JestPerfStats = z.infer<typeof JestPerfStatsSchema>;

export const JestSnapshotResultSchema = z.object({
  added: z.number(),
  fileDeleted: z.boolean(),
  matched: z.number(),
  unchecked: z.number(),
  unmatched: z.number(),
  updated: z.number(),
});

export type JestSnapshotResult = z.infer<typeof JestSnapshotResultSchema>;

export const JestTestResultSchema = z.object({
  assertionResults: z.array(JestAssertionResultSchema),
  coverage: z.record(z.unknown()),
  displayName: JestDisplayNameSchema.optional(),
  endTime: z.number(),
  leaks: z.boolean(),
  numFailingTests: z.number(),
  numPassingTests: z.number(),
  numPendingTests: z.number(),
  numTodoTests: z.number(),
  openHandles: z.array(z.unknown()),
  perfStats: JestPerfStatsSchema,
  skipped: z.boolean(),
  snapshot: JestSnapshotResultSchema,
  sourceMaps: z.record(z.unknown()),
  testFilePath: z.string(),
  testResults: z.array(JestAssertionResultSchema),
});

export type JestTestResult = z.infer<typeof JestTestResultSchema>;

export const JestSnapshotSummarySchema = z.object({
  added: z.number(),
  didUpdate: z.boolean(),
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
});

export type JestSnapshotSummary = z.infer<typeof JestSnapshotSummarySchema>;

export const JestLocationSchema = z.object({
  line: z.number(),
  column: z.number(),
});

export type JestLocation = z.infer<typeof JestLocationSchema>;

export const JestStatementMapSchema = z.record(
  z.object({
    start: JestLocationSchema,
    end: JestLocationSchema,
  })
);

export type JestStatementMap = z.infer<typeof JestStatementMapSchema>;

export const JestFunctionMapSchema = z.record(
  z.object({
    name: z.string(),
    decl: z.object({
      start: JestLocationSchema,
      end: JestLocationSchema,
    }),
    loc: z.object({
      start: JestLocationSchema,
      end: JestLocationSchema,
    }),
  })
);

export type JestFunctionMap = z.infer<typeof JestFunctionMapSchema>;

export const JestBranchMapSchema = z.record(
  z.object({
    loc: z.object({
      start: JestLocationSchema,
      end: JestLocationSchema,
    }),
    type: z.string(),
    locations: z.array(
      z.object({
        start: JestLocationSchema,
        end: JestLocationSchema,
      })
    ),
  })
);

export type JestBranchMap = z.infer<typeof JestBranchMapSchema>;

export const JestCoverageDataSchema = z.object({
  path: z.string(),
  statementMap: JestStatementMapSchema,
  fnMap: JestFunctionMapSchema,
  branchMap: JestBranchMapSchema,
  s: z.record(z.number()),
  f: z.record(z.number()),
  b: z.record(z.array(z.number())),
});

export type JestCoverageData = z.infer<typeof JestCoverageDataSchema>;

export const JestCoverageMapSchema = z.record(JestCoverageDataSchema);

export type JestCoverageMap = z.infer<typeof JestCoverageMapSchema>;

export const JestReportSchema = z.object({
  numFailedTestSuites: z.number(),
  numFailedTests: z.number(),
  numPassedTestSuites: z.number(),
  numPassedTests: z.number(),
  numPendingTestSuites: z.number(),
  numPendingTests: z.number(),
  numRuntimeErrorTestSuites: z.number(),
  numTodoTests: z.number(),
  numTotalTestSuites: z.number(),
  numTotalTests: z.number(),
  openHandles: z.array(z.unknown()),
  snapshot: JestSnapshotSummarySchema,
  startTime: z.number(),
  success: z.boolean(),
  testResults: z.array(JestTestResultSchema),
  wasInterrupted: z.boolean(),
  coverageMap: JestCoverageMapSchema.optional(),
});

export type JestReport = z.infer<typeof JestReportSchema>;
