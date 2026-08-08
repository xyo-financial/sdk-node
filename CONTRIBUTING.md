# Contributing to XYO Financial Node.js SDK

Thank you for contributing to the **XYO Financial Node.js SDK** (`xyo-sdk`). This document provides institutional guidelines for engineers contributing to the design, implementation, testing, and maintenance of the SDK.

---

## 1. Two-Layer Architecture

The XYO Financial Node.js SDK is engineered with a strict two-layer architecture separating auto-generated OpenAPI bindings from hand-crafted developer ergonomics.

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
└──────────────────────────────┬────────────────────────────────┘
                               │
                               ▼
┌───────────────────────────────────────────────────────────────┐
│        Generated Layer (src/generated/ - READ-ONLY)           │
│  - Auto-generated via OpenAPI Generator (typescript-fetch)    │
│  - Direct 1:1 mapping with xyo-financial/specs (openapi.yml)  │
│  - Low-level APIs (EnrichmentApi) & raw models/serializers    │
│  - Runtime HTTP infrastructure & RFC 7807 Problem Details     │
└───────────────────────────────────────────────────────────────┘
```

### Layer Breakdown

1. **Generated Layer (`src/generated/`) — READ-ONLY**:
   - **Origin**: Automatically synthesized from the canonical OpenAPI 3.1 specification maintained in [`xyo-financial/specs`](https://github.com/xyo-financial/specs).
   - **Contents**: Raw API clients (such as `EnrichmentApi`), request and response interfaces (`EnrichmentRequest`, `EnrichmentResponse`, `APIError`, `ErrorResponse`), serialization helpers (`*FromJSON`, `*ToJSON`), and base fetch runtime utilities (`runtime.ts`).
   - **Policy**: **DO NOT edit files in `src/generated/` manually.** Any direct modifications will be overwritten on the next code generation cycle.

2. **Wrapper Layer (`src/index.ts`, `src/index.test.ts`) — HAND-CRAFTED**:
   - **Origin**: Authored and maintained directly in this repository.
   - **Contents**:
     - `src/index.ts`: The unified entrypoint providing `XYOClient` (and aliased `Client`), high-level convenience methods (`enrichTransaction`, `enrichTransactions`, `getEnrichmentStatus`), configuration parsing (`XYOClientOptions`), custom fetch injection, and curated type re-exports.
     - `src/index.test.ts`: Comprehensive test suite verifying client lifecycle, error responses (RFC 7807 problem details, HTTP 400/401/403/429/500/502/503), batch workflows, status polling, serialization, and middleware hooks.
   - **Policy**: All ergonomics improvements, convenience helpers, middleware additions, and SDK test enhancements must be made in this layer.

---

## 2. Contribution Workflow

To maintain consistency across all official XYO Financial SDKs (Node.js, Python, Go, PHP, Rust, Java, C++), changes must be proposed in the appropriate repository:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Where to Propose Changes                          │
├──────────────────────────────────────┬──────────────────────────────────────┤
│ Scope of Change                      │ Target Repository                    │
├──────────────────────────────────────┼──────────────────────────────────────┤
│ API Endpoints, Parameters, Schemas,  │ https://github.com/xyo-financial/specs│
│ Data Models, Error Specifications    │                                      │
├──────────────────────────────────────┼──────────────────────────────────────┤
│ SDK Ergonomics, Client Options,      │ https://github.com/xyo-financial/    │
│ Middleware, Helpers, Tests, Docs     │ sdk-node (This Repository)           │
└──────────────────────────────────────┴──────────────────────────────────────┘
```

### Flow 1: API / Data Model Changes
1. Submit an issue or pull request to [`xyo-financial/specs`](https://github.com/xyo-financial/specs).
2. Once the specification changes are approved and merged upstream, regenerate the client code in this repository using the local generation workflow below.
3. Update `src/index.ts` if the public wrapper interface needs to surface new capabilities.
4. Add comprehensive unit tests in `src/index.test.ts`.

### Flow 2: SDK Ergonomics, Helpers, and Tests
1. Create a feature branch from `main`:
   ```bash
   git checkout -b feat/my-enhancement
   ```
2. Implement your changes in `src/index.ts` or add tests in `src/index.test.ts`.
3. Verify that all Quality Gates pass cleanly.
4. Submit a Pull Request with a clear description of the motivation, changes, and verification output.

---

## 3. Local Code Generation

The generated layer is produced using `@openapitools/openapi-generator-cli` with the `typescript-fetch` generator target.

### Prerequisites
- Node.js `>= 22.0.0`
- Java Runtime Environment (JRE 11+) for the OpenAPI Generator engine

### Generating Client Code

Run the npm script:
```bash
npm run generate
```

Alternatively, invoke the OpenAPI Generator CLI directly via `npx`:
```bash
npx @openapitools/openapi-generator-cli generate \
  -i ../specs/openapi.yml \
  -g typescript-fetch \
  -o ./src/generated
```

### Post-Generation Verification
After generating:
1. Review generated files in `src/generated/` for any breaking changes or updated schemas.
2. Update the wrapper exports in `src/index.ts` if new models or endpoints were introduced.
3. Run the test suite to ensure existing behavior and serialization contracts are preserved.

---

## 4. Quality Gates & Verification Standards

All pull requests must pass the complete quality gate suite prior to review and merging.

### 1. Code Formatting & Linting
Enforce code formatting (Prettier) and ESLint rules:
```bash
npm run lint
```

### 2. Compilation & Type Checking
Verify clean TypeScript compilation and emit distribution bundles to `./dist`:
```bash
npm run build
```

### 3. Unit Testing & Coverage
Execute the Node.js native test runner with `tsx` and experimental code coverage:
```bash
npm test
```

### 4. Complete Pre-Commit Validation
Execute all quality gates sequentially:
```bash
npm run lint && npm run build && npm test
```

### 5. Containerized Pipeline Verification (Optional / Staff)
Validate the end-to-end containerized packaging build:
```bash
docker build -f deploy/Dockerfile . -t xyo-sdk-node:latest --no-cache
```

---

## 5. Coding Standards & Conventions

- **Language & Runtime**: Modern TypeScript targeting Node.js `>= 22.0.0`.
- **Zero Runtime Dependencies**: The SDK runtime relies exclusively on standard Web/Node APIs (native `fetch`, `Headers`, `Request`, `Response`). Do not introduce external runtime dependencies without architectural approval.
- **Type Safety**: Maintain strict type definitions. Do not bypass the TypeScript type system with `any` unless strictly required for low-level serialization adapters.
- **Error Handling**: Follow RFC 7807 Problem Details standards (`APIError`, `ErrorResponse`).
- **Commit Messages**: Follow Conventional Commits format (`feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`).
- **Testing**: Maintain high test coverage for all methods, parameter variations, error states, and edge cases.

---

## 6. Security Vulnerability Reporting

If you discover a potential security vulnerability in this SDK or the XYO Financial platform, please **do not** open a public GitHub issue. Instead, report it directly to our security team at [security@syniol.com](mailto:security@syniol.com) or [security@xyo.financial](mailto:security@xyo.financial).
