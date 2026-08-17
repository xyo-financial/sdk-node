<p align="center">
  <a href="https://xyo.financial" target="_blank" rel="noopener noreferrer">
    <img alt="XYO Financial Node.js Mascot" width="380" src="docs/mascot.png" />
  </a>
</p>

<h1 align="center">XYO Financial SDK for Node.js & TypeScript</h1>

<p align="center">
  <a href="https://www.npmjs.com/package/xyo-sdk"><img src="https://img.shields.io/npm/v/xyo-sdk.svg?style=flat-square&color=blue" alt="npm version" /></a>
  <a href="https://github.com/xyo-financial/sdk-node/actions/workflows/release.yml"><img src="https://github.com/xyo-financial/sdk-node/actions/workflows/release.yml/badge.svg?branch=main&style=flat-square&label=build" alt="Build Status" /></a>
  <img src="https://img.shields.io/badge/Node.js-%3E%3D22.0.0-brightgreen?style=flat-square" alt="Node Compatibility" />
  <img src="https://img.shields.io/badge/TypeScript-Strict%205.x-3178C6?style=flat-square" alt="TypeScript Strict" />
  <img src="https://img.shields.io/badge/RFC%207807-Compliant-success?style=flat-square" alt="RFC 7807 Problem Details" />
  <img src="https://img.shields.io/badge/Dependencies-0%20Runtime-blue?style=flat-square" alt="Zero Runtime Dependencies" />
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-Apache--2.0-blue.svg?style=flat-square" alt="License" /></a>
</p>

<p align="center">
  <strong>The official Node.js & TypeScript SDK for <a href="https://xyo.financial">XYO Financial</a>.</strong><br>
  Seamlessly enrich raw financial transactions into clean merchant profiles, intelligent business categorizations, high-res logos, and geolocated address metadata using AI-powered enrichment pipelines.
</p>

---

## 🏛 Summary & Architecture

The **XYO Financial SDK** is the official, institutional-grade Node.js and TypeScript client for integrating the **XYO Financial AI Banking Transaction Enrichment Platform**. Built specifically for Tier-1 banks, payment service providers (PSPs), neo-banks, and enterprise fintechs, this SDK transforms raw, cryptic, and unstandardized transaction narratives into clean, deterministic merchant intelligence and hierarchical categorization.

### Core Architectural Principles

- **Zero Runtime Dependencies**: Relies exclusively on native Web Standard `fetch` (built into modern Node.js runtimes), eliminating supply-chain vulnerabilities and keeping bundle footprint minimal.
- **Strict Compile-Time & Runtime Type Safety**: Generated directly from canonical OpenAPI specifications with full TypeScript type definitions, providing complete compile-time guarantees and rich IDE intellisense.
- **RFC 7807 Problem Details Standard**: First-class handling of machine-readable RFC 7807 error structures (`type`, `title`, `status`, `detail`, `instance`) enabling programmatic failure recovery and automated alerting.
- **Stateless & PCI-DSS / PSD2 Compliant**: Strictly zero persistence of PII. Encrypted in-flight via TLS 1.3/1.2 over HTTPS with Bearer token authentication.
- **Dual-Path Throughput Architecture**:
  - *Synchronous Low-Latency Engine*: Sub-second resolution for real-time payment authorization flows and interactive banking feeds.
  - *Asynchronous Bulk Collection Engine*: High-volume batch ingestion for nocturnal reconciliation, ledger analysis, and data lake pipelines.

---

## 📦 Installation

```bash
# npm
npm install xyo-sdk

# pnpm
pnpm add xyo-sdk

# yarn
yarn add xyo-sdk
```

---

## ⚡ 3-Line Quickstart

```typescript
import { XYOClient } from 'xyo-sdk'
const xyo = new XYOClient({ token: process.env.XYO_API_KEY })
const result = await xyo.enrichTransaction({ content: 'AMZN Mktp UK*1M23456', countryCode: 'GB' })
```

---

## 🔧 Client Initialization

Initialize the `XYOClient` (or alias `Client`) as a singleton in your service layer or dependency injection container:

