import { HttpClient } from '@/utils/http-client';
import { UnifiedReport } from '@/types/unified-report';
import { WebhookConfig } from '@/types/webhook';

jest.mock('axios', () => ({
  __esModule: true,
  default: jest.fn(),
  isAxiosError: jest.fn(),
}));

import axios from 'axios';
const mockedAxios = axios as jest.MockedFunction<typeof axios>;

describe('HttpClient', () => {
  let httpClient: HttpClient;
  let mockReport: UnifiedReport;

  beforeEach(() => {
    httpClient = new HttpClient();
    mockReport = {
      id: '1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      framework: 'playwright',
      frameworkVersion: '1.43.0',
      toolVersion: '1.43.0',
      suites: [
        {
          id: '1',
          name: 'Test Suite',
          tests: [
            {
              fullName: 'Test 1',
              id: '1',
              name: 'Test 1',
              status: 'passed',
              duration: 100,
              results: [
                {
                  status: 'passed',
                  attemptNumber: 1,
                  duration: 100,
                },
              ],
            },
          ],
          duration: 100,
        },
      ],
      stats: {
        total: 1,
        passed: 1,
        failed: 0,
        skipped: 0,
        todo: 0,
        timeout: 0,
        interrupted: 0,
        duration: 100,
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
      },
    };
    jest.clearAllMocks();
  });

  describe('sendWebhook', () => {
    it('should send successful webhook request', async () => {
      const mockResponse = {
        status: 200,
        statusText: 'OK',
        data: { success: true },
      };

      mockedAxios.mockResolvedValueOnce(mockResponse);

      const config: WebhookConfig = {
        url: 'https://example.com/webhook',
      };

      const result = await httpClient.sendWebhook(mockReport, config);

      expect(result.success).toBe(true);
      expect(result.status).toBe(200);
      expect(result.data).toEqual({ success: true });
      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'post',
          url: 'https://example.com/webhook',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'User-Agent': 'test-report-converter/1.0.0',
          }),
          data: mockReport,
        })
      );
    });

    it('should handle failed webhook request', async () => {
      const mockResponse = {
        status: 500,
        statusText: 'Internal Server Error',
        data: 'Error occurred',
      };

      mockedAxios.mockResolvedValueOnce(mockResponse);

      const config: WebhookConfig = {
        url: 'https://example.com/webhook',
      };

      const result = await httpClient.sendWebhook(mockReport, config);

      expect(result.success).toBe(false);
      expect(result.status).toBe(500);
      expect(result.error).toBe('HTTP 500: Internal Server Error');
    });

    it('should add authentication headers', async () => {
      const mockResponse = {
        status: 200,
        statusText: 'OK',
        data: {},
      };

      mockedAxios.mockResolvedValueOnce(mockResponse);

      const config: WebhookConfig = {
        url: 'https://example.com/webhook',
        authToken: 'my-token',
      };

      await httpClient.sendWebhook(mockReport, config);

      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer my-token',
          }),
        })
      );
    });

    it('should use custom auth header', async () => {
      const mockResponse = {
        status: 200,
        statusText: 'OK',
        data: {},
      };

      mockedAxios.mockResolvedValueOnce(mockResponse);

      const config: WebhookConfig = {
        url: 'https://example.com/webhook',
        authToken: 'my-api-key',
        authHeader: 'X-API-Key',
      };

      await httpClient.sendWebhook(mockReport, config);

      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-API-Key': 'my-api-key',
          }),
        })
      );
    });

    it('should retry on failure', async () => {
      const mockErrorResponse = {
        status: 500,
        statusText: 'Internal Server Error',
        data: 'Error',
      };

      const mockSuccessResponse = {
        status: 200,
        statusText: 'OK',
        data: { success: true },
      };

      mockedAxios
        .mockResolvedValueOnce(mockErrorResponse)
        .mockResolvedValueOnce(mockSuccessResponse);

      const config: WebhookConfig = {
        url: 'https://example.com/webhook',
        retries: 2,
        retryDelay: 10, // Short delay for tests
      };

      const result = await httpClient.sendWebhook(mockReport, config);

      expect(result.success).toBe(true);
      expect(mockedAxios).toHaveBeenCalledTimes(2);
    });
  });
});
