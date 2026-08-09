import { createGunzip } from 'node:zlib'
import { pipeline } from 'node:stream/promises'
import { Writable } from 'node:stream'
import {
  Configuration,
  EnrichmentApi,
  EnrichmentRequest,
  EnrichTransactionsRequestInner,
  EnrichmentResponse,
  EnrichmentResponseFromJSON,
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
/**
 * Minimal POSIX/ustar tar entry parser.
 * Each entry is: 512-byte header + ceil(size/512)*512 bytes of content.
 * Header layout (bytes):
 *   0–99:   filename (NUL-terminated)
 *   124–135: file size as ASCII octal (NUL/space padded)
 *   156:    type flag ('0' or '\0' = regular file, '5' = directory)
 */
function parseTar(buf: Buffer): { name: string; content: Buffer }[] {
  const entries: { name: string; content: Buffer }[] = []
  let offset = 0
  while (offset + 512 <= buf.length) {
    // Two consecutive zero-filled blocks signal end-of-archive
    const header = buf.subarray(offset, offset + 512)
    if (header.every((b) => b === 0)) break

    // Filename: bytes 0–99, NUL-terminated
    const nameEnd = header.indexOf(0, 0)
    const name = header.subarray(0, nameEnd < 0 ? 100 : nameEnd).toString('utf8')

    // Type flag: byte 156
    const typeFlag = String.fromCharCode(header[156])

    // File size: bytes 124–135 (octal ASCII, NUL/space padded)
    const sizeStr = header.subarray(124, 136).toString('ascii').replace(/\0/g, '').trim()
    const size = parseInt(sizeStr, 8) || 0

    offset += 512 // skip header block

    if (typeFlag !== '5' && name) {
      // Regular file entry
      const content = buf.subarray(offset, offset + size)
      entries.push({ name, content: Buffer.from(content) })
    }

    // Advance past content blocks (rounded up to 512)
    offset += Math.ceil(size / 512) * 512
  }
  return entries
}

export class XYOClient {
  private readonly _api: EnrichmentApi
  private readonly _token: string | undefined
  private readonly _fetchApi: typeof fetch | undefined

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
    this._token = accessToken
    this._fetchApi = options.fetchApi
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

      /**
       * Downloads and decompresses the enrichment results archive (.tar.gz)
       * from the link returned by enrichTransactions.
       */
      downloadEnrichmentCollection: async (
        downloadUrl: string,
      ): Promise<EnrichmentResponse[]> => {
        return this.downloadEnrichmentCollection(downloadUrl)
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

  /**
   * Downloads and decompresses the `.tar.gz` enrichment results archive
   * produced by the bulk enrichment pipeline.
   *
   * @param downloadUrl - The `link` field returned by `enrichTransactions`.
   * @returns An array of `EnrichmentResponse` objects parsed from the archive.
   * @throws `ResponseError` on non-200 HTTP status.
   * @throws `Error` on decompression or tar-parsing failure.
   */
  public async downloadEnrichmentCollection(
    downloadUrl: string,
  ): Promise<EnrichmentResponse[]> {
    const fetchFn = this._fetchApi ?? globalThis.fetch
    const headers: Record<string, string> = {
      Accept: 'application/gzip',
    }
    if (this._token) {
      headers['Authorization'] = `Bearer ${this._token}`
    }

    const response = await fetchFn(downloadUrl, {
      method: 'GET',
      headers,
    })

    if (response.status < 200 || response.status >= 300) {
      throw new Error(
        `downloadEnrichmentCollection: unexpected HTTP status ${String(response.status)}`,
      )
    }

    if (!response.body) {
      throw new Error(
        'downloadEnrichmentCollection: response body is null',
      )
    }

    // Collect all compressed bytes
    const compressedChunks: Buffer[] = []
    const reader = response.body.getReader()
    let chunk = await reader.read()
    while (!chunk.done) {
      compressedChunks.push(Buffer.from(chunk.value))
      chunk = await reader.read()
    }
    const compressed = Buffer.concat(compressedChunks)

    // Decompress gzip stream using Node.js built-in zlib
    const decompressedChunks: Buffer[] = []
    const gunzip = createGunzip()
    const sink = new Writable({
      write(chunk: Buffer, _encoding, callback) {
        decompressedChunks.push(chunk)
        callback()
      },
    })

    const { Readable } = await import('node:stream')
    await pipeline(Readable.from(compressed), gunzip, sink)

    const tarBuffer = Buffer.concat(decompressedChunks)

    // Parse the tar archive and decode each JSON entry
    const entries = parseTar(tarBuffer)
    const results: EnrichmentResponse[] = []
    for (const entry of entries) {
      if (!entry.name.endsWith('.json')) continue
      const parsed: unknown = JSON.parse(entry.content.toString('utf8'))
      results.push(EnrichmentResponseFromJSON(parsed))
    }
    return results
  }
}

export { XYOClient as Client }
export type { XYOClientOptions as ClientOptions }
