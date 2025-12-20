# Changelog

All notable changes to this project will be documented in this file. See [commit-and-tag-version](https://github.com/absolute-version/commit-and-tag-version) for commit guidelines.

## [3.9.0](https://github.com/capawesome-team/cli/compare/v3.8.0...v3.9.0) (2025-12-20)


### Features

* **apps:builds:create:** add `--stack` option ([#106](https://github.com/capawesome-team/cli/issues/106)) ([1b2fa91](https://github.com/capawesome-team/cli/commit/1b2fa9154305b4f73ca3253a84f131ff8fc74263))

## [3.8.0](https://github.com/capawesome-team/cli/compare/v3.7.0...v3.8.0) (2025-12-04)


### Features

* **apps:bundles:create:** auto-detect app ID and web assets directory ([#102](https://github.com/capawesome-team/cli/issues/102)) ([0e60df6](https://github.com/capawesome-team/cli/commit/0e60df66fcbe1effcb406b24e5a751a21badfa9d))
* **apps:bundles:create:** print warning if private key is missing ([ae29ad9](https://github.com/capawesome-team/cli/commit/ae29ad96ba85db353c81b85be2bee4c6ac928dc0))


### Bug Fixes

* update error message to guide users to login first ([e5ea710](https://github.com/capawesome-team/cli/commit/e5ea710208df82d918e6f191d256d377569350f8))

## [3.7.0](https://github.com/capawesome-team/cli/compare/v3.6.0...v3.7.0) (2025-12-02)


### Features

* **apps:builds:create:** add JSON output option ([#101](https://github.com/capawesome-team/cli/issues/101)) ([32797f9](https://github.com/capawesome-team/cli/commit/32797f93229848fc23565e89f245772e3e509500))

## [3.6.0](https://github.com/capawesome-team/cli/compare/v3.5.0...v3.6.0) (2025-11-29)


### Features

* add proxy support for HTTP and HTTPS requests ([#99](https://github.com/capawesome-team/cli/issues/99)) ([5a6e627](https://github.com/capawesome-team/cli/commit/5a6e627a85634628ea9c365d4e7b25cc69fbe11d))

## [3.5.0](https://github.com/capawesome-team/cli/compare/v3.4.2...v3.5.0) (2025-11-24)


### Features

* add `apps:builds:download` command ([#98](https://github.com/capawesome-team/cli/issues/98)) ([5f9ba10](https://github.com/capawesome-team/cli/commit/5f9ba1068afc835aacb2e6a356abbc90d7ebd70c))
* add `apps:builds:logs` command ([#96](https://github.com/capawesome-team/cli/issues/96)) ([30ebd7e](https://github.com/capawesome-team/cli/commit/30ebd7e0159c53772f8ab80a9757e8ed957036ba))
* add `apps:deployments:logs` command ([#97](https://github.com/capawesome-team/cli/issues/97)) ([9c91fd1](https://github.com/capawesome-team/cli/commit/9c91fd1ca6d3e6a31465e0671ced534f1f5fa138))

## [3.4.2](https://github.com/capawesome-team/cli/compare/v3.4.1...v3.4.2) (2025-11-22)

## [3.4.1](https://github.com/capawesome-team/cli/compare/v3.4.0...v3.4.1) (2025-11-20)

## [3.4.0](https://github.com/capawesome-team/cli/compare/v3.3.0...v3.4.0) (2025-11-19)


### Features

* support builds and deployments ([#89](https://github.com/capawesome-team/cli/issues/89)) ([71be7b0](https://github.com/capawesome-team/cli/commit/71be7b0b69c59bd5d7e123fe37b30044a47f7afc))

## [3.3.0](https://github.com/capawesome-team/cli/compare/v3.2.2...v3.3.0) (2025-10-03)


### Features

* **apps:bundles:create:** add `--android-eq` and `--ios-eq` options ([#87](https://github.com/capawesome-team/cli/issues/87)) ([ca6c9f1](https://github.com/capawesome-team/cli/commit/ca6c9f11e37ef1dc4d636e660bc0f4227b469710))

## [3.2.2](https://github.com/capawesome-team/cli/compare/v3.2.1...v3.2.2) (2025-09-29)


### Bug Fixes

* check for interactive terminal interface before prompt ([#86](https://github.com/capawesome-team/cli/issues/86)) ([ed8b6b0](https://github.com/capawesome-team/cli/commit/ed8b6b07d5ddedb10541472cf769176095c24645)), closes [#85](https://github.com/capawesome-team/cli/issues/85)

## [3.2.1](https://github.com/capawesome-team/cli/compare/v3.2.0...v3.2.1) (2025-09-26)


### Bug Fixes

* add missing CI checks ([#84](https://github.com/capawesome-team/cli/issues/84)) ([617e89c](https://github.com/capawesome-team/cli/commit/617e89c6b69c907573b61b5e685a2f05cdab2d62))
* **apps:bundles:create:** add CI check for channel prompt ([5d89cff](https://github.com/capawesome-team/cli/commit/5d89cffad756b6d5b9017c8797dc8c2e8cd2d5f8))
* **apps:bundles:create:** add CI checks for path and app ID prompts ([e96f567](https://github.com/capawesome-team/cli/commit/e96f5674293a01a8d87eb293dffdf06b4a59f43f))

## [3.2.0](https://github.com/capawesome-team/cli/compare/v3.1.0...v3.2.0) (2025-09-21)


### Features

* **apps:channels:create:** add `--expires-in-days` option ([#69](https://github.com/capawesome-team/cli/issues/69)) ([ef2dd36](https://github.com/capawesome-team/cli/commit/ef2dd3638653e35a3ee3390ad336f39d368cd7ca))


### Bug Fixes

* **apps:bundles:create:** add error handling for invalid path types ([1fae8c6](https://github.com/capawesome-team/cli/commit/1fae8c6a831bdc0f5bb1e80f2dea4fa3a981e625))

## [3.1.0](https://github.com/capawesome-team/cli/compare/v3.0.0...v3.1.0) (2025-09-17)


### Features

* **login:** provide token creation info ([37bb72d](https://github.com/capawesome-team/cli/commit/37bb72da29036daf9cabcc761a8edb811bc6e50a))


### Bug Fixes

* **utils:** remove 403 status message ([#82](https://github.com/capawesome-team/cli/issues/82)) ([c1637d3](https://github.com/capawesome-team/cli/commit/c1637d33dd30e3940e99a2523d137ff2228b710b))

## [3.0.0](https://github.com/capawesome-team/cli/compare/v2.1.5...v3.0.0) (2025-09-11)


### ⚠ BREAKING CHANGES

* An error is now thrown when an unsupported option is used.

### Features

* throw error if option is unknown ([#80](https://github.com/capawesome-team/cli/issues/80)) ([faf5dfc](https://github.com/capawesome-team/cli/commit/faf5dfc6c5765a1a2fefb7b9f0ee57e76f463b85)), closes [#79](https://github.com/capawesome-team/cli/issues/79)

## [2.1.5](https://github.com/capawesome-team/cli/compare/v2.1.4...v2.1.5) (2025-09-08)


### Bug Fixes

* **error:** improve network error handling ([500ed94](https://github.com/capawesome-team/cli/commit/500ed94eff85538531e1a16906a33f4af6437998))
* **login:** throw error in CI if not token was provided ([#78](https://github.com/capawesome-team/cli/issues/78)) ([eda17c6](https://github.com/capawesome-team/cli/commit/eda17c691d807d1a4e76d83e91790f729c42385d))

## [2.1.4](https://github.com/capawesome-team/cli/compare/v2.1.3...v2.1.4) (2025-08-31)


### Bug Fixes

* `Unexpected token 'with'`error on Windows ([#75](https://github.com/capawesome-team/cli/issues/75)) ([1f20e43](https://github.com/capawesome-team/cli/commit/1f20e4318add70a7919468ddd9ad7742306b3e64))

## [2.1.3](https://github.com/capawesome-team/cli/compare/v2.1.2...v2.1.3) (2025-08-28)


### Bug Fixes

* capture only the first argument ([99d3892](https://github.com/capawesome-team/cli/commit/99d3892b99727ac95d3511da6c3dbfd39bad4ee4))
* do not capture validation errors ([a8b89bc](https://github.com/capawesome-team/cli/commit/a8b89bcae7b9b2698857507a8ef030a6b443d711))

## [2.1.2](https://github.com/capawesome-team/cli/compare/v2.1.1...v2.1.2) (2025-08-27)


### Bug Fixes

* remove deprecation warning ([5d8c2c0](https://github.com/capawesome-team/cli/commit/5d8c2c0b494d1c791bd2f02766202ab38321e48c))

## [2.1.1](https://github.com/capawesome-team/cli/compare/v2.1.0...v2.1.1) (2025-08-26)

## [2.1.0](https://github.com/capawesome-team/cli/compare/v2.0.3...v2.1.0) (2025-08-26)


### Features

* retry failed http requests if status code is `5xx` ([4a2399f](https://github.com/capawesome-team/cli/commit/4a2399f8219edd35d4a5a6f79e3f4c5e15fa8659)), closes [#67](https://github.com/capawesome-team/cli/issues/67)

## [2.0.3](https://github.com/capawesome-team/cli/compare/v2.0.2...v2.0.3) (2025-08-26)


### Bug Fixes

* `--version` was no longer supported ([526819b](https://github.com/capawesome-team/cli/commit/526819bebb2e5296380183fa4ec331b364376718))
* do not capture HTTP errors ([83f93e2](https://github.com/capawesome-team/cli/commit/83f93e21fc706e3245f349891e76501385dea03b))

## [2.0.2](https://github.com/capawesome-team/cli/compare/v2.0.1...v2.0.2) (2025-08-24)


### Bug Fixes

* improve error messages for 500 and 503 status codes ([769ee5d](https://github.com/capawesome-team/cli/commit/769ee5dbd6535b7b58f516165bc02dbe9c40c531))

## [2.0.1](https://github.com/capawesome-team/cli/compare/v2.0.0...v2.0.1) (2025-08-24)


### Bug Fixes

* do not capture CLI errors ([0eacbab](https://github.com/capawesome-team/cli/commit/0eacbab054b314ce953493e9fe71a17e872d1066))

## [2.0.0](https://github.com/capawesome-team/cli/compare/v1.14.0...v2.0.0) (2025-08-23)


### ⚠ BREAKING CHANGES

* You should now call the CLI using `@capawesome/cli` instead of just `capawesome` (see `BREAKING.md`).
* set npm minimum version to `8.0.0` (see `BREAKING.md`)
* set Node.js minimum version to `18.0.0` (see `BREAKING.md`)

* deprecate `capawesome` command ([d59ea30](https://github.com/capawesome-team/cli/commit/d59ea305b7bb873071162b2ef896fc2f87b7ea21))
* set Node.js minimum version to `18.0.0` ([396688c](https://github.com/capawesome-team/cli/commit/396688c96b69131dc0433e79af2d79eca19ee7fe))
* set npm minimum version to `8.0.0` ([8c382fa](https://github.com/capawesome-team/cli/commit/8c382fab37c53b0df8d7efc18e6a0efbb45e1c39))


### Features

* add `organizations:create` command ([a3b5855](https://github.com/capawesome-team/cli/commit/a3b5855a84f0c58cc0463b40c9965811837d92bb))
* add link to report bugs ([#64](https://github.com/capawesome-team/cli/issues/64)) ([9eb95b2](https://github.com/capawesome-team/cli/commit/9eb95b2d1e8b47cb0f13f26aae6cccb50ec401e0)), closes [#56](https://github.com/capawesome-team/cli/issues/56)
* **apps:bundles:create:** support private key as plain text or file path ([#62](https://github.com/capawesome-team/cli/issues/62)) ([1db77a2](https://github.com/capawesome-team/cli/commit/1db77a2aa665f8f28e459598112a37e22c391944)), closes [#25](https://github.com/capawesome-team/cli/issues/25)


### Bug Fixes

* add missing authorization token checks to commands ([6699b1e](https://github.com/capawesome-team/cli/commit/6699b1e6993cc8f4ff5cdcd5ebef64de53a93b0e))
* handle private keys without line breaks ([#66](https://github.com/capawesome-team/cli/issues/66)) ([d1b8d2f](https://github.com/capawesome-team/cli/commit/d1b8d2f69e64b9c97d0117a305e9bca0ec158d4f)), closes [#30](https://github.com/capawesome-team/cli/issues/30)
* **utils:** add error message for 403 status ([6922448](https://github.com/capawesome-team/cli/commit/69224483114190ff0b81e0dcfeb656e7ea208f54))

## [1.14.0](https://github.com/capawesome-team/cli/compare/v1.13.2...v1.14.0) (2025-08-11)


### Features

* support multiple organizations ([#58](https://github.com/capawesome-team/cli/issues/58)) ([09cc225](https://github.com/capawesome-team/cli/commit/09cc2258d4b6a2a619651166a1ac290baa7a3b67))

## [1.13.2](https://github.com/capawesome-team/cli/compare/v1.13.1...v1.13.2) (2025-07-28)


### Bug Fixes

* do not print empty error messages ([f6a65c5](https://github.com/capawesome-team/cli/commit/f6a65c530c8f30230991190fc18928fb4e648052))

## [1.13.1](https://github.com/capawesome-team/cli/compare/v1.13.0...v1.13.1) (2025-06-02)


### Bug Fixes

* ES Module error ([bfe5f83](https://github.com/capawesome-team/cli/commit/bfe5f83c172386c84c8a58a3d7da71e63d664f65))

## [1.13.0](https://github.com/capawesome-team/cli/compare/v1.12.0...v1.13.0) (2025-06-01)


### Features

* support for uploading bundles with more than 100 mb ([#52](https://github.com/capawesome-team/cli/issues/52)) ([788b70b](https://github.com/capawesome-team/cli/commit/788b70b71258f57537a8284ce9c5fc93be81443b))

## [1.12.0](https://github.com/capawesome-team/cli/compare/v1.11.1...v1.12.0) (2025-05-22)


### Features

* add `apps:channels:list` command ([87234f2](https://github.com/capawesome-team/cli/commit/87234f28b8daf487f7f06c2b87060499596025e2))

## [1.11.1](https://github.com/capawesome-team/cli/compare/v1.11.0...v1.11.1) (2025-05-05)


### Bug Fixes

* `File must be a File object` error ([bd154a3](https://github.com/capawesome-team/cli/commit/bd154a3d418093b471d58830a7ab2e150b7d33c3))

## [1.11.0](https://github.com/capawesome-team/cli/compare/v1.10.0...v1.11.0) (2025-05-04)


### Features

* add `apps:channels:get` command ([308a68d](https://github.com/capawesome-team/cli/commit/308a68d47492a554e8d56d61b29cde1c7bee1ff7))

## [1.10.0](https://github.com/capawesome-team/cli/compare/v1.9.0...v1.10.0) (2025-05-02)


### Features

* **apps:channels:** add update channel command ([8e93c85](https://github.com/capawesome-team/cli/commit/8e93c851e8b868cb608432dd76c52f149838e6b7))

## [1.9.0](https://github.com/capawesome-team/cli/compare/v1.8.1...v1.9.0) (2025-04-17)


### Features

* add `--ignore-errors` option to `apps:channels:create` command ([#48](https://github.com/capawesome-team/cli/issues/48)) ([3bfb65e](https://github.com/capawesome-team/cli/commit/3bfb65e3c6f9915a6a67b31525b1737497408d59))
* add `--name` option to `apps:channels:create` ([#46](https://github.com/capawesome-team/cli/issues/46)) ([d6190b7](https://github.com/capawesome-team/cli/commit/d6190b7c9617a0d197d062aa21d01fe26d6e172f))
* add support for `CAPAWESOME_CLOUD_TOKEN` env variable ([5a8de4c](https://github.com/capawesome-team/cli/commit/5a8de4c9230112e71f74ee72888a86de18d67be7)), closes [#28](https://github.com/capawesome-team/cli/issues/28)


### Bug Fixes

* `apps:bundles:create` command should always ask for a channel ([#47](https://github.com/capawesome-team/cli/issues/47)) ([fcd97a3](https://github.com/capawesome-team/cli/commit/fcd97a38a64599a8013da94e2f4ef3cdf2b641e5))
* **apps:channels:delete:** skip prompt in CI environment ([c455e15](https://github.com/capawesome-team/cli/commit/c455e15b711706a9422fc18fbec142f5fe86776d))

## [1.8.1](https://github.com/capawesome-team/cli/compare/v1.8.0...v1.8.1) (2025-04-07)


### Bug Fixes

* `login` command throws ES Module error ([#41](https://github.com/capawesome-team/cli/issues/41)) ([ed36738](https://github.com/capawesome-team/cli/commit/ed36738a4eac38729bf3f1971d4f7ecda7bfaa40)), closes [#40](https://github.com/capawesome-team/cli/issues/40) [/github.com/sindresorhus/open/issues/340#issuecomment-2410444952](https://github.com/capawesome-team//github.com/sindresorhus/open/issues/340/issues/issuecomment-2410444952)

## [1.8.0](https://github.com/capawesome-team/cli/compare/v1.7.0...v1.8.0) (2025-04-06)


### Features

* login via browser ([#39](https://github.com/capawesome-team/cli/issues/39)) ([814f0e4](https://github.com/capawesome-team/cli/commit/814f0e4875e6ce0a21fd655cfa3c57b50fa5146a)), closes [#32](https://github.com/capawesome-team/cli/issues/32)


### Bug Fixes

* improved error handling ([9f12894](https://github.com/capawesome-team/cli/commit/9f128941d1a8576034712cadea22da62313fa90c))

## [1.7.0](https://github.com/capawesome-team/cli/compare/v1.6.3...v1.7.0) (2025-03-24)


### Features

* **doctor:** add doctor command ([#37](https://github.com/capawesome-team/cli/issues/37)) ([1d9d0ac](https://github.com/capawesome-team/cli/commit/1d9d0acf74b1b3ce63c87031a8499227bf3e3f8b))

## [1.6.3](https://github.com/capawesome-team/cli/compare/v1.6.2...v1.6.3) (2025-03-20)


### Bug Fixes

* **apps:bundles:create:** handle backslashes on WIndows ([8754f93](https://github.com/capawesome-team/cli/commit/8754f9306e25ff466ec14ba817781f5cad2b4634))

## [1.6.2](https://github.com/capawesome-team/cli/compare/v1.6.1...v1.6.2) (2025-03-18)


### Bug Fixes

* invalid hrefs were created for the artifact type `manifest` if path starts with `./` ([5d3f629](https://github.com/capawesome-team/cli/commit/5d3f6299fbfde98705589e1518af654dba7e234f))

## [1.6.1](https://github.com/capawesome-team/cli/compare/v1.6.0...v1.6.1) (2025-03-16)


### Bug Fixes

* **apps:bundles:create:** validate zip file if url is passed ([bd1c4c7](https://github.com/capawesome-team/cli/commit/bd1c4c7463ed3a1611ec6da1b2e87eccb0665fed))
* improve error handling ([949e358](https://github.com/capawesome-team/cli/commit/949e35826d3e75d5077b55966cff75ccd15a54d7))

## [1.6.0](https://github.com/capawesome-team/cli/compare/v1.5.0...v1.6.0) (2025-03-03)


### Features

* add git integration ([#34](https://github.com/capawesome-team/cli/issues/34)) ([7ca323a](https://github.com/capawesome-team/cli/commit/7ca323a030e9c70866c2cf1c34c69ef9dc0129e0))

## [1.5.0](https://github.com/capawesome-team/cli/compare/v1.4.1...v1.5.0) (2025-02-21)


### Features

* **apps:bundles:create:** support code signing for self-hosted bundles ([ebc84ec](https://github.com/capawesome-team/cli/commit/ebc84ecdf3006e9b68491d3082991d0bcf8f9423))


### Bug Fixes

* **apps:bundles:create:** provide a url without path to support self-hosted bundles ([1dcf020](https://github.com/capawesome-team/cli/commit/1dcf020ff006445e3ff211ed66a1cec1afdd012d))

## [1.4.1](https://github.com/capawesome-team/cli/compare/v1.4.0...v1.4.1) (2025-02-16)


### Bug Fixes

* **bundles:** add retry mechanism for file upload on failure ([86a62da](https://github.com/capawesome-team/cli/commit/86a62daa2ae50d691791714ef6a5812a6e87dc4b))

## [1.4.0](https://github.com/capawesome-team/cli/compare/v1.3.2...v1.4.0) (2025-01-29)


### Features

* **bundles:** support custom properties ([#31](https://github.com/capawesome-team/cli/issues/31)) ([405634b](https://github.com/capawesome-team/cli/commit/405634b8a46a77a72ea9812fb350f54ca79a8387))


### Bug Fixes

* convert command arguments to string if not undefined ([b147e21](https://github.com/capawesome-team/cli/commit/b147e214b4ee0da3babc82773b1426162f753c36)), closes [#33](https://github.com/capawesome-team/cli/issues/33)

## [1.3.2](https://github.com/capawesome-team/cli/compare/v1.3.1...v1.3.2) (2024-12-30)


### Bug Fixes

* npm error `patch-package: command not found` ([ed3513a](https://github.com/capawesome-team/cli/commit/ed3513a63d89d20da76e969d2b5a11f876b7da76)), closes [#23](https://github.com/capawesome-team/cli/issues/23)

## [1.3.1](https://github.com/capawesome-team/cli/compare/v1.3.0...v1.3.1) (2024-12-30)


### Bug Fixes

* exit with error code 1 ([#22](https://github.com/capawesome-team/cli/issues/22)) ([d05789e](https://github.com/capawesome-team/cli/commit/d05789e8e68b6bf6f0c48acadcdbe7c572a02593))

## [1.3.0](https://github.com/capawesome-team/cli/compare/v1.2.0...v1.3.0) (2024-12-21)


### Features

* set custom user agent for http requests ([dceb044](https://github.com/capawesome-team/cli/commit/dceb044c4e9a14f40a26544ab46815e77333a831))

## [1.2.0](https://github.com/capawesome-team/cli/compare/v1.1.0...v1.2.0) (2024-12-21)


### Features

* add Sentry for error reporting ([398868c](https://github.com/capawesome-team/cli/commit/398868c762c2fb24dcd631d19f33134ef876a6ed)), closes [#4](https://github.com/capawesome-team/cli/issues/4)

## [1.1.0](https://github.com/capawesome-team/cli/compare/v1.0.1...v1.1.0) (2024-11-01)


### Features

* **apps:** add `--bundle-limit` option ([#18](https://github.com/capawesome-team/cli/issues/18)) ([b20d33c](https://github.com/capawesome-team/cli/commit/b20d33cb0504c4bd83fec62fe40317b996357ef0))

## [1.0.1](https://github.com/capawesome-team/cli/compare/v1.0.0...v1.0.1) (2024-11-01)


### Bug Fixes

* **apps:** `--ios-min` option was ignored ([d2de664](https://github.com/capawesome-team/cli/commit/d2de66481f7b54e44fc52eac6d1c868e82499160))
* **apps:** `--rollout` option was ignored ([5f1b2d8](https://github.com/capawesome-team/cli/commit/5f1b2d85a77d6a99e123dc690d947a740e864d6e))

## [1.0.0](https://github.com/capawesome-team/cli/compare/v0.0.17...v1.0.0) (2024-11-01)


### Features

* **apps:** add new `--expires-in-days` option to `apps:bundles:create` ([5e83d14](https://github.com/capawesome-team/cli/commit/5e83d1422f927c7202cde0f57d47e790aeaf02c1))


### Bug Fixes

* **login:** log error if email or password are not provided ([844acc4](https://github.com/capawesome-team/cli/commit/844acc4952886cfed83573b18961c482eae6f410))
* **manifests:** ignore `.DS_Store` file ([5e7ef8e](https://github.com/capawesome-team/cli/commit/5e7ef8ed9ec95bb48f3c4508648fe35f9d6090e8))

## [0.0.17](https://github.com/capawesome-team/cli/compare/v0.0.16...v0.0.17) (2024-10-24)

## [0.0.16](https://github.com/capawesome-team/cli/compare/v0.0.15...v0.0.16) (2024-10-20)


### Bug Fixes

* **manifests:** exclude manifest file itself ([afae1f2](https://github.com/capawesome-team/cli/commit/afae1f23e88fa6e0c35d9c27ff5fa091593a27cd))

## [0.0.15](https://github.com/capawesome-team/cli/compare/v0.0.14...v0.0.15) (2024-10-20)


### Features

* **bundles:** support artifact type `manifest` ([#14](https://github.com/capawesome-team/cli/issues/14)) ([5e92c5e](https://github.com/capawesome-team/cli/commit/5e92c5e74574748c1c9ceaab3bf7ae94430dfb71))


### Bug Fixes

* error message on sign-in if client is offline ([#13](https://github.com/capawesome-team/cli/issues/13)) ([56404f6](https://github.com/capawesome-team/cli/commit/56404f6e779dc851fa1bd7914921fa9744e9eeeb))

## [0.0.14](https://github.com/capawesome-team/cli/compare/v0.0.13...v0.0.14) (2024-09-30)


### Bug Fixes

* **apps:** typo ([c65ca99](https://github.com/capawesome-team/cli/commit/c65ca99289b333ddb79d3ade0db33cb4571e860d))
* **whoami:** support oauth provider ([7b80a7b](https://github.com/capawesome-team/cli/commit/7b80a7b3c5aa3d8dea6c77cf30a8bfae10961e36))

## [0.0.13](https://github.com/capawesome-team/cli/compare/v0.0.12...v0.0.13) (2024-08-20)


### Features

* print notice if new version is available ([#7](https://github.com/capawesome-team/cli/issues/7)) ([db88dc3](https://github.com/capawesome-team/cli/commit/db88dc356f6f6f5f73444e341ab749ae68cfdf6a)), closes [#2](https://github.com/capawesome-team/cli/issues/2)

## [0.0.12](https://github.com/capawesome-team/cli/compare/v0.0.11...v0.0.12) (2024-07-25)


### Bug Fixes

* **apps:** typo ([2376f13](https://github.com/capawesome-team/cli/commit/2376f1397e4b8e71aeea58fff3b2338d59ab41e7))

## [0.0.11](https://github.com/capawesome-team/cli/compare/v0.0.10...v0.0.11) (2024-07-12)


### Features

* add support for signature verification ([#6](https://github.com/capawesome-team/cli/issues/6)) ([b82a190](https://github.com/capawesome-team/cli/commit/b82a1901f9cbca856d493e0c778fefb8205f6742))


### Bug Fixes

* **apps:** throw error if empty path is provided ([e5de25c](https://github.com/capawesome-team/cli/commit/e5de25c68dbceb412d53790349f977c71ce33683))

## [0.0.10](https://github.com/capawesome-team/cli/compare/v0.0.9...v0.0.10) (2024-07-10)


### Features

* add support for checksum verification ([#5](https://github.com/capawesome-team/cli/issues/5)) ([5dbe8af](https://github.com/capawesome-team/cli/commit/5dbe8af4c866d94dc633009d26be143b079474d1))

## [0.0.9](https://github.com/capawesome-team/cli/compare/v0.0.8...v0.0.9) (2024-07-04)


### Features

* **bundles:** add `url` argument ([bf7b213](https://github.com/capawesome-team/cli/commit/bf7b21346813543992128f54e9a6bde283c38446))

## [0.0.8](https://github.com/capawesome-team/cli/compare/v0.0.7...v0.0.8) (2024-06-10)


### Bug Fixes

* improve error handling ([e67e94b](https://github.com/capawesome-team/cli/commit/e67e94b50308fe227275a9ce83097f67423d0fbd))
* throw error if no app exists ([930857c](https://github.com/capawesome-team/cli/commit/930857cf735e102ebf1be7e8772cc251a3ddc1a2))

## [0.0.7](https://github.com/capawesome-team/cli/compare/v0.0.6...v0.0.7) (2024-05-27)


### Features

* add `apps:bundles:update` command ([9dbad37](https://github.com/capawesome-team/cli/commit/9dbad377bebf4ea9b2a04194c3cda73aafcae067))
* add `rollout` argument to `apps:bundles:create` command ([30b892c](https://github.com/capawesome-team/cli/commit/30b892cd3aabfc62178420d516c162abacd1b757))

## [0.0.6](https://github.com/capawesome-team/cli/compare/v0.0.5...v0.0.6) (2024-05-04)


### Features

* **bundles:** add new min and max options ([#1](https://github.com/capawesome-team/cli/issues/1)) ([41d4bad](https://github.com/capawesome-team/cli/commit/41d4badadafc4b5989d22200e58f09efe01ebeec))

## [0.0.5](https://github.com/capawesome-team/cli/compare/v0.0.4...v0.0.5) (2024-05-02)


### Features

* **login:** add `--token` option ([2cdd649](https://github.com/capawesome-team/cli/commit/2cdd649bec96fbdb8a43e16a08b256b16a98a662))


### Bug Fixes

* allow execution of commands in ci ([4ce7ea6](https://github.com/capawesome-team/cli/commit/4ce7ea6e23c5cb15543df8a215274287134682e8))
* read user config in ci ([f404989](https://github.com/capawesome-team/cli/commit/f4049890e5ebac15af5491d4ee04e7fcb6e15235))

## [0.0.4](https://github.com/capawesome-team/cli/compare/v0.0.3...v0.0.4) (2024-04-30)


### Bug Fixes

* **apps:** improve error message for `apps:bundles:create` ([79dc82c](https://github.com/capawesome-team/cli/commit/79dc82ce7ce7600fa3885f42b4af73a368e3249a))

## [0.0.3](https://github.com/capawesome-team/cli/compare/v0.0.2...v0.0.3) (2024-04-27)


### Features

* **apps:** return bundle ID on create ([8a02925](https://github.com/capawesome-team/cli/commit/8a02925aba7580d0f96284f56478f279e84bfade))
* **apps:** return channel ID on create ([afec871](https://github.com/capawesome-team/cli/commit/afec8719685fc022586b78792801df575d9bf0a7))

## [0.0.2](https://github.com/capawesome-team/cli/compare/v0.0.1...v0.0.2) (2024-04-25)


### Bug Fixes

* add missing shebang line ([a4c7b64](https://github.com/capawesome-team/cli/commit/a4c7b643b02cb9c74ecc8fba0b17517961aaa822))

## 0.0.1 (2024-04-25)

Initial release 🎉
