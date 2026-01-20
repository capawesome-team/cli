# Breaking Changes

This is a comprehensive list of the breaking changes introduced in the major version releases.

## Versions

- [Version 4.x.x](#version-4xx)
- [Version 3.x.x](#version-3xx)
- [Version 2.x.x](#version-2xx)

## Version 4.x.x

### Removed `--bundle-limit` parameter

The `--bundle-limit` parameter has been removed from the `apps:channels:create` command as it is no longer necessary. Channels only support a single active build at a time, making this parameter redundant.

## Version 3.x.x

### Unsupported Options

The CLI will now throw an error if you use an unsupported option. This change helps to ensure that users are aware of deprecated or invalid options and encourages the use of supported features.

## Version 2.x.x

### CLI Name

You should now call the CLI using `@capawesome/cli` instead of just `capawesome`.

```diff
- npx capawesome --help
+ npx @capawesome/cli --help
```

This change ensures that the CLI is properly namespaced and avoids potential conflicts with other packages.

### Minimum Node.js Version

The minimum required Node.js version has been updated to **18.0.0**. Please ensure that your environment meets this requirement before using the CLI. You can still use the CLI with older Node.js versions, but it is no longer officially supported.

### Minimum npm Version

The minimum required npm version has been updated to **8.0.0**. Please ensure that your environment meets this requirement before using the CLI. You can still use the CLI with older npm versions, but it is no longer officially supported.
