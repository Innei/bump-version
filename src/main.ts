import { precheck } from './core/pre-check.js'
import { promptMain } from './core/prompt.js'

import './utils/error'

// precheck
precheck().then(() => {
  promptMain()
})
