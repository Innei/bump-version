import { promptMain } from './core/prompt.js'
import { precheck } from './utils/pre-check.js'

// precheck
precheck().then(() => {
  promptMain()
})
