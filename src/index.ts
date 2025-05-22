#!/usr/bin/env node
import * as Sentry from '@sentry/node';
import { defineCommand, runMain } from 'citty';
import consola from 'consola';
import pkg from '../package.json';
import configService from './services/config';
import updateService from './services/update';
import { getMessageFromUnknownError } from './utils/error';

const main = defineCommand({
  meta: {
    name: pkg.name,
    version: pkg.version,
    description: pkg.description,
  },
  setup() {
    // No op
  },
  cleanup() {
    return updateService.checkForUpdate();
  },
  subCommands: {
    whoami: import('./commands/whoami').then((mod) => mod.default),
    login: import('./commands/login').then((mod) => mod.default),
    logout: import('./commands/logout').then((mod) => mod.default),
    doctor: import('./commands/doctor').then((mod) => mod.default),
    'apps:create': import('./commands/apps/create').then((mod) => mod.default),
    'apps:delete': import('./commands/apps/delete').then((mod) => mod.default),
    'apps:bundles:create': import('./commands/apps/bundles/create').then((mod) => mod.default),
    'apps:bundles:delete': import('./commands/apps/bundles/delete').then((mod) => mod.default),
    'apps:bundles:update': import('./commands/apps/bundles/update').then((mod) => mod.default),
    'apps:channels:create': import('./commands/apps/channels/create').then((mod) => mod.default),
    'apps:channels:delete': import('./commands/apps/channels/delete').then((mod) => mod.default),
    'apps:channels:get': import('./commands/apps/channels/get').then((mod) => mod.default),
    'apps:channels:list': import('./commands/apps/channels/list').then((mod) => mod.default),
    'apps:channels:update': import('./commands/apps/channels/update').then((mod) => mod.default),
    'apps:devices:delete': import('./commands/apps/devices/delete').then((mod) => mod.default),
    'manifests:generate': import('./commands/manifests/generate').then((mod) => mod.default),
  },
});

const captureException = async (error: unknown) => {
  const environment = await configService.getValueForKey('ENVIRONMENT');
  if (environment !== 'production') {
    return;
  }
  Sentry.init({
    dsn: 'https://19f30f2ec4b91899abc33818568ceb42@o4507446340747264.ingest.de.sentry.io/4508506426966096',
  });
  Sentry.captureException(error);
  await Sentry.close();
};

runMain(main).catch(async (error) => {
  try {
    await captureException(error).catch(() => {
      // No op
    });
    // Print the error message
    const message = getMessageFromUnknownError(error);
    consola.error(message);
  } finally {
    // Exit with a non-zero code
    process.exit(1);
  }
});
