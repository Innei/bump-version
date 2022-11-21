#!/usr/bin/env node
import { precheck } from './core/pre-check.js'
import { promptMain } from './core/prompt.js'

import './utils/error.js'

process.env.FORCE_COLOR = 3 as any

// @ts-ignore
globalThis.__DEV__ = process.env.NODE_ENV === 'development'

// precheck
precheck().then(() => {
  promptMain()
})
