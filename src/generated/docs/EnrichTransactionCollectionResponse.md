
# EnrichTransactionCollectionResponse


## Properties

Name | Type
------------ | -------------
`id` | string
`link` | string

## Example

```typescript
import type { EnrichTransactionCollectionResponse } from ''

// TODO: Update the object below with actual values
const example = {
  "id": 72c037df-d0d3-43ee-9470-323ff35a2e50,
  "link": https://api.xyo.financial/v1/ai/finance/enrichment/download/72c037df-d0d3-43ee-9470-323ff35a2e50.tar.gz,
} satisfies EnrichTransactionCollectionResponse

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as EnrichTransactionCollectionResponse
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


