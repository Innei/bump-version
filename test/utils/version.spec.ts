import { describe, expect, it } from 'vitest'

import { getNextVersionWithTags } from '../../src/utils/version.js'

// prettier-ignore
const tags = [
  '0.1.5',         '0.2.0',         '0.2.2',
  '0.2.3',         '0.2.4',         '0.2.5',
  '0.2.6',         '0.3.0',         '0.3.1',
  '1.0.0',         '1.0.0-alpha.0', '1.0.0-alpha.1',
  '1.0.0-alpha.2', '1.0.0-alpha.3', '1.0.0-alpha.4',
  '1.0.0-alpha.5', '1.0.0-alpha.6', '1.0.0-alpha.7',
  '1.0.0-beta.0',  '1.0.0-beta.1',  '1.0.1',
  '1.0.2',         '1.1.0',         '1.1.1-alpha.0',
  '1.1.1-alpha.1', '1.1.1-alpha.2', '1.2.0',
  '1.2.1',         '1.3.0',         '1.3.0-alpha.0',
  '1.3.1',         '1.3.2',
  '1.3.4',         '1.4.0',         '1.4.0-alpha.0'
]

describe.only('test version utils', () => {
  it('should get the next version major', () => {
    const currentVersion = '0.1.5'
    const result = getNextVersionWithTags({
      currentVersion,
      tags,
      releaseType: 'major',
    })
    expect(result).toBe('2.0.0')
  })

  it('should get the next version patch', () => {
    const currentVersion = '1.3.1'
    const result = getNextVersionWithTags({
      currentVersion,
      tags,
      releaseType: 'patch',
    })
    expect(result).toBe('1.3.5')
  })

  it('should get the next version minor', () => {
    const currentVersion = '0.1.5'
    const result = getNextVersionWithTags({
      currentVersion,
      tags,
      releaseType: 'minor',
    })
    expect(result).toBe('0.4.0')
  })

  it('should get the next version preminor', () => {
    const currentVersion = '0.1.5'
    const result = getNextVersionWithTags({
      currentVersion,
      tags,
      releaseType: 'preminor',
    })
    expect(result).toBe('0.4.0-alpha.0')
  })

  it('should get the next version prepatch', () => {
    const currentVersion = '1.3.1'
    const result = getNextVersionWithTags({
      currentVersion,
      tags,
      releaseType: 'prepatch',
    })
    expect(result).toBe('1.3.5-alpha.0')
  })

  it('should get the next version premajor', () => {
    const currentVersion = '0.1.5'
    const result = getNextVersionWithTags({
      currentVersion,
      tags,
      releaseType: 'premajor',
    })
    expect(result).toBe('2.0.0-alpha.0')
  })

  it('should get the next version prepatch with identifier', () => {
    const currentVersion = '1.3.1-alpha.0'
    const result = getNextVersionWithTags({
      currentVersion,
      tags,
      releaseType: 'prepatch',
    })
    expect(result).toBe('1.3.5-alpha.0')
  })
})
