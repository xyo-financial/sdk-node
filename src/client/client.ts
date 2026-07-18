import {
  Request,
  HttpMethod,
  CarbonHttpRequestOption,
} from 'carbon-http'

import {
  EnrichmentService,
  EnrichmentRequest,
  EnrichmentResponse,
  EnrichTransactionCollectionResponse,
  EnrichmentCollectionStatus,
} from '../enrichment/enrichment'

import { ClientError } from './error'
import { SDK_VERSION } from './version'

export interface HttpTransportOptions {
  readonly method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  readonly headers: Record<string, string>
  readonly body?: string
  readonly timeout?: number
}

export interface HttpTransportResponse<T> {
  readonly status: number
  readonly text: () => Promise<string>
  readonly json: () => Promise<T>
}

export type HttpTransportFn = <T>(
  url: string,
  options: HttpTransportOptions,
) => Promise<HttpTransportResponse<T>>

export interface HttpTransport {
  send<T>(
    url: string,
    options: HttpTransportOptions,
  ): Promise<HttpTransportResponse<T>>
}

export interface ClientOptions {
  readonly apiKey: string
  readonly timeoutMs?: number
  readonly endpoint?: string
  readonly transport?: HttpTransport | HttpTransportFn
}

const defaultTransport: HttpTransportFn = async <T>(
  url: string,
  options: HttpTransportOptions,
): Promise<HttpTransportResponse<T>> => {
  const requestOptions: CarbonHttpRequestOption = {
    method: options.method as HttpMethod,
    headers: options.headers,
    ...(options.body !== undefined
      ? { body: options.body }
      : {}),
    ...(options.timeout !== undefined
      ? { timeout: options.timeout }
      : {}),
  }

  const resp = await Request<T>(url, requestOptions)
  return {
    status: resp.status,
    text: () => {
      try {
        return Promise.resolve(resp.text())
      } catch (err) {
        return Promise.reject(
          err instanceof Error
            ? err
            : new Error(String(err)),
        )
      }
    },
    json: () => {
      try {
        return Promise.resolve(resp.json())
      } catch (err) {
        return Promise.reject(
          err instanceof Error
            ? err
            : new Error(String(err)),
        )
      }
    },
  }
}

function validateRequest(
  request: unknown,
): asserts request is EnrichmentRequest {
  if (request == null || typeof request !== 'object') {
    throw new ClientError(
      'Request must be a valid object',
      {
        category: 'validation',
      },
    )
  }
  const r = request as Record<string, unknown>
  if (
    typeof r['content'] !== 'string' ||
    r['content'].trim().length === 0
  ) {
    throw new ClientError(
      'Request content must be a non-empty string',
      {
        category: 'validation',
      },
    )
  }
  if (
    typeof r['countryCode'] !== 'string' ||
    !/^[A-Z]{2}$/.test(r['countryCode'])
  ) {
    throw new ClientError(
      'Request countryCode must be a 2-letter uppercase ISO country code (e.g., "GB")',
      { category: 'validation' },
    )
  }
}

function validateEnrichmentResponse(
  data: unknown,
): EnrichmentResponse {
  if (data == null || typeof data !== 'object') {
    throw new ClientError(
      'Malformed API response: expected JSON object',
      {
        category: 'server_error',
      },
    )
  }
  const d = data as Record<string, unknown>
  const categories = d['categories']
  const validCategories =
    Array.isArray(categories) &&
    categories.every((c) => typeof c === 'string')
  const validLoc =
    d['location'] === null ||
    typeof d['location'] === 'string'
  const validAddr =
    d['address'] === null ||
    typeof d['address'] === 'string'

  if (
    typeof d['merchant'] !== 'string' ||
    typeof d['description'] !== 'string' ||
    !validCategories ||
    typeof d['logo'] !== 'string' ||
    !validLoc ||
    !validAddr
  ) {
    throw new ClientError(
      'Malformed API response: invalid EnrichmentResponse structure',
      { category: 'server_error' },
    )
  }
  return data as EnrichmentResponse
}

