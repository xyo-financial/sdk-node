# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Support for dynamic secret rotation via `tokenSupplier` / `apiKeySupplier` async function callbacks in `XYOClientOptions` (NIST SP 800-57 compliance).
- Fallback support for `XYO_API_BASE_URL` environment variable in `XYOClient` constructor.
- Zero-trust domain validation for `downloadEnrichmentCollection`, strictly restricting target endpoints to configured API host or trusted AWS S3 (`.amazonaws.com`) domains.
- ISO 3166-1 alpha-2 two-letter uppercase country code validation in `enrichTransaction`.
- Custom header injection protection (CRLF / CWE-113) on `xApiUser` header in `enrichTransactions` and `getEnrichmentStatus`.
- Non-empty `id` parameter validation in `getEnrichmentStatus`.
- URL protocol scheme validation rejecting non-HTTP protocols (`file://`, `ftp://`, `gopher://`) against SSRF attack vectors.
- Streaming decompression bomb mitigations: aggregate archive limits (`DEFAULT_MAX_ARCHIVE_BYTES = 100 MiB`), entry size limits (`DEFAULT_MAX_ENTRY_BYTES = 10 MiB`), and tar entry count bounds (`DEFAULT_MAX_TAR_ENTRIES = 50,000`).
- Path traversal and Zip Slip protections in streaming tar parser.
- Multi-engine universal async body iteration supporting Web Streams, Node.js streams, and `node-fetch`.

### Changed
- Sanitized tar entry names in error strings to prevent CWE-117 log injection.
- Removed raw response body preview strings from Content-Type error diagnostics to eliminate SSRF log exposure (CWE-209).
- Clamped tar parser buffer scanning strictly to the 100-byte UStar filename field with positive size bounds (`Math.max(0, ...)`).
- Strongly typed async iterable chunk handling to satisfy strict TypeScript ESLint rules.
- Removed redundant `npm whoami` invocation from automated release workflow (`.github/workflows/release.yml`).
- Aligned `LICENSE` file with exact standard Apache 2.0 text for `licensecheck` tool compliance.

## [2.0.0] - 2026-08-12

### Added
- Generated OpenAPI 3.0 TypeScript client module using `@openapitools/openapi-generator-cli` (`typescript-fetch` generator).
- High-level ergonomic `XYOClient` wrapper class supporting `enrichTransaction`, `enrichTransactions`, `getEnrichmentStatus`, and `downloadEnrichmentCollection`.
- Automated OpenAPI client generation GitHub Actions workflow (`.github/workflows/generate.yml`).
- Comprehensive native test suite (`src/index.test.ts`) using Node.js native test runner and `tsx`.
- Enterprise security documentation (`SECURITY.md`), contribution guide (`CONTRIBUTING.md`), and updated `README.md`.

### Changed
- Breaking: Replaced legacy hand-written HTTP client with generated OpenAPI 3.0 client runtime and strongly-typed models.
- Updated Dockerfile CI/CD step to restrict `npm audit` to production dependencies.

## [1.2.3] - 2026-08-07

### Changed
- Updated repository URLs and links to `https://github.com/xyo-financial/sdk-node`.
- Bumped package version to 1.2.3.

## [1.2.2] - 2026-07-20

### Changed
- Updated repository license to BSD-3-Clause.
- Bumped package version to 1.2.2.

## [1.2.1] - 2026-07-18

### Added
- New cybernetic hexagon mascot asset (`docs/mascot.png`) and generation instructions (`docs/mascot_generation_instructions.md`).

### Changed
- Complete enterprise documentation overhaul in `README.md` adhering to Tier-1 banking architectural principles (real-time vs batch processing, DLQ routing, circuit breakers).
- Standardized all documentation across repository to British English spelling.
- Bumped package version to 1.2.1.

## [1.2.0] - 2026-07-18

### Added
- Integrated multi-model AI code review suggestions across client and test suites.

### Fixed
- Fixed npm registry publishing pipeline configuration in GitHub Actions.

## [1.1.0] - 2025-10-19

### Added
- Added `location` and `address` fields to enrichment response models.

