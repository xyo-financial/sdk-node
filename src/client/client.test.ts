import { describe, test } from 'node:test'
import assert from 'node:assert'
import {
  CarbonHttpResponse,
  HttpStatusCode,
} from 'carbon-http'
import { Client } from './client'
import {
  EnrichmentCollectionStatus,
  EnrichmentResponse,
  EnrichTransactionCollectionResponse,
  EnrichTransactionCollectionStatusResponse,
} from '../enrichment/enrichment'
import { ClientError } from './error'

function createMockTransport<T>(
  status: number,
  responseBody: string | T,
) {
  return <U>(): Promise<CarbonHttpResponse<U>> => {
    const mockedResponse = {
      status,
      text() {
        return typeof responseBody === 'string'
          ? responseBody
          : JSON.stringify(responseBody)
      },
      json() {
        return (
          typeof responseBody === 'string'
            ? JSON.parse(responseBody)
            : responseBody
        ) as U
      },
    } as CarbonHttpResponse<U>
    return Promise.resolve(mockedResponse)
  }
}

void describe('Client Enrichment Suite', () => {
  describe('Constructor Options', () => {
    test('throws if apiKey is missing or empty', () => {
      assert.throws(
        () => new Client({ apiKey: '' }),
        /apiKey is required/,
      )
      assert.throws(
        () => new Client({ apiKey: '   ' }),
        /apiKey is required/,
      )
    })

    test('supports custom endpoint override and strips trailing slashes', () => {
      const sut = new Client({
        apiKey: 'test-key',
        endpoint: 'https://custom-api.example.com///',
      })
      assert.strictEqual(
        (sut as any).endpoint,
        'https://custom-api.example.com',
      )
    })
  })

  describe('Validation Guards', () => {
    const client = new Client({ apiKey: 'valid-key' })

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
            /must be a 2-letter ISO/,
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
          return true
        },
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
        transport: createMockTransport(
          HttpStatusCode.OK,
          mockResponse,
        ),
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
          HttpStatusCode.BAD_REQUEST,
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
          assert.strictEqual(
            err.statusCode,
            HttpStatusCode.BAD_REQUEST,
          )
          assert.strictEqual(err.category, 'validation')
          assert.strictEqual(
            err.message,
            'error with the request',
          )
          return true
        },
      )
    })

    test('when there is an unexpected error querying the API via HTTP protocol', async () => {
      const networkError = new Error('Network timeout')
      const sut = new Client({
        apiKey: 'test-key',
        transport: () => {
          throw networkError
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
        transport: createMockTransport(
          HttpStatusCode.OK,
          mockResponse,
        ),
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
          HttpStatusCode.BAD_REQUEST,
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
          assert.strictEqual(
            err.statusCode,
            HttpStatusCode.BAD_REQUEST,
          )
          assert.strictEqual(
            err.message,
            'error with the request',
          )
          return true
        },
      )
    })
  })

  describe('Test enrichTransactionCollectionStatus', () => {
    test('when status code is 200', async () => {
      const mockResponse: EnrichTransactionCollectionStatusResponse =
        {
          status:
            EnrichmentCollectionStatus.EnrichmentCollectionStatusReady,
        }

      const sut = new Client({
        apiKey: 'test-key',
        transport: createMockTransport(
          HttpStatusCode.OK,
          mockResponse,
        ),
      })

      const actual =
        await sut.enrichTransactionCollectionStatus(
          '6dd29d66-2326-40bb-b3e9-2b45f2dcf517',
        )

      assert.strictEqual(actual, mockResponse.status)
    })

    test('when status code is not 200', async () => {
      const sut = new Client({
        apiKey: 'test-key',
        transport: createMockTransport(
          HttpStatusCode.BAD_REQUEST,
          'error with the request',
        ),
      })

      await assert.rejects(
        () =>
          sut.enrichTransactionCollectionStatus(
            '6dd29d66-2326-40bb-b3e9-2b45f2dcf517',
          ),
        (err: any) => {
          assert.ok(err instanceof ClientError)
          assert.strictEqual(
            err.statusCode,
            HttpStatusCode.BAD_REQUEST,
          )
          assert.strictEqual(
            err.message,
            'error with the request',
          )
          return true
        },
      )
    })

    test('when response body is malformed', async () => {
      const sut = new Client({
        apiKey: 'test-key',
        transport: createMockTransport(
          HttpStatusCode.OK,
          {},
        ),
      })

      await assert.rejects(
        () =>
          sut.enrichTransactionCollectionStatus(
            '6dd29d66-2326-40bb-b3e9-2b45f2dcf517',
          ),
        (err: any) => {
          assert.ok(err instanceof ClientError)
          assert.strictEqual(err.category, 'server_error')
          assert.match(err.message, /status is missing/)
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
            status: HttpStatusCode.UNAUTHORIZED,
            detail:
              'Authorization header (Bearer) is required',
            instance: 'HttpHeaderAuthorizationException',
          },
        ],
      }

      const sut = new Client({
        apiKey: 'test-key',
        transport: createMockTransport(
          HttpStatusCode.UNAUTHORIZED,
          errorPayload,
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
          assert.strictEqual(
            err.statusCode,
            HttpStatusCode.UNAUTHORIZED,
          )
          assert.strictEqual(err.category, 'authentication')
          assert.strictEqual(
            err.message,
            'API Error: [HttpHeaderAuthorizationException] authorization header required - Authorization header (Bearer) is required (Type: Invalid Format)',
          )
          assert.strictEqual(err.errors.length, 1)
          assert.strictEqual(
            err.errors[0]?.['type'],
            'Invalid Format',
          )
          assert.strictEqual(
            err.errors[0]?.['title'],
            'authorization header required',
          )
          assert.strictEqual(
            err.errors[0]?.['detail'],
            'Authorization header (Bearer) is required',
          )
          assert.strictEqual(
            err.errors[0]?.['instance'],
            'HttpHeaderAuthorizationException',
          )
          return true
        },
      )
    })
  })
})
