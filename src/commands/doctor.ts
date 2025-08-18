import { defineCommand } from '@robingenz/zli';
import consola from 'consola';
import systeminformation from 'systeminformation';
import pkg from '../../package.json' with { type: 'json' };

export default defineCommand({
  description: 'Prints out neccessary information for debugging',
  action: async (options, args) => {
    const osInfo = await systeminformation.osInfo();
    const versions = await systeminformation.versions('npm, node');
    consola.box(
      [
        `NodeJS version: ${versions.node}`,
        `NPM version: ${versions.npm}`,
        `CLI version: ${pkg.version}`,
        `OS: ${osInfo.distro} ${osInfo.release} ${osInfo.codename ? `(${osInfo.codename})` : ''}`,
      ].join('\n'),
    );
  },
});
