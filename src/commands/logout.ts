import { defineCommand } from 'citty'
import consola from 'consola'
import userConfig from '../utils/user-config'

export default defineCommand({
  meta: {
    name: 'logout',
    description: 'Logout from Capawesome',
  },
  args: {},
  run: async () => {
    const config = userConfig.read()
    delete config.username
    delete config.token
    userConfig.write(config)
    consola.success('Successfully logged out!')
  },
})
