<p align="center">
    <a href="https://xyo.financial" target="blank"><img alt="XYO Financial Logo" width="50%" src="https://github.com/syniol/xyo-sdk-node/blob/main/docs/mascot.png?raw=true" /></a>
    <br/>
    <b>Enterprise-Grade Financial Transaction Enrichment SDK for Node.js</b>
</p>

<p align="center">
    <img src="https://github.com/syniol/xyo-sdk-node/actions/workflows/release.yml/badge.svg" alt="Release Pipeline" />
    <img src="https://img.shields.io/badge/Security-npm%20audit%20passing-success" alt="Security Audit" />
    <img src="https://img.shields.io/badge/TypeScript-Strict-blue" alt="TypeScript Strict" />
    <img src="https://img.shields.io/badge/Node.js-%3E%3D18.0.0-brightgreen" alt="Node Compatibility" />
</p>

---

## 📖 Executive Summary

The **XYO Financial SDK** provides an elegant, zero-dependency (runtime), strictly-typed interface for integrating XYO's transaction enrichment engine into enterprise Node.js environments. Engineered with the rigorous demands of Tier-1 financial institutions in mind, this SDK facilitates the seamless translation of raw, cryptic payment strings into rich, categorised, and actionable merchant data.

Maintained by [Syniol Limited](https://syniol.com) as the official Node.js distribution for XYO.Financial, this SDK is designed to be embedded within mission-critical paths—from real-time payment authorization flows to high-throughput nightly batch processing.

## 🏗 Enterprise Architectural Principles

1. **Type-Safe by Default**: Built entirely in strict TypeScript. Complete interface exposure ensures robust compile-time guarantees, deterministic object shapes, and flawless IDE intellisense.
2. **Resilience & Fault Tolerance**: Exposes configurable network timeout controls, explicit typed error structures (`ClientError`), and granular HTTP status propagation to seamlessly integrate with enterprise circuit-breakers and retry policies.
3. **Stateless & Secure**: The SDK is completely stateless. It performs no local caching of PII, maintains strict TLS enforcement, and relies on secure HTTP bearer token authentication to comply with stringent PCI-DSS and PSD2 environments.
4. **High-Throughput Capabilities**: Supports both synchronous single-transaction enrichment for low-latency paths, and asynchronous bulk-collection ingestion for high-volume ETL pipelines.

---

## ⚙️ System Requirements

- **Runtime**: Node.js v18.0.0 or higher (LTS versions recommended).
- **Network**: Outbound internet access to `api.xyo.financial` over port `443` (TLS 1.2+).
- **Authentication**: A valid API Key obtained from the [XYO.Financial Dashboard](https://xyo.financial/dashboard).

## 📦 Installation

Integrate the SDK via your preferred package manager. It is distributed as both CommonJS (CJS) and ECMAScript Modules (ESM).

```bash
# npm
npm install xyo-sdk

# yarn
yarn add xyo-sdk

# pnpm
pnpm add xyo-sdk
```

---

## 🚀 Integration Patterns

### 1. Initialization

Initialize the `Client` as a singleton within your application's dependency injection container or module scope.

```typescript
import { Client } from 'xyo-sdk';

// Initialize with environment variables (Best Practice)
const xyoClient = new Client({ 
  apiKey: process.env.XYO_API_KEY,
  timeoutMs: 30000, // 30-second timeout for resilient network bounding
});
```

### 2. Real-Time Enrichment (Synchronous)

Designed for the critical path of a transaction flow, providing sub-second resolution of raw payment strings to merchant entities.

```typescript
import { ClientError } from 'xyo-sdk';

async function processPayment(rawDescription: string, country: string) {
  try {
    const enrichedData = await xyoClient.enrichTransaction({
      content: rawDescription, // e.g., 'AMZN Mktp UK*1M23456'
      countryCode: country,    // ISO 3166-1 alpha-2, e.g., 'GB'
    });

    // Highly structured, deterministic response
    console.info(`Merchant Identified: ${enrichedData.merchant.name}`);
    console.info(`Category: ${enrichedData.categories[0].name}`);
    console.info(`Confidence Score: ${enrichedData.confidence}`);

    return enrichedData;

  } catch (error) {
    if (error instanceof ClientError) {
      // Handle known API rejection (e.g., 400 Bad Request, 401 Unauthorized, 429 Too Many Requests)
      console.error(`XYO API Error [${error.statusCode}]: ${error.message}`);
    } else {
      // Handle network-level or systemic failures (e.g., DNS resolution, TCP timeouts)
      console.error('Systemic failure reaching XYO Enrichment API', error);
    }
    // Fallback logic for payment processing
    throw error;
  }
}
```

### 3. Batch Processing (Asynchronous Bulk Enrichment)

Designed for data warehousing, nightly reconciliations, or large-scale historical transaction analysis. Operations are queued asynchronously to respect API rate limits and maximize throughput.

```typescript
async function processNightlyBatch(transactions: Array<{content: string, countryCode: string}>) {
  // 1. Submit the batch payload
  const collection = await xyoClient.enrichTransactionCollection(transactions);
  
  console.info(`Batch Accepted. Collection ID: ${collection.id}`);
  
  // 2. Poll for completion status
  // In an enterprise setup, this would typically be handled by a message queue (SQS, RabbitMQ)
  // or a temporal workflow (Step Functions, Temporal.io)
  let status = await xyoClient.enrichTransactionCollectionStatus(collection.id);
  
  while (status === 'PROCESSING' || status === 'PENDING') {
      await new Promise(resolve => setTimeout(resolve, 5000)); // 5 second backoff
      status = await xyoClient.enrichTransactionCollectionStatus(collection.id);
  }

  if (status === 'COMPLETED') {
      console.info(`Batch ${collection.id} processed successfully. Ready for retrieval via webhooks.`);
  } else {
      console.error(`Batch processing failed with status: ${status}`);
  }
}
```

---

## 🛡 Robust Error Handling

The SDK normalizes all operational errors into a structured `ClientError` class, enabling highly reliable control flow and alerting mechanisms.

| HTTP Status | Context | Enterprise Mitigation Strategy |
| :--- | :--- | :--- |
| `400` | Bad Request | Trigger DLQ (Dead Letter Queue) routing for payload inspection. |
| `401` / `403` | Unauthorized | Alert SecOps. Validate API key rotation and secret manager integrity. |
| `429` | Too Many Requests | API limit reached. Implement Exponential Backoff and Jitter (Client handles timeouts, but 429 requires app-level backoff). |
| `500` / `502` / `503` | Server Error | XYO upstream degradation. Open circuit breaker; fallback to raw string processing. |

---

## 🔒 Security & Compliance

- **Zero Third-Party Runtime Dependencies**: Minimizes supply-chain attack vectors. The SDK relies purely on the native Node.js `https` module.
- **Data Minimization**: Send only the raw transaction string and country code. The SDK does not require Account Numbers, Sort Codes, or any strictly regulated PII.
- **TLS Enforcement**: All traffic is strictly bound to `https://`. Downgrade attacks are structurally impossible within the transport layer of the client.

## 📞 Support & SLAs

For Tier-1 enterprise support, SLAs, and dedicated technical account management, please contact your Syniol Limited account representative or reach out via [support@xyo.financial](mailto:support@xyo.financial).

---
*Copyright &copy; 2026 Syniol Limited. All rights reserved. XYO Financial is a trademark of Syniol Limited.*
