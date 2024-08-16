import { defineConfig } from './src/index.mjs'

export default defineConfig({
  leading: ['git pull --rebase', 'pnpm i', 'npm run build'],
  trailing: [],
  publish: true,
  changelog: false,
  mode: 'independent',
  allowedBranches: ['dev/*', 'master', 'main'],
})
