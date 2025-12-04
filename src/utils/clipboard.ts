import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Copy text to the system clipboard.
 * Works on macOS, Linux, and Windows.
 *
 * @param text The text to copy to the clipboard.
 */
export const copyToClipboard = async (text: string): Promise<void> => {
  const platform = process.platform;

  try {
    if (platform === 'darwin') {
      // macOS
      await execAsync(`echo "${text.replace(/"/g, '\\"')}" | pbcopy`);
    } else if (platform === 'win32') {
      // Windows
      await execAsync(`echo "${text.replace(/"/g, '\\"')}" | clip`);
    } else {
      // Linux - try xclip first, fall back to xsel
      try {
        await execAsync(`echo "${text.replace(/"/g, '\\"')}" | xclip -selection clipboard`);
      } catch (error) {
        await execAsync(`echo "${text.replace(/"/g, '\\"')}" | xsel --clipboard --input`);
      }
    }
  } catch (error) {
    throw new Error('Failed to copy to clipboard. Make sure clipboard utilities are installed.');
  }
};
