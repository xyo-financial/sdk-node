export class ClientError extends Error {
  public readonly statusCode?: number | undefined

  public constructor(message: string, code?: number) {
    super(message)
    this.name = 'ClientError'
    this.statusCode = code
  }
}
