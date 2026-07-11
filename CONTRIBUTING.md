# Publishing NPM
GitHub Workflows are configured to trigger on a new tag push on git. Please follow the steps to publish the NPM Package.

1. Increment the `version` inside the `package.json` to match your new tag and run `npm i` to update `package-lock.json`.
2. Push all your changes to the `main` branch.
3. `git tag 1.x.x`
4. `git push origin 1.x.x`
5. The `release.yml` pipeline will automatically verify the tag, run tests, build the package (`npm pack`), generate artifacts (SBOM, SHA256 checksums, build provenance attestation), and publish a GitHub Release.
6. The `npm_publish.yml` pipeline will automatically publish the package to the configured NPM registry.