function validateEnrichTransactionCollectionResponse(
  data: unknown,
): EnrichTransactionCollectionResponse {
  if (data == null || typeof data !== 'object') {
    throw new ClientError(
      'Malformed API response: expected JSON object',
      {
        category: 'server_error',
      },
    )
  }
  const d = data as Record<string, unknown>
  if (
    typeof d['id'] !== 'string' ||
    typeof d['link'] !== 'string'
  ) {
    throw new ClientError(
      'Malformed API response: invalid EnrichTransactionCollectionResponse structure',
      { category: 'server_error' },
    )
  }
  return data as EnrichTransactionCollectionResponse
}

function validateEnrichTransactionCollectionStatusResponse(
  data: unknown,
): EnrichmentCollectionStatus {
  if (data == null || typeof data !== 'object') {
    throw new ClientError(
      'Malformed API response: expected JSON object',
      {
        category: 'server_error',
      },
    )
  }
  const d = data as Record<string, unknown>
  const status = d['status']
  if (
    status !== EnrichmentCollectionStatus.Ready &&
    status !== EnrichmentCollectionStatus.Failed &&
    status !== EnrichmentCollectionStatus.Pending
  ) {
    throw new ClientError(
      'Malformed API response: invalid status value',
      {
        category: 'server_error',
      },
    )
  }
  return status
}

const DEFAULT_ENDPOINT = 'https://api.xyo.financial'

export class Client implements EnrichmentService {
  /**
   * @deprecated Use the `endpoint` constructor option to configure the API endpoint instead.
   */
  public static readonly BASE_URL = DEFAULT_ENDPOINT

  private readonly timeoutMs: number
  private readonly endpoint: string
  private readonly transport: HttpTransport
  private readonly baseHeaders: Record<string, string>

  public constructor(options: ClientOptions) {
    if (
      !options.apiKey ||
      typeof options.apiKey !== 'string' ||
      options.apiKey.trim().length === 0
    ) {
      throw new ClientError(
        'apiKey is required and must be a non-empty string',
        { category: 'validation' },
      )
    }

    if (
      options.timeoutMs !== undefined &&
      (options.timeoutMs <= 0 ||
        options.timeoutMs > 120000 ||
        !Number.isInteger(options.timeoutMs))
    ) {
      throw new ClientError(
        'timeoutMs must be an integer between 1 and 120000 milliseconds',
        { category: 'validation' },
      )
    }

    const trimmedApiKey = options.apiKey.trim()
    this.timeoutMs = options.timeoutMs ?? 30000
    this.endpoint = (
      options.endpoint ?? DEFAULT_ENDPOINT
    ).replace(/\/+$/, '')

    try {
      new URL(this.endpoint)
    } catch {
      throw new ClientError(
        'endpoint must be a valid URL',
        {
          category: 'validation',
        },
      )
    }

    const rawTransport =
      options.transport ?? defaultTransport
    this.transport =
      typeof rawTransport === 'function'
        ? { send: rawTransport }
        : rawTransport

    // Compute and freeze base headers once at initialization (perf optimization)
    this.baseHeaders = Object.freeze({
      Accept: 'application/json',
      Authorization: `Bearer ${trimmedApiKey}`,
      'X-SDK-Version': SDK_VERSION,
      'User-Agent': `xyo-sdk-node/${SDK_VERSION}`,
    })
  }

  public get endpointUrl(): string {
    return this.endpoint
  }

