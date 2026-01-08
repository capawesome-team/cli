import appEnvironmentsService from '@/services/app-environments.js';
import appsService from '@/services/apps.js';
import authorizationService from '@/services/authorization-service.js';
import organizationsService from '@/services/organizations.js';
import { parseKeyValuePairs } from '@/utils/app-environments.js';
import { isInteractive } from '@/utils/environment.js';
import { prompt } from '@/utils/prompt.js';
import { defineCommand, defineOptions } from '@robingenz/zli';
import consola from 'consola';
import fs from 'fs';
import { z } from 'zod';

export default defineCommand({
  description: 'Set environment variables and secrets.',
  options: defineOptions(
    z.object({
      appId: z.string().optional().describe('ID of the app.'),
      environmentId: z.string().optional().describe('ID of the environment.'),
      variable: z
        .array(z.string())
        .optional()
        .describe('Environment variable in key=value format. Can be specified multiple times.'),
      variableFile: z.string().optional().describe('Path to a file containing environment variables in .env format.'),
      secret: z
        .array(z.string())
        .optional()
        .describe('Environment secret in key=value format. Can be specified multiple times.'),
      secretFile: z.string().optional().describe('Path to a file containing environment secrets in .env format.'),
    }),
  ),
  action: async (options, args) => {
    let { appId, environmentId, variable, variableFile, secret, secretFile } = options;

    if (!authorizationService.hasAuthorizationToken()) {
      consola.error('You must be logged in to run this command. Please run the `login` command first.');
      process.exit(1);
    }

    if (!appId) {
      if (!isInteractive()) {
        consola.error('You must provide an app ID when running in non-interactive environment.');
        process.exit(1);
      }
      const organizations = await organizationsService.findAll();
      if (organizations.length === 0) {
        consola.error('You must create an organization before setting environment variables or secrets.');
        process.exit(1);
      }
      // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
      const organizationId = await prompt(
        'Select the organization of the app for which you want to set environment variables or secrets.',
        {
          type: 'select',
          options: organizations.map((organization) => ({ label: organization.name, value: organization.id })),
        },
      );
      if (!organizationId) {
        consola.error(
          'You must select the organization of an app for which you want to set environment variables or secrets.',
        );
        process.exit(1);
      }
      const apps = await appsService.findAll({
        organizationId,
      });
      if (!apps.length) {
        consola.error('You must create an app before setting environment variables or secrets.');
        process.exit(1);
      }
      // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
      appId = await prompt('Which app do you want to set the environment variables or secrets for?', {
        type: 'select',
        options: apps.map((app) => ({ label: app.name, value: app.id })),
      });
    }

    if (!environmentId) {
      if (!isInteractive()) {
        consola.error('You must provide an environment ID when running in non-interactive environment.');
        process.exit(1);
      }
      const environments = await appEnvironmentsService.findAll({ appId });
      if (!environments.length) {
        consola.error('No environments found for this app. Create one first.');
        process.exit(1);
      }
      // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
      environmentId = await prompt('Select the environment:', {
        type: 'select',
        options: environments.map((env) => ({ label: env.name, value: env.id })),
      });
    }

    // Parse variables from inline and file
    const variablesMap = new Map<string, string>();
    if (variableFile) {
      const fileContent = await fs.promises.readFile(variableFile, 'utf-8');
      const fileVariables = parseKeyValuePairs(fileContent);
      fileVariables.forEach((v) => variablesMap.set(v.key, v.value));
    }
    if (variable) {
      const inlineVariables = parseKeyValuePairs(variable.join('\n'));
      inlineVariables.forEach((v) => variablesMap.set(v.key, v.value));
    }
    const allVariables = Array.from(variablesMap.entries()).map(([key, value]) => ({ key, value }));

    // Parse secrets from inline and file
    const secretsMap = new Map<string, string>();
    if (secretFile) {
      const fileContent = await fs.promises.readFile(secretFile, 'utf-8');
      const fileSecrets = parseKeyValuePairs(fileContent);
      fileSecrets.forEach((s) => secretsMap.set(s.key, s.value));
    }
    if (secret) {
      const inlineSecrets = parseKeyValuePairs(secret.join('\n'));
      inlineSecrets.forEach((s) => secretsMap.set(s.key, s.value));
    }
    const allSecrets = Array.from(secretsMap.entries()).map(([key, value]) => ({ key, value }));

    if (!allVariables.length && !allSecrets.length) {
      consola.error('You must provide at least one variable or secret to set.');
      process.exit(1);
    }

    if (allVariables.length) {
      await appEnvironmentsService.setVariables({
        appId,
        environmentId,
        variables: allVariables,
      });
    }

    if (allSecrets.length) {
      await appEnvironmentsService.setSecrets({
        appId,
        environmentId,
        secrets: allSecrets,
      });
    }

    consola.success('Environment variables and secrets set successfully.');
  },
});
