import { z } from 'zod';

export const PlaywrightStatusSchema = z.enum([
  'passed',
  'failed',
  'timedOut',
  'interrupted',
  'skipped',
]);

export type PlaywrightStatus = z.infer<typeof PlaywrightStatusSchema>;

export const PlaywrightErrorSchema = z.object({
  message: z.string().optional(),
  location: z
    .object({
      file: z.string(),
      line: z.number(),
      column: z.number(),
    })
    .optional(),
  snippet: z.string().optional(),
});

export type PlaywrightError = z.infer<typeof PlaywrightErrorSchema>;

export const PlaywrightTestResultSchema = z.object({
  duration: z.number(),
  status: PlaywrightStatusSchema,
  error: PlaywrightErrorSchema.optional(),
  retry: z.number(),
  startTime: z.string(),
  attachments: z.array(z.unknown()).optional(),
  stdout: z.array(z.unknown()).optional(),
  stderr: z.array(z.unknown()).optional(),
  steps: z.array(z.unknown()).optional(),
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
  title: z.string(),
  location: z
    .object({
      file: z.string(),
      line: z.number(),
      column: z.number(),
    })
    .optional(),
  tags: z.array(z.string()).optional(),
});

export type PlaywrightTest = z.infer<typeof PlaywrightTestSchema>;

export type PlaywrightSuite = {
  title: string;
  file?: string;
  line?: number;
  column?: number;
  suites?: PlaywrightSuite[];
  tests?: PlaywrightTest[];
};

export const PlaywrightConfigSchema = z.object({
  configFile: z.string().optional(),
  rootDir: z.string().optional(),
  forbidOnly: z.boolean().optional(),
  fullyParallel: z.boolean().optional(),
  globalSetup: z.string().optional(),
  globalTeardown: z.string().optional(),
  globalTimeout: z.number().optional(),
  grep: z.unknown().optional(),
  grepInvert: z.unknown().optional(),
  maxFailures: z.number().optional(),
  metadata: z.record(z.unknown()).optional(),
  preserveOutput: z.string().optional(),
  reporter: z.array(z.unknown()).optional(),
  reportSlowTests: z.unknown().optional(),
  quiet: z.boolean().optional(),
  projects: z.array(z.unknown()).optional(),
  shard: z.unknown().optional(),
  updateSnapshots: z.string().optional(),
  version: z.string().optional(),
  workers: z.number().optional(),
});

export type PlaywrightConfig = z.infer<typeof PlaywrightConfigSchema>;

export const PlaywrightReportSchema = z.object({
  config: PlaywrightConfigSchema,
  suites: z.array(z.any()),
  errors: z.array(PlaywrightErrorSchema).optional(),
  stats: z
    .object({
      startTime: z.string(),
      duration: z.number(),
      expected: z.number(),
      unexpected: z.number(),
      flaky: z.number(),
      skipped: z.number(),
    })
    .optional(),
});

export type PlaywrightReport = {
  config: PlaywrightConfig;
  suites: PlaywrightSuite[];
  errors?: PlaywrightError[];
  stats?: {
    startTime: string;
    duration: number;
    expected: number;
    unexpected: number;
    flaky: number;
    skipped: number;
  };
};