```typescript
import { XYOClient, type XYOClientOptions } from 'xyo-sdk'

const options: XYOClientOptions = {
  // Pass your API key via token or apiKey option
  token: process.env.XYO_API_KEY!,
  // Optional: Custom base URL (e.g. sandbox or dedicated enterprise gateway)
  baseUrl: 'https://api.xyo.financial',
  // Optional: Custom fetch implementation (useful for proxying, mocks, or custom agents)
  fetchApi: globalThis.fetch,
}

export const xyoClient = new XYOClient(options)
```

---

## 💡 Code Examples

### 1. Single Transaction Enrichment (Real-Time Synchronous)

Designed for real-time card authorization streams, webhook listeners, and interactive mobile banking feeds.

```typescript
import { xyoClient } from './client'
import {
  type EnrichmentRequest,
  type EnrichmentResponse,
  ResponseError,
  FetchError,
} from 'xyo-sdk'

async function enrichCardTransaction(narrative: string, country: string): Promise<EnrichmentResponse> {
  const request: EnrichmentRequest = {
    content: narrative, // e.g. "UBER *TRIP 1234 HELP.UBER.COM CA" (max 128 chars)
    countryCode: country, // ISO 3166-1 alpha-2, e.g. "US", "GB", "DE"
  }

  try {
    // Both xyoClient.enrichTransaction(...) and xyoClient.enrichment.enrichTransaction(...) are supported
    const response: EnrichmentResponse = await xyoClient.enrichTransaction(request)

    console.info(`Merchant:    ${response.merchant}`)
    console.info(`Description: ${response.description}`)
    console.info(`Categories:  ${response.categories.join(', ')}`)
    console.info(`Location:    ${response.location}`)
    console.info(`Address:     ${response.address}`)
    console.info(`Logo:        ${response.logo ? '[Base64 Embedded Image]' : 'N/A'}`)

    return response
  } catch (error) {
    if (error instanceof ResponseError) {
      console.error(`HTTP ${error.response.status} from XYO API`)
    }
    throw error
  }
}
```

### 2. Bulk Asynchronous Enrichment (High-Throughput Batch Processing)

Designed for nightly batch reconciliations, ETL data pipelines, and retrospective transaction analysis. Submit up to thousands of transactions in a single asynchronous request.

```typescript
import { xyoClient } from './client'
import {
  type EnrichTransactionsRequestInner,
  type EnrichTransactionCollectionResponse,
} from 'xyo-sdk'

async function submitBatchForEnrichment(
  transactions: Array<{ content: string; countryCode: string }>
): Promise<EnrichTransactionCollectionResponse> {
  const payload: EnrichTransactionsRequestInner[] = transactions.map((tx) => ({
    content: tx.content,
    countryCode: tx.countryCode,
  }))

  // Submits the collection for background processing
  const collection: EnrichTransactionCollectionResponse =
    await xyoClient.enrichTransactions(payload)

  console.info(`Batch Accepted!`)
  console.info(`Job ID:          ${collection.id}`)
  console.info(`Results Archive: ${collection.link}`) // Destination URL for the tar.gz archive

  return collection
}
```

### 3. Status Polling & Result Retrieval

Poll the bulk job status until completion using exponential backoff and typed status enums.

```typescript
import { xyoClient } from './client'
import {
  EnrichmentCollectionStatusResponseStatusEnum,
  type EnrichmentCollectionStatusResponse,
} from 'xyo-sdk'

async function waitForBatchCompletion(
  jobId: string,
  maxAttempts = 30,
  intervalMs = 3000
): Promise<void> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const statusResponse: EnrichmentCollectionStatusResponse =
      await xyoClient.getEnrichmentStatus(jobId)

    console.info(`[Attempt ${attempt}/${maxAttempts}] Job ${jobId} Status: ${statusResponse.status}`)

    if (statusResponse.status === EnrichmentCollectionStatusResponseStatusEnum.Ready) {
      console.info(`Batch processing complete! Data is ready for download.`)
      return
    }

    if (statusResponse.status === EnrichmentCollectionStatusResponseStatusEnum.Failed) {
      throw new Error(`Bulk enrichment job ${jobId} failed during processing.`)
    }

    // Wait before polling again
    await new Promise((resolve) => setTimeout(resolve, intervalMs))
  }

  throw new Error(`Timed out waiting for bulk enrichment job ${jobId} to complete.`)
}
```

