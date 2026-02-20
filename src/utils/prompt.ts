import consola from 'consola';

export const prompt: typeof consola.prompt = async (message, options) => {
  options = { ...(options || {}), cancel: 'symbol' } as any;
  const response = await consola.prompt(message, options);
  // See https://github.com/unjs/consola/pull/325#issue-2751614453
  if (response === Symbol.for('cancel')) {
    process.exit(0);
  }
  return response;
};

export const promptOrganizationSelection = async (options?: { allowCreate?: boolean }): Promise<string> => {
  const organizationsService = await import('@/services/organizations.js').then((mod) => mod.default);
  let organizations = await organizationsService.findAll();
  if (organizations.length === 0) {
    if (options?.allowCreate) {
      const shouldCreate = await prompt('No organizations found. Do you want to create one now?', {
        type: 'confirm',
        initial: true,
      });
      if (shouldCreate) {
        await (await import('@/commands/organizations/create.js').then((mod) => mod.default)).action({}, undefined);
        organizations = await organizationsService.findAll();
      } else {
        process.exit(1);
      }
    } else {
      consola.error('No organizations found. Please create one first.');
      process.exit(1);
    }
  }
  // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
  const organizationId = await prompt('Which organization do you want to use?', {
    type: 'select',
    options: organizations.map((organization) => ({ label: organization.name, value: organization.id })),
  });
  return organizationId;
};

export const promptAppSelection = async (
  organizationId: string,
  options?: { allowCreate?: boolean },
): Promise<string> => {
  const appsService = await import('@/services/apps.js').then((mod) => mod.default);
  let apps = await appsService.findAll({ organizationId });
  if (apps.length === 0) {
    if (options?.allowCreate) {
      const shouldCreate = await prompt('No apps found. Do you want to create one now?', {
        type: 'confirm',
        initial: true,
      });
      if (shouldCreate) {
        await (
          await import('@/commands/apps/create.js').then((mod) => mod.default)
        ).action({ organizationId }, undefined);
        apps = await appsService.findAll({ organizationId });
      } else {
        process.exit(1);
      }
    } else {
      consola.error('No apps found. Please create one first.');
      process.exit(1);
    }
  }
  // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
  const appId = await prompt('Which app do you want to use?', {
    type: 'select',
    options: apps.map((app) => ({ label: app.name, value: app.id })),
  });
  return appId;
};
