---
id: devops-release
title: DevOps Release
description: One-dispatch release of Catalyst to GitHub and npm, gated on the exact tarball users will install.
dependencies:
  - ai-plugin
  - devops-build
  - e2e-gate
---

<!-- markdownlint-disable single-title -->

# Feature: DevOps Release

## Purpose

Let a maintainer release Catalyst with one workflow dispatch, so that what ships is exactly what was validated, a failure leaves nothing public, and any step can be rerun safely.

## Scenarios

### FR:release: Release Run

Maintainer needs to cut a release with one dispatch so that the tag, GitHub release, npm package, and marketplace listing agree on one version.

- **FR:release.@workflow**: Interface: `.github/workflows/release.yml` (Create Release), dispatched manually
- **FR:release.input** (P2):
  - Version (string, optional) — release version; defaults to the `package.json` version without `-dev`
  - Dry run (boolean) — run the gate only, with no tag, release, publish, or bump
- **FR:release.version** (P1): Plan MUST normalize a short version such as `0.3` to `0.3.0`, name the tag without a trailing `.0` patch, and compute the next `-dev` version
- **FR:release.order** (P1): Release MUST run plan, build, validate, create-release, and publish in that order, each only after the previous succeeds, and run smoke and marketplace only after publish succeeds
- **FR:release.dry-run** (P2): A dry run MUST stop after validation, leaving no tag, release, publish, or version bump
- **FR:release.secrets** (P2): Release MUST NOT fail when any e2e secret is missing
- **FR:release.auth-pass** (P2): Release MUST pass `ANTHROPIC_API_KEY`, `CLAUDE_CODE_OAUTH_TOKEN`, and `E2E_GH_TOKEN` to validation, which picks the skills to run from them
  > - @req FR:e2e-gate/gate.needs-based
- **FR:release.pack-gate** (P2): Release MUST run the pack gate (tarball install, `catalyst check`, `catalyst init`, negative control) before the tag

### FR:artifact: Validated Artifact

Maintainer needs the validated tarball to be the published tarball so that nothing untested reaches npm.

- **FR:artifact.build** (P1): Release MUST build the tarball once, with the release version stamped in, and share it with later jobs as a workflow artifact
  > - @req FR:devops-build/build.pack
- **FR:artifact.validate** (P1): Validation MUST install that tarball into a clean directory and run `catalyst check` and `catalyst init` from it
  > - @req FR:e2e-gate/gate.local-build
- **FR:artifact.gate** (P1): A failed validation MUST leave no tag, GitHub release, or version bump
- **FR:artifact.publish** (P1): Publish MUST upload that same tarball without rebuilding it
- **FR:artifact.fallback** (P3): Publish MAY rebuild from a tag when run by hand with no artifact

### FR:tag: Tag and Release

Maintainer needs the git side of a release to be repeatable so that a rerun after a partial failure finishes the job.

- **FR:tag.create** (P1): Release MUST commit the release version, tag it, and create the GitHub release once validation passes
- **FR:tag.rerun** (P1): Release MUST reuse an existing tag and GitHub release instead of failing on them
- **FR:tag.bump** (P1): Release MUST bump `package.json` to the next `-dev` version, skipping the bump when main is already past the release

### FR:npm: npm Publish

Maintainer needs publishing to need no stored token so that nothing secret can leak from the repository.

- **FR:npm.oidc** (P1): Publish MUST authenticate with npm trusted publishing, with no stored npm token
- **FR:npm.idempotent** (P1): Publish MUST skip publishing when the version is already on npm
- **FR:npm.verify** (P1): Publish MUST fail when the package is absent from npm at the released version, retrying while the registry catches up
- **FR:npm.smoke** (P1): Release MUST install the published version from npm in a clean directory and run `catalyst check`

### FR:listing: Marketplace Listing

Maintainer needs the marketplace listing to follow the release so that plugin users see the new version.

- **FR:listing.after-npm** (P1): Release MUST update the `xerilium/ai-plugins` listing only after the npm publish succeeds
  > - @req FR:ai-plugin/plugin.marketplace
- **FR:listing.skip** (P3): Release MUST warn and skip the listing update when its token is missing

### Non-functional Requirements

None

## Data Model

None

## Architecture Constraints

- **AC:no-token** (P2): The release pipeline MUST NOT depend on a stored npm token

## External Dependencies

- [npm trusted publishing](https://docs.npmjs.com/trusted-publishers) — OIDC publishing from GitHub Actions
- [GitHub reusable workflows](https://docs.github.com/en/actions/using-workflows/reusing-workflows) — `workflow_call` jobs share artifacts within one run