  public async enrichTransaction(
    request: EnrichmentRequest,
  ): Promise<EnrichmentResponse> {
    validateRequest(request)

    let resp: HttpTransportResponse<EnrichmentResponse>
    try {
      resp = await this.transport.send<EnrichmentResponse>(
        `${this.endpoint}/v1/ai/finance/enrichment/transaction`,
        {
          method: 'POST',
          headers: {
            ...this.baseHeaders,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(request),
          timeout: this.timeoutMs,
        },
      )
    } catch (error) {
      if (error instanceof ClientError) throw error
      throw new ClientError(
        `Transport error: ${error instanceof Error ? error.message : String(error)}`,
        { category: 'network_error', cause: error },
      )
    }

    if (resp.status < 200 || resp.status >= 300) {
      const errorBody = await resp.text()
      throw ClientError.fromApiResponse(
        errorBody,
        resp.status,
      )
    }

    let parsedJson: unknown
    try {
      parsedJson = await resp.json()
    } catch (error) {
      throw new ClientError(
        'Malformed API response: failed to parse JSON payload',
        {
          category: 'server_error',
          cause: error,
        },
      )
    }

    return validateEnrichmentResponse(parsedJson)
  }

  public async enrichTransactionCollection(
    request: readonly EnrichmentRequest[],
  ): Promise<EnrichTransactionCollectionResponse> {
    if (!Array.isArray(request)) {
      throw new ClientError(
        'Request collection must be an array',
        {
          category: 'validation',
        },
      )
    }
    if (request.length === 0) {
      throw new ClientError(
        'Request collection must contain at least one transaction request',
        { category: 'validation' },
      )
    }
    for (const req of request) {
      validateRequest(req)
    }

    let resp: HttpTransportResponse<EnrichTransactionCollectionResponse>
    try {
      resp =
        await this.transport.send<EnrichTransactionCollectionResponse>(
          `${this.endpoint}/v1/ai/finance/enrichment/transactions`,
          {
            method: 'POST',
            headers: {
              ...this.baseHeaders,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(request),
            timeout: this.timeoutMs,
          },
        )
    } catch (error) {
      if (error instanceof ClientError) throw error
      throw new ClientError(
        `Transport error: ${error instanceof Error ? error.message : String(error)}`,
        { category: 'network_error', cause: error },
      )
    }

    if (resp.status < 200 || resp.status >= 300) {
      const errorBody = await resp.text()
      throw ClientError.fromApiResponse(
        errorBody,
        resp.status,
      )
    }

    let parsedJson: unknown
    try {
      parsedJson = await resp.json()
    } catch (error) {
      throw new ClientError(
        'Malformed API response: failed to parse JSON payload',
        {
          category: 'server_error',
          cause: error,
        },
      )
    }

    return validateEnrichTransactionCollectionResponse(
      parsedJson,
    )
  }

  public async enrichTransactionCollectionStatus(
    id: string,
  ): Promise<EnrichmentCollectionStatus> {
    if (typeof id !== 'string' || id.trim().length === 0) {
      throw new ClientError(
        'Collection Job ID must be a non-empty string',
        {
          category: 'validation',
        },
      )
    }

    let resp: HttpTransportResponse<unknown>
    try {
      resp = await this.transport.send<unknown>(
        `${this.endpoint}/v1/ai/finance/enrichment/transactions/status/${encodeURIComponent(id)}`,
        {
          method: 'GET',
          headers: this.baseHeaders,
          timeout: this.timeoutMs,
        },
      )
    } catch (error) {
      if (error instanceof ClientError) throw error
      throw new ClientError(
        `Transport error: ${error instanceof Error ? error.message : String(error)}`,
        { category: 'network_error', cause: error },
      )
    }

    if (resp.status < 200 || resp.status >= 300) {
      const errorBody = await resp.text()
      throw ClientError.fromApiResponse(
        errorBody,
        resp.status,
      )
    }

    let parsedJson: unknown
    try {
      parsedJson = await resp.json()
    } catch (error) {
      throw new ClientError(
        'Malformed API response: failed to parse JSON payload',
        {
          category: 'server_error',
          cause: error,
        },
      )
    }

    return validateEnrichTransactionCollectionStatusResponse(
      parsedJson,
    )
  }
}
