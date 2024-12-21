# Changelog

All notable changes to this project will be documented in this file. See [commit-and-tag-version](https://github.com/absolute-version/commit-and-tag-version) for commit guidelines.

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