### Changed
- Normalized and strengthened TypeScript types across unit test cases.

## [1.0.2] - 2025-09-02

### Changed
- Minor maintenance and documentation adjustments.

## [1.0.1] - 2025-09-02

### Changed
- Updated documentation and adjusted `.npmignore` to ensure README and LICENSE are packaged.
- Updated example package for local integration testing.

## [1.0.0] - 2025-09-02

### Added
- Official 1.0.0 release of the XYO Financial Node.js SDK.
- Core `Client` and `EnrichmentService` implementation.
- Methods for single transaction enrichment and bulk transaction processing.
- Native Node.js test runner suite and example usage package.
- Main documentation and contributing guidelines.

## [0.2.2] - 2025-09-02

### Changed
- Maintenance patch for v0.2.x series.

## [0.2.1] - 2025-09-02

### Changed
- Optimized package bundle size by excluding unnecessary files from npm distribution.

## [0.2.0] - 2025-09-02

### Added
- Client configuration interface and encapsulated enrichment service architecture.
- Custom error hierarchy (`XYOClientError`).
- Skeleton test suite using Node.js native test runner.
- Prettier and ESLint code formatting tooling.
- Dockerfile for CI/CD test automation.

## [0.1.6] - 2025-08-12

### Changed
- Updated documentation and resolved dist directory build permissions.

## [0.1.5] - 2025-08-10

### Changed
- Packaging sanity adjustments and expanded npm ignore rules.

## [0.1.4] - 2025-08-10

### Changed
- Distribution folder packaging updates.

## [0.1.3] - 2025-08-10

### Changed
- Internal cleanup and maintenance.

## [0.1.2] - 2025-08-10

### Changed
- Completed ignore configuration for npm packaging and git tracking.

## [0.1.1] - 2025-08-10

### Fixed
- Resolved TypeScript compilation and distribution build issues.

## [0.1.0] - 2025-08-10

### Added
- Initial SDK skeleton with base client class, enrichment service, Docker environment, and GitHub Actions CI workflow.

[Unreleased]: https://github.com/xyo-financial/sdk-node/compare/v2.0.0...HEAD
[2.0.0]: https://github.com/xyo-financial/sdk-node/compare/v1.2.3...v2.0.0
[1.2.3]: https://github.com/xyo-financial/sdk-node/compare/v1.2.2...v1.2.3
[1.2.2]: https://github.com/xyo-financial/sdk-node/compare/v1.2.1...v1.2.2
[1.2.1]: https://github.com/xyo-financial/sdk-node/compare/v1.2.0...v1.2.1
[1.2.0]: https://github.com/xyo-financial/sdk-node/compare/1.1.0...v1.2.0
[1.1.0]: https://github.com/xyo-financial/sdk-node/compare/1.0.2...1.1.0
[1.0.2]: https://github.com/xyo-financial/sdk-node/compare/1.0.1...1.0.2
[1.0.1]: https://github.com/xyo-financial/sdk-node/compare/1.0.0...1.0.1
[1.0.0]: https://github.com/xyo-financial/sdk-node/compare/0.2.2...1.0.0
[0.2.2]: https://github.com/xyo-financial/sdk-node/compare/0.2.1...0.2.2
[0.2.1]: https://github.com/xyo-financial/sdk-node/compare/0.2.0...0.2.1
[0.2.0]: https://github.com/xyo-financial/sdk-node/compare/v0.1.6...0.2.0
[0.1.6]: https://github.com/xyo-financial/sdk-node/compare/v0.1.5...v0.1.6
[0.1.5]: https://github.com/xyo-financial/sdk-node/compare/v0.1.4...v0.1.5
[0.1.4]: https://github.com/xyo-financial/sdk-node/compare/v0.1.3...v0.1.4
[0.1.3]: https://github.com/xyo-financial/sdk-node/compare/v0.1.2...v0.1.3
[0.1.2]: https://github.com/xyo-financial/sdk-node/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/xyo-financial/sdk-node/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/xyo-financial/sdk-node/releases/tag/v0.1.0
