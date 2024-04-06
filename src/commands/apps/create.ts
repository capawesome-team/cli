import { defineCommand } from 'citty'
import { isRunningInCi } from '../../utils/ci'
import consola from 'consola'
import { prompt } from '../../utils/prompt'
import axios from 'axios'
import { API_URL } from '../../config'

export default defineCommand({
  meta: {
    description: 'Create a new app.',
  },
  args: {
    name: {
      type: 'string',
      description: 'Name of the app.',
    },
  },
  run: async (ctx) => {
    if (isRunningInCi()) {
      consola.error('This command is not supported in CI environments.')
      return
    }
    let name = ctx.args.name
    if (!name) {
      name = await prompt('Enter the name of the app:', { type: 'text' })
    }
    try {
      await axios.post<{ id: string }>(`${API_URL}/apps`, { name: name })
    } catch (error) {
      consola.error('App could not be created.')
      return
    }
    consola.success('App created successfully.')
  },
})
