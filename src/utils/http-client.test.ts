import configService from '@/services/config.js';
import { getInstallationId } from '@/utils/installation-id.js';
import nock from 'nock';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the config service
vi.mock('@/services/config.js', () => ({
  default: {
    getValueForKey: vi.fn().mockResolvedValue('https://api.example.com'),
  },
}));

vi.mock('@/utils/installation-id.js', () => ({
  getInstallationId: vi.fn().mockReturnValue('aa4b5a1c-1d0e-4a51-9c8f-3f1b2d9e7a10'),
}));

describe('http-client', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original environment variables
    originalEnv = { ...process.env };
    nock.cleanAll();
    vi.clearAllMocks();
    // Clear proxy environment variables
    delete process.env.HTTP_PROXY;
    delete process.env.http_proxy;
    delete process.env.HTTPS_PROXY;
    delete process.env.https_proxy;
  });

  afterEach(() => {
    // Restore original environment variables
    process.env = originalEnv;
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

  it('should work without proxy when no environment variables are set', async () => {
    vi.mocked(configService.getValueForKey).mockResolvedValue('https://api.example.com');

    nock('https://api.example.com').get('/no-proxy').reply(200, { success: true });

    const { default: httpClient } = await import('./http-client.js');

    const response = await httpClient.get('/no-proxy');

    expect(response.status).toBe(200);
    expect(response.data).toEqual({ success: true });
  });

  it('should send the installation id header on API requests', async () => {
    vi.mocked(configService.getValueForKey).mockResolvedValue('https://api.example.com');

    nock('https://api.example.com', {
      reqheaders: { 'x-capawesome-installation-id': 'aa4b5a1c-1d0e-4a51-9c8f-3f1b2d9e7a10' },
    })
      .get('/installation-id')
      .reply(200, { success: true });

    const { default: httpClient } = await import('./http-client.js');

    const response = await httpClient.get('/installation-id');

    expect(response.status).toBe(200);
    expect(nock.isDone()).toBe(true);
  });

  it('should omit the installation id header when it is not available', async () => {
    vi.mocked(configService.getValueForKey).mockResolvedValue('https://api.example.com');
    vi.mocked(getInstallationId).mockReturnValueOnce(undefined);

    nock('https://api.example.com', { badheaders: ['x-capawesome-installation-id'] })
      .get('/no-installation-id')
      .reply(200, { success: true });

    const { default: httpClient } = await import('./http-client.js');

    const response = await httpClient.get('/no-installation-id');

    expect(response.status).toBe(200);
    expect(nock.isDone()).toBe(true);
  });

  it('should not send the installation id header to third-party hosts', async () => {
    nock('https://registry.example.com', { badheaders: ['x-capawesome-installation-id'] })
      .get('/package')
      .reply(200, { success: true });

    const { default: httpClient } = await import('./http-client.js');

    const response = await httpClient.get('https://registry.example.com/package');

    expect(response.status).toBe(200);
    expect(nock.isDone()).toBe(true);
  });

  // Note: Testing actual proxy behavior with nock is not reliable as nock intercepts
  // requests at a different level than proxy agents. The proxy functionality is handled
  // by the http-proxy-agent and https-proxy-agent libraries which are well-tested.
  // The implementation ensures that:
  // - HTTPS requests use HttpsProxyAgent when https_proxy/HTTPS_PROXY is set
  // - HTTP requests use HttpProxyAgent when http_proxy/HTTP_PROXY is set
  // - HTTP proxies (http://) work correctly for HTTPS targets (https://)
});
