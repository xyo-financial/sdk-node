# Contributing to XYO Node.js SDK

Thank you for your interest in the XYO Node.js SDK.

## Contribution Policy

> ⚠️ **We do not accept external pull requests or code contributions.**
> Code contributions and pull requests are strictly limited to verified staff members at **Syniol Limited**.
>
> Any external pull requests or solutions submitted by the public will be closed without review.

### Raising Issues

Members of the public are welcome and encouraged to open GitHub issues for:

- Bug reports
- Feature requests
- General feedback

If you encounter an issue or want to suggest an improvement, please search existing issues first, then open a new issue describing your finding.

---

## Internal Developer Guide (Syniol Staff Only)

For staff members contributing to the repository, please follow the guidelines below.

### Code Quality Gates

Before proposing changes internally, ensure the following targets are met:

1. **Compilation:** `npm run build` succeeds with zero errors.
2. **Linting & Style:** `npm run lint` passes (aligned with Prettier).
3. **Tests:** `npm run test` executes successfully and maintains high coverage.
4. **Local Verification:** Build the Docker image locally to verify the end-to-end release pipeline passes:
   ```bash
   docker build -f deploy/Dockerfile . -t xyo-sdk-node:latest --no-cache
   ```

### Publishing a Release

GitHub Actions workflows are configured to orchestrate tag releases. To release a new version of the package:

1. Increment the `version` inside the root `package.json` to match your target version.
2. Run `npm install` to update the root `package-lock.json`.
3. Synchronize the example app lockfile by running:
   ```bash
   cd example && npm install
   ```
4. Push all changes to the `main` branch.
5. Create and push a semver tag matching the `package.json` version (e.g., `v1.1.0`):
   ```bash
   git tag v1.1.0
   git push origin v1.1.0
   ```
6. The unified `release.yml` pipeline will automatically:
   - Verify the tag integrity.
   - Run code linters, formatter checks, and unit tests.
   - Build the package and generate build artifacts (SBOM, SHA-256 checksums, build provenance).
   - Verify package installation and startup using the example application.
   - Publish the release assets to GitHub.
   - Publish the package to the NPM registry with provenance attestation.
