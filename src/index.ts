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
  ResponseError,
} from './generated'

export * from './generated'

export const DEFAULT_MAX_TAR_ENTRIES = 50000
export const DEFAULT_MAX_ENTRY_BYTES = 10 * 1024 * 1024 // 10 MiB
export const DEFAULT_MAX_ARCHIVE_BYTES = 100 * 1024 * 1024 // 100 MiB

export interface RequestOptions {
  /**
   * Distributed tracing correlation ID (X-Correlation-ID header, UUID format)
   */
  correlationId?: string
  /**
   * Distributed tracing traceparent header (traceparent header, W3C format)
   */
  traceparent?: string
  /**
   * Optional End-user API tenant identifier
   */
  xApiUser?: string
}

export type XYORequestOptions = RequestOptions

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
  /**
   * Optional default distributed tracing correlation ID (X-Correlation-ID header, UUID format)
   */
  correlationId?: string
  /**
   * Optional default distributed tracing traceparent header (traceparent header, W3C format)
   */
  traceparent?: string
}

export class XyoRateLimitError extends ResponseError {
  // @ts-expect-error TS2416: openapi generator hardcodes literal type 'ResponseError' on ResponseError.name
  override readonly name = 'XyoRateLimitError' as const
  private readonly _retryAfterSec?: number
  private readonly _retryAfterDateMs?: number
  public readonly rateLimitLimit?: number
  public readonly rateLimitRemaining?: number
  public readonly rateLimitReset?: number

  get retryAfter(): number | undefined {
    if (this._retryAfterSec !== undefined) {
      return this._retryAfterSec
    }
    if (this._retryAfterDateMs !== undefined) {
      return Math.max(0, Math.ceil((this._retryAfterDateMs - Date.now()) / 1000))
    }
    return undefined
  }

  constructor(response: Response, msg?: string) {
    super(response, msg ?? 'Rate limit exceeded (HTTP 429)')

    const actualProto = new.target.prototype
    Object.setPrototypeOf(this, actualProto)

    const headers = response.headers
    const retryStr = headers.get('retry-after')
    if (retryStr) {
      if (/^\s*\d+\s*$/.test(retryStr)) {
        const parsedSec = parseInt(retryStr, 10)
        if (!isNaN(parsedSec)) {
          this._retryAfterSec = parsedSec
        }
      } else {
        const dateMs = Date.parse(retryStr)
        if (!isNaN(dateMs)) {
          this._retryAfterDateMs = dateMs
        }
      }
    }

    const limitStr = headers.get('ratelimit-limit') ?? headers.get('x-ratelimit-limit')
    if (limitStr) {
      const parsed = parseInt(limitStr, 10)
      if (!isNaN(parsed)) this.rateLimitLimit = parsed
    }

    const remainingStr = headers.get('ratelimit-remaining') ?? headers.get('x-ratelimit-remaining')
    if (remainingStr) {
      const parsed = parseInt(remainingStr, 10)
      if (!isNaN(parsed)) this.rateLimitRemaining = parsed
    }

    const resetStr = headers.get('ratelimit-reset') ?? headers.get('x-ratelimit-reset')
    if (resetStr) {
      const parsed = parseInt(resetStr, 10)
      if (!isNaN(parsed)) this.rateLimitReset = parsed
    }
  }
}

const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/
const TRACEPARENT_REGEX = /^[0-9a-fA-F]{2}-[0-9a-fA-F]{32}-[0-9a-fA-F]{16}-[0-9a-fA-F]{2}$/
// eslint-disable-next-line no-control-regex
const CONTROL_CHAR_REGEX = /[\x00-\x1F\x7F]/

function validateCorrelationId(correlationId?: string): void {
  if (correlationId !== undefined) {
    if (!UUID_REGEX.test(correlationId)) {
      throw new Error('correlationId must be a valid UUID')
    }
  }
}

function validateTraceparent(traceparent?: string): void {
  if (traceparent !== undefined) {
    if (!TRACEPARENT_REGEX.test(traceparent)) {
      throw new Error('traceparent must be a valid W3C traceparent header')
    }
  }
}

