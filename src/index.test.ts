import {
  describe,
  it,
  beforeEach,
  afterEach,
} from 'node:test'
import assert from 'node:assert/strict'
import {
  XYOClient,
  Client,
  type XYOClientOptions,
  type EnrichmentRequest,
  type EnrichmentResponse,
  type EnrichTransactionsRequestInner,
  type EnrichTransactionCollectionResponse,
  type EnrichmentCollectionStatusResponse,
  EnrichmentCollectionStatusResponseStatusEnum,
  ResponseError,
  FetchError,
  RequiredError,
  Configuration,
  EnrichmentApi,
  APIErrorFromJSON,
  APIErrorToJSON,
  instanceOfAPIError,
  ErrorResponseFromJSON,
  ErrorResponseToJSON,
  instanceOfErrorResponse,
  EnrichmentRequestFromJSON,
  EnrichmentRequestToJSON,
  instanceOfEnrichmentRequest,
  EnrichmentResponseFromJSON,
  EnrichmentResponseToJSON,
  instanceOfEnrichmentResponse,
  EnrichTransactionsRequestInnerFromJSON,
  EnrichTransactionsRequestInnerToJSON,
  instanceOfEnrichTransactionsRequestInner,
  EnrichTransactionCollectionResponseFromJSON,
  EnrichTransactionCollectionResponseToJSON,
  instanceOfEnrichTransactionCollectionResponse,
  EnrichmentCollectionStatusResponseFromJSON,
  EnrichmentCollectionStatusResponseToJSON,
  instanceOfEnrichmentCollectionStatusResponse,
  JSONApiResponse,
  VoidApiResponse,
  BlobApiResponse,
  TextApiResponse,
  querystring,
  mapValues,
  exists,
  anyToJSON,
  canConsumeForm,
  type APIError,
  type ErrorResponse,
} from './index'

interface CapturedRequest {
  url: string
  method: string
  headers: Record<string, string>
  body?: string
}

function createJsonResponse(
  data: unknown,
  status = 200,
  headers: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  })
}

function createTextResponse(
  text: string,
  status = 500,
  headers: Record<string, string> = {},
): Response {
  return new Response(text, {
    status,
    headers: {
      'Content-Type': 'text/plain',
      ...headers,
    },
  })
}

