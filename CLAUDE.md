# Capawesome CLI

The Capawesome Cloud Command Line Interface (CLI) can be used to manage Live Updates from the command line.

## Your role

Your role is to write or review code, provide constructive feedback, and help maintain the quality of the codebase.

Don't be shy to asked questions -- I'm here to help you!

If i send you a URL, you MUST immediately fetch it's content and read it carefully, before your do anything else.

## Plan Mode

- Make the plan extremely concise. Sacrifice grammar for the sake of conciseness.
- At the end of each plan, give me a list of unresolved questions to answer, if any.

## Dependencies

This project uses the following dependencies, among others:

- Axios
- Node.js
- TypeScript
- Zod

## Project Structure

This project is structured as follows:

```
.
├── dist - Compiled output files.
├── src
│   ├── commands - CLI command implementations.
│   ├── config - Configuration files and utilities.
│   ├── services - Services for interacting with external APIs and databases.
│   ├── types - Type definitions for the application.
|   ├── utils - Utility functions and helpers.
│   └── index.test.ts - Tests for the entry point.
│   └── index.ts - Entry point of the application.
├── package.json - Project metadata and dependencies.
├── README.md - Project documentation.
├── tsconfig.json - TypeScript configuration file.
└── vitest.config.ts - Vite configuration file.
```

## Best Practices

- **Early Returns**: Use to avoid nested conditions.
- **Descriptive Names** : Use clear property/method names (e.g. prefix handlers with "handle").
- **DRY Code**: Avoid code duplication by using services and utility functions.
- **Keep changes minimal**: When making changes, try to keep them as minimal as possible to avoid introducing bugs.
- **Simplicity**: Keep code simple and readable.

## Philosophy

- **Simplicity**: Write simple, straightforward code.
- **Readability**: Write code that is easy to read and understand.
- **Performance**: Optimize for performance where necessary, but not at the cost of readability.
- **Maintainability**: Write code that is easy to maintain and extend.
- **Reusability**: Write reusable services and utilities.
- **Less is more**: Avoid unnecessary complexity and minimize the code footprint.

## Pull Request

If you have to create a pull request (PR) with your changes, please follow these guidelines:

- **Title**: Use conventional commit messages for your PR title. For example, `feat: add new feature`, `fix: correct a bug`, or `docs: update documentation`.
- **Close related issues**: If your PR addresses an issue, please close it in the description by adding `Close #issue_number`.
