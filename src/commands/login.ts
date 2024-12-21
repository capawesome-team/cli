import axios, { AxiosError } from 'axios';
import { defineCommand } from 'citty';
import consola from 'consola';
import { API_URL } from '../config';
import usersService from '../services/users';
import { getMessageFromUnknownError } from '../utils/error';
import { passwordPrompt, prompt } from '../utils/prompt';
import userConfig from '../utils/userConfig';

export default defineCommand({
  meta: {
    name: 'login',
    description: 'Sign in to the Capawesome Cloud Console.',
  },
  args: {
    token: {
      type: 'string',
      description: 'Token to use for authentication.',
    },
  },
  run: async (ctx) => {
    let token = ctx.args.token as string | undefined;
    if (token === undefined) {
      consola.warn('If you have signed up via an OAuth provider, please sign in using the `--token` argument.');
      const email = (await prompt('Enter your email:', { type: 'text' })) as string | undefined;
      const password = (await passwordPrompt('Enter your password:')) as string | undefined;
      if (!email || !password) {
        consola.error('Invalid email or password.');
        return;
      }
      consola.start('Logging in...');
      let sessionId: string;
      try {
        const sessionResponse = await axios.post<{ id: string }>(`${API_URL}/sessions`, {
          email: email,
          password: password,
        });
        sessionId = sessionResponse.data.id;
      } catch (error) {
        consola.error('Invalid email or password.');
        return;
      }
      userConfig.write({
        token: sessionId,
      });
      consola.success(`Successfully signed in.`);
    } else if (token.length === 0) {
      consola.error(
        'Please provide a valid token. You can create a token at https://cloud.capawesome.io/settings/tokens.',
      );
    } else {
      userConfig.write({
        token: token,
      });
      try {
        await usersService.me();
        consola.success(`Successfully signed in.`);
      } catch (error) {
        userConfig.write({});
        let message = getMessageFromUnknownError(error);
        if (error instanceof AxiosError && error.response?.status === 401) {
          message =
            'Invalid token. Please provide a valid token. You can create a token at https://cloud.capawesome.io/settings/tokens.';
        }
        consola.error(message);
      }
    }
  },
});
