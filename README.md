# cli

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

## Changelog

See [CHANGELOG](./CHANGELOG.md).

## License

See [LICENSE](./LICENSE.md).
