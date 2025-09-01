#!/usr/bin/env node
import configService from '@/services/config.js';
import updateService from '@/services/update.js';
import { getMessageFromUnknownError } from '@/utils/error.js';
import { defineConfig, processConfig, ZliError } from '@robingenz/zli';
import * as Sentry from '@sentry/node';
import { AxiosError } from 'axios';
import consola from 'consola';
import { ZodError } from 'zod';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pkg = require('../package.json');

const config = defineConfig({
  meta: {
    name: pkg.name,
    version: pkg.version,
    description: pkg.description,
  },
  commands: {
    whoami: await import('@/commands/whoami.js').then((mod) => mod.default),
    login: await import('@/commands/login.js').then((mod) => mod.default),
    logout: await import('@/commands/logout.js').then((mod) => mod.default),
    doctor: await import('@/commands/doctor.js').then((mod) => mod.default),
    'apps:create': await import('@/commands/apps/create.js').then((mod) => mod.default),
    'apps:delete': await import('@/commands/apps/delete.js').then((mod) => mod.default),
    'apps:bundles:create': await import('@/commands/apps/bundles/create.js').then((mod) => mod.default),
    'apps:bundles:delete': await import('@/commands/apps/bundles/delete.js').then((mod) => mod.default),
    'apps:bundles:update': await import('@/commands/apps/bundles/update.js').then((mod) => mod.default),
    'apps:channels:create': await import('@/commands/apps/channels/create.js').then((mod) => mod.default),
    'apps:channels:delete': await import('@/commands/apps/channels/delete.js').then((mod) => mod.default),
    'apps:channels:get': await import('@/commands/apps/channels/get.js').then((mod) => mod.default),
    'apps:channels:list': await import('@/commands/apps/channels/list.js').then((mod) => mod.default),
    'apps:channels:update': await import('@/commands/apps/channels/update.js').then((mod) => mod.default),
    'apps:devices:delete': await import('@/commands/apps/devices/delete.js').then((mod) => mod.default),
    'manifests:generate': await import('@/commands/manifests/generate.js').then((mod) => mod.default),
    'mutate:version:get': await import('@/commands/mutate/version/get.js').then((mod) => mod.default),
    'mutate:version:set': await import('@/commands/mutate/version/set.js').then((mod) => mod.default),
    'mutate:version:major': await import('@/commands/mutate/version/major.js').then((mod) => mod.default),
    'mutate:version:minor': await import('@/commands/mutate/version/minor.js').then((mod) => mod.default),
    'mutate:version:patch': await import('@/commands/mutate/version/patch.js').then((mod) => mod.default),
    'mutate:version:hotfix': await import('@/commands/mutate/version/hotfix.js').then((mod) => mod.default),
    'mutate:version:sync': await import('@/commands/mutate/version/sync.js').then((mod) => mod.default),
    'organizations:create': await import('@/commands/organizations/create.js').then((mod) => mod.default),
  },
});

const captureException = async (error: unknown) => {
  // Ignore errors from the CLI itself (e.g. "No command found.")
  if (error instanceof ZliError) {
    return;
  }
  // Ignore validation errors
  if (error instanceof ZodError) {
    return;
  }
  // Ignore failed HTTP requests
  if (error instanceof AxiosError) {
    return;
  }
  const environment = await configService.getValueForKey('ENVIRONMENT');
  if (environment !== 'production') {
    return;
  }
  Sentry.init({
    dsn: 'https://19f30f2ec4b91899abc33818568ceb42@o4507446340747264.ingest.de.sentry.io/4508506426966096',
    release: pkg.version,
  });
  if (process.argv.slice(2).length > 0) {
    Sentry.setTag('cli_command', process.argv.slice(2)[0]);
  }
  Sentry.captureException(error);
  await Sentry.close();
};

try {
  const result = processConfig(config, process.argv.slice(2));
  await result.command.action(result.options, result.args);
} catch (error) {
  try {
    await captureException(error).catch(() => {
      // No op
    });
    // Print the error message
    const message = getMessageFromUnknownError(error);
    consola.error(message);
  } finally {
    // Suggest opening an issue
    consola.log('If you think this is a bug, please open an issue at:');
    consola.log('  https://github.com/capawesome-team/cli/issues/new/choose');
    // Check for updates
    await updateService.checkForUpdate();
    // Exit with a non-zero code
    process.exit(1);
  }
} finally {
  // Check for updates
  await updateService.checkForUpdate();
}
