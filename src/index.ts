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

export const DEFAULT_MAX_TAR_ENTRIES = 50000
export const DEFAULT_MAX_ENTRY_BYTES = 10 * 1024 * 1024 // 10 MiB
export const DEFAULT_MAX_ARCHIVE_BYTES = 100 * 1024 * 1024 // 100 MiB

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
   * Dynamic token supplier for runtime secret rotation (NIST SP 800-57)
   */
  tokenSupplier?: () => string | Promise<string>
  /**
   * Dynamic apiKey supplier (alias for tokenSupplier)
   */
  apiKeySupplier?: () => string | Promise<string>
  /**
   * Custom Base URL (optional, defaults to XYO_API_BASE_URL env or https://api.xyo.financial)
   */
  baseUrl?: string
  /**
   * Custom Base Path (optional alias for baseUrl)
   */
  basePath?: string
  /**
   * Maximum response archive bytes allowed during decompression
   */
  maxArchiveBytes?: number
  /**
   * Custom fetch implementation (optional)
   */
  fetchApi?: typeof fetch
}

/**
 * Sanitizes entry name for error messages to prevent CWE-117 log injection.
 */
function sanitizeEntryName(name: string): string {
  let clean = ''
  for (let i = 0; i < name.length; i++) {
    const code = name.charCodeAt(i)
    if (code < 32 || code === 127) {
      clean += '_'
    } else {
      clean += name[i]
    }
  }
  return clean
}

/**
 * Minimal POSIX/ustar tar entry parser with Zip Slip and DoS protections.
 */
