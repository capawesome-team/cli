import { defineCommand } from 'citty';
import consola from 'consola';
import axios from 'axios';
import userConfig from '../utils/userConfig';
import { API_URL } from '../config';
import { passwordPrompt, prompt } from '../utils/prompt';
import { isRunningInCi } from '../utils/ci';
import usersService from '../services/users';

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
    let token = ctx.args.token;
    if (token) {
      userConfig.write({
        token: token,
      });
      try {
        await usersService.me();
      } catch (error) {
        userConfig.write({});
        consola.error('Invalid token.');
        return;
      }
      consola.success(`Successfully signed in.`);
    } else {
      const email = await prompt('Enter your email:', { type: 'text' });
      const password = await passwordPrompt('Enter your password:');
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
      const tokenResponse = await axios.post<{ token: string }>(
        `${API_URL}/tokens`,
        { name: 'Capawesome CLI' },
        { headers: { Authorization: `Bearer ${sessionId}` } },
      );
      userConfig.write({
        token: tokenResponse.data.token,
      });
      consola.success(`Successfully signed in.`);
    }
  },
});
