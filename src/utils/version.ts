export const nextIdentifierMap = {
  alpha: 'beta',
  beta: 'canary',
  canary: 'rc',
}

export const getIdentifier = (currentVersion: string) => {
  const identifier = currentVersion.match(/\d+\.\d+\.\d+-(.*?)\.\d+/)?.[1]

  return identifier
}

export const getNextIdentifier = (
  currentVersion: string,
  releaseType?: string,
) => {
  const identifier = getIdentifier(currentVersion)

  // if is stable version, the next identifier is undefined
  // otherwise is alpha
  return identifier
    ? nextIdentifierMap[identifier]
    : releaseType.startsWith('pre')
    ? 'alpha'
    : undefined
}
