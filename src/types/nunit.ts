// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

/**
 * NUnit XML report structure types
 * Based on NUnit 3.x XML output format
 */

export type NUnitStatus =
  | 'Passed'
  | 'Failed'
  | 'Skipped'
  | 'Inconclusive'
  | 'Warning';

export interface NUnitFailure {
  message?: string;
  'stack-trace'?: string;
}

export interface NUnitReason {
  message?: string;
}

export interface NUnitTestCase {
  '@_id'?: string;
  '@_name': string;
  '@_fullname'?: string;
  '@_result': NUnitStatus;
  '@_duration'?: string;
  '@_time'?: string;
  '@_classname'?: string;
  '@_methodname'?: string;
  '@_seed'?: string;
  '@_start-time'?: string;
  '@_end-time'?: string;
  '@_asserts'?: string;
  failure?: NUnitFailure;
  reason?: NUnitReason;
  output?: string;
}

export interface NUnitTestSuite {
  '@_type'?: string;
  '@_id'?: string;
  '@_name'?: string;
  '@_fullname'?: string;
  '@_classname'?: string;
  '@_result'?: NUnitStatus;
  '@_testcasecount'?: string;
  '@_total'?: string;
  '@_passed'?: string;
  '@_failed'?: string;
  '@_skipped'?: string;
  '@_inconclusive'?: string;
  '@_duration'?: string;
  '@_time'?: string;
  '@_start-time'?: string;
  '@_end-time'?: string;
  'test-suite'?: NUnitTestSuite | NUnitTestSuite[];
  'test-case'?: NUnitTestCase | NUnitTestCase[];
}

export interface NUnitTestRun {
  '@_id'?: string;
  '@_name'?: string;
  '@_fullname'?: string;
  '@_testcasecount'?: string;
  '@_result'?: NUnitStatus;
  '@_total'?: string;
  '@_passed'?: string;
  '@_failed'?: string;
  '@_inconclusive'?: string;
  '@_skipped'?: string;
  '@_asserts'?: string;
  '@_engine-version'?: string;
  '@_clr-version'?: string;
  '@_start-time'?: string;
  '@_end-time'?: string;
  '@_duration'?: string;
  'test-suite'?: NUnitTestSuite | NUnitTestSuite[];
}

export interface NUnitReport {
  '?xml'?: {
    '@_version': string;
    '@_encoding': string;
  };
  'test-run': NUnitTestRun;
}
