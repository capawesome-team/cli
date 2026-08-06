import userConfig from '@/utils/user-config.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/utils/user-config.js');

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('getInstallationId', () => {
  const mockRead = vi.mocked(userConfig.read);
  const mockWrite = vi.mocked(userConfig.write);

  // The installation id is cached in a module-level variable, so the module has to be
  // reimported for every test.
  const importGetInstallationId = async () => {
    vi.resetModules();
    return (await import('./installation-id.js')).getInstallationId;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockRead.mockReturnValue({});
  });

  it('should generate and persist a random uuid on first use', async () => {
    mockRead.mockReturnValue({ token: 'abc' });
    const getInstallationId = await importGetInstallationId();

    const installationId = getInstallationId();

    expect(installationId).toMatch(UUID_PATTERN);
    expect(mockWrite).toHaveBeenCalledWith({ token: 'abc', installationId });
  });

  it('should return the persisted installation id without writing it again', async () => {
    mockRead.mockReturnValue({ installationId: 'aa4b5a1c-1d0e-4a51-9c8f-3f1b2d9e7a10' });
    const getInstallationId = await importGetInstallationId();

    expect(getInstallationId()).toBe('aa4b5a1c-1d0e-4a51-9c8f-3f1b2d9e7a10');
    expect(mockWrite).not.toHaveBeenCalled();
  });

  it('should read the config only once', async () => {
    const getInstallationId = await importGetInstallationId();

    expect(getInstallationId()).toBe(getInstallationId());
    expect(mockRead).toHaveBeenCalledOnce();
  });

  it('should return undefined when the config cannot be read', async () => {
    mockRead.mockImplementation(() => {
      throw new Error('read failed');
    });
    const getInstallationId = await importGetInstallationId();

    expect(getInstallationId()).toBeUndefined();
  });

  it('should return undefined when the installation id cannot be persisted', async () => {
    mockWrite.mockImplementation(() => {
      throw new Error('write failed');
    });
    const getInstallationId = await importGetInstallationId();

    expect(getInstallationId()).toBeUndefined();
  });
});
