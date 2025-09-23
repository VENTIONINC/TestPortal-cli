export interface JunitProperty {
  name: string;
  value: string;
}

export interface JunitProperties {
  property: JunitProperty[];
}

export interface JunitFailure {
  message: string;
  type: string;
  content: string;
}

export interface JunitError {
  message: string;
  type: string;
  content: string;
}

export interface JunitTestCase {
  name: string;
  classname: string;
  time: number;
  failure?: JunitFailure;
  error?: JunitError;
  'system-out'?: string;
  'system-err'?: string;
  skipped?: boolean;
}

export interface JunitTestSuite {
  name: string;
  tests: number;
  failures: number;
  errors: number;
  time: number;
  timestamp?: string;
  skipped?: number;
  hostname?: string;
  properties?: JunitProperties;
  testcase: JunitTestCase[];
  'system-out'?: string;
  'system-err'?: string;
}

export interface JunitTestSuites {
  name?: string;
  tests: number;
  failures: number;
  errors: number;
  time: number;
  timestamp?: string;
  properties?: JunitProperties;
  testsuite: JunitTestSuite[];
  'system-out'?: string;
  'system-err'?: string;
}

export type JunitReport = JunitTestSuites | JunitTestSuite;

export type JunitTestStatus = 'passed' | 'failed' | 'error' | 'skipped';
