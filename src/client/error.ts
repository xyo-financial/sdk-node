export type ClientErrorCategory =
  | 'validation'
  | 'authentication'
  | 'rate_limit'
  | 'not_found'
  | 'server_error'
  | 'network_error'
  | 'unknown'

export interface ApiError {
  readonly type: string
  readonly title: string
  readonly status?: number
  readonly detail: string
  readonly instance: string
}

export class ClientError extends Error {
  public readonly statusCode?: number | undefined
  public readonly category: ClientErrorCategory
  public readonly errors: readonly ApiError[] = []
  public readonly rawBody?: string | undefined

  public constructor(
    message: string,
    options?: {
      statusCode?: number
      category?: ClientErrorCategory
      cause?: unknown
      errors?: readonly ApiError[]
      rawBody?: string
    },
  ) {
    super(
      message,
      options?.cause !== undefined
        ? { cause: options.cause }
        : undefined,
    )

    this.statusCode = options?.statusCode
    this.errors = options?.errors ?? []
    this.rawBody = options?.rawBody

    if (options?.category) {
      this.category = options.category
    } else if (this.statusCode !== undefined) {
      const code = this.statusCode
      if (code === 401 || code === 403) {
        this.category = 'authentication'
      } else if (code === 404) {
        this.category = 'not_found'
      } else if (code === 429) {
        this.category = 'rate_limit'
      } else if (code >= 400 && code < 500) {
        this.category = 'validation'
      } else if (code >= 500) {
        this.category = 'server_error'
      } else {
        this.category = 'unknown'
      }
    } else {
      this.category = 'unknown'
    }

    // Restore prototype chain
    Object.setPrototypeOf(this, new.target.prototype)
    this.name = 'ClientError'
  }

  /**
   * Helper to deserialize API error responses (potentially in RFC 7807 shape)
   * into a formatted ClientError instance.
   */
  public static fromApiResponse(
    body: string,
    statusCode: number,
  ): ClientError {
    let parsedErrors: ApiError[] = []
    let formattedMessage = body

    try {
      const parsed = JSON.parse(body) as unknown
      if (
        parsed &&
        typeof parsed === 'object' &&
        'errors' in parsed &&
        Array.isArray(parsed.errors)
      ) {
        parsedErrors = parsed.errors.filter(
          (err): err is ApiError =>
            err !== null &&
            typeof err === 'object' &&
            typeof (err as Record<string, unknown>)[
              'type'
            ] === 'string' &&
            typeof (err as Record<string, unknown>)[
              'title'
            ] === 'string' &&
            typeof (err as Record<string, unknown>)[
              'detail'
            ] === 'string' &&
            typeof (err as Record<string, unknown>)[
              'instance'
            ] === 'string',
        )

        if (parsedErrors.length > 0) {
          formattedMessage = parsedErrors
            .map(
              (err) =>
                `API Error: [${err.instance}] ${err.title} - ${err.detail} (Type: ${err.type})`,
            )
            .join(' | ')
        }
      }
    } catch {
      // Body is not JSON, retain raw message body
    }

    return new ClientError(formattedMessage, {
      statusCode,
      errors: parsedErrors,
      rawBody: body,
    })
  }
}
