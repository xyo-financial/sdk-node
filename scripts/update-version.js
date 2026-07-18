const fs = require('fs')
const path = require('path')

const packageJsonPath = path.join(__dirname, '../package.json')
const versionTsPath = path.join(
  __dirname,
  '../src/client/version.ts',
)

const packageJson = JSON.parse(
  fs.readFileSync(packageJsonPath, 'utf8'),
)
const version = packageJson.version

const content = `export const SDK_VERSION = '${version}'\n`
fs.writeFileSync(versionTsPath, content, 'utf8')
console.log(`Updated src/client/version.ts to version ${version}`)