### 4. Downloading Bulk Results Archive

Once a batch status is `READY`, retrieve and decompress the entire `.tar.gz` archive directly into an array of typed `EnrichmentResponse` objects.

```typescript
import { xyoClient } from './client'
import { type EnrichmentResponse } from 'xyo-sdk'

async function fetchBatchResults(downloadUrl: string): Promise<EnrichmentResponse[]> {
  // Downloads, decompresses gzip stream, and parses JSON results
  const results: EnrichmentResponse[] = await xyoClient.downloadEnrichmentCollection(downloadUrl)

  console.info(`Successfully decoded ${results.length} enriched transactions:`)
  for (const item of results) {
    console.info(`- ${item.merchant} (${item.categories.join(', ')}): ${item.description}`)
  }

  return results
}
```

---

## 🛡 RFC 7807 Error Handling

The XYO API adheres strictly to the **RFC 7807 (Problem Details for HTTP APIs)** specification. When an API call fails with a 4xx or 5xx status code, the SDK throws a `ResponseError` containing the raw HTTP `Response`, from which the structured `ErrorResponse` model can be extracted.

### Comprehensive Error Handling Example

```typescript
import {
  XYOClient,
  ResponseError,
  FetchError,
  RequiredError,
  ErrorResponseFromJSON,
  type ErrorResponse,
  type APIError,
} from 'xyo-sdk'

const xyo = new XYOClient({ token: process.env.XYO_API_KEY })

async function safeEnrichment(content: string, countryCode: string) {
  try {
    return await xyo.enrichTransaction({ content, countryCode })
  } catch (error) {
    // 1. API Level Rejection (HTTP 4xx / 5xx with RFC 7807 payload)
    if (error instanceof ResponseError) {
      const httpStatus = error.response.status
      console.error(`HTTP Status: ${httpStatus}`)

      try {
        const errorJson = await error.response.json()
        const errorResponse: ErrorResponse = ErrorResponseFromJSON(errorJson)

        errorResponse.errors.forEach((err: APIError, index: number) => {
          console.error(`Problem Detail [${index + 1}]:`)
          console.error(`  - Type:     ${err.type}`)     // RFC 7807 URI identifying problem
          console.error(`  - Title:    ${err.title}`)    // Short summary
          console.error(`  - Status:   ${err.status}`)   // HTTP status code
          console.error(`  - Detail:   ${err.detail}`)   // Specific explanation
          console.error(`  - Instance: ${err.instance}`) // Occurrence identifier
        })
      } catch {
        // Non-JSON response body (e.g. 502 Bad Gateway from intermediate reverse proxy)
        const rawText = await error.response.text().catch(() => '')
        console.error(`Non-JSON API error payload: ${rawText}`)
      }
      return null
    }

    // 2. Network & Transport Level Failure (DNS resolution, TCP timeout, SSL handshake)
    if (error instanceof FetchError) {
      console.error('Network transport failure reaching XYO API:', error.cause)
      return null
    }

    // 3. Client Validation Failure (missing required parameters)
    if (error instanceof RequiredError) {
      console.error(`Required field missing: ${error.field}`)
      return null
    }

    throw error
  }
}
```

### HTTP Status Code Resolution Matrix

| Status | Context | Problem Detail Example | Enterprise Mitigation Strategy |
| :--- | :--- | :--- | :--- |
| `400` | **Bad Request** | Narrative > 128 characters or invalid country code format. | Validate input at application boundary; route invalid records to Dead Letter Queue (DLQ). |
| `401` | **Unauthorized** | Missing, malformed, or expired API token. | Verify secret manager configuration; trigger credentials rotation alert. |
| `403` | **Forbidden** | Insufficient tier permissions or account suspended. | Verify plan entitlements in XYO Dashboard. |
| `404` | **Not Found** | Job ID does not exist in status query. | Verify bulk collection identifier integrity. |
| `429` | **Too Many Requests** | Rate limit exceeded for tier. | Implement client-side exponential backoff with jitter. |
| `500` / `502` / `503` | **Server Error** | Temporary upstream infrastructure degradation. | Activate circuit-breaker; fallback to raw narrative display and retry with backoff. |

---

## 🚀 Framework & Architecture Integration

