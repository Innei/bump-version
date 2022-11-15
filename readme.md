# Bump version

Bump version, change package.json version.

<img width="508" alt="image" src="https://user-images.githubusercontent.com/41265413/201814822-669fb5f9-35a7-4f4d-a553-9c22a7a264ef.png">

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
| `tag-prefix`             | Custom git tag prefix, the priority is higher than rcfile |                    |
| `minor`                  | Create minor version                                      |                    |
| `major`                  | Create major version                                      |                    |
| `patch`                  | Create patch version                                      |                    |
| `prepatch`               | Create prepatch version                                   |                    |
| `preminor`               | Create preminor version                                   |                    |
| `premajor`               | Create premajor version                                   |                    |

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

| Name             | Description                              | Type                                           | Default                    |
| ---------------- | ---------------------------------------- | ---------------------------------------------- | -------------------------- |
| leading          | Run script before change version         | string[]                                       | `[]`                       |
| trailing         | Run script after change version          | string[]                                       | `[]`                       |
| publish          | Publish package after bump               | boolean                                        | false                      |
| tag              | Create git tag after bump                | boolean                                        | true                       |
| push             | Push git commit after bump               | boolean                                        | true                       |
| commit_message   | Commit message for new version tag       | string                                         | `release: v${NEW_VERSION}` |
| changelog        | Generate changelog                       | boolean                                        | false                      |
| allowed_branches | Allow run bump version on special branch | (RegExp \| string \| AllowedBranchesOptions)[] | `["main", "master"]`       |
| tag-prefix       | Git prefix tag                           | string                                         | `v`                        |
| mode             | Workspace mode                           | `independent` `monorepo`                       | `independent`              |
| packages         | Monorepo mode packages path              | string[]                                       | `[]`                       |

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

```
