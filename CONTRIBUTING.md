# Contributing to XYO Financial Node.js SDK

Thank you for contributing to the **XYO Financial Node.js SDK** (`xyo-sdk`). This document provides institutional guidelines for engineers contributing to the design, implementation, testing, and maintenance of the SDK.

---

## 📋 1. Contribution Policy & Issue Reporting

### Contribution Policy
Development, pull request reviews, and package publishing are maintained by **Syniol Limited** engineers.

External pull requests submitted directly to this repository without prior coordination may be rejected. However, feedback, bug reports, and enhancement proposals from the developer community are welcome.

### Reporting Issues & Requesting Features
If you discover a bug, have questions, or wish to propose an enhancement:
1. Search existing [GitHub Issues](https://github.com/xyo-financial/sdk-node/issues) to verify if the topic is already tracked.
2. Open a new issue with:
   - Node.js environment details (`node -v`, `npm -v`, OS/platform).
   - SDK version or commit hash (`v2.0.0`).
   - Clear description of expected vs. actual behavior.
   - Minimal, reproducible TypeScript/JavaScript code snippet reproducing the problem.

---

## 🏗 2. Two-Layer Architecture

The XYO Financial Node.js SDK is engineered with a strict **Two-Layer Architecture** separating auto-generated OpenAPI bindings from hand-crafted developer ergonomics.

```
┌───────────────────────────────────────────────────────────────┐
│                       Consumer Code                           │
└──────────────────────────────┬────────────────────────────────┘
                               │
                               ▼
┌───────────────────────────────────────────────────────────────┐
│        Hand-Crafted Wrapper Layer (src/index.ts)              │
│  - Ergonomic client interface (XYOClient / Client)            │
│  - Flexible configuration (token, apiKey, baseUrl, fetchApi)  │
│  - Convenience namespaces (client.enrichment.*)               │
│  - Curated TypeScript exports & middleware integration        │
│  - Bulk tarball decompression helpers (downloadEnrichment...) │
└──────────────────────────────┬────────────────────────────────┘
                               │
                               ▼
┌───────────────────────────────────────────────────────────────┐
│        Generated Layer (src/generated/ - READ-ONLY)           │
│  - Auto-generated via OpenAPI Generator (typescript-fetch)    │
│  - Direct 1:1 mapping with xyo-financial/specs (openapi.yml)  │
│  - Low-level APIs (EnrichmentApi) & raw models/serializers    │
│  - Runtime HTTP infrastructure & RFC 7807 Problem Details     │
│  - ⚠️ READ-ONLY & IMMUTABLE: DO NOT EDIT OR FORMAT MANUALLY   │
└───────────────────────────────────────────────────────────────┘
                               │
                               ▼
                XYO RESTful API (https://api.xyo.financial)
```

### Layer Breakdown

1. **Generated Layer (`src/generated/`) — READ-ONLY & IMMUTABLE**:
   - **Origin**: Automatically synthesized from the canonical OpenAPI 3.1 specification maintained in [`xyo-financial/specs`](https://github.com/xyo-financial/specs).
   - **Contents**: Raw API clients (`EnrichmentApi`), request and response interfaces (`EnrichmentRequest`, `EnrichmentResponse`, `APIError`, `ErrorResponse`), serialization helpers (`*FromJSON`, `*ToJSON`), and base fetch runtime utilities (`runtime.ts`).
   - **Policy**: **DO NOT edit or reformat files in `src/generated/` manually.** Any direct modifications will be overwritten on the next code generation cycle. Linters and formatters (ESLint, Prettier) are configured to ignore this directory.

2. **Wrapper Layer (`src/index.ts`, `src/index.test.ts`) — HAND-CRAFTED**:
   - **Origin**: Authored and maintained directly in this repository.
   - **Contents**:
     - `src/index.ts`: The unified entrypoint providing `XYOClient` (and aliased `Client`), high-level convenience methods (`enrichTransaction`, `enrichTransactions`, `getEnrichmentStatus`, `downloadEnrichmentCollection`), configuration parsing (`XYOClientOptions`), custom fetch injection, and curated type re-exports.
     - `src/index.test.ts`: Comprehensive test suite verifying client lifecycle, error responses (RFC 7807 problem details, HTTP 400/401/403/429/500/502/503), batch workflows, status polling, serialization, tar.gz streaming archive extraction, and middleware hooks.
   - **Policy**: All ergonomics improvements, convenience helpers, middleware additions, and SDK test enhancements must be made in this layer.

---

## 🔀 3. Contribution Workflow & Decision Matrix

To maintain consistency across all official XYO Financial SDKs (Node.js, Python, Go, PHP, Rust, Java, C++), determine where your proposed change belongs:

| Type of Change | Target Repository | Action Required |
| :--- | :--- | :--- |
| **API Endpoints & Contracts**<br>(New endpoints, URL paths, HTTP methods) | [`xyo-financial/specs`](https://github.com/xyo-financial/specs) | Submit PR to update `openapi.yml`. Once merged and tagged, the Node SDK regenerates automatically. |
| **Data Models & Schema Properties**<br>(New fields, type definitions, validation rules) | [`xyo-financial/specs`](https://github.com/xyo-financial/specs) | Update the OpenAPI schema definitions in `specs`. |
| **SDK Ergonomics & Helpers**<br>(Higher-level methods, batch helpers, convenience wrappers) | [`xyo-financial/sdk-node`](https://github.com/xyo-financial/sdk-node) (This repo) | Implement directly in `src/index.ts` and add tests in `src/index.test.ts`. |
| **Transport & Middleware Handling**<br>(Custom fetch injection, middleware hooks, configuration) | [`xyo-financial/sdk-node`](https://github.com/xyo-financial/sdk-node) (This repo) | Enhance wrapper options in `XYOClientOptions` and `XYOClient`. |
| **Error Handling & Diagnostics**<br>(RFC 7807 mapping, status code extraction, unwrapping) | [`xyo-financial/sdk-node`](https://github.com/xyo-financial/sdk-node) (This repo) | Update error normalization and add unit tests. |
| **Unit & Integration Tests**<br>(Mock server tests, regression tests, coverage) | [`xyo-financial/sdk-node`](https://github.com/xyo-financial/sdk-node) (This repo) | Add tests in `src/index.test.ts`. |

---

## ⚙️ 4. Code Generation

### Automated Upstream Synchronization
When a new release tag or specification update is pushed to [`xyo-financial/specs`](https://github.com/xyo-financial/specs), a GitHub Actions workflow automatically triggers a `repository_dispatch` event (`spec_tagged`, `spec_updated`) to this repository. The [`.github/workflows/generate.yml`](.github/workflows/generate.yml) workflow:
1. Checks out `xyo-financial/specs` at the specified tag, branch, or commit (`ref: ${{ github.event.client_payload.tag || inputs.spec_tag || 'main' }}`).
2. Executes `openapi-generator-cli` to regenerate `src/generated/` using the `typescript-fetch` generator target.
3. Cleans up generator scaffolding and noise files (`git_push.sh`, `.travis.yml`, `README.md`, `specs/`).
4. Compiles the TypeScript bundle (`npm run build`) and executes the unit test suite (`npm test`).
5. Opens an automated pull request for review.

### Manual / Local Code Generation
If you need to regenerate the low-level `src/generated/` layer locally:

#### Prerequisites
- Node.js `>= 22.0.0`
- Java Runtime Environment (JRE 11+) for the OpenAPI Generator engine
- Sibling clone of `xyo-financial/specs` (or direct path to `openapi.yml`)

#### Command
Run from the root of the Node SDK repository:

```bash
npm run generate
```

Alternatively, invoke the OpenAPI Generator CLI directly via `npx` using portable paths:

```bash
npx @openapitools/openapi-generator-cli generate \
  -i ../specs/openapi.yml \
  -g typescript-fetch \
  -o ./src/generated
```

#### Parameter Breakdown
- `-i ../specs/openapi.yml`: Portable relative path to the canonical OpenAPI specification.
- `-g typescript-fetch`: Targets the official OpenAPI TypeScript Fetch client generator.
- `-o ./src/generated`: Specifies the destination directory for generated artifacts.

#### Post-Generation Clean-Up
After code generation completes, remove unnecessary generator scaffolding files (generated code in `src/generated/` should remain untouched):

```bash
rm -f src/generated/git_push.sh src/generated/.travis.yml src/generated/README.md
rm -rf src/generated/test
```

### Generated Code Policy

> [!IMPORTANT]
> `src/generated/` is produced by OpenAPI Generator and is committed **exactly as the generator emits it**.

- **Never edit it by hand.** Any manual change is silently destroyed by the next specification dispatch. Real fixes have already been lost this way elsewhere in the fleet, including a privacy fix in `sdk-go` that suppressed request bodies in debug logs.
- **Never reformat it.** It is excluded from linting and formatting via `ignores` in `eslint.config.mts` and via `.prettierignore`. Generated output that has been reformatted no longer matches what the generator produces, so every regeneration then fights CI and the diff fills with style churn instead of specification changes.
- **It is out of scope for code review, security review, audit and any other sanitisation pass.** Do not raise findings against generated output. Review the specification in [`xyo-financial/specs`](https://github.com/xyo-financial/specs) or the hand-written wrapper layer instead, which is what consumers actually call.
- **It carries no hand-written tests.** Generated tests are disabled at generation time. Test the wrapper layer.

If generated output is wrong, fix it at source, never in the output:

1. Change the specification upstream in `xyo-financial/specs`, if the contract itself is wrong.
2. Change the generator invocation in `.github/workflows/generate.yml`, if it is a generation setting.
3. Add the file to `src/generated/.openapi-generator-ignore`, if the generator's version of it is genuinely not the source of truth.

---

## 🛡 5. Quality Gates & Verification Standards

All pull requests and contributions must pass the complete quality gate suite prior to review and merging:

### 1. Code Formatting & Linting
Enforce code formatting (Prettier) and ESLint rules on hand-crafted code:
```bash
npm run lint
```

### 2. Compilation & Type Checking
Verify clean TypeScript compilation and emit distribution bundles to `./dist`:
```bash
npm run build
```

### 3. Unit Testing & Coverage
Execute the Node.js native test runner with `tsx` and code coverage:
```bash
npm test
```

### 4. Complete Pre-Commit Validation
Execute all quality gates sequentially:
```bash
npm run lint && npm run build && npm test
```

### 5. Containerized Pipeline Verification
Validate the end-to-end containerized packaging build:
```bash
docker build -f deploy/Dockerfile . -t xyo-sdk-node:latest --no-cache
```

---

## 📐 6. Coding Standards & Conventions

- **Language & Runtime**: Modern TypeScript targeting Node.js `>= 22.0.0`.
- **Zero Runtime Dependencies**: The SDK runtime relies exclusively on standard Web/Node APIs (native `fetch`, `Headers`, `Request`, `Response`, `node:zlib`, `node:stream`). Do not introduce external runtime dependencies without architectural approval.
- **Strict Type Safety**: Maintain strict type definitions. Do not bypass the TypeScript type system with `any` unless strictly required for low-level serialization adapters.
- **Error Handling**: Follow RFC 7807 Problem Details standards (`APIError`, `ErrorResponse`).
- **Commit Messages**: Follow [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`, `ci:`).
- **Testing**: Maintain high test coverage for all methods, parameter variations, error states, and edge cases.

---

## 🔒 7. Security Vulnerability Reporting

If you discover a potential security vulnerability in this SDK or the XYO Financial platform, please **do not** open a public GitHub issue. Refer to [`SECURITY.md`](SECURITY.md) and report it directly to our security team at [security@syniol.com](mailto:security@syniol.com).

---

## 📄 8. License

By contributing to the XYO Financial Node.js SDK, you agree that your contributions will be licensed under the [Apache License, Version 2.0](LICENSE) (Apache-2.0).
