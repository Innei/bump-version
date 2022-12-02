import { $ } from 'zx'
import { log } from 'zx/core'

import { resolveArgs } from './resolve-args.js'

export const dryRun = async (pieces: TemplateStringsArray, ...args: any[]) => {
  const { dryRun } = resolveArgs()
  if (dryRun) {
    let cmd = pieces[0],
      i = 0
    while (i < args.length) {
      let s
      if (Array.isArray(args[i])) {
        s = args[i].map((x) => $.quote(substitute(x))).join(' ')
      } else {
        s = $.quote(substitute(args[i]))
      }
      cmd += s + pieces[++i]
    }

    log({
      kind: 'cmd',
      cmd,
      verbose: true,
    })
    return
  }
  return $(pieces, ...args)
}

function substitute(arg) {
  if (arg?.stdout) {
    return arg.stdout.replace(/\n$/, '')
  }
  return `${arg}`
}
