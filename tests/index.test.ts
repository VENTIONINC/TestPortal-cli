// Copyright 2026 Vention
// SPDX-License-Identifier: Apache-2.0

import { convert } from '@/index';
import { Converter } from '@/core/converter';
import { UnifiedReport } from '@/types/unified-report';

describe('public API', () => {
  const report: UnifiedReport = {
    id: 'report-1',
    framework: 'playwright',
    stats: {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      duration: 0,
      startTime: '2026-05-10T10:00:00.000Z',
    },
    suites: [],
    createdAt: '2026-05-10T10:00:00.000Z',
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should perform conversion-only when no side-effect options are provided', async () => {
    const convertSpy = jest
      .spyOn(Converter.prototype, 'convert')
      .mockResolvedValue(report);
    const convertAndSaveSpy = jest.spyOn(
      Converter.prototype,
      'convertAndSave'
    );

    await expect(
      convert({
        input: 'report.json',
        provider: 'playwright',
      })
    ).resolves.toBe(report);

    expect(convertSpy).toHaveBeenCalledWith({
      input: 'report.json',
      provider: 'playwright',
    });
    expect(convertAndSaveSpy).not.toHaveBeenCalled();
  });

  it('should honor output options without running conversion twice', async () => {
    const convertSpy = jest.spyOn(Converter.prototype, 'convert');
    const convertAndSaveSpy = jest
      .spyOn(Converter.prototype, 'convertAndSave')
      .mockResolvedValue(report);

    await expect(
      convert({
        input: 'report.json',
        output: 'ctrf.json',
        provider: 'playwright',
      })
    ).resolves.toBe(report);

    expect(convertAndSaveSpy).toHaveBeenCalledTimes(1);
    expect(convertAndSaveSpy).toHaveBeenCalledWith({
      input: 'report.json',
      output: 'ctrf.json',
      provider: 'playwright',
    });
    expect(convertSpy).not.toHaveBeenCalled();
  });

  it('should honor webhook options without running conversion twice', async () => {
    const convertSpy = jest.spyOn(Converter.prototype, 'convert');
    const convertAndSaveSpy = jest
      .spyOn(Converter.prototype, 'convertAndSave')
      .mockResolvedValue(report);

    await expect(
      convert({
        input: 'report.json',
        provider: 'playwright',
        webhook: {
          url: 'https://example.com/webhook',
        },
      })
    ).resolves.toBe(report);

    expect(convertAndSaveSpy).toHaveBeenCalledTimes(1);
    expect(convertSpy).not.toHaveBeenCalled();
  });
});
