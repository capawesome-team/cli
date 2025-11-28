# cli

[![npm version](https://img.shields.io/npm/v/@capawesome/cli)](https://www.npmjs.com/package/@capawesome/cli)
[![npm downloads](https://img.shields.io/npm/dm/@capawesome/cli)](https://www.npmjs.com/package/@capawesome/cli)
[![license](https://img.shields.io/npm/l/@capawesome/cli)](https://github.com/capawesome-team/cli/blob/main/LICENSE)

💻 The Capawesome Cloud Command Line Interface (CLI) can be used to manage [Live Updates](https://capawesome.io/cloud/) from the command line.

## Installation

The Capawesome Cloud CLI can be installed globally via npm:

```bash
npm install -g @capawesome/cli
```

## Usage

The Capawesome Cloud CLI can be invoked with the `@capawesome/cli` command.

```bash
npx @capawesome/cli <command> [options]
```

You can find a list of available commands in the [Command Reference](https://capawesome.io/cloud/cli/).

## Help

The Capawesome Cloud CLI ships with command documentation that is accessible with the `--help` flag.

```bash
npx @capawesome/cli --help
```

## Development

### Getting Started

Run the following commands to get started with development:

1. Clone the repository:

    ```bash
    git clone https://github.com/capawesome-team/cli.git
    ```

2. Install dependencies:

    ```bash
    npm install
    ```

3. Copy the `.capawesomerc.example` file to `.capawesomerc`
4. Run your first command:

    ```bash
    npm start -- --help
    ```

    **Note:** The `--` is required to pass arguments to the script.

### Testing Proxy Support

To test HTTP/HTTPS proxy functionality locally:

1. Start Squid proxy in a separate terminal:
    ```bash
    docker run --rm --name squid-proxy -p 3128:3128 -v $(pwd)/squid.conf:/etc/squid/squid.conf:ro sameersbn/squid:latest
    ```

2. Set proxy environment variables and run the CLI:
    ```bash
    export https_proxy=http://localhost:3128
    npm run build && node ./dist/index.js login
    ```

3. To see debug output:
    ```bash
    DEBUG=https-proxy-agent node ./dist/index.js login
    ```

## Changelog

See [CHANGELOG](./CHANGELOG.md).

## License

See [LICENSE](./LICENSE.md).
