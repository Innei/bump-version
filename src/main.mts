#!/usr/bin/env node
import { chalk } from 'zx'

import { ROOT_WORKSPACE_DIR, WORKSPACE_DIR } from './constants/path.js'
import { precheck } from './core/pre-check.js'
import { promptMain } from './core/prompt.js'

// import './utils/error.js'

process.env.FORCE_COLOR = 3 as any

// @ts-ignore
globalThis.__DEV__ = process.env.NODE_ENV === 'development'

// precheck
precheck().then(() => {
  console.info(`Workspace dir: ${chalk.yellow(WORKSPACE_DIR)}`)
  console.info(`Root workspace dir: ${chalk.yellow(ROOT_WORKSPACE_DIR)}`)

  promptMain()
})
