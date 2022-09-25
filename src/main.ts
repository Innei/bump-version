import { precheck } from './core/pre-check.js'
import { promptMain } from './core/prompt.js'

import './utils/error'

// @ts-ignore
globalThis.__DEV__ = process.env.NODE_ENV === 'development'

// precheck
precheck().then(() => {
  promptMain()
})
