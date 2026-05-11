// Copyright 2026 Vention
// SPDX-License-Identifier: Apache-2.0

import { UnifiedReport } from '@/types/unified-report';
import {
  WebhookConfig,
  WebhookResponse,
  WebhookRetryConfig,
} from '@/types/webhook';
import axios, { AxiosResponse, AxiosError } from 'axios';
import FormData from 'form-data';
import { convertUnifiedToCTRF } from '@/utils/ctrf-converter';

export class HttpClient {
  private defaultTimeout = 30000;
  private defaultRetries = 3;
  private defaultRetryDelay = 1000;

  async sendWebhook(
    report: UnifiedReport,
    config: WebhookConfig
  ): Promise<WebhookResponse> {
    const retryConfig: WebhookRetryConfig = {
      attempts: config.retries ?? this.defaultRetries,
      delay: config.retryDelay ?? this.defaultRetryDelay,
      backoff: 'exponential',
      maxDelay: 10000,
    };

    return this.executeWithRetry(
      () => this.sendRequest(report, config),
      retryConfig
    );
  }

  private async sendRequest(
    report: UnifiedReport,
    config: WebhookConfig
  ): Promise<WebhookResponse> {
    const url = config.url;
    const method = config.method || 'POST';
    const timeout = config.timeout ?? this.defaultTimeout;

    // Convert UnifiedReport to CTRF format
    const ctrfReport = await convertUnifiedToCTRF(report);

    // Create FormData and append the CTRF report as a JSON file
    const formData = new FormData();
    const reportJson = JSON.stringify(ctrfReport, null, 2);
    formData.append('report', reportJson, {
      filename: 'ctrf-report.json',
      contentType: 'application/json',
    });

    const headers: Record<string, string> = {
      'User-Agent': 'test-report-converter/1.0.0',
      ...formData.getHeaders(), // This adds the correct Content-Type with boundary
      ...config.headers,
    };

    // Add X-API-Key header from environment variable if present
    const apiKey = process.env.TEST_PORTAL_API_KEY;
    if (apiKey) {
      headers['X-API-Key'] = apiKey;
    }

    try {
      const response: AxiosResponse = await axios({
        method: method.toLowerCase(),
        url,
        data: formData,
        headers,
        timeout,
        validateStatus: () => true,
        httpsAgent:
          config.verifySSL === false
            ? {
                rejectUnauthorized: false,
              }
            : undefined,
      });

      const result: WebhookResponse = {
        success: response.status >= 200 && response.status < 300,
        status: response.status,
        statusText: response.statusText,
        data: response.data,
      };

      if (!result.success) {
        result.error = `HTTP ${response.status}: ${response.statusText}`;
      }

      return result;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;

        if (axiosError.code === 'ECONNABORTED') {
          return {
            success: false,
            status: 0,
            statusText: 'Timeout',
            error: `Request timed out after ${timeout}ms`,
          };
        }

        if (axiosError.response) {
          return {
            success: false,
            status: axiosError.response.status,
            statusText: axiosError.response.statusText,
            error: `HTTP ${axiosError.response.status}: ${axiosError.response.statusText}`,
            data: axiosError.response.data,
          };
        }

        return {
          success: false,
          status: 0,
          statusText: 'Network Error',
          error: axiosError.message,
        };
      }

      return {
        success: false,
        status: 0,
        statusText: 'Unknown Error',
        error:
          error instanceof Error ? error.message : 'An unknown error occurred',
      };
    }
  }

  private async executeWithRetry<T>(
    fn: () => Promise<T>,
    config: WebhookRetryConfig
  ): Promise<T> {
    let lastResult: T | undefined;
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= config.attempts; attempt++) {
      try {
        const result = await fn();

        if (typeof result === 'object' && result && 'success' in result) {
          const response = result as unknown as WebhookResponse;
          if (response.success) {
            return result;
          }

          lastResult = result;
          if (attempt < config.attempts) {
            const delay = this.calculateRetryDelay(attempt, config);
            await this.sleep(delay);
            continue;
          }
        }

        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt === config.attempts) {
          break;
        }

        const delay = this.calculateRetryDelay(attempt, config);
        await this.sleep(delay);
      }
    }

    if (lastResult) {
      return lastResult;
    }

    throw lastError || new Error('All retry attempts failed');
  }

  private calculateRetryDelay(
    attempt: number,
    config: WebhookRetryConfig
  ): number {
    let delay = config.delay;

    if (config.backoff === 'exponential') {
      delay = config.delay * Math.pow(2, attempt - 1);
    } else {
      delay = config.delay * attempt;
    }

    return Math.min(delay, config.maxDelay || delay);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
