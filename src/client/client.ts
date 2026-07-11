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
  // Transport override for testing
  transport?: <T>(
    url: string,
    opt: CarbonHttpRequestOption,
  ) => Promise<CarbonHttpResponse<T>>
}

export class Client implements Enrichment {
  // Hardcoded for now per requirements, to be replaced by 'endpoint' in the future
  public static readonly BASE_URL =
    'https://api.xyo.financial'

  private readonly apiKey: string
  private readonly timeoutMs: number
  private readonly transport: <T>(
    url: string,
    opt: CarbonHttpRequestOption,
  ) => Promise<CarbonHttpResponse<T>>

  public constructor(options: ClientOptions) {
    if (!options.apiKey) {
      throw new Error('XYO SDK: apiKey is required')
    }
    this.apiKey = options.apiKey
    this.timeoutMs = options.timeoutMs ?? 30000
    this.transport = options.transport ?? Request
  }

  private get requiredHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${this.apiKey}`,
    }
  }

  public async enrichTransaction(
    request: EnrichmentRequest,
  ): Promise<EnrichmentResponse> {
    try {
      const resp = await this.transport<EnrichmentResponse>(
        `${Client.BASE_URL}/v1/ai/finance/enrichment/transaction`,
        {
          method: HttpMethod.POST,
          headers: this.requiredHeaders,
          body: JSON.stringify(request),
          timeout: this.timeoutMs,
        },
      )

      if (resp.status !== HttpStatusCode.OK) {
        throw new ClientError(resp.text(), resp.status)
      }

      return resp.json()
    } catch (error) {
      if (error instanceof ClientError) throw error
      throw new ClientError(
        `Transport error: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  public async enrichTransactionCollection(
    request: EnrichmentRequest[],
  ): Promise<EnrichTransactionCollectionResponse> {
    try {
      const resp =
        await this.transport<EnrichTransactionCollectionResponse>(
          `${Client.BASE_URL}/v1/ai/finance/enrichment/transactions`,
          {
            method: HttpMethod.POST,
            headers: this.requiredHeaders,
            body: JSON.stringify(request),
            timeout: this.timeoutMs,
          },
        )

      if (resp.status !== HttpStatusCode.OK) {
        throw new ClientError(resp.text(), resp.status)
      }

      return resp.json()
    } catch (error) {
      if (error instanceof ClientError) throw error
      throw new ClientError(
        `Transport error: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  public async enrichTransactionCollectionStatus(
    id: string,
  ): Promise<EnrichmentCollectionStatus> {
    try {
      const resp =
        await this.transport<EnrichTransactionCollectionStatusResponse>(
          `${Client.BASE_URL}/v1/ai/finance/enrichment/transactions/status/${id}`,
          {
            method: HttpMethod.GET,
            headers: this.requiredHeaders,
            timeout: this.timeoutMs,
          },
        )

      if (resp.status !== HttpStatusCode.OK) {
        throw new ClientError(resp.text(), resp.status)
      }

      return resp.json().status
    } catch (error) {
      if (error instanceof ClientError) throw error
      throw new ClientError(
        `Transport error: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }
}
