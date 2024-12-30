import { password as clackPassword } from '@clack/prompts';
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

/**
 * This is a workaround to support password prompts.
 *
 * @see https://github.com/unjs/consola/issues/285
 */
export const passwordPrompt = async (message: string) => {
  const result = await clackPassword({ message });
  if (typeof result === 'symbol') {
    process.exit(0);
  }
  return result;
};
