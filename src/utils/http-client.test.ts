import configService from '@/services/config.js';
import consola from 'consola';
import { createRequire } from 'module';
import nock from 'nock';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const require = createRequire(import.meta.url);
const pkg = require('../../package.json');

const ciInfo = vi.hoisted(() => ({ isCI: false, name: null as string | null }));

// Mock the config service
vi.mock('@/services/config.js', () => ({
  default: {
    getValueForKey: vi.fn().mockResolvedValue('https://api.example.com'),
  },
}));
vi.mock('consola');
vi.mock('ci-info', () => ciInfo);

describe('http-client', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original environment variables
    originalEnv = { ...process.env };
    nock.cleanAll();
    vi.clearAllMocks();
    ciInfo.isCI = false;
    ciInfo.name = null;
    // Clear proxy environment variables
    delete process.env.HTTP_PROXY;
    delete process.env.http_proxy;
    delete process.env.HTTPS_PROXY;
    delete process.env.https_proxy;
  });

  afterEach(() => {
    // Restore original environment variables
    process.env = originalEnv;
    vi.useRealTimers();
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

  it('should retry rate limited requests after the `Retry-After` delay', async () => {
    vi.mocked(configService.getValueForKey).mockResolvedValue('https://api.example.com');

    // Mock a 429 response followed by success
    nock('https://api.example.com')
      .post('/rate-limited')
      .reply(429, { error: 'Too Many Requests' }, { 'Retry-After': '10' })
      .post('/rate-limited')
      .reply(200, { success: true });

    const { default: httpClient } = await import('./http-client.js');

    // Only fake `setTimeout` so the request itself is still served by nock
    vi.useFakeTimers({ toFake: ['setTimeout'] });

    const responsePromise = httpClient.post('/rate-limited');

    // Wait until the retry has been scheduled
    await vi.waitFor(() => expect(vi.getTimerCount()).toBe(1));
    await vi.advanceTimersByTimeAsync(5000);
    expect(nock.isDone()).toBe(false);

    await vi.runAllTimersAsync();
    const response = await responsePromise;

    expect(response.status).toBe(200);
    expect(response.data).toEqual({ success: true });
    expect(nock.isDone()).toBe(true);
    expect(consola.warn).toHaveBeenCalledWith('Rate limit reached. Retrying...');
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

  it('should send a request of the given method to the base URL with the base headers and the given headers', async () => {
    vi.mocked(configService.getValueForKey).mockResolvedValue('https://api.example.com');

    nock('https://api.example.com')
      .patch('/request', { name: 'staging' })
      .matchHeader('User-Agent', `capawesome-cli/${pkg.version}`)
      .matchHeader('Authorization', 'Bearer test-token')
      .reply(200, { success: true });

    const { default: httpClient } = await import('./http-client.js');

    const response = await httpClient.request({
      data: { name: 'staging' },
      headers: { Authorization: 'Bearer test-token' },
      method: 'PATCH',
      url: '/request',
    });

    expect(response.status).toBe(200);
    expect(response.data).toEqual({ success: true });
    expect(nock.isDone()).toBe(true);
  });

  it('should send the client header to the API but not to other hosts', async () => {
    vi.mocked(configService.getValueForKey).mockResolvedValue('https://api.example.com');

    nock('https://api.example.com').get('/api').matchHeader('X-Capawesome-Client', `cli/${pkg.version}`).reply(200);
    nock('https://registry.example.com', { badheaders: ['X-Capawesome-Client'] })
      .get('/package')
      .reply(200);

    const { default: httpClient } = await import('./http-client.js');

    await httpClient.get('/api');
    await httpClient.get('https://registry.example.com/package');

    expect(nock.isDone()).toBe(true);
  });

  it('should append the CI provider to the client header in CI', async () => {
    vi.mocked(configService.getValueForKey).mockResolvedValue('https://api.example.com');
    ciInfo.isCI = true;
    ciInfo.name = 'GitHub Actions';

    nock('https://api.example.com')
      .get('/api')
      .matchHeader('X-Capawesome-Client', `cli/${pkg.version} ci/github-actions`)
      .reply(200);

    const { default: httpClient } = await import('./http-client.js');

    await httpClient.get('/api');

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
