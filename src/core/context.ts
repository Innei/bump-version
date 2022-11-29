import type { ReleaseType } from 'semver'

export const context = {
  currentVersion: '',
  selectedVersion: '',
  selectedReleaseType: '' as ReleaseType | 'branch',
  selectedPried: '',
}
