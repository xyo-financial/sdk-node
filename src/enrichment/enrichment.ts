export interface EnrichmentRequest {
  content: string
  countryCode: string
}

export interface EnrichmentResponse {
  merchant: string
  description: string
  categories: string[]
  logo: string
  location: string | null
  address: string | null
}

export interface EnrichTransactionCollectionResponse {
  id: string
  link: string
}

export interface EnrichTransactionCollectionStatusResponse {
  status: EnrichmentCollectionStatus
}

export enum EnrichmentCollectionStatus {
  Ready = 'READY',
  Failed = 'FAILED',
  Pending = 'PENDING',
}

export interface Enrichment {
  enrichTransaction(
    request: EnrichmentRequest,
  ): Promise<EnrichmentResponse>
  enrichTransactionCollection(
    request: EnrichmentRequest[],
  ): Promise<EnrichTransactionCollectionResponse>
  enrichTransactionCollectionStatus(
    id: string,
  ): Promise<EnrichmentCollectionStatus>
}
