# Breaking Changes

This is a comprehensive list of the breaking changes introduced in the major version releases.

## Versions

- [Version 2.x.x](#version-2xx)

## Version 2.x.x

### CLI Name

You should now call the CLI using `@capawesome/cli` instead of just `capawesome`.

```diff
- npx capawesome --help
+ npx @capawesome/cli --help
```

This change ensures that the CLI is properly namespaced and avoids potential conflicts with other packages.

### Minimum Node.js Version

The minimum required Node.js version has been updated to 16.x.x. Please ensure that your environment meets this requirement before using the CLI. You can still use the CLI with older Node.js versions, but it is no longer officially supported.

### Minimum npm Version

The minimum required npm version has been updated to 8.x.x. Please ensure that your environment meets this requirement before using the CLI. You can still use the CLI with older npm versions, but it is no longer officially supported.
