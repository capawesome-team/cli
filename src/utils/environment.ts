/**
 * Detects if the current environment supports interactive prompts.
 *
 * For interactive prompts to work, we need:
 * 1. stdin to be a TTY (to read user input)
 * 2. stdout to be a TTY (to display the prompt)
 * 3. Not running in a CI environment
 *
 * This is more robust than just checking stdout.isTTY (like std-env's hasTTY),
 * because interactive prompts require BOTH input and output TTYs.
 */
export const isInteractive = (): boolean => {
  // Check if both stdin AND stdout are TTYs
  const hasInputTTY = Boolean(process.stdin?.isTTY);
  const hasOutputTTY = Boolean(process.stdout?.isTTY);

  // Check for CI environment
  const isCI = Boolean(process.env.CI);

  // Need BOTH input and output TTY, and not in CI
  return hasInputTTY && hasOutputTTY && !isCI;
};
