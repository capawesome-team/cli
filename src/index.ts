import { defineCommand, runMain } from 'citty'
import pkg from '../package.json'

const main = defineCommand({
  meta: {
    name: pkg.name,
    version: pkg.version,
    description: pkg.description,
  },
  subCommands: {
    whoami: import('./commands/whoami').then((mod) => mod.default),
    login: import('./commands/login').then((mod) => mod.default),
    logout: import('./commands/logout').then((mod) => mod.default),
    deploy: import('./commands/deploy').then((mod) => mod.default),
  }
})

runMain(main)
