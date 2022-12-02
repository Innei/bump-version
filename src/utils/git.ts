import SemVer from 'semver'
import slugify from 'slugify'
import { $ } from 'zx'

import { dryRun } from './run.js'

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

export const getBranchVersion = async (currentVersion: string) => {
  const branchName = await getCurrentGitBranch()
  const slugifyTagName = slugify.default(branchName.replace(/\//g, '-'))

  const branchVersion = SemVer.inc(currentVersion, 'prerelease', slugifyTagName)

  return {
    branchVersion,
    slugifyTagName,
    branchName,
  }
}

export const gitPushWithUpstream = async (branchName?: string) => {
  branchName = branchName || (await getCurrentGitBranch())
  const hasUpstream = (
    await $`git rev-parse --abbrev-ref --symbolic-full-name @{u}`
      .quiet()
      .nothrow()
  ).stdout.trim()

  if (!hasUpstream) {
    await dryRun`git push -u origin ${branchName}`
  } else {
    await dryRun`git push`
  }
}
