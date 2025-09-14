import { beforeEach, describe, expect, it, vi } from 'vitest';
import nock from 'nock';
import configService from '@/services/config.js';

// Mock the config service
vi.mock('@/services/config.js', () => ({
  default: {
    getValueForKey: vi.fn().mockResolvedValue('https://api.example.com'),
  },
}));

describe('http-client', () => {
  beforeEach(() => {
    nock.cleanAll();
    vi.clearAllMocks();
  });

  it('should retry requests on 5xx status codes', async () => {
    // Mock the API_BASE_URL
    vi.mocked(configService.getValueForKey).mockResolvedValue('https://api.example.com');

    // Mock the first two requests to return 500, then succeed on the third
    nock('https://api.example.com')
      .get('/test')
      .reply(500, { error: 'Internal Server Error' })
      .get('/test')
      .reply(502, { error: 'Bad Gateway' })
      .get('/test')
      .reply(200, { success: true });

    // Import http-client after mocking to ensure axios-retry is configured
    const { default: httpClient } = await import('./http-client.js');

    const response = await httpClient.get('/test');

    expect(response.status).toBe(200);
    expect(response.data).toEqual({ success: true });
    expect(nock.isDone()).toBe(true);
  });

  it('should not retry requests on 4xx status codes', async () => {
    vi.mocked(configService.getValueForKey).mockResolvedValue('https://api.example.com');

    // Mock a 404 response - should not be retried
    nock('https://api.example.com').get('/not-found').reply(404, { error: 'Not Found' });

    const { default: httpClient } = await import('./http-client.js');

    await expect(httpClient.get('/not-found')).rejects.toThrow();
    expect(nock.isDone()).toBe(true);
  });

  it('should eventually fail after maximum retries on persistent 5xx errors', async () => {
    vi.mocked(configService.getValueForKey).mockResolvedValue('https://api.example.com');

    // Mock 4 consecutive 500 responses (initial + 3 retries)
    nock('https://api.example.com').get('/persistent-error').times(4).reply(500, { error: 'Internal Server Error' });

    const { default: httpClient } = await import('./http-client.js');

    await expect(httpClient.get('/persistent-error')).rejects.toThrow();
    expect(nock.isDone()).toBe(true);
  });

  it('should succeed on first try when no errors occur', async () => {
    vi.mocked(configService.getValueForKey).mockResolvedValue('https://api.example.com');

    nock('https://api.example.com').get('/success').reply(200, { data: 'success' });

    const { default: httpClient } = await import('./http-client.js');

    const response = await httpClient.get('/success');

    expect(response.status).toBe(200);
    expect(response.data).toEqual({ data: 'success' });
    expect(nock.isDone()).toBe(true);
  });

  it('should retry on network errors', async () => {
    vi.mocked(configService.getValueForKey).mockResolvedValue('https://api.example.com');

    // Mock a network error followed by success
    nock('https://api.example.com')
      .get('/network-error')
      .replyWithError('Network Error')
      .get('/network-error')
      .reply(200, { recovered: true });

    const { default: httpClient } = await import('./http-client.js');

    const response = await httpClient.get('/network-error');

    expect(response.status).toBe(200);
    expect(response.data).toEqual({ recovered: true });
    expect(nock.isDone()).toBe(true);
  });
});
