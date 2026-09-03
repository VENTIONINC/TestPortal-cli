// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { CTRFReportSchema } from '@/types/ctrf';

export type CtrfValidationResult =
  | { success: true }
  | { success: false; issues: Array<{ path: string; message: string }> };

export const validateGeneratedCtrf = (value: unknown): CtrfValidationResult => {
  const parsed = CTRFReportSchema.safeParse(value);
  if (parsed.success) return { success: true };
  return {
    success: false,
    issues: parsed.error.issues.map(issue => ({
      path: issue.path.join('.'),
      message: issue.message,
    })),
  };
};
