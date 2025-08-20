import configService from '@/services/config.js';
import sessionCodesService from '@/services/session-code.js';
import sessionsService from '@/services/sessions.js';
import usersService from '@/services/users.js';
import { prompt } from '@/utils/prompt.js';
import userConfig from '@/utils/user-config.js';
import { defineCommand, defineOptions } from '@robingenz/zli';
import { AxiosError } from 'axios';
import consola from 'consola';
import open from 'open';
import { z } from 'zod';

export default defineCommand({
  description: 'Sign in to the Capawesome Cloud Console.',
  options: defineOptions(
    z.object({
      token: z.string().optional().describe('Token to use for authentication.'),
    }),
  ),
  action: async (options, args) => {
    const consoleBaseUrl = await configService.getValueForKey('CONSOLE_BASE_URL');
    let { token: sessionIdOrToken } = options;
    if (sessionIdOrToken === undefined) {
      // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
      const authenticationMethod = await prompt('How would you like to authenticate Capawesome CLI?', {
        type: 'select',
        options: [
          { label: 'Login with a web browser', value: 'browser' },
          { label: 'Paste an authentication token', value: 'token' },
        ],
      });
      if (authenticationMethod === 'browser') {
        // Create a session code
        const { id: deviceCode, code: userCode } = await sessionCodesService.create();
        consola.box(`Copy your one-time code: ${userCode.slice(0, 4)}-${userCode.slice(4)}`);
        // Prompt the user to open the authorization URL in their browser
        const shouldProceed = await prompt(
          `Select Yes to continue in your browser or No to cancel the authentication.`,
          {
            type: 'confirm',
            initial: true,
          },
        );
        if (!shouldProceed) {
          consola.error('Authentication cancelled.');
          process.exit(1);
        }
        // Open the authorization URL in the user's default browser
        consola.start('Opening browser...');
        const authorizationUrl = `${consoleBaseUrl}/login/device`;
        try {
          open(authorizationUrl);
        } catch (error) {
          consola.warn(
            `Could not open browser automatically. Please open the following URL manually: ${authorizationUrl}`,
          );
        }
        // Wait for the user to authenticate
        consola.start('Waiting for authentication...');
        const sessionId = await createSession(deviceCode);
        if (!sessionId) {
          consola.error('Authentication timed out. Please try again.');
          process.exit(1);
        }
        sessionIdOrToken = sessionId;
      } else {
        sessionIdOrToken = await prompt('Please provide your authentication token:', {
          type: 'text',
        });
        if (!sessionIdOrToken) {
          consola.error('Token must be provided.');
          process.exit(1);
        }
      }
    } else if (sessionIdOrToken.length === 0) {
      // No token provided
      consola.error(`Please provide a valid token. You can create a token at ${consoleBaseUrl}/settings/tokens.`);
      process.exit(1);
    }
    // Sign in with the provided token
    consola.start('Signing in...');
    userConfig.write({
      token: sessionIdOrToken,
    });
    try {
      await usersService.me();
      consola.success(`Successfully signed in.`);
    } catch (error) {
      userConfig.write({});
      if (error instanceof AxiosError && error.response?.status === 401) {
        consola.error(
          `Invalid token. Please provide a valid token. You can create a token at ${consoleBaseUrl}/settings/tokens.`,
        );
        process.exit(1);
      } else {
        throw error;
      }
    }
  },
});

const createSession = async (deviceCode: string) => {
  const maxAttempts = 20;
  const interval = 3 * 1000; // 3 seconds
  let attempts = 0;
  let sessionId: string | null = null;
  while (attempts < maxAttempts && sessionId === null) {
    try {
      const response = await sessionsService.create({
        code: deviceCode,
        provider: 'code',
      });
      sessionId = response.id;
    } catch (error) {
      if (error instanceof AxiosError && error.response?.status === 400) {
        // Session not ready yet, wait and try again
        attempts++;
        await new Promise((resolve) => setTimeout(resolve, interval));
      } else {
        throw error;
      }
    }
  }
  return sessionId;
};
