import { defineConfig } from './src/index.mjs'

export default defineConfig({
  leading: ['git pull --rebase', 'pnpm i', 'npm run build'],
  trailing: [
    "gh pr create --title 'chore: Release v${NEW_VERSION}' --body 'v${NEW_VERSION}' --base main --head dev",
  ],
  publish: true,
  changelog: false,
  mode: 'independent',
  allowedBranches: ['dev/*', 'master', 'main'],
})
