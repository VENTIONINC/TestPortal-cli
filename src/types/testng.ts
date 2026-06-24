// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

export type TestNGStatus = 'PASS' | 'FAIL' | 'SKIP';

export interface TestNGException {
  message: string;
  'full-stacktrace': string;
}

export interface TestNGTestMethod {
  '@_status': TestNGStatus;
  '@_signature': string;
  '@_name': string;
  '@_duration-ms': string;
  '@_started-at': string;
  '@_finished-at': string;
  '@_is-config'?: string;
  '@_description'?: string;
  exception?: TestNGException;
}

export interface TestNGClass {
  '@_name': string;
  'test-method': TestNGTestMethod[] | TestNGTestMethod;
}

export interface TestNGTest {
  '@_name': string;
  '@_duration-ms': string;
  '@_started-at': string;
  '@_finished-at': string;
  class?: TestNGClass[] | TestNGClass;
}

export interface TestNGSuite {
  '@_name': string;
  '@_duration-ms': string;
  '@_started-at': string;
  '@_finished-at': string;
  test?: TestNGTest[] | TestNGTest;
}

export interface TestNGResults {
  'testng-results': {
    '@_total': string;
    '@_passed': string;
    '@_failed': string;
    '@_skipped': string;
    suite: TestNGSuite[] | TestNGSuite;
  };
}
