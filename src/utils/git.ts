import { $ } from 'zx'

export const getCurrentGitBranch = async () => {
  const branch = await $`git rev-parse --abbrev-ref HEAD`.quiet()
  const currentBranch = branch.stdout.trim()
  return currentBranch
}

export const isMainBranch = async () => {
  const currentBranch = await getCurrentGitBranch()
  return ['main', 'master'].includes(currentBranch)
}

export const getGitHeadShortHash = async () => {
  const gitHeadHash = await $`git rev-parse --short HEAD`.quiet()
  return gitHeadHash.stdout.trim()
}
