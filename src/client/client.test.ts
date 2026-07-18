import { describe, test } from 'node:test'
import assert from 'node:assert'
import {
  Client,
  HttpTransport,
  HttpTransportResponse,
  HttpTransportOptions,
} from './client'
import {
  EnrichmentCollectionStatus,
  EnrichmentResponse,
  EnrichTransactionCollectionResponse,
} from '../enrichment/enrichment'
import { ClientError } from './error'

function createMockTransport<T>(
  status: number,
  responseBody: string | T,
): HttpTransport {
  return {
    send<U>(): Promise<HttpTransportResponse<U>> {
      const mockedResponse: HttpTransportResponse<U> = {
        status,
        text() {
          return Promise.resolve(
            typeof responseBody === 'string'
              ? responseBody
              : JSON.stringify(responseBody),
          )
        },
        json() {
          return Promise.resolve(
            (typeof responseBody === 'string'
              ? JSON.parse(responseBody)
              : responseBody) as U,
          )
        },
      }
      return Promise.resolve(mockedResponse)
    },
  }
}

function createCapturingTransport<T>(
  status: number,
  responseBody: string | T,
) {
  const calls: {
    url: string
    options: HttpTransportOptions
  }[] = []
  const transport: HttpTransport = {
    send<U>(
      url: string,
      options: HttpTransportOptions,
    ): Promise<HttpTransportResponse<U>> {
      calls.push({ url, options })
      const mockedResponse: HttpTransportResponse<U> = {
        status,
        text() {
          return Promise.resolve(
            typeof responseBody === 'string'
              ? responseBody
              : JSON.stringify(responseBody),
          )
        },
        json() {
          return Promise.resolve(
            (typeof responseBody === 'string'
              ? JSON.parse(responseBody)
              : responseBody) as U,
          )
        },
      }
      return Promise.resolve(mockedResponse)
    },
  }
  return { transport, calls }
}

