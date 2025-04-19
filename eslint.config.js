// @ts-check

import { defineConfig } from 'eslint-config-hyoban'

export default defineConfig(
  {
    formatting: false,
    lessOpinionated: true,
    ignores: [],
    preferESM: true,
    tailwindCSS: false,
  },
  {
    rules: {
      'unicorn/no-process-exit': 'off',
    },
  },
)
