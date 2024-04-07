import { defineCommand } from 'citty'
import { isRunningInCi } from '../../utils/ci'
import consola from 'consola'
import axios from 'axios'
import { API_URL } from '../../config'

export default defineCommand({
  meta: {
    description: 'List all apps.',
  },
  run: async (ctx) => {
    if (isRunningInCi()) {
      consola.error('This command is not supported in CI environments.')
      return
    }
    try {
      const appsResponse = await axios.get<{ id: string }[]>(`${API_URL}/apps`)
      consola.info('Apps:')
      appsResponse.data.forEach((app) => {
        consola.info(`- ${app.id}`)
      })
    } catch (error) {
      consola.error('Apps could not be listed.')
    }
  },
})
