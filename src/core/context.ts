import type { ReleaseType } from 'semver'

export const context = {
  currentVersion: '',
  selectedVersion: '',
  selectedReleaseType: '' as Exclude<ReleaseType, 'release'> | 'branch',
  selectedPreid: '',
}
