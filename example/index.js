const xyo = require('xyo-sdk')

;(async () => {
  // Verify the SDK can be imported and the client can be instantiated with token or apiKey.
  // For a full usage example see the README.
  new xyo.XYOClient({ token: 'example-token' })
  new xyo.Client({ apiKey: 'example-api-key' })

  console.log(
    'Successfully imported and instantiated the XYO SDK Client',
  )
})()
