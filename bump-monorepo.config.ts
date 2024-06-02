export default {
  leading: ['git pull --rebase', 'pnpm i', 'npm run build'],
  trailing: [],
  publish: true,
  changelog: true,
  mode: 'monorepo',
  allowed_branches: ['dev/*', 'master', 'main'],
  packages: ['test/packages/**'],
}
