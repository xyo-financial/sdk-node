/**
 * Request payload for transaction enrichment.
 */
export interface EnrichmentRequest {
  /**
   * The raw transaction description or narrative content to enrich (e.g., "Costa Coffee London").
   */
  readonly content: string
  /**
   * Two-letter ISO country code where the transaction occurred (e.g., "GB").
   */
  readonly countryCode: string
}

/**
 * Result details of a single transaction enrichment request.
 */
export interface EnrichmentResponse {
  /**
   * Cleansed and standardized merchant name.
   */
  readonly merchant: string
  /**
   * Descriptive narrative detailing the merchant's business type or context.
   */
  readonly description: string
  /**
   * Structured list of category labels mapped to this transaction.
   */
  readonly categories: readonly string[]
  /**
   * Public URL or base64 representation of the merchant's logo.
   */
  readonly logo: string
  /**
   * Geographic location of the transaction, or null if undetermined.
   */
  readonly location: string | null
  /**
   * Formatted address location of the transaction, or null if undetermined.
   */
  readonly address: string | null
}

/**
 * Response payload indicating successful queueing of a bulk transaction enrichment job.
 */
export interface EnrichTransactionCollectionResponse {
  /**
   * Unique identifier generated for the asynchronous enrichment job.
   */
  readonly id: string
  /**
   * Temporary URL link to poll or fetch final results once processing is complete.
   */
  readonly link: string
}

/**
 * Enumeration of possible states for a bulk enrichment collection job.
 */
export enum EnrichmentCollectionStatus {
  /** Job processing has completed and results are ready. */
  Ready = 'READY',
  /** Job processing failed due to errors. */
  Failed = 'FAILED',
  /** Job processing is still underway. */
  Pending = 'PENDING',
}

/**
 * Interface contract defining enrichment client operations.
 */
export interface EnrichmentService {
  /**
   * Enriches a single transaction narrative with structured metadata.
   *
   * @param request - Configuration options including the content and country code of the transaction.
   * @returns A promise resolving to the enriched merchant, description, categories, logo, and location.
   * @throws ClientError if validation fails, network issues occur, or the API returns an error response.
   */
  enrichTransaction(
    request: EnrichmentRequest,
  ): Promise<EnrichmentResponse>

  /**
   * Queues a batch of transaction requests for asynchronous enrichment.
   *
   * @param request - Array of transaction requests to be enriched.
   * @returns A promise resolving to details containing the job id and result link.
   * @throws ClientError if validation fails, input array size conditions are violated, or the API returns an error.
   */
  enrichTransactionCollection(
    request: readonly EnrichmentRequest[],
  ): Promise<EnrichTransactionCollectionResponse>

  /**
   * Retrieves the current processing status of a queued transaction enrichment collection job.
   *
   * @param id - The unique job identifier.
   * @returns A promise resolving to the status of the enrichment collection (Ready, Pending, or Failed).
   * @throws ClientError if the job ID validation fails, network error occurs, or the API returns an error.
   */
  enrichTransactionCollectionStatus(
    id: string,
  ): Promise<EnrichmentCollectionStatus>
}

/**
 * @deprecated Use EnrichmentService interface instead.
 */
export type Enrichment = EnrichmentService
