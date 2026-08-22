
# APIError

RFC 7807 compliant problem details object representing an API error.

## Properties

Name | Type
------------ | -------------
`type` | string
`title` | string
`status` | number
`detail` | string
`instance` | string

## Example

```typescript
import type { APIError } from ''

// TODO: Update the object below with actual values
const example = {
  "type": https://api.xyo.financial/errors/unauthorized,
  "title": Unauthorized,
  "status": 401,
  "detail": Invalid or expired Bearer authentication token provided.,
  "instance": /v1/ai/finance/enrichment/transaction#req-9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d,
} satisfies APIError

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as APIError
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


