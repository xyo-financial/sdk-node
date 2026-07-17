import {
  Request,
  HttpMethod,
  HttpStatusCode,
  CarbonHttpResponse,
  CarbonHttpRequestOption,
} from 'carbon-http'

import {
  Enrichment,
  EnrichmentRequest,
  EnrichmentResponse,
  EnrichTransactionCollectionResponse,
  EnrichmentCollectionStatus,
  EnrichTransactionCollectionStatusResponse,
} from '../enrichment/enrichment'

import { ClientError } from './error'

export interface ClientOptions {
  apiKey: string
  timeoutMs?: number
  endpoint?: string
  // Transport override for testing
  transport?: <T>(
    url: string,
    opt: CarbonHttpRequestOption,
  ) => Promise<CarbonHttpResponse<T>>
}

function validateRequest(request: EnrichmentRequest): void {
  if (
    (request as unknown) === null ||
    (request as unknown) === undefined ||
    typeof request !== 'object'
  ) {
    throw new ClientError(
      'Request must be a valid object',
      { category: 'validation' },
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
  private readonly transport: <T>(
    url: string,
    opt: CarbonHttpRequestOption,
  ) => Promise<CarbonHttpResponse<T>>

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
    this.transport = options.transport ?? Request
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
          method: HttpMethod.POST,
          headers: this.requiredHeaders,
          body: JSON.stringify(request),
          timeout: this.timeoutMs,
        },
      )

      if (resp.status !== HttpStatusCode.OK) {
        throw new ClientError(resp.text(), {
          statusCode: resp.status,
        })
      }

      const data = resp.json() as unknown
      if (
        data === null ||
        data === undefined ||
        typeof data !== 'object'
      ) {
        throw new ClientError(
          'Malformed API response: expected JSON object',
          {
            category: 'server_error',
          },
        )
      }

      return data as EnrichmentResponse
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
            method: HttpMethod.POST,
            headers: this.requiredHeaders,
            body: JSON.stringify(request),
            timeout: this.timeoutMs,
          },
        )

      if (resp.status !== HttpStatusCode.OK) {
        throw new ClientError(resp.text(), {
          statusCode: resp.status,
        })
      }

      const data = resp.json() as unknown
      if (
        data === null ||
        data === undefined ||
        typeof data !== 'object'
      ) {
        throw new ClientError(
          'Malformed API response: expected JSON object',
          {
            category: 'server_error',
          },
        )
      }

      return data as EnrichTransactionCollectionResponse
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
      const resp =
        await this.transport<EnrichTransactionCollectionStatusResponse>(
          `${this.endpoint}/v1/ai/finance/enrichment/transactions/status/${id}`,
          {
            method: HttpMethod.GET,
            headers: this.requiredHeaders,
            timeout: this.timeoutMs,
          },
        )

      if (resp.status !== HttpStatusCode.OK) {
        throw new ClientError(resp.text(), {
          statusCode: resp.status,
        })
      }

      const data = resp.json() as unknown
      if (
        data === null ||
        data === undefined ||
        typeof data !== 'object' ||
        !('status' in data)
      ) {
        throw new ClientError(
          'Malformed API response: status is missing',
          {
            category: 'server_error',
          },
        )
      }

      return data.status as EnrichmentCollectionStatus
    } catch (error) {
      if (error instanceof ClientError) throw error
      throw new ClientError(
        `Transport error: ${error instanceof Error ? error.message : String(error)}`,
        { category: 'network_error', cause: error },
      )
    }
  }
}
