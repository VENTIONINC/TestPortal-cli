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
  const originalEnv = process.env;

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
    // Reset environment variables
    process.env = { ...originalEnv };
    delete process.env.TEST_PORTAL_API_KEY;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('sendWebhook', () => {
    it('should send successful webhook request with multipart/form-data', async () => {
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

      const call = mockedAxios.mock.calls[0]?.[0] as any;

      expect(call).toMatchObject({
        method: 'post',
        url: 'https://example.com/webhook',
      });

      // Verify headers contain User-Agent
      expect(call?.headers?.['User-Agent']).toBe('test-report-converter/1.0.0');

      // Verify Content-Type header includes multipart/form-data (set by FormData.getHeaders())
      const contentType = call?.headers?.['content-type'];
      expect(contentType).toBeDefined();
      expect(contentType).toContain('multipart/form-data');

      // Verify data is FormData
      expect(call?.data).toBeDefined();
      expect(call?.data.constructor.name).toBe('FormData');
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

    it('should add X-API-Key header from environment variable', async () => {
      const mockResponse = {
        status: 200,
        statusText: 'OK',
        data: {},
      };

      mockedAxios.mockResolvedValueOnce(mockResponse);

      // Set environment variable
      process.env.TEST_PORTAL_API_KEY = 'test-api-key-123';

      const config: WebhookConfig = {
        url: 'https://example.com/webhook',
      };

      await httpClient.sendWebhook(mockReport, config);

      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-API-Key': 'test-api-key-123',
          }),
        })
      );
    });

    it('should not add X-API-Key header when environment variable is not set', async () => {
      const mockResponse = {
        status: 200,
        statusText: 'OK',
        data: {},
      };

      mockedAxios.mockResolvedValueOnce(mockResponse);

      const config: WebhookConfig = {
        url: 'https://example.com/webhook',
      };

      await httpClient.sendWebhook(mockReport, config);

      const call = mockedAxios.mock.calls[0]?.[0] as any;
      expect(call?.headers?.['X-API-Key']).toBeUndefined();
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
