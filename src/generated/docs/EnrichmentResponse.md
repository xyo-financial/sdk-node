
# EnrichmentResponse


## Properties

Name | Type
------------ | -------------
`merchant` | string
`description` | string
`categories` | Array&lt;string&gt;
`logo` | string
`location` | string
`address` | string

## Example

```typescript
import type { EnrichmentResponse } from ''

// TODO: Update the object below with actual values
const example = {
  "merchant": Costa Coffee,
  "description": Costa Coffee is a British coffeehouse chain and a subsidiary of The Coca-Cola Company.,
  "categories": ["Food & Beverage","Cafes & Coffee Shops","Dining Out"],
  "logo": data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==,
  "location": United Kingdom, London,
  "address": 40-42 Great Portland St, London W1W 7LZ,
} satisfies EnrichmentResponse

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as EnrichmentResponse
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


