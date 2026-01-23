# Breaking Changes

This is a comprehensive list of the breaking changes introduced in the major version releases.

## Versions

- [Version 4.x.x](#version-4xx)
- [Version 3.x.x](#version-3xx)
- [Version 2.x.x](#version-2xx)

## Version 4.x.x

### Deprecated Bundle Commands

The following bundle commands have been deprecated and will be removed in future versions:

- `apps:bundles:create` - Use `apps:liveupdates:upload` or `apps:liveupdates:register` instead. 
- `apps:bundles:update` - No longer supported.
- `apps:bundles:delete` - No longer supported.

The new commands better separate the concerns of uploading and registering live update artifacts.

**Attention:** The `rollout` parameter is now expressed as a percentage (0-100) and renamed to `rolloutPercentage`.

### Renamed Manifest Command

The `manifests:generate` command has been renamed to `apps:liveupdates:generatemanifest` to better align with the new command structure.

### Removed `--bundle-limit` parameter

The `--bundle-limit` parameter has been removed from the `apps:channels:create` and `apps:channels:update` commands as it is no longer necessary. Channels only support a single active build at a time, making this parameter redundant.

### Minimum Node.js Version

The minimum required Node.js version has been updated to **20.0.0**. Please ensure that your environment meets this requirement before using the CLI. You can still use the CLI with older Node.js versions, but it is no longer officially supported.

### Minimum npm Version

The minimum required npm version has been updated to **10.0.0**. Please ensure that your environment meets this requirement before using the CLI. You can still use the CLI with older npm versions, but it is no longer officially supported.

### JSON Output Behavior

The `--json` flag in the `apps:builds:create` command now displays logs alongside JSON output. Previously, specifying `--json` would suppress all logs and print only JSON. The JSON output is now appended after the logs, which may break scripts that parse the entire output as JSON.

To extract only the JSON output, for example to get the build ID, you can use the following command:

```bash
npx @capawesome/cli apps:builds:create [...] --json | sed -n '/^{/,$p' | jq -r '.id'
```

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