describe('XYO Financial SDK - Node.js Test Suite', () => {
  const originalFetch = globalThis.fetch
  let capturedRequests: CapturedRequest[] = []
  let mockFetchHandler: (
    url: string,
    init: RequestInit,
  ) => Promise<Response>

  beforeEach(() => {
    capturedRequests = []
    mockFetchHandler = async () =>
      createJsonResponse({
        message: 'default mock response',
      })

    globalThis.fetch = async (
      input: string | URL | Request,
      init?: RequestInit,
    ): Promise<Response> => {
      const urlStr =
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url

      const headersRecord: Record<string, string> = {}
      if (init?.headers) {
        if (init.headers instanceof Headers) {
          init.headers.forEach((v, k) => {
            headersRecord[k.toLowerCase()] = v
          })
        } else if (Array.isArray(init.headers)) {
          for (const [k, v] of init.headers) {
            headersRecord[k.toLowerCase()] = v
          }
        } else {
          for (const [k, v] of Object.entries(
            init.headers as Record<string, string>,
          )) {
            headersRecord[k.toLowerCase()] = String(v)
          }
        }
      }

      capturedRequests.push({
        url: urlStr,
        method: init?.method ?? 'GET',
        headers: headersRecord,
        body: init?.body ? String(init.body) : undefined,
      })

      return mockFetchHandler(urlStr, init ?? {})
    }
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  describe('1. Client Initialization & Configuration', () => {
    it('initializes with default baseUrl when none provided', async () => {
      mockFetchHandler = async () =>
        createJsonResponse({
          merchant: 'Test Merchant',
          description: 'Desc',
          categories: ['Cat1'],
          logo: 'logo-data',
          location: 'City, Country',
          address: '123 Street',
        })

      const client = new XYOClient({
        apiKey: 'my-secret-api-key',
      })
      await client.enrichTransaction({
        content: 'TEST CONTENT',
        countryCode: 'US',
      })

      assert.equal(capturedRequests.length, 1)
      assert.ok(
        capturedRequests[0].url.startsWith(
          'https://api.xyo.financial',
        ),
      )
      assert.equal(
        capturedRequests[0].headers['authorization'],
        'Bearer my-secret-api-key',
      )
    })

    it('initializes with token option and sends Bearer authorization header', async () => {
      mockFetchHandler = async () =>
        createJsonResponse({
          merchant: 'Test Merchant',
          description: 'Desc',
          categories: ['Cat1'],
          logo: 'logo-data',
          location: 'City, Country',
          address: '123 Street',
        })

      const client = new XYOClient({
        token: 'my-bearer-token-123',
      })
      await client.enrichTransaction({
        content: 'TEST CONTENT',
        countryCode: 'US',
      })

      assert.equal(capturedRequests.length, 1)
      assert.ok(
        capturedRequests[0].url.startsWith(
          'https://api.xyo.financial',
        ),
      )
      assert.equal(
        capturedRequests[0].headers['authorization'],
        'Bearer my-bearer-token-123',
      )
    })

    it('initializes with custom baseUrl and strips trailing slash', async () => {
      mockFetchHandler = async () =>
        createJsonResponse({
          merchant: 'Test Merchant',
          description: 'Desc',
          categories: ['Cat1'],
          logo: 'logo-data',
          location: 'City, Country',
          address: '123 Street',
        })

      const client = new XYOClient({
        apiKey: 'custom-key',
        baseUrl:
          'https://sandbox.api.xyo.financial/v1-custom/',
      })

      await client.enrichTransaction({
        content: 'TEST CONTENT',
        countryCode: 'GB',
      })

      assert.equal(capturedRequests.length, 1)
      assert.ok(
        capturedRequests[0].url.startsWith(
          'https://sandbox.api.xyo.financial/v1-custom/v1/ai/finance/enrichment/transaction',
        ),
      )
      assert.equal(
        capturedRequests[0].headers['authorization'],
        'Bearer custom-key',
      )
    })

    it('initializes with basePath alias', async () => {
      mockFetchHandler = async () =>
        createJsonResponse({
          merchant: 'Test Merchant',
          description: 'Desc',
          categories: ['Cat1'],
          logo: 'logo-data',
          location: 'City, Country',
          address: '123 Street',
        })

      const client = new XYOClient({
        apiKey: 'alias-key',
        basePath: 'https://alias.api.xyo.financial',
      })

      await client.enrichTransaction({
        content: 'TEST CONTENT',
        countryCode: 'US',
      })

      assert.equal(capturedRequests.length, 1)
      assert.ok(
        capturedRequests[0].url.startsWith(
          'https://alias.api.xyo.financial',
        ),
      )
    })

    it('supports custom fetchApi override in options', async () => {
      let customFetchCalled = false
      const customFetch: typeof fetch = async (
        input,
        init,
      ) => {
        customFetchCalled = true
        return createJsonResponse({
          merchant: 'Custom Fetch Merchant',
          description: 'Desc',
          categories: ['Tech'],
          logo: 'logo',
          location: 'London',
          address: 'Road',
        })
      }

      const client = new XYOClient({
        apiKey: 'key',
        fetchApi: customFetch,
      })

      const result = await client.enrichTransaction({
        content: 'CUSTOM FETCH',
        countryCode: 'GB',
      })

      assert.equal(customFetchCalled, true)
      assert.equal(result.merchant, 'Custom Fetch Merchant')
    })

    it('exports Client as alias for XYOClient', () => {
      assert.equal(Client, XYOClient)
      const instance = new Client({ apiKey: 'test' })
      assert.ok(instance instanceof XYOClient)
      assert.ok(instance instanceof Client)
    })
  })

  describe('2. enrichTransaction (Single Transaction Enrichment)', () => {
    const mockSuccessPayload: EnrichmentResponse = {
      merchant: 'Costa Coffee',
      description: 'Coffee Shop & Cafe',
      categories: ['Food & Drink', 'Coffee Shops'],
      logo: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...',
      location: 'London, GB',
      address: '123 High Street, London',
    }

    it('successfully enriches a single transaction via client.enrichment.enrichTransaction', async () => {
      mockFetchHandler = async () =>
        createJsonResponse(mockSuccessPayload, 200)

      const client = new XYOClient({
        apiKey: 'token-xyz',
        baseUrl: 'https://api.xyo.financial',
      })

      const req: EnrichmentRequest = {
        content: 'COSTA PICKUP',
        countryCode: 'GB',
      }

      const response =
        await client.enrichment.enrichTransaction(req)

      assert.equal(capturedRequests.length, 1)
      const captured = capturedRequests[0]
      assert.equal(
        captured.url,
        'https://api.xyo.financial/v1/ai/finance/enrichment/transaction',
      )
      assert.equal(captured.method, 'POST')
      assert.equal(
        captured.headers['authorization'],
        'Bearer token-xyz',
      )
      assert.equal(
        captured.headers['content-type'],
        'application/json',
      )
      assert.deepEqual(JSON.parse(captured.body ?? '{}'), {
        content: 'COSTA PICKUP',
        countryCode: 'GB',
      })

      assert.equal(response.merchant, 'Costa Coffee')
      assert.equal(
        response.description,
        'Coffee Shop & Cafe',
      )
      assert.deepEqual(response.categories, [
        'Food & Drink',
        'Coffee Shops',
      ])
      assert.equal(
        response.logo,
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...',
      )
      assert.equal(response.location, 'London, GB')
      assert.equal(
        response.address,
        '123 High Street, London',
      )
    })

    it('successfully enriches a single transaction via top-level client.enrichTransaction', async () => {
      mockFetchHandler = async () =>
        createJsonResponse(mockSuccessPayload, 200)

      const client = new XYOClient({
        apiKey: 'token-top-level',
      })

      const response = await client.enrichTransaction({
        content: 'COSTA PICKUP',
        countryCode: 'GB',
      })

      assert.equal(response.merchant, 'Costa Coffee')
      assert.equal(response.location, 'London, GB')
    })

    it('handles 400 Bad Request error with RFC 7807 problem details', async () => {
      const problemDetails: ErrorResponse = {
        errors: [
          {
            type: 'https://api.xyo.financial/errors/validation',
            title: 'Invalid Transaction Narrative',
            status: 400,
            detail:
              'Content exceeds maximum allowable length of 128 chars',
            instance:
              '/v1/ai/finance/enrichment/transaction/err_01',
          },
        ],
      }

      mockFetchHandler = async () =>
        createJsonResponse(problemDetails, 400)

      const client = new XYOClient({ apiKey: 'test-token' })

      try {
        await client.enrichTransaction({
          content: 'VERY LONG INVALID NARRATIVE'.repeat(10),
          countryCode: 'GB',
        })
        assert.fail(
          'Expected enrichment call to throw ResponseError',
        )
      } catch (err) {
        assert.ok(err instanceof ResponseError)
        assert.equal(err.name, 'ResponseError')
        assert.equal(err.response.status, 400)
        const body =
          (await err.response.json()) as ErrorResponse
        const parsed = ErrorResponseFromJSON(body)
        assert.equal(parsed.errors.length, 1)
        assert.equal(
          parsed.errors[0].title,
          'Invalid Transaction Narrative',
        )
        assert.equal(parsed.errors[0].status, 400)
        assert.equal(
          parsed.errors[0].detail,
          'Content exceeds maximum allowable length of 128 chars',
        )
      }
    })

    it('handles 401 Unauthorized error with RFC 7807 problem details', async () => {
      const authErrorPayload: ErrorResponse = {
        errors: [
          {
            type: 'https://api.xyo.financial/errors/unauthorized',
            title: 'Invalid API Key',
            status: 401,
            detail:
              'Credits expired or an invalid API Key is given',
            instance: 'InvalidClientAPIKeyException',
          },
        ],
      }

      mockFetchHandler = async () =>
        createJsonResponse(authErrorPayload, 401)

      const client = new XYOClient({
        apiKey: 'invalid-token',
      })

      try {
        await client.enrichTransaction({
          content: 'TEST',
          countryCode: 'US',
        })
        assert.fail('Expected call to throw ResponseError')
      } catch (err) {
        assert.ok(err instanceof ResponseError)
        assert.equal(err.response.status, 401)
        const body =
          (await err.response.json()) as ErrorResponse
        const parsed = ErrorResponseFromJSON(body)
        assert.equal(
          parsed.errors[0].title,
          'Invalid API Key',
        )
        assert.equal(
          parsed.errors[0].instance,
          'InvalidClientAPIKeyException',
        )
      }
    })

    it('handles 403 Forbidden error', async () => {
      const errorPayload: ErrorResponse = {
        errors: [
          {
            type: 'https://api.xyo.financial/errors/forbidden',
            title: 'Forbidden',
            status: 403,
            detail:
              'IP not allowed or tier permissions insufficient',
            instance: '/v1/errors/403',
          },
        ],
      }

      mockFetchHandler = async () =>
        createJsonResponse(errorPayload, 403)

      const client = new XYOClient({ apiKey: 'token' })

      await assert.rejects(
        async () => {
          await client.enrichTransaction({
            content: 'TEST',
            countryCode: 'US',
          })
        },
        (err: unknown) => {
          assert.ok(err instanceof ResponseError)
          assert.equal(err.response.status, 403)
          return true
        },
      )
    })

    it('handles 429 Too Many Requests rate limit error', async () => {
      const rateLimitPayload: ErrorResponse = {
        errors: [
          {
            type: 'https://api.xyo.financial/errors/rate-limit',
            title: 'Too Many Requests',
            status: 429,
            detail:
              'Quota exceeded. Please retry after 1 second.',
            instance: '/v1/errors/429',
          },
        ],
      }

      mockFetchHandler = async () =>
        createJsonResponse(rateLimitPayload, 429, {
          'Retry-After': '1',
        })

      const client = new XYOClient({ apiKey: 'token' })

      await assert.rejects(
        async () => {
          await client.enrichTransaction({
            content: 'TEST',
            countryCode: 'US',
          })
        },
        (err: unknown) => {
          assert.ok(err instanceof ResponseError)
          assert.equal(err.response.status, 429)
          return true
        },
      )
    })

    it('handles 500 Internal Server Error with RFC 7807 problem details', async () => {
      const serverErrorPayload: ErrorResponse = {
        errors: [
          {
            type: 'https://api.xyo.financial/errors/server-error',
            title: 'Internal Server Error',
            status: 500,
            detail:
              'An unexpected enrichment pipeline failure occurred',
            instance: '/v1/errors/500_uuid',
          },
        ],
      }

      mockFetchHandler = async () =>
        createJsonResponse(serverErrorPayload, 500)

      const client = new XYOClient({ apiKey: 'token' })

      try {
        await client.enrichTransaction({
          content: 'TEST',
          countryCode: 'US',
        })
        assert.fail('Expected call to throw ResponseError')
      } catch (err) {
        assert.ok(err instanceof ResponseError)
        assert.equal(err.response.status, 500)
        const body =
          (await err.response.json()) as ErrorResponse
        assert.equal(
          body.errors[0].title,
          'Internal Server Error',
        )
        assert.equal(
          body.errors[0].detail,
          'An unexpected enrichment pipeline failure occurred',
        )
      }
    })

    it('handles 502 / 503 gateway errors with non-JSON text payload', async () => {
      mockFetchHandler = async () =>
        createTextResponse(
          '502 Bad Gateway from Cloudflare',
          502,
        )

      const client = new XYOClient({ apiKey: 'token' })

      try {
        await client.enrichTransaction({
          content: 'TEST',
          countryCode: 'US',
        })
        assert.fail('Expected call to throw ResponseError')
      } catch (err) {
        assert.ok(err instanceof ResponseError)
        assert.equal(err.response.status, 502)
        const text = await err.response.text()
        assert.ok(text.includes('502 Bad Gateway'))
      }
    })

    it('handles network transport errors throwing FetchError', async () => {
      mockFetchHandler = async () => {
        throw new Error('fetch failed: ECONNREFUSED')
      }

      const client = new XYOClient({ apiKey: 'token' })

      await assert.rejects(
        async () => {
          await client.enrichTransaction({
            content: 'TEST',
            countryCode: 'US',
          })
        },
        (err: unknown) => {
          assert.ok(err instanceof FetchError)
          assert.equal(err.name, 'FetchError')
          assert.ok(
            err.cause.message.includes('ECONNREFUSED'),
          )
          return true
        },
      )
    })
  })

  describe('3. enrichTransactions (Bulk / Batch Asynchronous Enrichment)', () => {
    const mockBulkResponse: EnrichTransactionCollectionResponse =
      {
        id: '72c037df-d0d3-43ee-9470-323ff35a2e50',
        link: 'https://api.xyo.financial/ai/transactions/download/72c037df-d0d3-43ee-9470-323ff35a2e50.tar.gz',
      }

    it('successfully queues a batch of transactions via client.enrichment.enrichTransactions', async () => {
      mockFetchHandler = async () =>
        createJsonResponse(mockBulkResponse, 200)

      const client = new XYOClient({
        apiKey: 'bulk-token-123',
        baseUrl: 'https://api.xyo.financial',
      })

      const batch: EnrichTransactionsRequestInner[] = [
        { content: 'COSTA COLLECT', countryCode: 'GB' },
        { content: 'AMZN MKTP US*123', countryCode: 'US' },
        { content: 'UBER TRIP PARIS', countryCode: 'FR' },
      ]

      const response =
        await client.enrichment.enrichTransactions(batch)

      assert.equal(capturedRequests.length, 1)
      const captured = capturedRequests[0]
      assert.equal(
        captured.url,
        'https://api.xyo.financial/v1/ai/finance/enrichment/transactions',
      )
      assert.equal(captured.method, 'POST')
      assert.equal(
        captured.headers['authorization'],
        'Bearer bulk-token-123',
      )
      assert.equal(
        captured.headers['content-type'],
        'application/json',
      )

      const parsedBody = JSON.parse(captured.body ?? '[]')
      assert.equal(Array.isArray(parsedBody), true)
      assert.equal(parsedBody.length, 3)
      assert.deepEqual(parsedBody[0], {
        content: 'COSTA COLLECT',
        countryCode: 'GB',
      })
      assert.deepEqual(parsedBody[1], {
        content: 'AMZN MKTP US*123',
        countryCode: 'US',
      })
      assert.deepEqual(parsedBody[2], {
        content: 'UBER TRIP PARIS',
        countryCode: 'FR',
      })

      assert.equal(
        response.id,
        '72c037df-d0d3-43ee-9470-323ff35a2e50',
      )
      assert.equal(
        response.link,
        'https://api.xyo.financial/ai/transactions/download/72c037df-d0d3-43ee-9470-323ff35a2e50.tar.gz',
      )
    })

    it('successfully queues a batch of transactions via top-level client.enrichTransactions', async () => {
      mockFetchHandler = async () =>
        createJsonResponse(mockBulkResponse, 200)

      const client = new XYOClient({ apiKey: 'token' })

      const response = await client.enrichTransactions([
        { content: 'TX 1', countryCode: 'GB' },
      ])

      assert.equal(
        response.id,
        '72c037df-d0d3-43ee-9470-323ff35a2e50',
      )
    })

    it('supports xApiUser parameter when calling EnrichmentApi directly', async () => {
      mockFetchHandler = async () =>
        createJsonResponse(mockBulkResponse, 200)

      const config = new Configuration({
        basePath: 'https://api.xyo.financial',
        accessToken: 'bulk-token-user',
      })
      const api = new EnrichmentApi(config)

      await api.enrichTransactions({
        xApiUser: 'tenant-user-123',
        enrichTransactionsRequestInner: [
          { content: 'TX', countryCode: 'GB' },
        ],
      })

      assert.equal(capturedRequests.length, 1)
      assert.equal(
        capturedRequests[0].headers['x-api-user'],
        'tenant-user-123',
      )
    })

    it('handles bulk submission 400 Bad Request error', async () => {
      const errorPayload: ErrorResponse = {
        errors: [
          {
            type: 'https://api.xyo.financial/errors/empty-batch',
            title: 'Batch Error',
            status: 400,
            detail: 'Batch payload cannot be empty',
            instance: '/v1/errors/batch/0',
          },
        ],
      }

      mockFetchHandler = async () =>
        createJsonResponse(errorPayload, 400)

      const client = new XYOClient({ apiKey: 'token' })

      try {
        await client.enrichTransactions([])
        assert.fail(
          'Expected bulk call to throw ResponseError',
        )
      } catch (err) {
        assert.ok(err instanceof ResponseError)
        assert.equal(err.response.status, 400)
        const body =
          (await err.response.json()) as ErrorResponse
        assert.equal(
          body.errors[0].detail,
          'Batch payload cannot be empty',
        )
      }
    })

    it('handles bulk submission 500 Internal Server Error', async () => {
      mockFetchHandler = async () =>
        createJsonResponse(
          {
            errors: [
              {
                type: 'server_error',
                title: 'Database failure',
                status: 500,
                detail:
                  'Could not enqueue batch work items',
                instance: '/batch/500',
              },
            ],
          },
          500,
        )

      const client = new XYOClient({ apiKey: 'token' })

      await assert.rejects(
        async () => {
          await client.enrichTransactions([
            { content: 'TX', countryCode: 'GB' },
          ])
        },
        (err: unknown) => {
          assert.ok(err instanceof ResponseError)
          assert.equal(err.response.status, 500)
          return true
        },
      )
    })
  })

  describe('4. getEnrichmentStatus (Job Status Polling)', () => {
    it('successfully fetches status READY via client.enrichment.getEnrichmentStatus', async () => {
      const statusResponse: EnrichmentCollectionStatusResponse =
        {
          status:
            EnrichmentCollectionStatusResponseStatusEnum.Ready,
        }

      mockFetchHandler = async () =>
        createJsonResponse(statusResponse, 200)

      const client = new XYOClient({
        apiKey: 'status-token',
        baseUrl: 'https://api.xyo.financial',
      })

      const result =
        await client.enrichment.getEnrichmentStatus(
          '72c037df-d0d3-43ee-9470-323ff35a2e50',
        )

      assert.equal(capturedRequests.length, 1)
      const captured = capturedRequests[0]
      assert.equal(
        captured.url,
        'https://api.xyo.financial/v1/ai/finance/enrichment/status/72c037df-d0d3-43ee-9470-323ff35a2e50',
      )
      assert.equal(captured.method, 'GET')
      assert.equal(
        captured.headers['authorization'],
        'Bearer status-token',
      )
      assert.equal(result.status, 'READY')
    })

    it('successfully fetches status PENDING via top-level client.getEnrichmentStatus', async () => {
      mockFetchHandler = async () =>
        createJsonResponse(
          {
            status:
              EnrichmentCollectionStatusResponseStatusEnum.Pending,
          },
          200,
        )

      const client = new XYOClient({
        apiKey: 'status-token',
      })

      const result = await client.getEnrichmentStatus(
        'job-pending-123',
      )

      assert.equal(result.status, 'PENDING')
      assert.ok(
        capturedRequests[0].url.endsWith(
          '/status/job-pending-123',
        ),
      )
    })

    it('successfully fetches status FAILED', async () => {
      mockFetchHandler = async () =>
        createJsonResponse(
          {
            status:
              EnrichmentCollectionStatusResponseStatusEnum.Failed,
          },
          200,
        )

      const client = new XYOClient({
        apiKey: 'status-token',
      })

      const result = await client.getEnrichmentStatus(
        'job-failed-456',
      )

      assert.equal(result.status, 'FAILED')
    })

    it('supports xApiUser in EnrichmentApi.getEnrichmentStatus', async () => {
      mockFetchHandler = async () =>
        createJsonResponse({ status: 'READY' }, 200)

      const config = new Configuration({
        basePath: 'https://api.xyo.financial',
        accessToken: 'status-token',
      })
      const api = new EnrichmentApi(config)

      await api.getEnrichmentStatus({
        id: 'job-123',
        xApiUser: 'tenant-user',
      })

      assert.equal(capturedRequests.length, 1)
      assert.equal(
        capturedRequests[0].headers['x-api-user'],
        'tenant-user',
      )
    })

    it('properly URL-encodes special characters in the status ID parameter', async () => {
      mockFetchHandler = async () =>
        createJsonResponse({ status: 'READY' }, 200)

      const client = new XYOClient({
        apiKey: 'status-token',
      })

      await client.getEnrichmentStatus(
        'batch/id with spaces&symbols',
      )

      assert.equal(capturedRequests.length, 1)
      assert.ok(
        capturedRequests[0].url.endsWith(
          '/status/batch%2Fid%20with%20spaces%26symbols',
        ),
      )
    })

    it('throws RequiredError when ID parameter is null or undefined', async () => {
      const client = new XYOClient({ apiKey: 'token' })

      await assert.rejects(
        async () => {
          // @ts-expect-error Testing runtime null guard
          await client.getEnrichmentStatus(null)
        },
        (err: unknown) => {
          assert.ok(err instanceof RequiredError)
          assert.equal(err.name, 'RequiredError')
          assert.equal(err.field, 'id')
          return true
        },
      )
    })

    it('handles 404 Not Found for non-existent bulk job ID', async () => {
      const notFoundPayload: ErrorResponse = {
        errors: [
          {
            type: 'https://api.xyo.financial/errors/not-found',
            title: 'Batch Not Found',
            status: 404,
            detail: 'No bulk job exists with ID unknown-id',
            instance: '/status/unknown-id',
          },
        ],
      }

      mockFetchHandler = async () =>
        createJsonResponse(notFoundPayload, 404)

      const client = new XYOClient({ apiKey: 'token' })

      try {
        await client.getEnrichmentStatus('unknown-id')
        assert.fail(
          'Expected status call to throw ResponseError',
        )
      } catch (err) {
        assert.ok(err instanceof ResponseError)
        assert.equal(err.response.status, 404)
        const body =
          (await err.response.json()) as ErrorResponse
        assert.equal(
          body.errors[0].title,
          'Batch Not Found',
        )
      }
    })
  })

  describe('5. RFC 7807 Problem Details and Models Validation', () => {
    it('validates APIErrorFromJSON and APIErrorToJSON serialization', () => {
      const rawJson = {
        type: 'https://example.com/prob/out-of-credit',
        title: 'You do not have enough credit.',
        status: 403,
        detail:
          'Your current balance is 30, but that costs 50.',
        instance: '/account/12345/msgs/abc',
      }

      const parsed: APIError = APIErrorFromJSON(rawJson)
      assert.equal(parsed.type, rawJson.type)
      assert.equal(parsed.title, rawJson.title)
      assert.equal(parsed.status, 403)
      assert.equal(parsed.detail, rawJson.detail)
      assert.equal(parsed.instance, rawJson.instance)

      const reSerialized = APIErrorToJSON(parsed)
      assert.deepEqual(reSerialized, rawJson)

      assert.equal(instanceOfAPIError(rawJson), true)
      assert.equal(
        instanceOfAPIError({ invalid: 'object' }),
        false,
      )
      assert.equal(APIErrorFromJSON(null), null)
      assert.equal(APIErrorToJSON(null), null)
      assert.equal(APIErrorToJSON(undefined), undefined)
    })

    it('validates ErrorResponseFromJSON and ErrorResponseToJSON serialization', () => {
      const rawJson = {
        errors: [
          {
            type: 'err_type_1',
            title: 'Title 1',
            status: 400,
            detail: 'Detail 1',
            instance: 'Instance 1',
          },
          {
            type: 'err_type_2',
            title: 'Title 2',
            status: 422,
            detail: 'Detail 2',
            instance: 'Instance 2',
          },
        ],
      }

      const parsed: ErrorResponse =
        ErrorResponseFromJSON(rawJson)
      assert.equal(parsed.errors.length, 2)
      assert.equal(parsed.errors[0].title, 'Title 1')
      assert.equal(parsed.errors[1].status, 422)

      const reSerialized = ErrorResponseToJSON(parsed)
      assert.deepEqual(reSerialized, rawJson)

      assert.equal(instanceOfErrorResponse(rawJson), true)
      assert.equal(instanceOfErrorResponse({}), false)
      assert.equal(ErrorResponseFromJSON(null), null)
      assert.equal(ErrorResponseToJSON(null), null)
      assert.equal(
        ErrorResponseToJSON(undefined),
        undefined,
      )
    })

    it('validates EnrichmentRequest and EnrichmentResponse serialization', () => {
      const req: EnrichmentRequest = {
        content: 'COSTA PICKUP',
        countryCode: 'GB',
      }
      const parsedReq = EnrichmentRequestFromJSON(req)
      assert.deepEqual(parsedReq, req)
      assert.deepEqual(
        EnrichmentRequestToJSON(parsedReq),
        req,
      )
      assert.equal(instanceOfEnrichmentRequest(req), true)
      assert.equal(
        instanceOfEnrichmentRequest({ content: 'only' }),
        false,
      )
      assert.equal(EnrichmentRequestFromJSON(null), null)
      assert.equal(EnrichmentRequestToJSON(null), null)
      assert.equal(
        EnrichmentRequestToJSON(undefined),
        undefined,
      )

      const resp: EnrichmentResponse = {
        merchant: 'Costa Coffee',
        description: 'Cafe',
        categories: ['Food'],
        logo: 'logo',
        location: 'UK',
        address: '123 St',
      }
      const parsedResp = EnrichmentResponseFromJSON(resp)
      assert.deepEqual(parsedResp, resp)
      assert.deepEqual(
        EnrichmentResponseToJSON(parsedResp),
        resp,
      )
      assert.equal(instanceOfEnrichmentResponse(resp), true)
      assert.equal(
        instanceOfEnrichmentResponse({ merchant: 'only' }),
        false,
      )
      assert.equal(EnrichmentResponseFromJSON(null), null)
      assert.equal(EnrichmentResponseToJSON(null), null)
      assert.equal(
        EnrichmentResponseToJSON(undefined),
        undefined,
      )
    })

    it('validates EnrichTransactionsRequestInner serialization', () => {
      const item: EnrichTransactionsRequestInner = {
        content: 'TX ITEM',
        countryCode: 'US',
      }
      const parsed =
        EnrichTransactionsRequestInnerFromJSON(item)
      assert.deepEqual(parsed, item)
      assert.deepEqual(
        EnrichTransactionsRequestInnerToJSON(parsed),
        item,
      )
      assert.equal(
        instanceOfEnrichTransactionsRequestInner(item),
        true,
      )
      assert.equal(
        EnrichTransactionsRequestInnerFromJSON(null),
        null,
      )
      assert.equal(
        EnrichTransactionsRequestInnerToJSON(null),
        null,
      )
      assert.equal(
        EnrichTransactionsRequestInnerToJSON(undefined),
        undefined,
      )
    })

    it('validates EnrichTransactionCollectionResponse and EnrichmentCollectionStatusResponse serialization', () => {
      const collResp: EnrichTransactionCollectionResponse =
        {
          id: 'job-1',
          link: 'https://download/1.tar.gz',
        }
      const parsedColl =
        EnrichTransactionCollectionResponseFromJSON(
          collResp,
        )
      assert.deepEqual(parsedColl, collResp)
      assert.deepEqual(
        EnrichTransactionCollectionResponseToJSON(
          parsedColl,
        ),
        collResp,
      )
      assert.equal(
        instanceOfEnrichTransactionCollectionResponse(
          collResp,
        ),
        true,
      )
      assert.equal(
        instanceOfEnrichTransactionCollectionResponse({
          id: 'only',
        }),
        false,
      )
      assert.equal(
        EnrichTransactionCollectionResponseFromJSON(null),
        null,
      )
      assert.equal(
        EnrichTransactionCollectionResponseToJSON(null),
        null,
      )
      assert.equal(
        EnrichTransactionCollectionResponseToJSON(
          undefined,
        ),
        undefined,
      )

      const statusResp: EnrichmentCollectionStatusResponse =
        {
          status:
            EnrichmentCollectionStatusResponseStatusEnum.Ready,
        }
      const parsedStatus =
        EnrichmentCollectionStatusResponseFromJSON(
          statusResp,
        )
      assert.deepEqual(parsedStatus, statusResp)
      assert.deepEqual(
        EnrichmentCollectionStatusResponseToJSON(
          parsedStatus,
        ),
        statusResp,
      )
      assert.equal(
        instanceOfEnrichmentCollectionStatusResponse(
          statusResp,
        ),
        true,
      )
      assert.equal(
        instanceOfEnrichmentCollectionStatusResponse({}),
        false,
      )
      assert.equal(
        EnrichmentCollectionStatusResponseFromJSON(null),
        null,
      )
      assert.equal(
        EnrichmentCollectionStatusResponseToJSON(null),
        null,
      )
      assert.equal(
        EnrichmentCollectionStatusResponseToJSON(undefined),
        undefined,
      )
    })
  })

  describe('6. Middleware, Runtime Helpers & API Class', () => {
    it('supports pre and post middleware execution on BaseAPI', async () => {
      let preHookCalled = false
      let postHookCalled = false

      const config = new Configuration({
        basePath: 'https://api.xyo.financial',
        accessToken: 'middleware-key',
        middleware: [
          {
            pre: async (context) => {
              preHookCalled = true
              return context
            },
            post: async (context) => {
              postHookCalled = true
              return context.response
            },
          },
        ],
      })

      const api = new EnrichmentApi(config)

      mockFetchHandler = async () =>
        createJsonResponse({
          merchant: 'Middleware Merchant',
          description: 'Desc',
          categories: ['Cat'],
          logo: 'logo',
          location: 'Loc',
          address: 'Addr',
        })

      const res = await api.enrichTransaction({
        enrichmentRequest: {
          content: 'TEST',
          countryCode: 'GB',
        },
      })

      assert.equal(preHookCalled, true)
      assert.equal(postHookCalled, true)
      assert.equal(res.merchant, 'Middleware Merchant')
    })

    it('supports withPreMiddleware and withPostMiddleware chaining', async () => {
      let preFired = false
      let postFired = false

      const config = new Configuration({
        basePath: 'https://api.xyo.financial',
        accessToken: 'chain-key',
      })

      const api = new EnrichmentApi(config)
        .withPreMiddleware(async (ctx) => {
          preFired = true
          return ctx
        })
        .withPostMiddleware(async (ctx) => {
          postFired = true
          return ctx.response
        })

      mockFetchHandler = async () =>
        createJsonResponse({
          merchant: 'Chained Merchant',
          description: 'Desc',
          categories: ['Cat'],
          logo: 'logo',
          location: 'Loc',
          address: 'Addr',
        })

      const res = await api.enrichTransaction({
        enrichmentRequest: {
          content: 'TEST',
          countryCode: 'GB',
        },
      })

      assert.equal(preFired, true)
      assert.equal(postFired, true)
      assert.equal(res.merchant, 'Chained Merchant')
    })

    it('supports middleware onError recovery', async () => {
      let recovered = false

      const config = new Configuration({
        basePath: 'https://api.xyo.financial',
        accessToken: 'error-mw-key',
        middleware: [
          {
            onError: async () => {
              recovered = true
              return createJsonResponse({
                merchant: 'Recovered Merchant',
                description: 'Desc',
                categories: ['Cat'],
                logo: 'logo',
                location: 'Loc',
                address: 'Addr',
              })
            },
          },
        ],
      })

      const api = new EnrichmentApi(config)

      mockFetchHandler = async () => {
        throw new Error('Initial network fail')
      }

      const res = await api.enrichTransaction({
        enrichmentRequest: {
          content: 'TEST',
          countryCode: 'GB',
        },
      })

      assert.equal(recovered, true)
      assert.equal(res.merchant, 'Recovered Merchant')
    })

    it('validates runtime ApiResponse helper classes', async () => {
      const rawJsonResp = createJsonResponse(
        { value: 'hello' },
        200,
      )
      const jsonApi = new JSONApiResponse(
        rawJsonResp,
        (json) => json.value,
      )
      assert.equal(await jsonApi.value(), 'hello')

      const rawVoidResp = new Response(null, {
        status: 204,
      })
      const voidApi = new VoidApiResponse(rawVoidResp)
      assert.equal(await voidApi.value(), undefined)

      const rawTextResp = createTextResponse(
        'sample text',
        200,
      )
      const textApi = new TextApiResponse(rawTextResp)
      assert.equal(await textApi.value(), 'sample text')

      const rawBlobResp = new Response(
        new Uint8Array([1, 2, 3]),
        {
          status: 200,
        },
      )
      const blobApi = new BlobApiResponse(rawBlobResp)
      const blob = await blobApi.value()
      assert.ok(blob instanceof Blob)
    })

    it('validates runtime utility functions (querystring, mapValues, exists, anyToJSON, canConsumeForm)', () => {
      assert.equal(
        querystring({ a: '1', b: 2, c: true }),
        'a=1&b=2&c=true',
      )
      assert.equal(
        querystring({ items: ['x', 'y'] }),
        'items=x&items=y',
      )
      assert.equal(
        querystring({ set: new Set(['item1']) }),
        'set=item1',
      )
      assert.equal(
        querystring({
          date: new Date('2026-01-01T00:00:00.000Z'),
        }),
        'date=2026-01-01T00%3A00%3A00.000Z',
      )
      assert.equal(
        querystring({ nested: { foo: 'bar' } }),
        'nested%5Bfoo%5D=bar',
      )

      assert.deepEqual(
        mapValues({ a: 1, b: 2 }, (x) => x * 2),
        { a: 2, b: 4 },
      )
      assert.equal(exists({ a: 1 }, 'a'), true)
      assert.equal(exists({ a: null }, 'a'), false)
      assert.equal(exists({}, 'missing'), false)
      assert.equal(anyToJSON('passthrough'), 'passthrough')
      assert.equal(
        canConsumeForm([
          { contentType: 'multipart/form-data' },
        ]),
        true,
      )
      assert.equal(
        canConsumeForm([
          { contentType: 'application/json' },
        ]),
        false,
      )
    })
  })

  describe('7. downloadEnrichmentCollection (Bulk Results Archive Download)', () => {
    it('successfully downloads, decompresses tar.gz, and parses JSON results', async () => {
      const { gzipSync } = await import('node:zlib')
      
      const file1 = {
        name: 'result_0.json',
        content: JSON.stringify({
          merchant: 'Starbucks Coffee',
          description: 'Coffee Shop Chain',
          categories: ['Food & Drink', 'Coffee'],
          logo: 'data:image/png;base64,...',
          location: 'Seattle, US',
          address: '1912 Pike Place, Seattle',
        }),
      }
      const file2 = {
        name: 'result_1.json',
        content: JSON.stringify({
          merchant: 'Uber Technologies',
          description: 'Ridesharing & Delivery',
          categories: ['Transportation', 'Rideshare'],
          logo: 'data:image/png;base64,...',
          location: 'San Francisco, US',
          address: '1455 Market St, San Francisco',
        }),
      }

      // Create valid tar buffer
      const blocks: Buffer[] = []
      for (const file of [file1, file2]) {
        const header = Buffer.alloc(512, 0)
        const contentBuf = Buffer.from(file.content, 'utf8')
        header.write(file.name, 0, 100, 'utf8')
        header.write('0000644\0', 100, 8, 'ascii')
        header.write('0000000\0', 108, 8, 'ascii')
        header.write('0000000\0', 116, 8, 'ascii')
        header.write(
          contentBuf.length.toString(8).padStart(11, '0') + '\0',
          124,
          12,
          'ascii',
        )
        header.write('00000000000\0', 136, 12, 'ascii')
        header.fill(32, 148, 156)
        header.write('0', 156, 1, 'ascii')
        header.write('ustar\0', 257, 6, 'ascii')
        header.write('00', 263, 2, 'ascii')

        let sum = 0
        for (let i = 0; i < 512; i++) sum += header[i]
        header.write(
          sum.toString(8).padStart(6, '0') + '\0 ',
          148,
          8,
          'ascii',
        )

        blocks.push(header)
        blocks.push(contentBuf)
        const rem = contentBuf.length % 512
        if (rem > 0) {
          blocks.push(Buffer.alloc(512 - rem, 0))
        }
      }
      blocks.push(Buffer.alloc(1024, 0))
      const tarGz = gzipSync(Buffer.concat(blocks))

      mockFetchHandler = async (_url, init) => {
        return new Response(tarGz, {
          status: 200,
          headers: {
            'Content-Type': 'application/gzip',
          },
        })
      }

      const client = new XYOClient({
        apiKey: 'token-download',
      })

      const results = await client.downloadEnrichmentCollection(
        'https://api.xyo.financial/v1/download/job_123.tar.gz',
      )

      assert.equal(results.length, 2)
      assert.equal(results[0].merchant, 'Starbucks Coffee')
      assert.equal(results[0].location, 'Seattle, US')
      assert.deepEqual(results[0].categories, [
        'Food & Drink',
        'Coffee',
      ])
      assert.equal(results[1].merchant, 'Uber Technologies')

      assert.equal(capturedRequests.length, 1)
      assert.equal(
        capturedRequests[0].url,
        'https://api.xyo.financial/v1/download/job_123.tar.gz',
      )
      assert.equal(
        capturedRequests[0].headers['authorization'],
        'Bearer token-download',
      )
      assert.ok(
        capturedRequests[0].headers['accept'].includes('application/gzip'),
      )

      // Test alias under client.enrichment.downloadEnrichmentCollection
      const resultsAlias =
        await client.enrichment.downloadEnrichmentCollection(
          'https://api.xyo.financial/v1/download/job_123.tar.gz',
        )
      assert.equal(resultsAlias.length, 2)
    })

    it('handles non-200 HTTP status code', async () => {
      mockFetchHandler = async () => {
        return new Response('Not Found', { status: 404 })
      }

      const client = new XYOClient({ apiKey: 'token' })
      await assert.rejects(
        async () => {
          await client.downloadEnrichmentCollection(
            'https://api.xyo.financial/download/missing.tar.gz',
          )
        },
        /downloadEnrichmentCollection: unexpected HTTP status 404/,
      )
    })

    it('handles null response body', async () => {
      mockFetchHandler = async () => {
        const resp = new Response(null, { status: 200 })
        Object.defineProperty(resp, 'body', { value: null })
        return resp
      }

      const client = new XYOClient({ apiKey: 'token' })
      await assert.rejects(
        async () => {
          await client.downloadEnrichmentCollection(
            'https://api.xyo.financial/download/null-body.tar.gz',
          )
        },
        /downloadEnrichmentCollection: response body is null/,
      )
    })

    it('rejects unsupported URL schemes (SSRF protection)', async () => {
      const client = new XYOClient({ apiKey: 'token' })
      await assert.rejects(
        async () => {
          await client.downloadEnrichmentCollection('file:///etc/passwd')
        },
        /downloadEnrichmentCollection: unsupported protocol "file:"/,
      )

      await assert.rejects(
        async () => {
          await client.downloadEnrichmentCollection('ftp://malicious.org/archive.tar.gz')
        },
        /downloadEnrichmentCollection: unsupported protocol "ftp:"/,
      )
    })

    it('diagnoses WAF HTML security challenge response on 200 status', async () => {
      mockFetchHandler = async () => {
        return new Response('<html><body><h1>Cloudflare / WAF Security Challenge</h1></body></html>', {
          status: 200,
          headers: { 'content-type': 'text/html; charset=UTF-8' },
        })
      }

      const client = new XYOClient({ apiKey: 'token' })
      await assert.rejects(
        async () => {
          await client.downloadEnrichmentCollection('https://api.xyo.financial/download/job_waf.tar.gz')
        },
        /downloadEnrichmentCollection: unexpected Content-Type "text\/html; charset=UTF-8"/,
      )
    })

    it('supports dynamic secret rotation via tokenSupplier', async () => {
      let currentKey = 'initial-token-1'

      mockFetchHandler = async () => {
        return createJsonResponse({
          merchant: 'Starbucks',
          description: 'Coffee',
          categories: ['Food'],
          logo: 'url',
        })
      }

      const client = new XYOClient({
        tokenSupplier: () => currentKey,
      })

      await client.enrichTransaction({ content: 'Coffee purchase', countryCode: 'US' })
      currentKey = 'rotated-token-2'
      await client.enrichTransaction({ content: 'Coffee purchase 2', countryCode: 'US' })

      assert.equal(capturedRequests.length, 2)
      assert.equal(capturedRequests[0].headers['authorization'], 'Bearer initial-token-1')
      assert.equal(capturedRequests[1].headers['authorization'], 'Bearer rotated-token-2')
    })
  })
})


