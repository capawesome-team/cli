import { isInteractive } from '@/utils/environment.js';
import userConfig from '@/utils/user-config.js';
import consola from 'consola';

const TELEMETRY_DISABLED_VALUES = ['1', 'true'];

export interface TelemetryService {
  isEnabled(): boolean;
  showNoticeIfNeeded(): void;
}

class TelemetryServiceImpl implements TelemetryService {
  isEnabled(): boolean {
    const value = process.env.CAPAWESOME_TELEMETRY_DISABLED?.toLowerCase();
    return !value || !TELEMETRY_DISABLED_VALUES.includes(value);
  }

  showNoticeIfNeeded(): void {
    if (!this.isEnabled() || !isInteractive()) {
      return;
    }
    try {
      const config = userConfig.read();
      if (config.telemetryNoticeShown) {
        return;
      }
      consola.info(
        'Capawesome CLI sends crash reports to help us fix bugs.\n' +
          'To opt out: export CAPAWESOME_TELEMETRY_DISABLED=1\n' +
          'Learn more: https://capawesome.io/docs/cloud/cli/telemetry/',
      );
      userConfig.write({ ...config, telemetryNoticeShown: true });
    } catch {
      // Never let the telemetry notice break the CLI.
    }
  }
}

const telemetryService: TelemetryService = new TelemetryServiceImpl();

export default telemetryService;
