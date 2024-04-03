import { defineCommand } from 'citty'
import consola from 'consola'
import axios, { AxiosError } from 'axios'
import userConfig from '../utils/userConfig'
import { createReadStream } from 'node:fs'
import FormData from 'form-data'
import zip from '../utils/zip'
import { isRunningInCi } from '../utils/ci'
import { API_URL } from '../config'
import { prompt } from '../utils/prompt'

export default defineCommand({
  meta: {
    name: 'deploy',
    description: 'Upload a new app bundle.',
  },
  args: {
    path: {
      type: 'string',
      description: 'Path to the app bundle to deploy. Must be a folder or .zip file.',
    },
    appId: {
      type: 'string',
      description: 'App ID to deploy to.',
    },
    channel: {
      type: 'string',
      description: 'Channel to deploy to.',
    },
  },
  run: async (ctx) => {
    let token
    if (isRunningInCi()) {
      token = process.env.CAPAWESOME_TOKEN
    } else {
      token = userConfig.read().token
    }
    if (!token) {
      consola.error('You must be logged in to run this command.')
      return
    }

    let path = ctx.args.path
    let app = ctx.args.app
    let channelName = ctx.args.channel
    if (!path) {
      path = await prompt('Enter the path to the app bundle:', { type: 'text' })
    }
    if (!app) {
      try {
        const appsResponse = await axios.get<{
          id: string,
          name: string
        }[]>(`${API_URL}/apps`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        })
        // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
        app = await prompt('Which app do you want to deploy to:', {
          type: 'select',
          options: appsResponse.data.map((app) => ({ label: app.name, value: app.id }))
        })
      } catch (e) {
        consola.error('Failed to fetch apps')
        return
      }
    }
    if (!channelName) {
      const promptChannel = await prompt('Do you want to deploy to a specific channel?', { type: 'select', options: ['Yes', 'No'] })
      if (promptChannel === 'Yes') {
        channelName = await prompt('Enter the channel name:', { type: 'text' })
      }
    }

    if (!zip.isZipped(path)) {
      consola.error('Only .zip files are supported')
      return
    }
    consola.start('Uploading...')
    const formData = new FormData()
    formData.append('file', createReadStream(path))
    if (channelName) {
      formData.append('channelName', channelName)
    }
    try {
      await axios.post(`${API_URL}/apps/${app}/bundles`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          ...formData.getHeaders(),
        },
      })
    } catch (error) {
      if (error instanceof AxiosError && error.response?.data.message) {
        consola.error(error.response.data.message)
      } else {
        consola.error('Failed to create bundle.')
      }
      return
    }
    consola.success('Bundle successfully created.')
  },
})