function parseTar(
  buf: Buffer,
  maxEntries = DEFAULT_MAX_TAR_ENTRIES,
  maxEntryBytes = DEFAULT_MAX_ENTRY_BYTES,
): { name: string; content: Buffer }[] {
  const entries: { name: string; content: Buffer }[] = []
  let offset = 0
  let entryCount = 0

  while (offset + 512 <= buf.length) {
    // Two consecutive zero-filled blocks signal end-of-archive
    const header = buf.subarray(offset, offset + 512)
    if (header.every((b) => b === 0)) break

    entryCount++
    if (entryCount > maxEntries) {
      throw new Error(
        `downloadEnrichmentCollection: archive contains too many entries (exceeded limit of ${String(maxEntries)})`,
      )
    }

    // Filename: bytes 0–99, NUL-terminated
    const nameEnd = header.indexOf(0, 0)
    const name = header.subarray(0, nameEnd < 0 ? 100 : nameEnd).toString('utf8')

    // Type flag: byte 156
    const typeFlag = String.fromCharCode(header[156])

    // File size: bytes 124–135 (octal ASCII, NUL/space padded)
    const sizeStr = header.subarray(124, 136).toString('ascii').replace(/\0/g, '').trim()
    const size = parseInt(sizeStr, 8) || 0

    if (size > maxEntryBytes) {
      throw new Error(
        `downloadEnrichmentCollection: entry "${sanitizeEntryName(name)}" size (${String(size)} bytes) exceeds limit of ${String(maxEntryBytes)} bytes`,
      )
    }

    offset += 512 // skip header block

    // Zip-Slip & Path Traversal mitigation
    const isPathTraversal = name.includes('..') || name.startsWith('/') || name.startsWith('\\')

    if (typeFlag !== '5' && name && !isPathTraversal) {
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
  private readonly _basePath: string
  private readonly _tokenSupplier: (() => string | Promise<string>) | undefined
  private readonly _fetchApi: typeof fetch | undefined
  private readonly _maxArchiveBytes: number

  constructor(options: XYOClientOptions) {
    const rawBasePath = (
      options.baseUrl ??
      options.basePath ??
      process.env['XYO_API_BASE_URL'] ??
      'https://api.xyo.financial'
    ).replace(/\/+$/, '')

    this._basePath = rawBasePath
    this._maxArchiveBytes = options.maxArchiveBytes ?? DEFAULT_MAX_ARCHIVE_BYTES
    this._fetchApi = options.fetchApi

    const tokenSupplier = options.tokenSupplier ?? options.apiKeySupplier
    if (tokenSupplier) {
      this._tokenSupplier = tokenSupplier
    } else {
      const staticToken = options.token ?? options.apiKey
      if (staticToken) {
        this._tokenSupplier = () => staticToken
      }
    }

    const currentSupplier = this._tokenSupplier
    const config = new Configuration({
      basePath: this._basePath,
      accessToken: currentSupplier ? () => currentSupplier() : undefined,
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
        if (request.countryCode && request.countryCode.trim().length !== 2) {
          throw new Error(
            'enrichTransaction: countryCode must be an ISO 3166-1 alpha-2 two-letter code',
          )
        }
        return this._api.enrichTransaction({
          enrichmentRequest: request,
        })
      },

      /**
       * Queues a batch of transaction requests for asynchronous enrichment.
       */
      enrichTransactions: async (
        transactions: EnrichTransactionsRequestInner[],
        xApiUser?: string,
      ): Promise<EnrichTransactionCollectionResponse> => {
        if (xApiUser && (xApiUser.includes('\r') || xApiUser.includes('\n'))) {
          throw new Error('enrichTransactions: xApiUser must not contain CR or LF characters')
        }
        return this._api.enrichTransactions({
          xApiUser,
          enrichTransactionsRequestInner: transactions,
        })
      },

      /**
       * Retrieves the current processing status of a queued bulk job.
       */
      getEnrichmentStatus: async (
        id: string,
        xApiUser?: string,
      ): Promise<EnrichmentCollectionStatusResponse> => {
        if (typeof id !== 'string' || !id.trim()) {
          throw new Error('getEnrichmentStatus: id cannot be empty')
        }
        if (xApiUser && (xApiUser.includes('\r') || xApiUser.includes('\n'))) {
          throw new Error('getEnrichmentStatus: xApiUser must not contain CR or LF characters')
        }
        return this._api.getEnrichmentStatus({ id, xApiUser })
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
    xApiUser?: string,
  ): Promise<EnrichTransactionCollectionResponse> {
    return this.enrichment.enrichTransactions(transactions, xApiUser)
  }

  /**
   * Retrieves the current processing status of a queued bulk job.
   */
  public async getEnrichmentStatus(
    id: string,
    xApiUser?: string,
  ): Promise<EnrichmentCollectionStatusResponse> {
    return this.enrichment.getEnrichmentStatus(id, xApiUser)
  }

  /**
   * Downloads and decompresses the `.tar.gz` enrichment results archive
   * produced by the bulk enrichment pipeline.
   *
   * @param downloadUrl - The `link` field returned by `enrichTransactions`.
   * @returns An array of `EnrichmentResponse` objects parsed from the archive.
   * @throws `Error` on non-200 HTTP status, WAF interception, or decompression failure.
   */
  public async downloadEnrichmentCollection(
    downloadUrl: string,
  ): Promise<EnrichmentResponse[]> {
    if (!downloadUrl.trim()) {
      throw new Error('downloadEnrichmentCollection: downloadUrl cannot be empty')
    }

    let parsedUrl: URL
    try {
      parsedUrl = new URL(downloadUrl, this._basePath)
    } catch {
      throw new Error(`downloadEnrichmentCollection: invalid URL "${downloadUrl}"`)
    }

    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      throw new Error(
        `downloadEnrichmentCollection: unsupported protocol "${parsedUrl.protocol}" (only http: and https: permitted)`,
      )
    }

    const fetchFn = this._fetchApi ?? globalThis.fetch
    const headers: Record<string, string> = {
      Accept: 'application/gzip, application/x-tar, application/octet-stream;q=0.9, */*;q=0.8',
    }

    // Only attach Authorization header if target host matches configured API base URL host (prevents token leakage)
    let apiHost = ''
    try {
      apiHost = new URL(this._basePath).host
    } catch {
      // ignore parse error
    }

    if (apiHost && parsedUrl.host.toLowerCase() === apiHost.toLowerCase()) {
      const currentToken = await this._tokenSupplier?.()
      if (currentToken) {
        headers['Authorization'] = `Bearer ${currentToken}`
      }
    }

    const response = await fetchFn(parsedUrl.toString(), {
      method: 'GET',
      headers,
    })

    if (response.status < 200 || response.status >= 300) {
      throw new Error(
        `downloadEnrichmentCollection: unexpected HTTP status ${String(response.status)}`,
      )
    }

    // Validate Content-Type header to diagnose intermediate proxy/WAF challenge pages
    const contentType = response.headers.get('content-type') ?? ''
    if (contentType) {
      const ct = contentType.toLowerCase()
      if (!ct.includes('gzip') && !ct.includes('tar') && !ct.includes('octet-stream') && !ct.includes('binary')) {
        const preview = (await response.text()).slice(0, 512)
        throw new Error(
          `downloadEnrichmentCollection: unexpected Content-Type "${contentType}" received when expecting binary archive (body preview: ${preview.trim()})`,
        )
      }
    }

    if (!response.body) {
      throw new Error('downloadEnrichmentCollection: response body is null')
    }

    // Collect all compressed bytes with max bytes guard
    let totalCompressedBytes = 0
    const compressedChunks: Buffer[] = []
    const reader = response.body.getReader()
    let chunk = await reader.read()

    while (!chunk.done) {
      totalCompressedBytes += chunk.value.length
      if (totalCompressedBytes > this._maxArchiveBytes) {
        throw new Error(
          `downloadEnrichmentCollection: compressed archive exceeded maximum allowed size of ${String(this._maxArchiveBytes)} bytes`,
        )
      }
      compressedChunks.push(Buffer.from(chunk.value))
      chunk = await reader.read()
    }
    const compressed = Buffer.concat(compressedChunks)

    // Decompress gzip stream with max uncompressed bytes guard
    let totalDecompressedBytes = 0
    const decompressedChunks: Buffer[] = []
    const maxArchiveBytes = this._maxArchiveBytes

    const gunzip = createGunzip()
    const sink = new Writable({
      write(chunk: Buffer, _encoding, callback) {
        totalDecompressedBytes += chunk.length
        if (totalDecompressedBytes > maxArchiveBytes) {
          callback(
            new Error(
              `downloadEnrichmentCollection: decompressed archive stream exceeded maximum allowed size of ${String(maxArchiveBytes)} bytes`,
            ),
          )
          return
        }
        decompressedChunks.push(chunk)
        callback()
      },
    })

    const { Readable } = await import('node:stream')
    await pipeline(Readable.from(compressed), gunzip, sink)

    const tarBuffer = Buffer.concat(decompressedChunks)

    // Parse the tar archive with Zip Slip and entry limits
    const entries = parseTar(tarBuffer, DEFAULT_MAX_TAR_ENTRIES, DEFAULT_MAX_ENTRY_BYTES)
    const results: EnrichmentResponse[] = []
    for (const entry of entries) {
      if (!entry.name.endsWith('.json')) continue
      try {
        const parsed: unknown = JSON.parse(entry.content.toString('utf8'))
        results.push(EnrichmentResponseFromJSON(parsed))
      } catch (err) {
        throw new Error(
          `downloadEnrichmentCollection: failed to parse JSON from entry "${sanitizeEntryName(entry.name)}": ${err instanceof Error ? err.message : String(err)}`,
        )
      }
    }
    return results
  }
}

export { XYOClient as Client }
export type { XYOClientOptions as ClientOptions }

