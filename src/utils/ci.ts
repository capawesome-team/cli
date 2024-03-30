export const isRunningInGithubActions = (): boolean => {
  return process.env.GITHUB_ACTIONS === 'true'
}
