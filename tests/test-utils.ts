// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

import { Converter } from '@/core/converter';
import { ConvertOptions } from '@/types/providers';
import { CTRFReport } from '@/types/ctrf';

export async function createTempDir(prefix: string): Promise<string> {
  return fs.mkdtemp(join(tmpdir(), `test-portal-${prefix}-`));
}

export async function writeTempFile(
  dir: string,
  fileName: string,
  content: string
): Promise<string> {
  const filePath = join(dir, fileName);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(filePath, content, 'utf8');
  return filePath;
}

export async function writeTempJsonFile(
  dir: string,
  fileName: string,
  content: unknown
): Promise<string> {
  return writeTempFile(dir, fileName, JSON.stringify(content, null, 2));
}

export async function cleanupTempDir(dir: string): Promise<void> {
  await fs.rm(dir, { recursive: true, force: true });
}

export function spyOnConsole(method: 'log' | 'error'): jest.SpyInstance {
  return jest.spyOn(console, method).mockImplementation(() => undefined);
}

export async function convertFixtureToCTRF(
  options: ConvertOptions,
  outputPath: string
): Promise<CTRFReport> {
  const converter = new Converter();
  await converter.convertAndSave({ ...options, output: outputPath });
  return readCTRFReport(outputPath);
}

export async function readCTRFReport(outputPath: string): Promise<CTRFReport> {
  return JSON.parse(await fs.readFile(outputPath, 'utf8')) as CTRFReport;
}

export function expectStableCTRFReport(
  report: CTRFReport,
  expected: {
    tool: string;
    tests: number;
    passed?: number;
    failed?: number;
    skipped?: number;
    pending?: number;
    other?: number;
  }
): void {
  expect(report.results.tool.name).toBe(expected.tool);
  expect(report.results.summary.tests).toBe(expected.tests);

  if (expected.passed !== undefined) {
    expect(report.results.summary.passed).toBe(expected.passed);
  }
  if (expected.failed !== undefined) {
    expect(report.results.summary.failed).toBe(expected.failed);
  }
  if (expected.skipped !== undefined) {
    expect(report.results.summary.skipped).toBe(expected.skipped);
  }
  if (expected.pending !== undefined) {
    expect(report.results.summary.pending).toBe(expected.pending);
  }
  if (expected.other !== undefined) {
    expect(report.results.summary.other).toBe(expected.other);
  }

  expect(report.results.summary.start).toEqual(expect.any(Number));
  expect(report.results.summary.stop).toEqual(expect.any(Number));
  expect(report.results.environment).toEqual(expect.any(Object));
}
