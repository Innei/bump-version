export const EXIT_CODES = {
  SUCCESS: 0,
  GENERAL_ERROR: 1,
  INVALID_VERSION: -1,
  BRANCH_NOT_ALLOWED: -2,
  MONOREPO_FILTER_ERROR: 3,
} as const

export type ExitCode = (typeof EXIT_CODES)[keyof typeof EXIT_CODES]
