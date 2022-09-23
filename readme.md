# Bump version

Bump version, change package.json version.

## How to use

```bash
npm i -g @innei/bump-version

vv # or bv, bump, bp
```

## Config

Define in package.json, add field `bump`:

```js
"bump": {
    "before": [
      "git pull --rebase",
      "pnpm i",
      "npm run build"
    ],
    "after": [
      "sh ./scripts/create-tags.sh",
      "npm publish --access=public"
    ]
},
```

| Name             | Description                              | Type                 | Default                    |
| ---------------- | ---------------------------------------- | -------------------- | -------------------------- |
| leading          | Run script before change version         | string[]             | `[]`                       |
| trailing         | Run script after change version          | string[]             | `[]`                       |
| publish          | Publish package after bump               | boolean              | false                      |
| tag              | Create git tag after bump                | boolean              | true                       |
| push             | Push git commit after bump               | boolean              | true                       |
| commit_message   | Commit message for new version tag       | string               | `release: v${NEW_VERSION}` |
| changelog        | Generate changelog                       | boolean              | false                      |
| allowed_branches | Allow run bump version on special branch | (RegExp \| string)[] | `["main", "master"]`       |
