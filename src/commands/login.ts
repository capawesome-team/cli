import { defineCommand } from 'citty'
import consola from 'consola'
import axios from 'axios'
import userConfig from '../utils/userConfig'
import { API_URL } from '../config'
import { prompt } from '../utils/prompt'
import { isRunningInCi } from '../utils/ci'

export default defineCommand({
  meta: {
    name: 'login',
    description: 'Sign in to the Capawesome Cloud Console.',
  },
  run: async (ctx) => {
    if (!isRunningInCi()) {
      consola.error('Sign in is not supported in CI environments. Please use the CAPAWESOME_TOKEN environment variable.')
      return
    }
    const email = await prompt('Enter your email:', { type: 'text' })
    console.log(email);
    const password = await prompt('Enter your password:', { type: 'text' })
    consola.start('Logging in...')
    let sessionId: string;
    try {
      const sessionResponse = await axios.post<{ id: string }>(`${API_URL}/sessions`, {
        email: email,
        password: password
      })
      sessionId = sessionResponse.data.id
    } catch (error) {
      consola.error('Invalid email or password.')
      return
    }
    const tokenResponse = await axios.post<{ token: string }>(`${API_URL}/tokens`,
      { name: 'Capawesome CLI' },
      { headers: { Authorization: `Bearer ${sessionId}` } }
    )
    userConfig.write({
      username: email,
      token: tokenResponse.data.token
    })
    consola.success(`Successfully signed in.`)
  },
})
