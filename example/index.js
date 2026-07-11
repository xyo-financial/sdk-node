const xyo = require('xyo-sdk-local');

(async () => {
  // Verify the SDK can be imported and the client can be instantiated.
  // For a full usage example see the README.
  new xyo.Client({ apiKey: 'example-api-key' })

  console.log("Successfully imported and instantiated the XYO SDK Client")
})()
