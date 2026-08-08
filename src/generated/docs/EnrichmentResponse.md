
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
  "merchant": null,
  "description": null,
  "categories": null,
  "logo": null,
  "location": null,
  "address": null,
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


