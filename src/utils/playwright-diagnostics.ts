// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { z } from 'zod';

const MAX_LOG_BYTES = 256 * 1024;
const MAX_TEXT_BYTES = 128 * 1024;
const MAX_PATH_BYTES = 2 * 1024;

const SourceSnippetSchema = z
  .object({
    path: z.string(),
    text: z.string(),
    startLine: z.number().int().positive(),
    failingLine: z.number().int().positive(),
  })
  .refine(value => value.failingLine >= value.startLine)
  .refine(
    value =>
      value.failingLine < value.startLine + value.text.split(/\r?\n/u).length
  )
  .refine(value => Buffer.byteLength(value.path, 'utf8') <= MAX_PATH_BYTES)
  .refine(value => Buffer.byteLength(value.text, 'utf8') <= MAX_TEXT_BYTES);

export interface NormalizedPlaywrightError {
  message: string;
  stack?: string | undefined;
  location?:
    | { file: string; line: number; column?: number | undefined }
    | undefined;
  rawLogs?: string[] | undefined;
  sourceSnippet?: z.infer<typeof SourceSnippetSchema> | undefined;
  generatedTestCase?: string | undefined;
}

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const location = (value: unknown) => {
  const item = asRecord(value);
  if (!item || typeof item.file !== 'string' || !Number.isInteger(item.line))
    return undefined;
  return {
    file: item.file,
    line: item.line as number,
    ...(Number.isInteger(item.column) ? { column: item.column as number } : {}),
  };
};

const error = (value: unknown): NormalizedPlaywrightError | null => {
  const item = asRecord(value);
  if (!item || typeof item.message !== 'string') return null;
  const errorLocation = location(item.location);
  return {
    message: item.message,
    ...(typeof item.stack === 'string' ? { stack: item.stack } : {}),
    ...(errorLocation ? { location: errorLocation } : {}),
  };
};

const errorHeadline = (message: string): string =>
  message
    .split(/\r?\n/u)
    .find(line => line.trim().length > 0)
    ?.trim() ?? '';

const identity = (value: NormalizedPlaywrightError): string => {
  if (value.location) {
    return [
      'located',
      value.location.file,
      value.location.line,
      value.location.column ?? '',
      errorHeadline(value.message),
    ].join('\u0000');
  }

  return ['unlocated', value.message, value.stack ?? ''].join('\u0000');
};

const normalizeLogs = (value: unknown): string[] | undefined => {
  const logs =
    typeof value === 'string'
      ? [value]
      : Array.isArray(value) && value.every(item => typeof item === 'string')
        ? value
        : undefined;
  return logs?.length &&
    Buffer.byteLength(logs.join('\n'), 'utf8') <= MAX_LOG_BYTES
    ? [...logs]
    : undefined;
};

const deriveSourceSnippet = (
  rawSnippet: string,
  specLocation: { file: string; line: number },
  errorLocation: { file: string; line: number; column?: number } | undefined
) => {
  if (!errorLocation) return undefined;

  const ansiEscapeSequence = new RegExp(
    `${String.fromCharCode(27)}\\[[0-?]*[ -/]*[@-~]`,
    'gu'
  );
  const codeFrameLines = rawSnippet
    .replace(ansiEscapeSequence, '')
    .split(/\r?\n/u)
    .flatMap(line => {
      const match = /^\s*>?\s*(\d+)\s+\|\s?(.*)$/u.exec(line);
      return match
        ? [
            {
              line: Number(match[1]),
              text: match[2] ?? '',
              failing: /^\s*>/u.test(line),
            },
          ]
        : [];
    });

  if (codeFrameLines.length > 0) {
    const startLine = codeFrameLines[0]?.line;
    const lastLine = codeFrameLines[codeFrameLines.length - 1]?.line;
    const markedFailingLine = codeFrameLines.find(item => item.failing)?.line;
    const failingLine = markedFailingLine ?? errorLocation.line;
    if (
      startLine !== undefined &&
      lastLine !== undefined &&
      failingLine >= startLine &&
      failingLine <= lastLine
    ) {
      return {
        path: errorLocation.file,
        // Keep Playwright's original frame formatting for consumers that
        // render its gutter, stack location, and failing-line marker.
        text: rawSnippet,
        startLine,
        failingLine,
      };
    }
  }

  return {
    path: errorLocation.file,
    text: rawSnippet,
    startLine: Math.min(specLocation.line, errorLocation.line),
    failingLine: errorLocation.line,
  };
};

export const normalizePlaywrightAttempt = (
  value: unknown,
  specLocation: { file: string; line: number }
) => {
  const attempt = asRecord(value) ?? {};
  const primary = error(attempt.error);
  const errors = [
    ...(primary ? [primary] : []),
    ...(Array.isArray(attempt.errors)
      ? attempt.errors
          .map(error)
          .filter((item): item is NormalizedPlaywrightError => item !== null)
      : []),
  ].filter(
    (item, index, all) =>
      all.findIndex(candidate => identity(candidate) === identity(item)) ===
      index
  );
  const rawError = asRecord(attempt.error);
  const errorLocation = location(rawError?.location);
  const derivedSnippet =
    typeof rawError?.snippet === 'string'
      ? deriveSourceSnippet(rawError.snippet, specLocation, errorLocation)
      : undefined;
  const snippet = SourceSnippetSchema.safeParse(
    attempt.sourceSnippet ?? derivedSnippet
  );
  const nativeLogs = [attempt.stdout, attempt.stderr]
    .flatMap(item => (Array.isArray(item) ? item : []))
    .map(item =>
      typeof item === 'string'
        ? item
        : typeof asRecord(item)?.text === 'string'
          ? (asRecord(item)?.text as string)
          : null
    )
    .filter((item): item is string => item !== null);
  const logs = normalizeLogs(attempt.logs ?? nativeLogs);
  const generatedTestCase =
    typeof attempt.generatedTestCase === 'string' &&
    attempt.generatedTestCase.length > 0 &&
    Buffer.byteLength(attempt.generatedTestCase, 'utf8') <= MAX_TEXT_BYTES
      ? attempt.generatedTestCase
      : undefined;
  if (errors[0])
    errors[0] = {
      ...errors[0],
      ...(logs ? { rawLogs: logs } : {}),
      ...(snippet.success ? { sourceSnippet: snippet.data } : {}),
      ...(generatedTestCase ? { generatedTestCase } : {}),
    };
  return {
    retry: typeof attempt.retry === 'number' ? attempt.retry : 0,
    status: typeof attempt.status === 'string' ? attempt.status : 'failed',
    duration: typeof attempt.duration === 'number' ? attempt.duration : 0,
    startTime:
      typeof attempt.startTime === 'string'
        ? attempt.startTime
        : new Date(0).toISOString(),
    workerIndex:
      typeof attempt.workerIndex === 'number' ? attempt.workerIndex : 0,
    errors,
  };
};
