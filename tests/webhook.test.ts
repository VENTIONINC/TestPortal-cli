import { HttpClient } from '@/utils/http-client';
import { CTRFReport } from '@/types/ctrf';
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
  let mockReport: CTRFReport;

  beforeEach(() => {
    httpClient = new HttpClient();
    mockReport = {
      results: {
        tool: { name: 'playwright' },
        summary: {
          tests: 1,
          passed: 1,
          failed: 0,
          pending: 0,
          skipped: 0,
          other: 0,
          start: Date.now(),
          stop: Date.now(),
        },
        tests: [
          {
            name: 'Test 1',
            status: 'passed',
            duration: 100,
          },
        ],
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
            'User-Agent': 'test-report-ctrfer/1.0.0',
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
