export type ClientErrorCategory =
  | 'validation'
  | 'authentication'
  | 'rate_limit'
  | 'server_error'
  | 'network_error'
  | 'unknown'

export interface ApiError {
  type: string
  title: string
  status?: number
  detail: string
  instance: string
}

export class ClientError extends Error {
  public readonly statusCode?: number | undefined
  public readonly category: ClientErrorCategory
  public readonly errors: ApiError[] = []

  public constructor(
    message: string,
    codeOrOptions?:
      | number
      | {
          statusCode?: number
          category?: ClientErrorCategory
          cause?: unknown
        },
  ) {
    let statusCode: number | undefined
    let category: ClientErrorCategory | undefined
    let cause: unknown

    if (typeof codeOrOptions === 'number') {
      statusCode = codeOrOptions
    } else if (
      codeOrOptions &&
      typeof codeOrOptions === 'object'
    ) {
      statusCode = codeOrOptions.statusCode
      category = codeOrOptions.category
      cause = codeOrOptions.cause
    }

    let parsedErrors: ApiError[] = []
    let formattedMessage = message

    try {
      const parsed = JSON.parse(message) as unknown
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
      // Fall back to original message if not valid JSON
    }

    super(
      formattedMessage,
      cause !== undefined ? { cause } : undefined,
    )
    this.statusCode = statusCode
    this.errors = parsedErrors

    if (category) {
      this.category = category
    } else if (statusCode !== undefined) {
      if (statusCode === 401 || statusCode === 403) {
        this.category = 'authentication'
      } else if (statusCode === 429) {
        this.category = 'rate_limit'
      } else if (statusCode >= 400 && statusCode < 500) {
        this.category = 'validation'
      } else if (statusCode >= 500) {
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
}
