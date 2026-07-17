import {
  Request,
  HttpMethod,
  CarbonHttpRequestOption,
} from 'carbon-http'

import {
  Enrichment,
  EnrichmentRequest,
  EnrichmentResponse,
  EnrichTransactionCollectionResponse,
  EnrichmentCollectionStatus,
} from '../enrichment/enrichment'

import { ClientError } from './error'

export interface HttpTransportOptions {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  headers: Record<string, string>
  body?: string
  timeout?: number
}

export interface HttpTransportResponse<T> {
  status: number
  text: () => string
  json: () => T
}

export type HttpTransport = <T>(
  url: string,
  options: HttpTransportOptions,
) => Promise<HttpTransportResponse<T>>

export interface ClientOptions {
  apiKey: string
  timeoutMs?: number
  endpoint?: string
  // Agnostic transport override for testing & custom client configuration
  transport?: HttpTransport
}

const defaultTransport: HttpTransport = async <T>(
  url: string,
  options: HttpTransportOptions,
): Promise<HttpTransportResponse<T>> => {
  const requestOptions: Record<string, unknown> = {
    method: options.method as HttpMethod,
    headers: options.headers,
  }
  if (options.body !== undefined) {
    requestOptions['body'] = options.body
  }
  if (options.timeout !== undefined) {
    requestOptions['timeout'] = options.timeout
  }

  const resp = await Request<T>(
    url,
    requestOptions as CarbonHttpRequestOption,
  )
  return {
    status: resp.status,
    text: () => resp.text(),
    json: () => resp.json(),
  }
}

function validateRequest(request: EnrichmentRequest): void {
  if (
    (request as unknown) === null ||
    (request as unknown) === undefined ||
    typeof request !== 'object'
  ) {
    throw new ClientError(
      'Request must be a valid object',
      {
        category: 'validation',
      },
    )
  }
  if (
    typeof request.content !== 'string' ||
    request.content.trim().length === 0
  ) {
    throw new ClientError(
      'Request content must be a non-empty string',
      { category: 'validation' },
    )
  }
  if (
    typeof request.countryCode !== 'string' ||
    request.countryCode.trim().length !== 2
  ) {
    throw new ClientError(
      'Request countryCode must be a 2-letter ISO country code (e.g., "GB")',
      {
        category: 'validation',
      },
    )
  }
}

function validateEnrichmentResponse(
  data: unknown,
): EnrichmentResponse {
  if (data === null || typeof data !== 'object') {
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
      {
        category: 'server_error',
      },
    )
  }
  return data as EnrichmentResponse
}

function validateEnrichTransactionCollectionResponse(
  data: unknown,
): EnrichTransactionCollectionResponse {
  if (data === null || typeof data !== 'object') {
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
      {
        category: 'server_error',
      },
    )
  }
  return data as EnrichTransactionCollectionResponse
}

function validateEnrichTransactionCollectionStatusResponse(
  data: unknown,
): EnrichmentCollectionStatus {
  if (data === null || typeof data !== 'object') {
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

export class Client implements Enrichment {
  /**
   * @deprecated Use the `endpoint` constructor option to configure the API endpoint instead.
   */
  public static readonly BASE_URL = DEFAULT_ENDPOINT

  private static readonly SDK_VERSION = '1.1.0'

  private readonly apiKey: string
  private readonly timeoutMs: number
  private readonly endpoint: string
  private readonly transport: HttpTransport

  public constructor(options: ClientOptions) {
    if (
      !options.apiKey ||
      typeof options.apiKey !== 'string' ||
      options.apiKey.trim().length === 0
    ) {
      throw new Error(
        'XYO SDK: apiKey is required and must be a non-empty string',
      )
    }
    this.apiKey = options.apiKey.trim()
    this.timeoutMs = options.timeoutMs ?? 30000
    this.endpoint = (
      options.endpoint ?? DEFAULT_ENDPOINT
    ).replace(/\/+$/, '')
    this.transport = options.transport ?? defaultTransport
  }

  public get endpointUrl(): string {
    return this.endpoint
  }

  private get requiredHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${this.apiKey}`,
      'X-SDK-Version': Client.SDK_VERSION,
      'User-Agent': `xyo-sdk-node/${Client.SDK_VERSION}`,
    }
  }

  public async enrichTransaction(
    request: EnrichmentRequest,
  ): Promise<EnrichmentResponse> {
    validateRequest(request)

    try {
      const resp = await this.transport<EnrichmentResponse>(
        `${this.endpoint}/v1/ai/finance/enrichment/transaction`,
        {
          method: 'POST',
          headers: this.requiredHeaders,
          body: JSON.stringify(request),
          timeout: this.timeoutMs,
        },
      )

      if (resp.status !== 200) {
        throw new ClientError(resp.text(), {
          statusCode: resp.status,
        })
      }

      return validateEnrichmentResponse(resp.json())
    } catch (error) {
      if (error instanceof ClientError) throw error
      throw new ClientError(
        `Transport error: ${error instanceof Error ? error.message : String(error)}`,
        { category: 'network_error', cause: error },
      )
    }
  }

  public async enrichTransactionCollection(
    request: EnrichmentRequest[],
  ): Promise<EnrichTransactionCollectionResponse> {
    if (!Array.isArray(request)) {
      throw new ClientError(
        'Request collection must be an array',
        { category: 'validation' },
      )
    }
    if (request.length === 0) {
      throw new ClientError(
        'Request collection must contain at least one transaction request',
        {
          category: 'validation',
        },
      )
    }
    for (const req of request) {
      validateRequest(req)
    }

    try {
      const resp =
        await this.transport<EnrichTransactionCollectionResponse>(
          `${this.endpoint}/v1/ai/finance/enrichment/transactions`,
          {
            method: 'POST',
            headers: this.requiredHeaders,
            body: JSON.stringify(request),
            timeout: this.timeoutMs,
          },
        )

      if (resp.status !== 200) {
        throw new ClientError(resp.text(), {
          statusCode: resp.status,
        })
      }

      return validateEnrichTransactionCollectionResponse(
        resp.json(),
      )
    } catch (error) {
      if (error instanceof ClientError) throw error
      throw new ClientError(
        `Transport error: ${error instanceof Error ? error.message : String(error)}`,
        { category: 'network_error', cause: error },
      )
    }
  }

  public async enrichTransactionCollectionStatus(
    id: string,
  ): Promise<EnrichmentCollectionStatus> {
    if (typeof id !== 'string' || id.trim().length === 0) {
      throw new ClientError(
        'Collection Job ID must be a non-empty string',
        { category: 'validation' },
      )
    }

    try {
      const resp = await this.transport<unknown>(
        `${this.endpoint}/v1/ai/finance/enrichment/transactions/status/${id}`,
        {
          method: 'GET',
          headers: this.requiredHeaders,
          timeout: this.timeoutMs,
        },
      )

      if (resp.status !== 200) {
        throw new ClientError(resp.text(), {
          statusCode: resp.status,
        })
      }

      return validateEnrichTransactionCollectionStatusResponse(
        resp.json(),
      )
    } catch (error) {
      if (error instanceof ClientError) throw error
      throw new ClientError(
        `Transport error: ${error instanceof Error ? error.message : String(error)}`,
        { category: 'network_error', cause: error },
      )
    }
  }
}
