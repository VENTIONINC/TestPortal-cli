import { z } from 'zod';

export const CypressTestStateSchema = z.enum(['passed', 'failed', 'pending']);

export type CypressTestState = z.infer<typeof CypressTestStateSchema>;

export const CypressTestSpeedSchema = z
  .enum(['fast', 'medium', 'slow'])
  .nullable();

export type CypressTestSpeed = z.infer<typeof CypressTestSpeedSchema>;

export const CypressErrorSchema = z.object({
  message: z.string().optional(),
  estack: z.string().optional(),
  diff: z.string().nullable().optional(),
});

export type CypressError = z.infer<typeof CypressErrorSchema>;

export const CypressTestSchema = z.object({
  title: z.array(z.string()),
  fullTitle: z.string(),
  timedOut: z.boolean().nullable(),
  duration: z.number(),
  state: CypressTestStateSchema,
  speed: CypressTestSpeedSchema,
  pass: z.boolean(),
  fail: z.boolean(),
  pending: z.boolean(),
  context: z.unknown().nullable(),
  code: z.string(),
  err: CypressErrorSchema,
  uuid: z.string(),
  parentUUID: z.string(),
  isHook: z.boolean(),
  skipped: z.boolean(),
});

export type CypressTest = z.infer<typeof CypressTestSchema>;

export type CypressSuite = {
  uuid: string;
  title: string;
  fullFile: string;
  file: string;
  beforeHooks: unknown[];
  afterHooks: unknown[];
  tests: CypressTest[];
  suites: CypressSuite[];
  passes: string[];
  failures: string[];
  pending: string[];
  skipped: string[];
  duration: number;
  root: boolean;
  rootEmpty: boolean;
  _timeout: number;
};

export const CypressStatsSchema = z.object({
  suites: z.number(),
  tests: z.number(),
  passes: z.number(),
  pending: z.number(),
  failures: z.number(),
  start: z.string(),
  end: z.string(),
  duration: z.number(),
});

export type CypressStats = z.infer<typeof CypressStatsSchema>;

export const CypressBrowserSchema = z.object({
  name: z.string(),
  version: z.string(),
});

export type CypressBrowser = z.infer<typeof CypressBrowserSchema>;

export const CypressConfigSchema = z.object({
  baseUrl: z.string().optional(),
  browser: CypressBrowserSchema.optional(),
  viewportWidth: z.number().optional(),
  viewportHeight: z.number().optional(),
  defaultCommandTimeout: z.number().optional(),
  requestTimeout: z.number().optional(),
  responseTimeout: z.number().optional(),
  pageLoadTimeout: z.number().optional(),
  video: z.boolean().optional(),
  screenshotOnRunFailure: z.boolean().optional(),
  trashAssetsBeforeRuns: z.boolean().optional(),
});

export type CypressConfig = z.infer<typeof CypressConfigSchema>;

export const CypressScreenshotSchema = z.object({
  screenshot: z.string(),
  test: z.string(),
  takenAt: z.string(),
});

export type CypressScreenshot = z.infer<typeof CypressScreenshotSchema>;

export const CypressVideoSchema = z.object({
  video: z.string(),
});

export type CypressVideo = z.infer<typeof CypressVideoSchema>;

export const CypressMochaOptionsSchema = z.object({
  quiet: z.boolean().optional(),
  reportFilename: z.string().optional(),
  saveHtml: z.boolean().optional(),
  saveJson: z.boolean().optional(),
  consoleReporter: z.string().optional(),
  useInlineDiffs: z.boolean().optional(),
  code: z.boolean().optional(),
});

export type CypressMochaOptions = z.infer<typeof CypressMochaOptionsSchema>;

export const CypressMetaSchema = z.object({
  mocha: z
    .object({
      version: z.string(),
    })
    .optional(),
  mochawesome: z
    .object({
      options: CypressMochaOptionsSchema.optional(),
      version: z.string(),
    })
    .optional(),
});

export type CypressMeta = z.infer<typeof CypressMetaSchema>;

export const CypressReportSchema = z.object({
  stats: CypressStatsSchema,
  results: z.array(z.any()),
  meta: CypressMetaSchema.optional(),
  config: CypressConfigSchema.optional(),
  screenshots: z.array(CypressScreenshotSchema).optional(),
  videos: z.array(CypressVideoSchema).optional(),
});

export type CypressReport = {
  stats: CypressStats;
  results: CypressSuite[];
  meta?: CypressMeta;
  config?: CypressConfig;
  screenshots?: CypressScreenshot[];
  videos?: CypressVideo[];
};
