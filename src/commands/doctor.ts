import { defineCommand } from 'citty';
import consola from 'consola';
import pkg from '../../package.json';
import systeminformation from 'systeminformation'

export default defineCommand({
  meta: {
    name: 'doctor',
    description: 'Prints out neccessary information for debugging',
  },
  run: async () => {
    const osInfo = await systeminformation.osInfo()
    const versions = await systeminformation.versions('npm, node')
    consola.box([
      `NodeJS version: ${versions.node}`,
      `NPM version: ${versions.npm}`,
      `CLI version: ${pkg.version}`,
      `OS: ${osInfo.distro} ${osInfo.release} ${osInfo.codename ? `(${osInfo.codename})` : ''}`
    ].join('\n'))
  },
});
