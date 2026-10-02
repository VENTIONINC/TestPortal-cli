// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { convertUnifiedToCTRF } from '@/utils/ctrf-converter';
import { validateGeneratedCtrf } from '@/utils/validate-ctrf';
import type { UnifiedReport } from '@/types/unified-report';

describe('pinned CTRF 0.0.0 validation', () => {
  it('validates generated output offline and rejects missing root metadata', async () => {
    const report: UnifiedReport = {
      id: '1',
      framework: 'other',
      createdAt: '2026-01-01T00:00:00Z',
      stats: {
        total: 1,
        passed: 1,
        failed: 0,
        skipped: 0,
        duration: 1,
        startTime: '2026-01-01T00:00:00Z',
        endTime: '2026-01-01T00:00:00.001Z',
      },
      suites: [
        {
          id: 's',
          name: 'suite',
          tests: [
            {
              id: 't',
              name: 'test',
              fullName: 'suite test',
              status: 'passed',
              duration: 1,
              startTime: '2026-01-01T00:00:00.000Z',
              endTime: '2026-01-01T00:00:00.001Z',
              results: [{ attemptNumber: 1, status: 'passed', duration: 1 }],
            },
          ],
        },
      ],
    };
    const output = await convertUnifiedToCTRF(report);
    expect(validateGeneratedCtrf(output)).toEqual({ success: true });
    expect(output.results.tests[0]).toMatchObject({
      start: Date.UTC(2026, 0, 1),
      stop: Date.UTC(2026, 0, 1) + 1,
    });
    expect(validateGeneratedCtrf({ results: output.results }).success).toBe(
      false
    );
  });
});
