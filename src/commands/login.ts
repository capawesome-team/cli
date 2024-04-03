import { defineCommand } from 'citty'
import consola from 'consola'
import axios from 'axios'
import userConfig from '../utils/userConfig'
import { API_URL } from '../config'

export default defineCommand({
  meta: {
    name: 'login',
    description: 'Sign in to the Capawesome Cloud Console.',
  },
  run: async (ctx) => {
    const email = await consola.prompt('Email:', { type: 'text' })
    const password = await consola.prompt('Password:', { type: 'text' })
    const sessionResponse = await axios.post<{ id: string }>(`${API_URL}/sessions`, {
      email: email,
      password: password
    })
    consola.start('Logging in...')
    const tokenResponse = await axios.post<{ token: string }>(`${API_URL}/tokens`,
      { name: 'Capawesome CLI' },
      { headers: { Authorization: `Bearer ${sessionResponse.data.id}` } }
    )
    userConfig.write({
      username: email,
      token: tokenResponse.data.token
    })
    consola.success(`Successfully logged in as ${email}!`)
  },
})
