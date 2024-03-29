import { defineCommand } from 'citty'
import consola from 'consola'
import axios from 'axios'
import userConfig from '../utils/userConfig'

export default defineCommand({
  meta: {
    name: 'login',
    description: 'Login to Capawesome',
  },
  args: {
    username: {
      type: 'string',
      description: 'Your username'
    },
    password: {
      type: 'string',
      description: 'Your password'
    }
  },
  run: async (ctx) => {
    let username = ctx.args.username
    let password = ctx.args.password
    if (!username) {
      username = await consola.prompt('Username:', { type: 'text' })
    }
    if (!password) {
      password = await consola.prompt('Password:', { type: 'text' })
    }
    const sessionRes = await axios.post<{ sessionId: string }>(`https://cloud-api-worker.shiny-block-d96d.workers.dev/v1/sessions`, {
      email: username,
      password: password
    })
    consola.start('Logging in...')
    const tokenRes = await axios.post<{ token: string }>(`https://cloud-api-worker.shiny-block-d96d.workers.dev/v1/tokens`,
      { name: 'Capawesome CLI' },
      { headers: { Authorization: `Bearer ${sessionRes.data.sessionId}` } }
    )
    userConfig.write({
      username,
      token: tokenRes.data.token
    })
    consola.success(`Successfully logged in as ${username}!`)
  },
})
