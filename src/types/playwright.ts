// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { z } from 'zod';

export const PlaywrightStatusSchema = z.enum([
  'passed',
  'failed',
  'timedOut',
  'interrupted',
  'skipped',
  'unexpected',
  'flaky',
]);

export type PlaywrightStatus = z.infer<typeof PlaywrightStatusSchema>;

export const PlaywrightLocationSchema = z.object({
  file: z.string(),
  line: z.number(),
  column: z.number(),
});

export type PlaywrightLocation = z.infer<typeof PlaywrightLocationSchema>;

export const PlaywrightErrorSchema = z.object({
  message: z.string(),
  stack: z.string().optional(),
  location: PlaywrightLocationSchema.optional(),
  snippet: z.string().optional(),
  matcherResult: z
    .object({
      message: z.string(),
      pass: z.boolean(),
    })
    .optional(),
});

export type PlaywrightError = z.infer<typeof PlaywrightErrorSchema>;

export const PlaywrightStdoutStderrSchema = z.object({
  text: z.string(),
});

export type PlaywrightStdoutStderr = z.infer<
  typeof PlaywrightStdoutStderrSchema
>;

export const PlaywrightAttachmentSchema = z.object({
  name: z.string(),
  contentType: z.string(),
  path: z.string(),
});

export type PlaywrightAttachment = z.infer<typeof PlaywrightAttachmentSchema>;

// Define types manually for recursive structures
export interface PlaywrightStep {
  title: string;
  duration: number;
  steps?: PlaywrightStep[] | undefined;
}

export const PlaywrightStepSchema: z.ZodType<PlaywrightStep> = z.lazy(() =>
  z.object({
    title: z.string(),
    duration: z.number(),
    steps: z.array(PlaywrightStepSchema).optional(),
  })
);

export const PlaywrightTestResultSchema = z.object({
  workerIndex: z.number(),
  status: PlaywrightStatusSchema,
  duration: z.number(),
  error: PlaywrightErrorSchema.optional(),
  errors: z.array(PlaywrightErrorSchema).optional(),
  retry: z.number(),
  startTime: z.string(),
  attachments: z.array(PlaywrightAttachmentSchema).optional(),
  stdout: z.array(PlaywrightStdoutStderrSchema).optional(),
  stderr: z.array(PlaywrightStdoutStderrSchema).optional(),
  steps: z.array(PlaywrightStepSchema).optional(),
  errorLocation: PlaywrightLocationSchema.optional(),
});

export type PlaywrightTestResult = z.infer<typeof PlaywrightTestResultSchema>;

export const PlaywrightTestSchema = z.object({
  timeout: z.number(),
  annotations: z.array(z.unknown()).optional(),
  expectedStatus: PlaywrightStatusSchema,
  projectId: z.string().optional(),
  projectName: z.string().optional(),
  results: z.array(PlaywrightTestResultSchema),
  status: PlaywrightStatusSchema,
});

export type PlaywrightTest = z.infer<typeof PlaywrightTestSchema>;

export const PlaywrightSpecSchema = z.object({
  title: z.string(),
  ok: z.boolean(),
  tags: z.array(z.string()),
  tests: z.array(PlaywrightTestSchema),
  id: z.string(),
  file: z.string(),
  line: z.number(),
  column: z.number(),
});

export type PlaywrightSpec = z.infer<typeof PlaywrightSpecSchema>;

// Define type manually for recursive structure
export interface PlaywrightSuite {
  title: string;
  file: string;
  column: number;
  line: number;
  specs: PlaywrightSpec[];
  suites?: PlaywrightSuite[] | undefined;
}

export const PlaywrightSuiteSchema: z.ZodType<PlaywrightSuite> = z.lazy(() =>
  z.object({
    title: z.string(),
    file: z.string(),
    column: z.number(),
    line: z.number(),
    specs: z.array(PlaywrightSpecSchema),
    suites: z.array(PlaywrightSuiteSchema).optional(),
  })
);

export const PlaywrightProjectSchema = z.object({
  outputDir: z.string().optional(),
  repeatEach: z.number().optional(),
  retries: z.number().optional(),
  metadata: z.record(z.unknown()).optional(),
  id: z.string().optional(),
  name: z.string().optional(),
  testDir: z.string().optional(),
  testIgnore: z.array(z.string()).optional(),
  testMatch: z.array(z.string()).optional(),
  timeout: z.number().optional(),
});

export type PlaywrightProject = z.infer<typeof PlaywrightProjectSchema>;

export const PlaywrightReportSlowTestsSchema = z.object({
  max: z.number(),
  threshold: z.number(),
});

export type PlaywrightReportSlowTests = z.infer<
  typeof PlaywrightReportSlowTestsSchema
>;

export const PlaywrightConfigSchema = z.object({
  configFile: z.string().optional(),
  rootDir: z.string().optional(),
  forbidOnly: z.boolean().optional(),
  fullyParallel: z.boolean().optional(),
  globalSetup: z.string().optional(),
  globalTeardown: z.string().nullable().optional(),
  globalTimeout: z.number().optional(),
  grep: z.record(z.unknown()).optional(),
  grepInvert: z.unknown().nullable().optional(),
  maxFailures: z.number().optional(),
  metadata: z.record(z.unknown()).optional(),
  preserveOutput: z.string().optional(),
  reporter: z.array(z.array(z.string())).optional(),
  reportSlowTests: PlaywrightReportSlowTestsSchema.optional(),
  quiet: z.boolean().optional(),
  projects: z.array(PlaywrightProjectSchema).optional(),
  shard: z.unknown().nullable().optional(),
  updateSnapshots: z.string().optional(),
  version: z.string().optional(),
  workers: z.number().optional(),
  webServer: z.unknown().nullable().optional(),
});

export type PlaywrightConfig = z.infer<typeof PlaywrightConfigSchema>;

export const PlaywrightStatsSchema = z.object({
  startTime: z.string(),
  duration: z.number(),
  expected: z.number(),
  skipped: z.number(),
  unexpected: z.number(),
  flaky: z.number(),
});

export type PlaywrightStats = z.infer<typeof PlaywrightStatsSchema>;

export const PlaywrightCustomReportSchema = z.object({
  testName: z.string(),
  testNameHash: z.string(),
  status: z.string(),
});

export type PlaywrightCustomReport = z.infer<
  typeof PlaywrightCustomReportSchema
>;

export const PlaywrightReportSchema = z.object({
  config: PlaywrightConfigSchema,
  suites: z.array(PlaywrightSuiteSchema),
  errors: z.array(PlaywrightErrorSchema).optional(),
  stats: PlaywrightStatsSchema.optional(),
  customReport: PlaywrightCustomReportSchema.optional(),
  runId: z.string().optional(),
  hash: z.string().optional(),
});

export type PlaywrightReport = z.infer<typeof PlaywrightReportSchema>;