function parseApiUserAndOptions(
  xApiUserOrOptions?: string | RequestOptions,
  options?: RequestOptions,
): { xApiUser?: string; opts?: RequestOptions } {
  if (typeof xApiUserOrOptions === 'string') {
    return { xApiUser: xApiUserOrOptions, opts: options }
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  } else if (xApiUserOrOptions !== null && typeof xApiUserOrOptions === 'object') {
    const { xApiUser, ...restOpts } = xApiUserOrOptions
    const mergedOpts = { ...restOpts, ...options }
    return { xApiUser: xApiUser ?? options?.xApiUser, opts: mergedOpts }
  }
  return { xApiUser: options?.xApiUser, opts: options }
}

async function handleApiError<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    if (err instanceof ResponseError && err.response.status === 429) {
      throw new XyoRateLimitError(err.response, err.message)
    }
    throw err
  }
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
    const nameBuf = header.subarray(0, 100)
    const nameEnd = nameBuf.indexOf(0)
    const name = nameBuf.subarray(0, nameEnd < 0 ? 100 : nameEnd).toString('utf8')

    // Type flag: byte 156
    const typeFlag = String.fromCharCode(header[156])

    // File size: bytes 124–135 (octal ASCII, NUL/space padded)
    const sizeStr = header.subarray(124, 136).toString('ascii').replace(/\0/g, '').trim()
    const rawSize = parseInt(sizeStr, 8)
    const size = Math.max(0, isNaN(rawSize) ? 0 : rawSize)

    if (size > maxEntryBytes) {
      throw new Error(
        `downloadEnrichmentCollection: entry "${sanitizeEntryName(name)}" size (${String(size)} bytes) exceeds limit of ${String(maxEntryBytes)} bytes`,
      )
    }

    offset += 512 // skip header block

    // Zip-Slip & Path Traversal mitigation
    const isPathTraversal = name.includes('..') || name.startsWith('/') || name.startsWith('\\')

    if (typeFlag !== '5' && name && !isPathTraversal) {
      // Regular file entry with bounds protection
      const endOffset = Math.min(offset + size, buf.length)
      const content = buf.subarray(offset, endOffset)
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
  private readonly _correlationId?: string
  private readonly _traceparent?: string

  constructor(options: XYOClientOptions) {
    const rawBasePath = (
      options.baseUrl ??
      options.basePath ??
      process.env['XYO_API_BASE_URL'] ??
      'https://api.xyo.financial'
    ).replace(/\/+$/, '')

    validateCorrelationId(options.correlationId)
    validateTraceparent(options.traceparent)

    this._basePath = rawBasePath
    this._maxArchiveBytes = options.maxArchiveBytes ?? DEFAULT_MAX_ARCHIVE_BYTES
    this._fetchApi = options.fetchApi
    this._correlationId = options.correlationId
    this._traceparent = options.traceparent

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

  private getTracingHeaders(options?: RequestOptions): { xCorrelationID?: string; traceparent?: string } {
    const correlationId = options?.correlationId ?? this._correlationId
    const traceparent = options?.traceparent ?? this._traceparent

    validateCorrelationId(correlationId)
    validateTraceparent(traceparent)

    return {
      xCorrelationID: correlationId,
      traceparent,
    }
  }

  /**
   * Transaction Enrichment Services
   */
  public get enrichment() {
    return {
      /**
       * Enriches a single transaction narrative with structured metadata.
       * @throws {XyoRateLimitError}
       */
      enrichTransaction: async (
        request: EnrichmentRequest,
        options?: RequestOptions,
      ): Promise<EnrichmentResponse> => {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (!request || typeof request !== 'object') {
          throw new Error('enrichTransaction: request must be a valid object')
        }
        if (!request.content || request.content.trim().length === 0) {
          throw new Error('enrichTransaction: content cannot be empty')
        }
        if (request.content.length > 128) {
          throw new Error('enrichTransaction: content cannot exceed 128 characters')
        }
        if (request.countryCode && request.countryCode.trim().length !== 2) {
          throw new Error(
            'enrichTransaction: countryCode must be an ISO 3166-1 alpha-2 two-letter code',
          )
        }
        const tracing = this.getTracingHeaders(options)
        return handleApiError(() =>
          this._api.enrichTransaction({
            enrichmentRequest: request,
            xCorrelationID: tracing.xCorrelationID,
            traceparent: tracing.traceparent,
          }),
        )
      },

      /**
       * Queues a batch of transaction requests for asynchronous enrichment.
       * @throws {XyoRateLimitError}
       */
      enrichTransactions: async (
        transactions: EnrichTransactionsRequestInner[],
        xApiUserOrOptions?: string | RequestOptions,
        options?: RequestOptions,
      ): Promise<EnrichTransactionCollectionResponse> => {
        if (!Array.isArray(transactions) || transactions.length < 1 || transactions.length > 50000) {
          throw new Error(
            'enrichTransactions: transactions batch must contain between 1 and 50,000 items',
          )
        }
        const { xApiUser, opts } = parseApiUserAndOptions(xApiUserOrOptions, options)
        if (xApiUser && CONTROL_CHAR_REGEX.test(xApiUser)) {
          throw new Error('enrichTransactions: xApiUser must not contain CR or LF characters')
        }
        const tracing = this.getTracingHeaders(opts)
        return handleApiError(() =>
          this._api.enrichTransactions({
            xApiUser,
            enrichTransactionsRequestInner: transactions,
            xCorrelationID: tracing.xCorrelationID,
            traceparent: tracing.traceparent,
          }),
        )
      },

      /**
       * Retrieves the current processing status of a queued bulk job.
       * @throws {XyoRateLimitError}
       */
      getEnrichmentStatus: async (
        id: string,
        xApiUserOrOptions?: string | RequestOptions,
        options?: RequestOptions,
      ): Promise<EnrichmentCollectionStatusResponse> => {
        if (typeof id !== 'string' || !id.trim()) {
          throw new Error('getEnrichmentStatus: id cannot be empty')
        }
        const { xApiUser, opts } = parseApiUserAndOptions(xApiUserOrOptions, options)
        if (xApiUser && CONTROL_CHAR_REGEX.test(xApiUser)) {
          throw new Error('getEnrichmentStatus: xApiUser must not contain CR or LF characters')
        }
        const tracing = this.getTracingHeaders(opts)
        return handleApiError(() =>
          this._api.getEnrichmentStatus({
            id,
            xApiUser,
            xCorrelationID: tracing.xCorrelationID,
            traceparent: tracing.traceparent,
          }),
        )
      },

      /**
       * Downloads and decompresses the enrichment results archive (.tar.gz)
       * from the link returned by enrichTransactions.
       */
      downloadEnrichmentCollection: async (
        downloadUrl: string,
        options?: RequestOptions,
      ): Promise<EnrichmentResponse[]> => {
        return this.downloadEnrichmentCollection(downloadUrl, options)
      },
    }
  }

  /**
   * Enriches a single transaction narrative with structured metadata.
   *
   * @throws {XyoRateLimitError}
   */
  public async enrichTransaction(
    request: EnrichmentRequest,
    options?: RequestOptions,
  ): Promise<EnrichmentResponse> {
    return this.enrichment.enrichTransaction(request, options)
  }

  /**
   * Queues a batch of transaction requests for asynchronous enrichment.
   *
   * @throws {XyoRateLimitError}
   */
  public async enrichTransactions(
    transactions: EnrichTransactionsRequestInner[],
    xApiUserOrOptions?: string | RequestOptions,
    options?: RequestOptions,
  ): Promise<EnrichTransactionCollectionResponse> {
    return this.enrichment.enrichTransactions(transactions, xApiUserOrOptions, options)
  }

  /**
   * Retrieves the current processing status of a queued bulk job.
   *
   * @throws {XyoRateLimitError}
   */
  public async getEnrichmentStatus(
    id: string,
    xApiUserOrOptions?: string | RequestOptions,
    options?: RequestOptions,
  ): Promise<EnrichmentCollectionStatusResponse> {
    return this.enrichment.getEnrichmentStatus(id, xApiUserOrOptions, options)
  }

  /**
   * Downloads and decompresses the `.tar.gz` enrichment results archive
   * produced by the bulk enrichment pipeline.
   *
   * @param downloadUrl - The `link` field returned by `enrichTransactions`.
   * @param options - Optional per-request settings (tracing headers, etc.)
   * @returns An array of `EnrichmentResponse` objects parsed from the archive.
   * @throws `Error` or `XyoRateLimitError` on non-200 HTTP status, WAF interception, or decompression failure.
   */
  public async downloadEnrichmentCollection(
    downloadUrl: string,
    options?: RequestOptions,
  ): Promise<EnrichmentResponse[]> {
    if (!downloadUrl.trim()) {
      throw new Error('downloadEnrichmentCollection: downloadUrl cannot be empty')
    }

    let apiHost: string
    try {
      apiHost = new URL(this._basePath).host
    } catch {
      throw new Error(`downloadEnrichmentCollection: invalid base URL "${this._basePath}"`)
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

    const isApiHost = parsedUrl.host.toLowerCase() === apiHost.toLowerCase()
    const S3_HOST_REGEX = /^([a-zA-Z0-9.-]+\.)?s3(\.[a-zA-Z0-9.-]+)?\.amazonaws\.com$/i
    const isS3 = S3_HOST_REGEX.test(parsedUrl.host)

    if (!isApiHost && !isS3) {
      throw new Error(
        `downloadEnrichmentCollection: domain "${parsedUrl.host}" is not permitted for secure archive downloads.`,
      )
    }

    const fetchFn = this._fetchApi ?? globalThis.fetch
    const headers: Record<string, string> = {
      Accept: 'application/gzip, application/x-tar, application/octet-stream;q=0.9, */*;q=0.8',
    }

    if (isApiHost) {
      const tracing = this.getTracingHeaders(options)
      if (tracing.xCorrelationID) {
        headers['X-Correlation-ID'] = tracing.xCorrelationID
      }
      if (tracing.traceparent) {
        headers['traceparent'] = tracing.traceparent
      }

      const currentToken = await this._tokenSupplier?.()
      if (currentToken) {
        headers['Authorization'] = `Bearer ${currentToken}`
      }
    }

    const response = await fetchFn(parsedUrl.toString(), {
      method: 'GET',
      headers,
    })

    if (response.status === 429) {
      throw new XyoRateLimitError(response)
    }

    if (response.status < 200 || response.status >= 300) {
      throw new ResponseError(
        response,
        `downloadEnrichmentCollection: unexpected HTTP status ${String(response.status)}`,
      )
    }

    // Validate Content-Type header to diagnose intermediate proxy/WAF challenge pages
    const contentType = response.headers.get('content-type') ?? ''
    if (contentType) {
      const ct = contentType.toLowerCase()
      if (
        !ct.includes('gzip') &&
        !ct.includes('tar') &&
        !ct.includes('octet-stream') &&
        !ct.includes('binary')
      ) {
        throw new Error(
          `downloadEnrichmentCollection: unexpected Content-Type "${contentType}" received when expecting binary archive.`,
        )
      }
    }

    if (!response.body) {
      throw new Error('downloadEnrichmentCollection: response body is null')
    }

    // Collect all compressed bytes with max bytes guard
    let totalCompressedBytes = 0
    const compressedChunks: Buffer[] = []

    // Support both Node.js Streams and Web Streams via Async Iteration
    for await (const chunk of response.body as unknown as AsyncIterable<Uint8Array | string>) {
      const bufChunk = Buffer.from(chunk)
      totalCompressedBytes += bufChunk.length
      if (totalCompressedBytes > this._maxArchiveBytes) {
        throw new Error(
          `downloadEnrichmentCollection: compressed archive exceeded maximum allowed size of ${String(this._maxArchiveBytes)} bytes`,
        )
      }
      compressedChunks.push(bufChunk)
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