The XYO Node.js SDK is engineered with **0 runtime dependencies**, relying entirely on native Web Standard APIs (`fetch`, Streams, `Buffer`). This architectural choice delivers **instant cold boot times (<10ms)** and ultra-low memory overhead, making it uniquely suited for containerized microservices, NestJS enterprise backends, and serverless edge functions.

### 1. NestJS Service & Dependency Injection

Integrate `XYOClient` into your NestJS application using standard dependency injection and injectable service patterns.

#### `xyo.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { XYOClient, type EnrichmentRequest, type EnrichmentResponse } from 'xyo-sdk';

@Injectable()
export class XyoService {
  private readonly client = new XYOClient({ token: process.env.XYO_API_KEY });

  async enrich(request: EnrichmentRequest): Promise<EnrichmentResponse> {
    return this.client.enrichTransaction(request);
  }
}
```

#### `xyo.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { XyoService } from './xyo.service';

@Module({
  providers: [XyoService],
  exports: [XyoService],
})
export class XyoModule {}
```

#### `transactions.controller.ts`

```typescript
import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { XyoService } from './xyo.service';
import type { EnrichmentRequest, EnrichmentResponse } from 'xyo-sdk';

@Controller('transactions')
export class TransactionsController {
  constructor(private readonly xyoService: XyoService) {}

  @Post('enrich')
  @HttpCode(HttpStatus.OK)
  async enrich(@Body() payload: EnrichmentRequest): Promise<EnrichmentResponse> {
    return this.xyoService.enrich(payload);
  }
}
```

---

### 2. Express.js Middleware & Route Pattern

Attach `XYOClient` as a shared singleton or inject it via middleware in Express pipelines:

```typescript
import express, { type Request, type Response, type NextFunction } from 'express';
import { XYOClient, ResponseError, type EnrichmentRequest } from 'xyo-sdk';

const app = express();
app.use(express.json());

const xyo = new XYOClient({ token: process.env.XYO_API_KEY });

// Middleware to attach client to request context
app.use((req: Request, _res: Response, next: NextFunction) => {
  req.xyo = xyo;
  next();
});

