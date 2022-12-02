# Bump version

Simple Bump version CLI, bump package.json version and generate changlog, running hooks and publish.

<img width="448" alt="image" src="https://user-images.githubusercontent.com/41265413/205250027-59c6d398-5242-45b6-997f-df63ad34aae5.png">

## How to use

```bash
npm i -g @innei/bump-version

vv # or bv, bump, bp
```

## Args

| Args                     | Description                                               | Example            |
| ------------------------ | --------------------------------------------------------- | ------------------ |
| `--dry-run`              | Dry run mode                                              |                    |
| `-f` `--filter`          | Run in special monorepo workspace                         | `-f packages/core` |
| `--alpha` `--prerelease` | Create prerelease version                                 |                    |
| `--tag-prefix`           | Custom git tag prefix, the priority is higher than rcfile |                    |
| `minor`                  | Create minor version                                      |                    |
| `major`                  | Create major version                                      |                    |
| `patch`                  | Create patch version                                      |                    |
| `prepatch`               | Create prepatch version                                   |                    |
| `preminor`               | Create preminor version                                   |                    |
| `premajor`               | Create premajor version                                   |                    |
| `branch`                 | Create version based on git branch (1.2.2-dev-perid.0)    |                    |

## Config

Define in package.json, add field `bump` or create `.bumprc`:

```json
{
  "leading": ["git pull --rebase", "pnpm i", "npm run build"],
  "trailing": ["sh ./scripts/create-tags.sh", "npm publish --access=public"],
  "changelog": true,
  "publish": true
}
```

| Name             | Description                                                                       | Type                                           | Default                    |
| ---------------- | --------------------------------------------------------------------------------- | ---------------------------------------------- | -------------------------- |
| leading          | Run script before change version                                                  | string[]                                       | `[]`                       |
| trailing         | Run script after change version                                                   | string[]                                       | `[]`                       |
| publish          | Publish package after bump                                                        | boolean                                        | false                      |
| tag              | Create git tag after bump                                                         | boolean                                        | true                       |
| push             | Push git commit after bump                                                        | boolean                                        | true                       |
| commit_message   | Commit message for new version tag                                                | string                                         | `release: v${NEW_VERSION}` |
| changelog        | Generate changelog                                                                | boolean \| ChangelogOptions                    | false                      |
| allowed_branches | Allow run bump version on special branch                                          | (RegExp \| string \| AllowedBranchesOptions)[] | `["main", "master"]`       |
| tag-prefix       | Git prefix tag                                                                    | string                                         | `v`                        |
| mode             | Workspace mode                                                                    | `independent` `monorepo`                       | `independent`              |
| packages         | Monorepo mode packages path                                                       | string[]                                       | `[]`                       |
| with_tags        | [Generate next version based on git tags](https://github.com/Innei/bump-version/blob/master/test/utils/version.spec.ts), maybe slowly.                            | boolean                                        | `false`                    |
| remote_tags      | Fetch git remote tags before version generate, only work when `with_tags` enable. | boolean                                        | `true`                     |

### Interface

```ts
type ReleaseType =
  | 'patch'
  | 'minor'
  | 'major'
  | 'premajor'
  | 'preminor'
  | 'prepatch'
  | 'prerelease'

export interface AllowedBranchesOptions {
  name: string
  disallowTypes: ReleaseType[]
  allowTypes: ReleaseType[]
}

/**
 * @see https://github.com/conventional-changelog/conventional-changelog/tree/master/packages/conventional-changelog-core
 */
export type ChangelogOptions = Parameters<typeof conventionalChangelog>[0] & {
  enable: boolean
}
```
