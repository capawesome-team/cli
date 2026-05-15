import { UserError } from '@/utils/error.js';
import capacitorAdapter from './app-types/capacitor.js';
import type { AppTypeAdapter } from './types.js';

const adapters: AppTypeAdapter[] = [capacitorAdapter];

export const detectAppType = async (projectRoot: string): Promise<AppTypeAdapter> => {
  for (const adapter of adapters) {
    if (await adapter.detect(projectRoot)) {
      return adapter;
    }
  }
  throw new UserError(
    `No supported app type was detected at the given path. Supported app types: ${adapters
      .map((a) => a.name)
      .join(', ')}.`,
  );
};
