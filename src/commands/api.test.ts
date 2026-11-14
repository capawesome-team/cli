import { DEFAULT_API_BASE_URL } from '@/config/consts.js';
import authorizationService from '@/services/authorization-service.js';
import { getMessageFromUnknownError } from '@/utils/error.js';
import consola from 'consola';
import fs from 'fs/promises';
import nock from 'nock';
import { text } from 'node:stream/consumers';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { processConfig } from 'zodline';
import apiCommand from './api.js';

vi.mock('@/services/authorization-service.js');
vi.mock('consola');
vi.mock('node:stream/consumers', () => ({ text: vi.fn() }));

vi.mock('@/utils/environment.js', () => ({
  isInteractive: () => false,
}));

describe('api', () => {
  const mockAuthorizationService = vi.mocked(authorizationService);
  const mockConsola = vi.mocked(consola);

  const testToken = 'test-token';
  const channelsPath = '/v1/apps/app-123/channels';
  const channel = { id: 'channel-456', name: 'staging' };

  let bodyDirectory: string;

  const writeBodyFile = async (content: string): Promise<string> => {
    const bodyPath = path.join(bodyDirectory, 'body.json');
    await fs.writeFile(bodyPath, content);
    return bodyPath;
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    // A request to any host that is not mocked fails instead of leaving the machine
    nock.disableNetConnect();

    mockAuthorizationService.hasAuthorizationToken.mockReturnValue(true);
    mockAuthorizationService.getCurrentAuthorizationToken.mockReturnValue(testToken);

    vi.spyOn(process, 'exit').mockImplementation((code?: string | number | null | undefined) => {
      throw new Error(`Process exited with code ${code}`);
    });
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    bodyDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'capawesome-cli-api-'));
  });

  afterEach(async () => {
    nock.cleanAll();
    nock.enableNetConnect();
    vi.restoreAllMocks();
    await fs.rm(bodyDirectory, { force: true, recursive: true });
  });

  it('should send a GET request with the query string and print the JSON body', async () => {
    const apps = [{ id: 'app-123', name: 'Example App' }];
    const scope = nock(DEFAULT_API_BASE_URL)
      .get('/v1/apps')
      .query({ limit: '10' })
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(200, apps);

    await apiCommand.action({}, ['/v1/apps?limit=10']);

    expect(scope.isDone()).toBe(true);
    expect(console.log).toHaveBeenCalledWith(JSON.stringify(apps, null, 2));
  });

  it('should add the leading slash when the path comes without it', async () => {
    const scope = nock(DEFAULT_API_BASE_URL).get('/v1/apps').reply(200, []);

    await apiCommand.action({}, ['v1/apps']);

    expect(scope.isDone()).toBe(true);
  });

  it('should send a path that looks like another host to the API host', async () => {
    const scope = nock(DEFAULT_API_BASE_URL)
      .get('/https://example.com/v1/apps')
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(200, [])
      .get('/@example.com/v1/apps')
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(200, []);

    await apiCommand.action({}, ['https://example.com/v1/apps']);
    await apiCommand.action({}, ['@example.com/v1/apps']);

    expect(scope.isDone()).toBe(true);
  });

  it('should require a path in a non-interactive environment', async () => {
    await expect(apiCommand.action({}, [])).rejects.toThrow('Process exited with code 1');

    expect(mockConsola.error).toHaveBeenCalledWith(
      'You must provide a path when running in non-interactive environment.',
    );
  });

  it('should send a POST request with the JSON of the body file and print a JSON answer whatever the letter case of its content type', async () => {
    const scope = nock(DEFAULT_API_BASE_URL)
      .post(channelsPath, { name: 'staging' })
      .matchHeader('Content-Type', 'application/json')
      .reply(201, JSON.stringify(channel), { 'Content-Type': 'Application/JSON; charset=utf-8' });

    await apiCommand.action({ bodyPath: await writeBodyFile('{"name":"staging"}') }, [channelsPath]);

    expect(scope.isDone()).toBe(true);
    expect(console.log).toHaveBeenCalledWith(JSON.stringify(channel, null, 2));
  });

  it('should read the body from stdin when `--body-path` is `-`', async () => {
    vi.mocked(text).mockResolvedValue('{"name":"staging"}');
    const scope = nock(DEFAULT_API_BASE_URL).post(channelsPath, { name: 'staging' }).reply(201, channel);

    const { options, args } = processConfig({ commands: { api: apiCommand } }, [
      'api',
      channelsPath,
      '--body-path',
      '-',
    ]);
    await apiCommand.action(options, args);

    expect(text).toHaveBeenCalledWith(process.stdin);
    expect(scope.isDone()).toBe(true);
  });

  it('should send the method of `--method` and print nothing when the answer is empty', async () => {
    const channelPath = `${channelsPath}/${channel.id}`;
    const scope = nock(DEFAULT_API_BASE_URL).delete(channelPath).reply(200, '', { 'Content-Type': 'application/json' });

    await apiCommand.action({ method: 'DELETE' }, [channelPath]);

    expect(scope.isDone()).toBe(true);
    expect(console.log).not.toHaveBeenCalled();
    expect(process.stdout.write).not.toHaveBeenCalled();
  });

  it('should print the bytes as received when the answer is not JSON', async () => {
    nock(DEFAULT_API_BASE_URL).get('/v1/apps').reply(200, 'id,name\n', { 'Content-Type': 'text/csv' });

    await apiCommand.action({}, ['/v1/apps']);

    expect(process.stdout.write).toHaveBeenCalledWith(Buffer.from('id,name\n'));
  });

  it('should print the bytes as received when the answer has no content type', async () => {
    const bytes = Buffer.from([0xff, 0xd8, 0x00]);
    nock(DEFAULT_API_BASE_URL).get('/v1/apps').reply(200, bytes);

    await apiCommand.action({}, ['/v1/apps']);

    expect(process.stdout.write).toHaveBeenCalledWith(bytes);
  });

  it('should print the bytes as received when the answer names JSON and holds none', async () => {
    nock(DEFAULT_API_BASE_URL).get('/v1/apps').reply(200, '<html></html>', { 'Content-Type': 'application/json' });

    await apiCommand.action({}, ['/v1/apps']);

    expect(process.stdout.write).toHaveBeenCalledWith(Buffer.from('<html></html>'));
  });

  it('should refuse `--body-path` together with `--method GET` before any request', async () => {
    const scope = nock(DEFAULT_API_BASE_URL).get(channelsPath).reply(200, []);

    await expect(
      apiCommand.action({ bodyPath: await writeBodyFile('{}'), method: 'GET' }, [channelsPath]),
    ).rejects.toThrow('Process exited with code 1');

    expect(mockConsola.error).toHaveBeenCalledWith(
      'A GET request sends no body, so `--method GET` and `--body-path` cannot be passed together.',
    );
    expect(scope.isDone()).toBe(false);
  });

  it('should refuse a body that is not JSON and send no request', async () => {
    const scope = nock(DEFAULT_API_BASE_URL).post(channelsPath).reply(201, channel);

    await expect(apiCommand.action({ bodyPath: await writeBodyFile('{"name":') }, [channelsPath])).rejects.toThrow(
      'Process exited with code 1',
    );

    expect(mockConsola.error).toHaveBeenCalledWith('The body from `--body-path` is not valid JSON.');
    expect(scope.isDone()).toBe(false);
  });

  it('should refuse a second argument', async () => {
    await expect(apiCommand.action({}, ['/v1/apps', '/v1/organizations'])).rejects.toThrow(
      'Process exited with code 1',
    );

    expect(mockConsola.error).toHaveBeenCalledWith(
      'The api command takes one path. It does not take /v1/organizations.',
    );
  });

  it('should reject with the message of the API when the request fails', async () => {
    nock(DEFAULT_API_BASE_URL).get('/v1/apps/app-123').reply(404, { message: 'App not found.' });

    await expect(apiCommand.action({}, ['/v1/apps/app-123'])).rejects.toSatisfy(
      (error) => getMessageFromUnknownError(error) === 'App not found.',
    );
  });
});
