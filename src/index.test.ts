import { defineConfig, processConfig } from '@robingenz/zli';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import pkg from '../package.json' with { type: 'json' };

const config = defineConfig({
  meta: {
    name: pkg.name,
    version: pkg.version,
    description: pkg.description,
  },
  commands: {},
});

describe('CLI', () => {
  let consoleSpy: any;
  let processExitSpy: any;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should display version when --version flag is used', () => {
    try {
      processConfig(config, ['--version']);
    } catch (error) {
      // The processConfig function calls process.exit which we mock
      // so we continue execution and check the mocks
    }

    expect(consoleSpy).toHaveBeenCalledWith(pkg.version);
    expect(processExitSpy).toHaveBeenCalledWith(0);
  });
});
