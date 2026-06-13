import consola from 'consola';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isInteractive } from '@/utils/environment.js';
import userConfig from '@/utils/user-config.js';
import telemetryService from './telemetry.js';

vi.mock('@/utils/environment.js');
vi.mock('@/utils/user-config.js');
vi.mock('consola');

describe('telemetryService', () => {
  const mockIsInteractive = vi.mocked(isInteractive);
  const mockRead = vi.mocked(userConfig.read);
  const mockWrite = vi.mocked(userConfig.write);

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.CAPAWESOME_TELEMETRY_DISABLED;
    mockIsInteractive.mockReturnValue(true);
    mockRead.mockReturnValue({});
  });

  afterEach(() => {
    delete process.env.CAPAWESOME_TELEMETRY_DISABLED;
  });

  describe('isEnabled', () => {
    it('should be enabled by default', () => {
      expect(telemetryService.isEnabled()).toBe(true);
    });

    it.each(['1', 'true', 'TRUE'])('should be disabled when CAPAWESOME_TELEMETRY_DISABLED is "%s"', (value) => {
      process.env.CAPAWESOME_TELEMETRY_DISABLED = value;
      expect(telemetryService.isEnabled()).toBe(false);
    });

    it('should stay enabled for other values', () => {
      process.env.CAPAWESOME_TELEMETRY_DISABLED = '0';
      expect(telemetryService.isEnabled()).toBe(true);
    });
  });

  describe('showNoticeIfNeeded', () => {
    it('should show the notice once and persist the flag', () => {
      mockRead.mockReturnValue({ token: 'abc' });

      telemetryService.showNoticeIfNeeded();

      expect(consola.info).toHaveBeenCalledOnce();
      expect(mockWrite).toHaveBeenCalledWith({ token: 'abc', telemetryNoticeShown: true });
    });

    it('should not show the notice when it was already shown', () => {
      mockRead.mockReturnValue({ telemetryNoticeShown: true });

      telemetryService.showNoticeIfNeeded();

      expect(consola.info).not.toHaveBeenCalled();
      expect(mockWrite).not.toHaveBeenCalled();
    });

    it('should not show the notice when telemetry is disabled', () => {
      process.env.CAPAWESOME_TELEMETRY_DISABLED = '1';

      telemetryService.showNoticeIfNeeded();

      expect(consola.info).not.toHaveBeenCalled();
      expect(mockWrite).not.toHaveBeenCalled();
    });

    it('should not show the notice in non-interactive environments', () => {
      mockIsInteractive.mockReturnValue(false);

      telemetryService.showNoticeIfNeeded();

      expect(consola.info).not.toHaveBeenCalled();
      expect(mockWrite).not.toHaveBeenCalled();
    });

    it('should not throw when reading or writing the config fails', () => {
      mockRead.mockImplementation(() => {
        throw new Error('read failed');
      });

      expect(() => telemetryService.showNoticeIfNeeded()).not.toThrow();
    });
  });
});
