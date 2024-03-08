# [New] Bump version

A small command line tool to simplify releasing software by updating all version strings in your source code by the correct increment. Out of box, UI friendly and configure easily. And with other features:

- [Hooks support](#hooks)
- [Changelog support](#attach-changelog)
- [Whitelist or Blacklist branch](#whitelist-or-blacklist-branch)
- [Git tag mode](#git-tag-mode)

<img width="448" alt="image" src="https://user-images.githubusercontent.com/41265413/205250027-59c6d398-5242-45b6-997f-df63ad34aae5.png">

## Install

```bash
npm i -g nbump
```

## Usage

```bash
vv # or bump
vv alpha # bump to next prerelease version, other args please see below.
```

## Feature

### Hooks

There are two kind of hooks supported.

1. leading hook, this hook will run before package json version updated.
2. trailing hook, run after updated of course.

E.g.

```json
{
  "leading": ["git pull --rebase", "pnpm i"],
  "trailing": ["npm run build"]
}
```

### Attach Changelog

Auto detect changelog file location, and regenerate after update package version.

To enable it.

```json
{
  "changelog": true
}
```

### Whitelist or Blacklist branch

The bump version allows you ban special branch run it, such as you don't want to be contaminated other branches which is not main branch. In main branch, you just allow publish stable version, but ban unstable version. Oppositely, dev branch not allow to publish stable version just unstable. It's ok. Just write configuration as below.

```json
{
  "allowed_branches": [
    "main",
    {
      "name": "dev/*",
      "allow_types": ["premajor", "preminor", "prepatch", "prerelease"]
    }
  ]
}
```

### Git Tag Mode

If the project maintains by a team and other developers can publish their own unstable version, the publish action will create a git tag based on new version. So, if another developer bump version at same time, he will got a conflict error because of git tag is exist on remote repository.

For example, if Developer A and Developer B checkout two private branches from the master branch and fix a bug that requires release new version. At this point, the projects are both at version 1.0.0, and A has created a Git Tag 1.0.0-alpha.0 on the private branch and pushed it to the remote repository, while B has also created a Git Tag 1.0.0-alpha.0 on the private branch, and there is a conflict.

So, the tool provide git tag mode, it can fetch remote git tags, and gerenate the correct version according to the git tags (or remote) sequence, and no conflicting tags are generated.

To enable it.

```json
{
  "with_tags": true,
  "remote_tags": true
}
```

Now if your local or remote tags has tag `1.0.1`, but project current version is `1.0.0`, so the next patch version will be generate as `1.0.2`.

Another example, if remote tags has tag `1.2.0` `1.3.0`, project current version is `1.1.0`, the next minor version is `1.2.0` theoretically, but if you enable this feature, it will generate a non-conflicting version as `1.4.0`.

Other information, please see the [test suit](https://github.com/Innei/bump-version/blob/master/test/utils/version.spec.ts).

## Args

This is args passed in cli command. e.g. `vv --dry-run`.

| Args                     | Description                                                 | Example            |
| ------------------------ | ----------------------------------------------------------- | ------------------ |
| `--dry-run`              | Dry run mode                                                |                    |
| `-f` `--filter`          | Run in special monorepo workspace                           | `-f packages/core` |
| `--alpha` `--prerelease` | Create prerelease version                                   |                    |
| `--tag-prefix`           | Custom git tag prefix, the priority is higher than rcfile   |                    |
| `--no-verify`            | Force bump version, no verify allowed branches or disallow. |                    |
| `minor`                  | Create minor version                                        |                    |
| `major`                  | Create major version                                        |                    |
| `patch`                  | Create patch version                                        |                    |
| `prepatch`               | Create prepatch version                                     |                    |
| `preminor`               | Create preminor version                                     |                    |
| `premajor`               | Create premajor version                                     |                    |
| `branch`                 | Create version based on git branch (1.2.2-dev-perid.0)      |                    |

## Configuration

Define in package.json, add field `bump` or create `.bumprc` in root dir:

There is a example configuration.

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
| with_tags        | Generate next version based on git tags, maybe slowly.                            | boolean                                        | `false`                    |
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

## License

2022 © Innei, Released under the MIT License.

> [Personal Website](https://innei.in/) · GitHub [@Innei](https://github.com/innei/)
