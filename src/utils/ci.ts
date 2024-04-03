export const isRunningInCi = (): boolean => {
  return process.env.CI === 'true'
}
