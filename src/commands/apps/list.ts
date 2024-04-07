import { defineCommand } from 'citty'
import { isRunningInCi } from '../../utils/ci'
import consola from 'consola'
import httpClient from '../../utils/http-client'
import userConfig from '../../utils/userConfig'

export default defineCommand({
  meta: {
    description: 'List all apps.',
  },
  run: async (ctx) => {
    if (isRunningInCi()) {
      consola.error('This command is not supported in CI environments.')
      return
    }
    const res = await httpClient.get<{ name: string }[]>('/apps', { Authorization: `Bearer ${userConfig.read().token}` })
    if (!res.success) {
      consola.error('Apps could not be listed.')
      return
    }
    if (res.data.length === 0) {
      consola.info('No apps found.')
      return
    }
    consola.info('Available Apps:')
    res.data.forEach((app) => {
      consola.info(`- ${app.name}`)
    })
  },
})
