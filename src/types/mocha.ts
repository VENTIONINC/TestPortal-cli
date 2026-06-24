// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { z } from 'zod';

// Mocha test states
export const MochaTestStateSchema = z.enum([
  'passed',
  'failed',
  'pending',
  'skipped',
]);

export type MochaTestState = z.infer<typeof MochaTestStateSchema>;

// Mocha error information
export const MochaErrorSchema = z.object({
  message: z.string().optional(),
  stack: z.string().optional(),
  actual: z.unknown().optional(),
  expected: z.unknown().optional(),
  operator: z.string().optional(),
  showDiff: z.boolean().optional(),
});

export type MochaError = z.infer<typeof MochaErrorSchema>;

// Mocha test result
export const MochaTestSchema = z.object({
  title: z.string(),
  fullTitle: z.string(),
  file: z.string().optional(),
  duration: z.number().optional(),
  currentRetry: z.number().optional(),
  speed: z.string().optional(), // 'slow', 'medium', 'fast'
  err: MochaErrorSchema.optional(),
  uuid: z.string().optional(),
  parentUUID: z.string().optional(),
  isHook: z.boolean().optional(),
  skipped: z.boolean().optional(),
  pending: z.boolean().optional(),
  pass: z.boolean().optional(),
  fail: z.boolean().optional(),
  code: z.string().optional(),
  timedOut: z.boolean().optional(),
  context: z.string().optional(),
});

export type MochaTest = z.infer<typeof MochaTestSchema>;

// Mocha suite (describe block) - use lazy schema for recursive structure
export const MochaSuiteSchema: z.ZodSchema<any> = z.lazy(() =>
  z.object({
    title: z.string(),
    file: z.string().optional(),
    uuid: z.string().optional(),
    parentUUID: z.string().optional(),
    fullFile: z.string().optional(),
    tests: z.array(MochaTestSchema),
    suites: z.array(MochaSuiteSchema).optional(),
    passes: z.array(z.string()).optional(),
    failures: z.array(z.string()).optional(),
    pending: z.array(z.string()).optional(),
    skipped: z.array(z.string()).optional(),
    duration: z.number().optional(),
    root: z.boolean().optional(),
    _timeout: z.number().optional(),
  })
);

export type MochaSuite = {
  title: string;
  file?: string;
  uuid?: string;
  parentUUID?: string;
  fullFile?: string;
  tests: MochaTest[];
  suites?: MochaSuite[];
  passes?: string[];
  failures?: string[];
  pending?: string[];
  skipped?: string[];
  duration?: number;
  root?: boolean;
  _timeout?: number;
};

// Mocha statistics
export const MochaStatsSchema = z.object({
  suites: z.number(),
  tests: z.number(),
  passes: z.number(),
  pending: z.number(),
  failures: z.number(),
  start: z.string().optional(),
  end: z.string().optional(),
  duration: z.number().optional(),
  testsRegistered: z.number().optional(),
  passPercent: z.number().optional(),
  pendingPercent: z.number().optional(),
  other: z.number().optional(),
  hasOther: z.boolean().optional(),
  skipped: z.number().optional(),
  hasSkipped: z.boolean().optional(),
});

export type MochaStats = z.infer<typeof MochaStatsSchema>;

// Mocha JSON report structure
export const MochaReportSchema = z.object({
  stats: MochaStatsSchema,
  tests: z.array(MochaTestSchema),
  pending: z.array(MochaTestSchema).optional(),
  failures: z.array(MochaTestSchema).optional(),
  passes: z.array(MochaTestSchema).optional(),
  skipped: z.array(MochaTestSchema).optional(),
  suites: MochaSuiteSchema.optional(),
});

export type MochaReport = z.infer<typeof MochaReportSchema>;
