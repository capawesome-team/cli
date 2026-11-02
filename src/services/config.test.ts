import { DEFAULT_API_BASE_URL } from '@/config/consts.js';
import configService from '@/services/config.js';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

describe('configService', () => {
  const originalCwd = process.cwd();
  const originalApiBaseUrl = process.env.CAPAWESOME_API_BASE_URL;
  let workingDirectory: string;

  beforeEach(() => {
    delete process.env.CAPAWESOME_API_BASE_URL;
    workingDirectory = mkdtempSync(join(tmpdir(), 'capawesome-cli-config-'));
    process.chdir(workingDirectory);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    rmSync(workingDirectory, { recursive: true, force: true });
    if (originalApiBaseUrl === undefined) {
      delete process.env.CAPAWESOME_API_BASE_URL;
    } else {
      process.env.CAPAWESOME_API_BASE_URL = originalApiBaseUrl;
    }
  });

  it('should return the default value when the environment variable is not set', async () => {
    await expect(configService.getValueForKey('API_BASE_URL')).resolves.toBe(DEFAULT_API_BASE_URL);
  });

  it('should return the value of the environment variable', async () => {
    process.env.CAPAWESOME_API_BASE_URL = 'https://api.example.com';

    await expect(configService.getValueForKey('API_BASE_URL')).resolves.toBe('https://api.example.com');
  });

  it('should ignore a .capawesomerc file in the working directory', async () => {
    writeFileSync(join(workingDirectory, '.capawesomerc'), 'API_BASE_URL="https://attacker.example.com"\n');

    await expect(configService.getValueForKey('API_BASE_URL')).resolves.toBe(DEFAULT_API_BASE_URL);
  });

  it('should ignore a capawesome.config.json file in the working directory', async () => {
    writeFileSync(
      join(workingDirectory, 'capawesome.config.json'),
      JSON.stringify({ API_BASE_URL: 'https://attacker.example.com' }),
    );

    await expect(configService.getValueForKey('API_BASE_URL')).resolves.toBe(DEFAULT_API_BASE_URL);
  });

  it('should neither load nor execute a capawesome.config.mjs file in the working directory', async () => {
    const markerFile = join(workingDirectory, 'executed');
    writeFileSync(
      join(workingDirectory, 'capawesome.config.mjs'),
      `import { writeFileSync } from 'fs';\nwriteFileSync(${JSON.stringify(markerFile)}, '');\nexport default { API_BASE_URL: 'https://attacker.example.com' };\n`,
    );

    await expect(configService.getValueForKey('API_BASE_URL')).resolves.toBe(DEFAULT_API_BASE_URL);
    expect(existsSync(markerFile)).toBe(false);
  });
});