void describe('Client Enrichment Suite', () => {
  describe('Constructor Options', () => {
    test('throws if apiKey is missing or empty', () => {
      assert.throws(
        () => new Client({ apiKey: '' }),
        (err: any) => {
          assert.ok(err instanceof ClientError)
          assert.strictEqual(err.category, 'validation')
          assert.match(err.message, /apiKey is required/)
          return true
        },
      )
      assert.throws(
        () => new Client({ apiKey: '   ' }),
        (err: any) => {
          assert.ok(err instanceof ClientError)
          assert.strictEqual(err.category, 'validation')
          assert.match(err.message, /apiKey is required/)
          return true
        },
      )
    })

    test('throws if timeoutMs is invalid', () => {
      assert.throws(
        () =>
          new Client({
            apiKey: 'test-key',
            timeoutMs: -50,
          }),
        /timeoutMs must be an integer/,
      )
      assert.throws(
        () =>
          new Client({
            apiKey: 'test-key',
            timeoutMs: 150000,
          }),
        /timeoutMs must be an integer/,
      )
      assert.throws(
        () =>
          new Client({
            apiKey: 'test-key',
            timeoutMs: 30.5,
          }),
        /timeoutMs must be an integer/,
      )
    })

    test('throws if endpoint is invalid URL', () => {
      assert.throws(
        () =>
          new Client({
            apiKey: 'test-key',
            endpoint: 'not-a-valid-url',
          }),
        /endpoint must be a valid URL/,
      )
    })

    test('supports custom endpoint override and strips trailing slashes', () => {
      const sut = new Client({
        apiKey: 'test-key',
        endpoint: 'https://custom-api.example.com///',
      })
      assert.strictEqual(
        sut.endpointUrl,
        'https://custom-api.example.com',
      )
    })
  })

  describe('Validation Guards', () => {
    // Inject a transport sentinel that throws to prove zero real HTTP calls occur
    const client = new Client({
      apiKey: 'valid-key',
      transport: {
        send() {
          return Promise.reject(
            new Error('Transport should not be called'),
          )
        },
      },
    })

    test('enrichTransaction validates request object properties', async () => {
      await assert.rejects(
        () => client.enrichTransaction(null as any),
        (err: any) => {
          assert.ok(err instanceof ClientError)
          assert.strictEqual(err.category, 'validation')
          assert.match(
            err.message,
            /must be a valid object/,
          )
          return true
        },
      )

      await assert.rejects(
        () =>
          client.enrichTransaction({
            content: '',
            countryCode: 'GB',
          }),
        (err: any) => {
          assert.ok(err instanceof ClientError)
          assert.strictEqual(err.category, 'validation')
          assert.match(
            err.message,
            /must be a non-empty string/,
          )
          return true
        },
      )

      await assert.rejects(
        () =>
          client.enrichTransaction({
            content: 'Costa',
            countryCode: 'G',
          }),
        (err: any) => {
          assert.ok(err instanceof ClientError)
          assert.strictEqual(err.category, 'validation')
          assert.match(
            err.message,
            /must be a 2-letter uppercase ISO/,
          )
          return true
        },
      )

      await assert.rejects(
        () =>
          client.enrichTransaction({
            content: 'Costa',
            countryCode: 'gb', // lowercase should fail validation
          }),
        (err: any) => {
          assert.ok(err instanceof ClientError)
          assert.strictEqual(err.category, 'validation')
          assert.match(
            err.message,
            /must be a 2-letter uppercase ISO/,
          )
          return true
        },
      )
    })

    test('enrichTransactionCollection validates array input and size', async () => {
      await assert.rejects(
        () =>
          client.enrichTransactionCollection(null as any),
        (err: any) => {
          assert.ok(err instanceof ClientError)
          assert.strictEqual(err.category, 'validation')
          assert.match(err.message, /must be an array/)
          return true
        },
      )

      await assert.rejects(
        () => client.enrichTransactionCollection([]),
        (err: any) => {
          assert.ok(err instanceof ClientError)
          assert.strictEqual(err.category, 'validation')
          assert.match(
            err.message,
            /contain at least one transaction/,
          )
          return true
        },
      )
    })

    test('enrichTransactionCollectionStatus validates jobId string', async () => {
      await assert.rejects(
        () => client.enrichTransactionCollectionStatus(''),
        (err: any) => {
          assert.ok(err instanceof ClientError)
          assert.strictEqual(err.category, 'validation')
          assert.match(
            err.message,
            /must be a non-empty string/,
          )
          return true
        },
      )
    })
  })

  describe('Request Construction & Payload Delegation', () => {
    test('enrichTransaction builds correct HTTP request parameters', async () => {
      const mockResponse: EnrichmentResponse = {
        merchant: 'Syniol Limited',
        description: 'Cloud Software Consultancy',
        categories: ['Cloud', 'Tech'],
        logo: 'base64-logo',
        location: 'London, UK',
        address: null,
      }

      const { transport, calls } = createCapturingTransport(
        200,
        mockResponse,
      )

      const sut = new Client({
        apiKey: 'secure-token',
        endpoint: 'https://test.xyo.financial',
        timeoutMs: 5000,
        transport,
      })

      const req = {
        content: 'Syniol Software',
        countryCode: 'GB',
      }
      const actual = await sut.enrichTransaction(req)

      assert.deepStrictEqual(actual, mockResponse)
      assert.strictEqual(calls.length, 1)
      const call = calls[0]!
      assert.strictEqual(
        call.url,
        'https://test.xyo.financial/v1/ai/finance/enrichment/transaction',
      )
      assert.strictEqual(call.options.method, 'POST')
      assert.strictEqual(call.options.timeout, 5000)
      assert.strictEqual(
        call.options.headers['Authorization'],
        'Bearer secure-token',
      )
      assert.strictEqual(
        call.options.headers['Content-Type'],
        'application/json',
      )
      assert.strictEqual(
        call.options.headers['Accept'],
        'application/json',
      )
      assert.match(
        call.options.headers['User-Agent']!,
        /^xyo-sdk-node\//,
      )
      assert.strictEqual(
        call.options.body,
        JSON.stringify(req),
      )
    })

    test('enrichTransactionCollectionStatus builds correct HTTP URL with escaping', async () => {
      const mockResponse = {
        status: EnrichmentCollectionStatus.Ready,
      }
      const { transport, calls } = createCapturingTransport(
        200,
        mockResponse,
      )

      const sut = new Client({
        apiKey: 'secure-token',
        transport,
      })

      const jobId = 'job/123?param=val#hash'
      const status =
        await sut.enrichTransactionCollectionStatus(jobId)

      assert.strictEqual(
        status,
        EnrichmentCollectionStatus.Ready,
      )
      assert.strictEqual(calls.length, 1)
      const call = calls[0]!
      // Verify encodeURIComponent encoding is applied to jobId
      assert.strictEqual(
        call.url,
        `https://api.xyo.financial/v1/ai/finance/enrichment/transactions/status/${encodeURIComponent(jobId)}`,
      )
    })
  })

  describe('Test enrichTransaction', () => {
    test('when status code is 200', async () => {
      const mockResponse: EnrichmentResponse = {
        merchant: 'Syniol Limited',
        description:
          'Cloud Software and Platform Consultancy',
        categories: ['Cloud', 'Tech'],
        logo: 'base64/png;eyutuidbavdqgfmfnbamdnsdsadasdfc',
        location: 'London, United Kingdom',
        address: null,
      }

      const sut = new Client({
        apiKey: 'test-key',
        transport: createMockTransport(200, mockResponse),
      })

      const actual = await sut.enrichTransaction({
        content: 'Syniol Software Consultancy',
        countryCode: 'GB',
      })

      assert.deepStrictEqual(actual, mockResponse)
    })

    test('when status code is not 200', async () => {
      const sut = new Client({
        apiKey: 'test-key',
        transport: createMockTransport(
          400,
          'error with the request',
        ),
      })

      await assert.rejects(
        () =>
          sut.enrichTransaction({
            content: 'Syniol Software Consultancy',
            countryCode: 'GB',
          }),
        (err: any) => {
          assert.ok(err instanceof ClientError)
          assert.strictEqual(err.statusCode, 400)
          assert.strictEqual(err.category, 'validation')
          assert.strictEqual(
            err.message,
            'error with the request',
          )
          return true
        },
      )
    })

    test('when there is a synchronous transport failure', async () => {
      const networkError = new Error('Network timeout')
      const sut = new Client({
        apiKey: 'test-key',
        transport: {
          send() {
            throw networkError
          },
        },
      })

      await assert.rejects(
        () =>
          sut.enrichTransaction({
            content: 'Syniol Software Consultancy',
            countryCode: 'GB',
          }),
        (err: any) => {
          assert.ok(err instanceof ClientError)
          assert.strictEqual(err.category, 'network_error')
          assert.strictEqual(err.cause, networkError)
          assert.match(
            err.message,
            /Transport error: Network timeout/,
          )
          return true
        },
      )
    })

    test('when there is an asynchronous transport failure', async () => {
      const networkError = new Error('DNS failure')
      const sut = new Client({
        apiKey: 'test-key',
        transport: {
          send() {
            return Promise.reject(networkError)
          },
        },
      })

      await assert.rejects(
        () =>
          sut.enrichTransaction({
            content: 'Syniol Software Consultancy',
            countryCode: 'GB',
          }),
        (err: any) => {
          assert.ok(err instanceof ClientError)
          assert.strictEqual(err.category, 'network_error')
          assert.strictEqual(err.cause, networkError)
          assert.match(
            err.message,
            /Transport error: DNS failure/,
          )
          return true
        },
      )
    })

    test('when response payload structure is invalid', async () => {
      const sut = new Client({
        apiKey: 'test-key',
        transport: createMockTransport(200, {
          merchant: 'Costa',
        }),
      })

      await assert.rejects(
        () =>
          sut.enrichTransaction({
            content: 'Costa Coffee',
            countryCode: 'GB',
          }),
        (err: any) => {
          assert.ok(err instanceof ClientError)
          assert.strictEqual(err.category, 'server_error')
          assert.match(
            err.message,
            /invalid EnrichmentResponse structure/,
          )
          return true
        },
      )
    })

    test('when response body JSON is malformed', async () => {
      const sut = new Client({
        apiKey: 'test-key',
        transport: createMockTransport(
          200,
          '{"invalid-json',
        ),
      })

      await assert.rejects(
        () =>
          sut.enrichTransaction({
            content: 'Costa Coffee',
            countryCode: 'GB',
          }),
        (err: any) => {
          assert.ok(err instanceof ClientError)
          assert.strictEqual(err.category, 'server_error')
          assert.match(
            err.message,
            /failed to parse JSON payload/,
          )
          return true
        },
      )
    })
  })

  describe('Test enrichTransactionCollection', () => {
    test('when status code is 200', async () => {
      const mockResponse: EnrichTransactionCollectionResponse =
        {
          id: '411f991f-2b62-4dc9-aaa8-13bf3610152a',
          link: 'ftp://storage.xyo.financial/enrichment/download/411f991f-2b62-4dc9-aaa8-13bf3610152a.tar.gz',
        }

      const sut = new Client({
        apiKey: 'test-key',
        transport: createMockTransport(200, mockResponse),
      })

      const actual = await sut.enrichTransactionCollection([
        {
          content: 'Syniol Software Consultancy',
          countryCode: 'GB',
        },
      ])

      assert.deepStrictEqual(actual, mockResponse)
    })

    test('when status code is not 200', async () => {
      const sut = new Client({
        apiKey: 'test-key',
        transport: createMockTransport(
          400,
          'error with the request',
        ),
      })

      await assert.rejects(
        () =>
          sut.enrichTransactionCollection([
            {
              content: 'Syniol Software Consultancy',
              countryCode: 'GB',
            },
          ]),
        (err: any) => {
          assert.ok(err instanceof ClientError)
          assert.strictEqual(err.statusCode, 400)
          assert.strictEqual(
            err.message,
            'error with the request',
          )
          return true
        },
      )
    })

    test('when response payload structure is invalid', async () => {
      const sut = new Client({
        apiKey: 'test-key',
        transport: createMockTransport(200, {
          id: '123',
        }),
      })

      await assert.rejects(
        () =>
          sut.enrichTransactionCollection([
            {
              content: 'Costa Coffee',
              countryCode: 'GB',
            },
          ]),
        (err: any) => {
          assert.ok(err instanceof ClientError)
          assert.strictEqual(err.category, 'server_error')
          assert.match(
            err.message,
            /invalid EnrichTransactionCollectionResponse structure/,
          )
          return true
        },
      )
    })
  })

  describe('Test enrichTransactionCollectionStatus', () => {
    test('when status code is 200', async () => {
      const mockResponse = {
        status: EnrichmentCollectionStatus.Ready,
      }

      const sut = new Client({
        apiKey: 'test-key',
        transport: createMockTransport(200, mockResponse),
      })

      const actual =
        await sut.enrichTransactionCollectionStatus(
          '6dd29d66-2326-40bb-b3e9-2b45f2dcf517',
        )

      assert.strictEqual(actual, mockResponse.status)
    })

    test('when status code is 404 (not found mapping check)', async () => {
      const sut = new Client({
        apiKey: 'test-key',
        transport: createMockTransport(
          404,
          'Job not found',
        ),
      })

      await assert.rejects(
        () =>
          sut.enrichTransactionCollectionStatus(
            '6dd29d66-2326-40bb-b3e9-2b45f2dcf517',
          ),
        (err: any) => {
          assert.ok(err instanceof ClientError)
          assert.strictEqual(err.statusCode, 404)
          assert.strictEqual(err.category, 'not_found') // verifies P1-01 category mapping
          return true
        },
      )
    })

    test('when response body is malformed', async () => {
      const sut = new Client({
        apiKey: 'test-key',
        transport: createMockTransport(200, {}),
      })

      await assert.rejects(
        () =>
          sut.enrichTransactionCollectionStatus(
            '6dd29d66-2326-40bb-b3e9-2b45f2dcf517',
          ),
        (err: any) => {
          assert.ok(err instanceof ClientError)
          assert.strictEqual(err.category, 'server_error')
          assert.match(err.message, /invalid status value/)
          return true
        },
      )
    })
  })

  describe('RFC 7807 Error Handling', () => {
    test('correctly parses and formats RFC 7807 problem details response', async () => {
      const errorPayload = {
        errors: [
          {
            type: 'Invalid Format',
            title: 'authorization header required',
            status: 401,
            detail:
              'Authorization header (Bearer) is required',
            instance: 'HttpHeaderAuthorizationException',
          },
        ],
      }

      const sut = new Client({
        apiKey: 'test-key',
        transport: createMockTransport(401, errorPayload),
      })

      await assert.rejects(
        () =>
          sut.enrichTransaction({
            content: 'Syniol Software Consultancy',
            countryCode: 'GB',
          }),
        (err: any) => {
          assert.ok(err instanceof ClientError)
          assert.strictEqual(err.statusCode, 401)
          assert.strictEqual(err.category, 'authentication')
          assert.strictEqual(
            err.message,
            'API Error: [HttpHeaderAuthorizationException] authorization header required - Authorization header (Bearer) is required (Type: Invalid Format)',
          )
          assert.strictEqual(err.errors.length, 1)
          assert.strictEqual(
            err.errors[0]?.type,
            'Invalid Format',
          )
          assert.strictEqual(
            err.errors[0]?.title,
            'authorization header required',
          )
          assert.strictEqual(
            err.errors[0]?.detail,
            'Authorization header (Bearer) is required',
          )
          assert.strictEqual(
            err.errors[0]?.instance,
            'HttpHeaderAuthorizationException',
          )
          assert.strictEqual(
            err.rawBody,
            JSON.stringify(errorPayload),
          )
          return true
        },
      )
    })

    test('correctly handles multi-error RFC 7807 payloads', async () => {
      const errorPayload = {
        errors: [
          {
            type: 'ValidationError',
            title: 'missing field',
            status: 400,
            detail: 'content is required',
            instance: 'FieldValidationException',
          },
          {
            type: 'ValidationError',
            title: 'invalid length',
            status: 400,
            detail: 'countryCode must be 2 chars',
            instance: 'FieldValidationException',
          },
        ],
      }

      const sut = new Client({
        apiKey: 'test-key',
        transport: createMockTransport(400, errorPayload),
      })

      await assert.rejects(
        () =>
          sut.enrichTransaction({
            content: 'Syniol',
            countryCode: 'GB',
          }),
        (err: any) => {
          assert.ok(err instanceof ClientError)
          assert.strictEqual(err.statusCode, 400)
          assert.strictEqual(err.category, 'validation')
          assert.strictEqual(
            err.message,
            'API Error: [FieldValidationException] missing field - content is required (Type: ValidationError) | API Error: [FieldValidationException] invalid length - countryCode must be 2 chars (Type: ValidationError)',
          )
          assert.strictEqual(err.errors.length, 2)
          return true
        },
      )
    })
  })
})
