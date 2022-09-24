import { render } from '@temir/core'
import { precheck } from './utils/pre-check.js'

import App from './views/App.vue'

// precheck
precheck().then(() => {
  render(App)
})
