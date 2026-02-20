import authorizationService from '@/services/authorization-service.js';
import { prompt } from '@/utils/prompt.js';
import consola from 'consola';

export function withAuth<O, A>(
  action: (options: O, args: A) => void | Promise<void>,
): (options: O, args: A) => Promise<void> {
  return async (options, args) => {
    if (!authorizationService.hasAuthorizationToken()) {
      consola.error('You must be logged in to run this command.');
      const shouldLogin = await prompt('Do you want to login now?', {
        type: 'confirm',
        initial: true,
      });
      if (shouldLogin) {
        await (await import('@/commands/login.js').then((mod) => mod.default)).action({}, undefined);
      } else {
        consola.error('Please run the `login` command first.');
        process.exit(1);
      }
    }
    return action(options, args);
  };
}
