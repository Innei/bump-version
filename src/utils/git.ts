import SemVer from 'semver'
import slugify from 'slugify'

import colors from 'picocolors'

import { dryRun } from '../core/dry-run.js'
import { $ } from 'execa'

export const getCurrentGitBranch = async () => {
  const branch = await $`git rev-parse --abbrev-ref HEAD`
  const currentBranch = branch.stdout.trim()
  return currentBranch
}

export const isMainBranch = async () => {
  const currentBranch = await getCurrentGitBranch()
  return ['main', 'master'].includes(currentBranch)
}

export const getGitHeadShortHash = async () => {
  const gitHeadHash = await $`git rev-parse --short HEAD`
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
  let hasUpstream = ''
  try {
    hasUpstream = (
      await $`git rev-parse --abbrev-ref --symbolic-full-name @{u}`
    ).stdout.trim()
  } catch (e) {
    // no upstream
  }

  if (!hasUpstream) {
    await dryRun`git push -u origin ${branchName}`
  } else {
    await dryRun`git push`
  }
}

/**
 *
 * @returns ['1.0.0', '1.2.3', '1.2.4', '1.2.5-0']
 */
export const getGitSemVerTags = async () => {
  let pipe = ''
  try {
    pipe = (await $`git tag | cat | grep -s "v"`).stdout.trim()
  } catch (e) {
    // no tags
  }

  if (!pipe) {
    return []
  }
  return pipe
    .trim()
    .split('\n')
    .map((tag) => tag.trim().slice(1))
    .filter((tag) => SemVer.valid(tag))
}

export const fetchGitRemoteTags = async () => {
  console.log(colors.green(`Fetching git remote tags...`))
  await $`git fetch --tags`
}

export const getLatestGitTag = async () => {
  let stdout = ''
  try {
    stdout = (await $`git describe --abbrev=0 --tags`).stdout.trim()
  } catch (e) {
    // no tags
  }
  return stdout
}

export const hasCommitBeforeTag = async (tagName: string) => {
  let stdout = ''
  try {
    stdout = (await $`git rev-list -n 1 ${tagName}`).stdout.trim()
  } catch (e) {
    // no tags
  }
  return !!stdout
}
