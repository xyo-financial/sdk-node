import { describe, suite, test } from 'node:test'
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

void (async () => {
  await suite('Client Enrichment Suite', async () => {
    await describe('Test enrichTransaction', async () => {
      await test('when status code is 200', async (t) => {
        const mockedEnrichmentResponse: EnrichmentResponse =
          {
            merchant: 'Syniol Limited',
            description:
              'Cloud Software and Platform Consultancy',
            categories: ['Cloud', 'Tech'],
            logo: 'base64/png;eyutuidbavdqgfmfnbamdnsdsadasdfc',
            location: 'London, United Kingdom',
            address: null,
          }

        const sut = new Client({
          apiKey: 'YourApiKeyFromXYO.FinancialDashboard',
          transport: <T>(): Promise<
            CarbonHttpResponse<T>
          > => {
            const mockedHttpRequestResponse = {
              status: HttpStatusCode.OK,
              text() {
                return JSON.stringify(
                  mockedEnrichmentResponse,
                )
              },
              json() {
                return mockedEnrichmentResponse as T
              },
            } as CarbonHttpResponse<T>

            return Promise.resolve(
              mockedHttpRequestResponse,
            )
          },
        })

        const actual = await sut.enrichTransaction({
          content: 'Syniol Software Consultancy',
          countryCode: 'GB',
        })

        t.assert.deepEqual(actual, mockedEnrichmentResponse)
      })

      await test('when status code is not 200', async (t) => {
        const sut = new Client({
          apiKey: 'YourApiKeyFromXYO.FinancialDashboard',
          transport: <T>(): Promise<
            CarbonHttpResponse<T>
          > => {
            const mockedHttpRequestResponse = {
              status: HttpStatusCode.BAD_REQUEST,
              text() {
                return 'error with the request'
              },
            } as CarbonHttpResponse<T>

            return Promise.resolve(
              mockedHttpRequestResponse,
            )
          },
        })

        try {
          await sut.enrichTransaction({
            content: 'Syniol Software Consultancy',
            countryCode: 'GB',
          })
        } catch (e: any) {
          t.assert.equal(
            e.statusCode,
            HttpStatusCode.BAD_REQUEST,
          )
          t.assert.equal(
            e.message,
            'error with the request',
          )
          t.assert.ok(e instanceof ClientError)
        }
      })

      await test('when there is an unexpected error querying the API via HTTP protocol', async (t) => {
        const sut = new Client({
          apiKey: 'YourApiKeyFromXYO.FinancialDashboard',
          transport: <T>(): Promise<
            CarbonHttpResponse<T>
          > => {
            throw new Error('Network timeout')
          },
        })

        try {
          await sut.enrichTransaction({
            content: 'Syniol Software Consultancy',
            countryCode: 'GB',
          })
        } catch (e: any) {
          t.assert.equal(
            e.message,
            'Transport error: Network timeout',
          )
          t.assert.ok(e instanceof ClientError)
        }
      })
    })

    await describe('Test enrichTransactionCollection', async () => {
      await test('when status code is 200', async (t) => {
        const mockedEnrichmentResponse: EnrichTransactionCollectionResponse =
          {
            id: '411f991f-2b62-4dc9-aaa8-13bf3610152a',
            link: 'ftp://storage.xyo.financial/enrichment/download/411f991f-2b62-4dc9-aaa8-13bf3610152a.tar.gz',
          }

        const sut = new Client({
          apiKey: 'YourApiKeyFromXYO.FinancialDashboard',
          transport: <T>(): Promise<
            CarbonHttpResponse<T>
          > => {
            const mockedHttpRequestResponse = {
              status: HttpStatusCode.OK,
              text() {
                return JSON.stringify(
                  mockedEnrichmentResponse,
                )
              },
              json() {
                return mockedEnrichmentResponse as T
              },
            } as CarbonHttpResponse<T>

            return Promise.resolve(
              mockedHttpRequestResponse,
            )
          },
        })

        const actual =
          await sut.enrichTransactionCollection([
            {
              content: 'Syniol Software Consultancy',
              countryCode: 'GB',
            },
          ])

        t.assert.deepEqual(actual, mockedEnrichmentResponse)
      })

      await test('when status code is not 200', async (t) => {
        const sut = new Client({
          apiKey: 'YourApiKeyFromXYO.FinancialDashboard',
          transport: <T>(): Promise<
            CarbonHttpResponse<T>
          > => {
            const mockedHttpRequestResponse = {
              status: HttpStatusCode.BAD_REQUEST,
              text() {
                return 'error with the request'
              },
            } as CarbonHttpResponse<T>

            return Promise.resolve(
              mockedHttpRequestResponse,
            )
          },
        })

        try {
          await sut.enrichTransactionCollection([
            {
              content: 'Syniol Software Consultancy',
              countryCode: 'GB',
            },
          ])
        } catch (e: any) {
          t.assert.equal(
            e.statusCode,
            HttpStatusCode.BAD_REQUEST,
          )
          t.assert.equal(
            e.message,
            'error with the request',
          )
          t.assert.ok(e instanceof ClientError)
        }
      })
    })

    await describe('Test enrichTransactionCollectionStatus', async () => {
      await test('when status code is 200', async (t) => {
        const mockedEnrichmentResponse: EnrichTransactionCollectionStatusResponse =
          {
            status:
              EnrichmentCollectionStatus.EnrichmentCollectionStatusReady,
          }

        const sut = new Client({
          apiKey: 'YourApiKeyFromXYO.FinancialDashboard',
          transport: <T>(): Promise<
            CarbonHttpResponse<T>
          > => {
            const mockedHttpRequestResponse = {
              status: HttpStatusCode.OK,
              text() {
                return JSON.stringify(
                  mockedEnrichmentResponse,
                )
              },
              json() {
                return mockedEnrichmentResponse as T
              },
            } as CarbonHttpResponse<T>

            return Promise.resolve(
              mockedHttpRequestResponse,
            )
          },
        })

        const actual =
          await sut.enrichTransactionCollectionStatus(
            '6dd29d66-2326-40bb-b3e9-2b45f2dcf517',
          )

        t.assert.deepEqual(
          actual,
          mockedEnrichmentResponse.status,
        )
      })

      await test('when status code is not 200', async (t) => {
        const sut = new Client({
          apiKey: 'YourApiKeyFromXYO.FinancialDashboard',
          transport: <T>(): Promise<
            CarbonHttpResponse<T>
          > => {
            const mockedHttpRequestResponse = {
              status: HttpStatusCode.BAD_REQUEST,
              text() {
                return 'error with the request'
              },
            } as CarbonHttpResponse<T>

            return Promise.resolve(
              mockedHttpRequestResponse,
            )
          },
        })

        try {
          await sut.enrichTransactionCollectionStatus(
            '6dd29d66-2326-40bb-b3e9-2b45f2dcf517',
          )
        } catch (e: any) {
          t.assert.equal(
            e.statusCode,
            HttpStatusCode.BAD_REQUEST,
          )
          t.assert.equal(
            e.message,
            'error with the request',
          )
          t.assert.ok(e instanceof ClientError)
        }
      })
    })
  })
})()
