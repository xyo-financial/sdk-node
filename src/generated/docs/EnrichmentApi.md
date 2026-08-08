# EnrichmentApi

All URIs are relative to *https://api.xyo.financial*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**enrichTransaction**](EnrichmentApi.md#enrichtransaction) | **POST** /v1/ai/finance/enrichment/transaction | Transaction Enrichment |
| [**enrichTransactions**](EnrichmentApi.md#enrichtransactions) | **POST** /v1/ai/finance/enrichment/transactions | Transaction Enrichments |
| [**getEnrichmentStatus**](EnrichmentApi.md#getenrichmentstatus) | **GET** /v1/ai/finance/enrichment/status/{id} | Transaction Enrichments Status |



## enrichTransaction

> EnrichmentResponse enrichTransaction(enrichmentRequest)

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
    // EnrichmentRequest (optional)
    enrichmentRequest: {"content":"COSTA PICKUP","countryCode":"GB"},
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
| **enrichmentRequest** | [EnrichmentRequest](EnrichmentRequest.md) |  | [Optional] |

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
| **200** | Successful response |  -  |
| **3XX** | Redirection |  -  |
| **4XX** | Client Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## enrichTransactions

> EnrichTransactionCollectionResponse enrichTransactions(xApiUser, enrichTransactionsRequestInner)

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
    // any (optional)
    xApiUser: syniol,
    // Array<EnrichTransactionsRequestInner> (optional)
    enrichTransactionsRequestInner: [{"content":"COSTA COLLECT","countryCode":"GB"}],
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
| **xApiUser** | `any` |  | [Optional] [Defaults to `undefined`] |
| **enrichTransactionsRequestInner** | `Array<EnrichTransactionsRequestInner>` |  | [Optional] |

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
| **200** | Successful response |  -  |
| **3XX** | Redirection |  -  |
| **4XX** | Client Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## getEnrichmentStatus

> EnrichmentCollectionStatusResponse getEnrichmentStatus(id, xApiUser)

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
    // string
    id: id_example,
    // any (optional)
    xApiUser: syniol,
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
| **id** | `string` |  | [Defaults to `undefined`] |
| **xApiUser** | `any` |  | [Optional] [Defaults to `undefined`] |

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
| **200** | Successful response |  -  |
| **3XX** | Redirection |  -  |
| **4XX** | Client Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

