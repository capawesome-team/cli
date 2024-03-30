import { defineCommand } from 'citty'
import consola from 'consola'
import axios from 'axios'
import userConfig from '../utils/userConfig'
import { createReadStream } from 'node:fs'
import FormData from 'form-data'
import zip from '../utils/zip'
import { isRunningInGithubActions } from '../utils/ci'

export default defineCommand({
  meta: {
    name: 'deploy',
    description: 'Deploy your project',
  },
  args: {
    path: {
      type: 'string',
      description: 'Path to deploy',
    },
    app: {
      type: 'string',
      description: 'Id of the app to deploy to',
    }
  },
  run: async (ctx) => {
    let path = ctx.args.path
    let app = ctx.args.app
    if (!path) {
      path = await consola.prompt('Path to deploy:', { type: 'text' })
    }
    let token
    if (isRunningInGithubActions()) {
      if (!process.env.CAPAWESOME_TOKEN) {
        consola.error('You need to provide CAPAWESOME_TOKEN in your environment')
        return
      }
      token = process.env.CAPAWESOME_TOKEN
    } else {
      token = userConfig.read().token
      if (!token) {
        consola.error('You need to be logged in to deploy')
        return
      }
    }
    if (!app) {
      try {
        const appsRes = await axios.get<{
          id: string,
          name: string
        }[]>('https://cloud-api-worker.shiny-block-d96d.workers.dev/v1/apps', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        })
        // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
        app = await consola.prompt('Which app do you want to deploy:', {
          type: 'select',
          options: appsRes.data.map((app) => ({ label: app.name, value: app.id }))
        })
      } catch (e) {
        consola.error('Failed to fetch apps')
        return
      }
    }

    if (!zip.isZipped(path)) {
      consola.error('Only .zip files are supported')
      return
    }
    consola.start('Deploying...')
    const formData = new FormData()
    formData.append('file', createReadStream(path))
    await axios.post(`https://cloud-api-worker.shiny-block-d96d.workers.dev/v1/apps/${app}/bundles`, formData, {
      headers: {
        Authorization: `Bearer ${token}`,
        ...formData.getHeaders(),
      },
    })
    consola.success('Successfully deployed!')
  },
})
