# EnrichmentApi

All URIs are relative to *https://api.xyo.financial*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**enrichTransaction**](EnrichmentApi.md#enrichtransaction) | **POST** /v1/ai/finance/enrichment/transaction | Transaction Enrichment |
| [**enrichTransactions**](EnrichmentApi.md#enrichtransactions) | **POST** /v1/ai/finance/enrichment/transactions | Transaction Enrichments |
| [**getEnrichmentStatus**](EnrichmentApi.md#getenrichmentstatus) | **GET** /v1/ai/finance/enrichment/status/{id} | Transaction Enrichments Status |



## enrichTransaction

> EnrichmentResponse enrichTransaction(enrichmentRequest, xCorrelationID, traceparent)

Transaction Enrichment

Enrich a single financial transaction synchronously.

### Example

```ts
import {
  Configuration,
  EnrichmentApi,
} from '';
import type { EnrichTransactionRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: BearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new EnrichmentApi(config);

  const body = {
    // EnrichmentRequest | Transaction enrichment request payload containing payment text and ISO-3166-1 alpha-2 country code.
    enrichmentRequest: {"content":"COSTA PICKUP LONDON","countryCode":"GB"},
    // string | Unique caller correlation identifier (UUIDv4) for distributed tracing across microservice boundaries. (optional)
    xCorrelationID: 9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d,
    // string | Standard W3C TraceContext header (version-trace_id-parent_id-trace_flags) for distributed APM tracing. (optional)
    traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01,
  } satisfies EnrichTransactionRequest;

  try {
    const data = await api.enrichTransaction(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **enrichmentRequest** | [EnrichmentRequest](EnrichmentRequest.md) | Transaction enrichment request payload containing payment text and ISO-3166-1 alpha-2 country code. | |
| **xCorrelationID** | `string` | Unique caller correlation identifier (UUIDv4) for distributed tracing across microservice boundaries. | [Optional] [Defaults to `undefined`] |
| **traceparent** | `string` | Standard W3C TraceContext header (version-trace_id-parent_id-trace_flags) for distributed APM tracing. | [Optional] [Defaults to `undefined`] |

### Return type

[**EnrichmentResponse**](EnrichmentResponse.md)

### Authorization

[BearerAuth](../README.md#BearerAuth)

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful response returning enriched merchant and categorization details. |  * X-Correlation-ID -  <br>  |
| **429** | Too Many Requests - Rate limit or quota exceeded. |  * Retry-After -  <br>  * RateLimit-Limit -  <br>  * RateLimit-Remaining -  <br>  * RateLimit-Reset -  <br>  * X-Correlation-ID -  <br>  |
| **3XX** | Redirection |  -  |
| **4XX** | Client Error |  * X-Correlation-ID -  <br>  |
| **5XX** | Server Error |  * X-Correlation-ID -  <br>  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## enrichTransactions

> EnrichTransactionCollectionResponse enrichTransactions(enrichTransactionsRequestInner, xApiUser, xCorrelationID, traceparent)

Transaction Enrichments

Enrich a collection of financial transactions asynchronously.

### Example

```ts
import {
  Configuration,
  EnrichmentApi,
} from '';
import type { EnrichTransactionsRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: BearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new EnrichmentApi(config);

  const body = {
    // Array<EnrichTransactionsRequestInner> | Array of transaction enrichment requests (minimum 1, maximum 50,000 items) for asynchronous batch processing.
    enrichTransactionsRequestInner: [{"content":"COSTA PICKUP LONDON","countryCode":"GB"},{"content":"STARBUCKS STORE #10423 SEATTLE WA","countryCode":"US"},{"content":"UBER *TRIP 12345 HELP.UBER.COM","countryCode":"GB"},{"content":"TfL Travel Charge tfl.gov.uk","countryCode":"GB"}],
    // string | Optional identifier for the API user or tenant. (optional)
    xApiUser: syniol,
    // string | Unique caller correlation identifier (UUIDv4) for distributed tracing across microservice boundaries. (optional)
    xCorrelationID: 9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d,
    // string | Standard W3C TraceContext header (version-trace_id-parent_id-trace_flags) for distributed APM tracing. (optional)
    traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01,
  } satisfies EnrichTransactionsRequest;

  try {
    const data = await api.enrichTransactions(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **enrichTransactionsRequestInner** | `Array<EnrichTransactionsRequestInner>` | Array of transaction enrichment requests (minimum 1, maximum 50,000 items) for asynchronous batch processing. | |
| **xApiUser** | `string` | Optional identifier for the API user or tenant. | [Optional] [Defaults to `undefined`] |
| **xCorrelationID** | `string` | Unique caller correlation identifier (UUIDv4) for distributed tracing across microservice boundaries. | [Optional] [Defaults to `undefined`] |
| **traceparent** | `string` | Standard W3C TraceContext header (version-trace_id-parent_id-trace_flags) for distributed APM tracing. | [Optional] [Defaults to `undefined`] |

### Return type

[**EnrichTransactionCollectionResponse**](EnrichTransactionCollectionResponse.md)

### Authorization

[BearerAuth](../README.md#BearerAuth)

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful response returning bulk job ID and download archive link. |  * X-Correlation-ID -  <br>  |
| **429** | Too Many Requests - Rate limit or quota exceeded. |  * Retry-After -  <br>  * RateLimit-Limit -  <br>  * RateLimit-Remaining -  <br>  * RateLimit-Reset -  <br>  * X-Correlation-ID -  <br>  |
| **3XX** | Redirection |  -  |
| **4XX** | Client Error |  * X-Correlation-ID -  <br>  |
| **5XX** | Server Error |  * X-Correlation-ID -  <br>  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## getEnrichmentStatus

> EnrichmentCollectionStatusResponse getEnrichmentStatus(id, xApiUser, xCorrelationID, traceparent)

Transaction Enrichments Status

Get the status of an asynchronous bulk enrichment job.

### Example

```ts
import {
  Configuration,
  EnrichmentApi,
} from '';
import type { GetEnrichmentStatusRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: BearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new EnrichmentApi(config);

  const body = {
    // string | The unique identifier of the asynchronous bulk enrichment job.
    id: 72c037df-d0d3-43ee-9470-323ff35a2e50,
    // string | Optional identifier for the API user or tenant. (optional)
    xApiUser: syniol,
    // string | Unique caller correlation identifier (UUIDv4) for distributed tracing across microservice boundaries. (optional)
    xCorrelationID: 9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d,
    // string | Standard W3C TraceContext header (version-trace_id-parent_id-trace_flags) for distributed APM tracing. (optional)
    traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01,
  } satisfies GetEnrichmentStatusRequest;

  try {
    const data = await api.getEnrichmentStatus(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **id** | `string` | The unique identifier of the asynchronous bulk enrichment job. | [Defaults to `undefined`] |
| **xApiUser** | `string` | Optional identifier for the API user or tenant. | [Optional] [Defaults to `undefined`] |
| **xCorrelationID** | `string` | Unique caller correlation identifier (UUIDv4) for distributed tracing across microservice boundaries. | [Optional] [Defaults to `undefined`] |
| **traceparent** | `string` | Standard W3C TraceContext header (version-trace_id-parent_id-trace_flags) for distributed APM tracing. | [Optional] [Defaults to `undefined`] |

### Return type

[**EnrichmentCollectionStatusResponse**](EnrichmentCollectionStatusResponse.md)

### Authorization

[BearerAuth](../README.md#BearerAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful response returning the current processing status of the bulk enrichment job. |  * X-Correlation-ID -  <br>  |
| **429** | Too Many Requests - Rate limit or quota exceeded. |  * Retry-After -  <br>  * RateLimit-Limit -  <br>  * RateLimit-Remaining -  <br>  * RateLimit-Reset -  <br>  * X-Correlation-ID -  <br>  |
| **3XX** | Redirection |  -  |
| **4XX** | Client Error |  * X-Correlation-ID -  <br>  |
| **5XX** | Server Error |  * X-Correlation-ID -  <br>  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