// Route handler
app.post('/api/transactions/enrich', async (req: Request, res: Response) => {
  try {
    const payload: EnrichmentRequest = req.body;
    const enriched = await req.xyo.enrichTransaction(payload);
    return res.json(enriched);
  } catch (error) {
    if (error instanceof ResponseError) {
      const status = error.response.status;
      const problem = await error.response.json().catch(() => ({}));
      return res.status(status).json(problem);
    }
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.listen(3000, () => console.info('Server running on port 3000'));
```

---

### 3. Fastify Plugin & Decorator Pattern

Register `XYOClient` as a Fastify singleton plugin using `fastify-plugin`:

```typescript
import Fastify from 'fastify';
import fp from 'fastify-plugin';
import { XYOClient, type EnrichmentRequest, type EnrichmentResponse } from 'xyo-sdk';

declare module 'fastify' {
  interface FastifyInstance {
    xyo: XYOClient;
  }
}

const fastify = Fastify({ logger: true });

// Register XYO SDK plugin
fastify.register(
  fp(async (instance) => {
    const client = new XYOClient({ token: process.env.XYO_API_KEY });
    instance.decorate('xyo', client);
  })
);

// Route handler
fastify.post<{ Body: EnrichmentRequest; Reply: EnrichmentResponse }>(
  '/api/transactions/enrich',
  async (request, reply) => {
    const enriched = await fastify.xyo.enrichTransaction(request.body);
    return reply.send(enriched);
  }
);

await fastify.listen({ port: 3000 });
```

---

### 4. Serverless & Edge Runtimes (AWS Lambda & Cloudflare Workers)

Because the SDK has **0 runtime dependencies** and uses standard Web `fetch`, cold boot latency is **sub-10ms** across all major serverless runtimes.

#### AWS Lambda (Node.js 20 / 22)

```typescript
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { XYOClient, ResponseError } from 'xyo-sdk';

// Instantiate outside the handler for container reuse across warm invocations
const xyo = new XYOClient({ token: process.env.XYO_API_KEY });

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const body = JSON.parse(event.body ?? '{}');
    const enriched = await xyo.enrichTransaction({
      content: body.content,
      countryCode: body.countryCode,
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(enriched),
    };
  } catch (error) {
    const statusCode = error instanceof ResponseError ? error.response.status : 500;
    return {
      statusCode,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
```

#### Cloudflare Workers / Edge Runtime

```typescript
import { XYOClient, type EnrichmentRequest } from 'xyo-sdk';

export interface Env {
  XYO_API_KEY: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    const xyo = new XYOClient({
      token: env.XYO_API_KEY,
      fetchApi: fetch, // Native Edge fetch
    });

    const body: EnrichmentRequest = await request.json();
    const result = await xyo.enrichTransaction(body);

    return Response.json(result);
  },
};
```

---

## ⚙️ Configuration Reference

The `XYOClient` constructor accepts an `XYOClientOptions` object:

```typescript
export interface XYOClientOptions {
  /**
   * Your XYO Financial API Key / Bearer Token
   */
  token?: string

  /**
   * Alias for token
   */
  apiKey?: string

  /**
   * Custom API Base URL (defaults to https://api.xyo.financial)
   */
  baseUrl?: string

  /**
   * Custom Base Path (alias for baseUrl)
   */
  basePath?: string

  /**
   * Custom Fetch implementation (defaults to globalThis.fetch)
   */
  fetchApi?: typeof fetch
}
```

---

## 🔌 Advanced: Middleware & Interceptors

The underlying `EnrichmentApi` extends `BaseAPI`, enabling pre-request mutation and post-response telemetry hooks:

```typescript
import { Configuration, EnrichmentApi, type Middleware } from 'xyo-sdk'

const loggingMiddleware: Middleware = {
  pre: async (context) => {
    console.info(`[XYO Request] ${context.init.method} ${context.url}`)
    return context
  },
  post: async (context) => {
    console.info(`[XYO Response] ${context.response.status} from ${context.url}`)
    return context.response
  },
  onError: async (context) => {
    console.error(`[XYO Network Error]`, context.error)
    return context.response
  },
}

const config = new Configuration({
  accessToken: process.env.XYO_API_KEY,
  middleware: [loggingMiddleware],
})

const api = new EnrichmentApi(config)
```

---

## 📚 TypeScript Interfaces

| Interface / Class | Export Path | Description |
| :--- | :--- | :--- |
| `XYOClient` / `Client` | `xyo-sdk` | Main client providing high-level synchronous and batch enrichment methods. |
| `EnrichmentRequest` | `xyo-sdk` | Single enrichment input payload (`content`, `countryCode`). |
| `EnrichmentResponse` | `xyo-sdk` | Enriched merchant entity (`merchant`, `description`, `categories`, `logo`, `location`, `address`). |
| `EnrichTransactionsRequestInner` | `xyo-sdk` | Array element for bulk enrichment batch submissions. |
| `EnrichTransactionCollectionResponse` | `xyo-sdk` | Bulk job initialization response (`id`, `link`). |
| `EnrichmentCollectionStatusResponse` | `xyo-sdk` | Bulk job status polling response (`status`: `READY`, `PENDING`, `FAILED`). |
| `APIError` | `xyo-sdk` | Single RFC 7807 problem detail object (`type`, `title`, `status`, `detail`, `instance`). |
| `ErrorResponse` | `xyo-sdk` | RFC 7807 container response (`errors: APIError[]`). |
| `ResponseError` | `xyo-sdk` | Runtime exception thrown on HTTP 4xx/5xx responses. |
| `FetchError` | `xyo-sdk` | Runtime exception thrown on low-level transport failures. |

---

## 🔒 Security & Compliance

- **PCI-DSS & PSD2 Compliant Architecture**: The SDK enforces minimal payload exchange (`content` and `countryCode` only). Never send Primary Account Numbers (PAN), CVVs, passwords, or PII.
- **TLS 1.2+ Transport Security**: All requests are encrypted over standard HTTPS endpoints.
- **Supply Chain Integrity**: 0 runtime third-party dependencies reduces CVE attack surface to zero.

---

## 📄 License

This SDK is released under the **Apache License, Version 2.0** (Apache-2.0). See the [LICENSE](LICENSE) file for complete details.

Copyright &copy; 2026 Syniol Limited. All rights reserved.
