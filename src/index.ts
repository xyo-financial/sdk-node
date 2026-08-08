import {
  Configuration,
  EnrichmentApi,
  EnrichmentRequest,
  EnrichTransactionsRequestInner,
  EnrichmentResponse,
  EnrichTransactionCollectionResponse,
  EnrichmentCollectionStatusResponse,
} from './generated'

export * from './generated'

export interface XYOClientOptions {
  /**
   * Your XYO Financial API Token (Bearer token / API key)
   */
  token?: string
  /**
   * Your XYO Financial API Key (alias for token)
   */
  apiKey?: string
  /**
   * Custom Base URL (optional, defaults to https://api.xyo.financial)
   */
  baseUrl?: string
  /**
   * Custom Base Path (optional alias for baseUrl)
   */
  basePath?: string
  /**
   * Custom fetch implementation (optional)
   */
  fetchApi?: typeof fetch
}

/**
 * XYO Financial SDK Client
 */
export class XYOClient {
  private readonly _api: EnrichmentApi

  constructor(options: XYOClientOptions) {
    const basePath = (
      options.baseUrl ??
      options.basePath ??
      'https://api.xyo.financial'
    ).replace(/\/+$/, '')
    const accessToken = options.token ?? options.apiKey
    const config = new Configuration({
      basePath,
      accessToken,
      fetchApi: options.fetchApi,
    })

    this._api = new EnrichmentApi(config)
  }

  /**
   * Transaction Enrichment Services
   */
  public get enrichment() {
    return {
      /**
       * Enriches a single transaction narrative with structured metadata.
       */
      enrichTransaction: async (
        request: EnrichmentRequest,
      ): Promise<EnrichmentResponse> => {
        return this._api.enrichTransaction({
          enrichmentRequest: request,
        })
      },

      /**
       * Queues a batch of transaction requests for asynchronous enrichment.
       */
      enrichTransactions: async (
        transactions: EnrichTransactionsRequestInner[],
      ): Promise<EnrichTransactionCollectionResponse> => {
        return this._api.enrichTransactions({
          enrichTransactionsRequestInner: transactions,
        })
      },

      /**
       * Retrieves the current processing status of a queued bulk job.
       */
      getEnrichmentStatus: async (
        id: string,
      ): Promise<EnrichmentCollectionStatusResponse> => {
        return this._api.getEnrichmentStatus({ id })
      },
    }
  }

  /**
   * Enriches a single transaction narrative with structured metadata.
   */
  public async enrichTransaction(
    request: EnrichmentRequest,
  ): Promise<EnrichmentResponse> {
    return this.enrichment.enrichTransaction(request)
  }

  /**
   * Queues a batch of transaction requests for asynchronous enrichment.
   */
  public async enrichTransactions(
    transactions: EnrichTransactionsRequestInner[],
  ): Promise<EnrichTransactionCollectionResponse> {
    return this.enrichment.enrichTransactions(transactions)
  }

  /**
   * Retrieves the current processing status of a queued bulk job.
   */
  public async getEnrichmentStatus(
    id: string,
  ): Promise<EnrichmentCollectionStatusResponse> {
    return this.enrichment.getEnrichmentStatus(id)
  }
}

export { XYOClient as Client }
export type { XYOClientOptions as ClientOptions }
