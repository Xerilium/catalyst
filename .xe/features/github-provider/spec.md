---
id: github-provider
title: GitHub Provider
description: How Catalyst reads GitHub rules that GitHub's API doesn't apply for it, such as code owners from `CODEOWNERS`.
dependencies: []
---

<!-- markdownlint-disable single-title -->

# Feature: GitHub Provider

## Purpose

Some GitHub rules live in repository files that GitHub's API doesn't evaluate for a caller. Catalyst reads them the way GitHub does, so its decisions match what GitHub enforces.

Explicit non-goals:

- This feature does NOT define playbook actions (see `playbook-actions-git`)

## Scenarios

### FR:codeowners: Read code owners

Playbook action needs each changed file's code owners as GitHub assigns them, so that a code-owner gate matches the reviews GitHub requests.

- **FR:codeowners.match** (P1): Provider MUST give each file the owners of the last `CODEOWNERS` rule that matches it
  - **FR:codeowners.match.globstar** (P2): Provider MUST let a leading `**/` match files at the repository root
  - **FR:codeowners.match.single-star** (P2): Provider MUST match a pattern ending in `/*` only to files directly in that folder
  - **FR:codeowners.match.unowned** (P1): Provider MUST treat a file whose last matching rule lists no owners as unowned
- **FR:codeowners.email** (P2): Provider MUST skip owners given by email
  - An email can't be matched to a reviewer
- **FR:codeowners.teams** (P2): Provider MUST skip team owners (`@org/team`)
  - A team can't be matched to a reviewer; GitHub branch protection enforces team reviews

## Data Model

None

## Architecture Constraints

None

## External Dependencies

- **GitHub `CODEOWNERS` syntax**: [About code owners](https://docs.github.com/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners)
