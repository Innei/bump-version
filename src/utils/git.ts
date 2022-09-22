import { $ } from 'zx'

export const getCurrentGitBranch = async () => {
  const branch = await $`git rev-parse --abbrev-ref HEAD`
  const currentBranch = branch.stdout.trim()
  return currentBranch
}
