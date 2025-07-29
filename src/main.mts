#!/usr/bin/env node
import { chalk } from 'zx'

import { version } from '../package.json'
import { ROOT_WORKSPACE_DIR, WORKSPACE_DIR } from './constants/path.js'
import { precheck } from './core/pre-check.js'
import { promptMain } from './core/prompt.js'
import { resolveArgs } from './core/resolve-args.js'
import { showHelp, showInfo } from './utils/cli-info.js'

process.env.FORCE_COLOR = 3 as any

// @ts-ignore
globalThis.__DEV__ = process.env.NODE_ENV === 'development'

// Handle help and info flags early
const args = resolveArgs()

if (args.help) {
  showHelp()
  process.exit(0)
}

if (args.v) {
  console.info(version)

  process.exit(0)
}
if (args.info) {
  showInfo().then(() => process.exit(0))
} else {
  // precheck
  precheck().then(() => {
    console.info(`Workspace dir: ${chalk.yellow(WORKSPACE_DIR)}`)
    console.info(`Root workspace dir: ${chalk.yellow(ROOT_WORKSPACE_DIR)}`)

    promptMain()
  })
}
