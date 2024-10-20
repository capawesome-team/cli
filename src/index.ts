#!/usr/bin/env node
import { defineCommand, runMain } from 'citty';
import pkg from '../package.json';
import updateService from './services/update';

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
    'apps:create': import('./commands/apps/create').then((mod) => mod.default),
    'apps:delete': import('./commands/apps/delete').then((mod) => mod.default),
    'apps:bundles:create': import('./commands/apps/bundles/create').then((mod) => mod.default),
    'apps:bundles:delete': import('./commands/apps/bundles/delete').then((mod) => mod.default),
    'apps:bundles:update': import('./commands/apps/bundles/update').then((mod) => mod.default),
    'apps:channels:create': import('./commands/apps/channels/create').then((mod) => mod.default),
    'apps:channels:delete': import('./commands/apps/channels/delete').then((mod) => mod.default),
    'apps:devices:delete': import('./commands/apps/devices/delete').then((mod) => mod.default),
    'manifests:generate': import('./commands/manifests/generate').then((mod) => mod.default),
  },
});

runMain(main);
