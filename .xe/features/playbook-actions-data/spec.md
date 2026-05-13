---
id: playbook-actions-data
title: Playbook Actions - Data
description: Data-format action primitives — JSON file I/O with structured parse and serialize semantics.
dependencies:
  - error-handling
  - playbook-definition
  - playbook-actions-io
---

<!-- markdownlint-disable single-title -->

# Feature: Playbook Actions - Data

## Purpose

Provide native playbook actions for reading and writing structured data files so that workflows can consume and produce JSON (and, in the future, other data formats) without dropping into `script` blocks. File I/O concerns — path validation, encoding, atomic writes, error mapping — are inherited from playbook-actions-io's file actions; this feature owns the data-format layer on top.

## Scenarios

### FR:json-read: JSON File Read

Playbook author needs to load structured data from a JSON file so that workflows can consume configuration, manifests, and catalogs without inline script blocks.

- **FR:json-read.@action** (P1): Interface: `json-read`
  > - @req FR:playbook-definition/types.action.interface
- **FR:json-read.input** (P1):
  - Path (string) — File path to read; supports template interpolation
  - Encoding (string?) — File encoding. Default: `utf8`
- **FR:json-read.read** (P1): Action MUST read the file at Path using the requested Encoding and parse its content as JSON
  > - @req FR:playbook-actions-io/file.read-action.implementation
  > - @req FR:playbook-actions-io/file.read-action.file-reading
- **FR:json-read.errors** (P2): Action MUST surface failures via CatalystError
  > - @req FR:error-handling/catalyst-error
  - File errors propagate as-is from the underlying file read (`FileNotFound`, `FilePermissionDenied`, `FileInvalidPath`)
  - Malformed JSON content → `JsonParseError` with offending file path in guidance
- **FR:json-read.output** (P1): Value (any) — Parsed JSON value (object, array, string, number, boolean, or null)

### FR:json-write: JSON File Write

Playbook author needs to persist structured data as JSON so that workflows can produce configuration, manifests, and reports without inline script blocks.

- **FR:json-write.@action** (P1): Interface: `json-write`
  > - @req FR:playbook-definition/types.action.interface
- **FR:json-write.input** (P1):
  - Path (string) — File path to write; supports template interpolation
  - Value (any) — Data to serialize; any JSON-serializable value
  - Pretty (boolean?) — Pretty-print with 2-space indentation. Default: `true`
  - Encoding (string?) — File encoding. Default: `utf8`
- **FR:json-write.write** (P1): Action MUST serialize Value as a JSON string (pretty-printed with 2-space indentation when Pretty is true) and atomically write it to Path using the requested Encoding
  > - @req FR:playbook-actions-io/file.write-action.implementation
  > - @req FR:playbook-actions-io/file.write-action.atomic-write
- **FR:json-write.errors** (P2): Action MUST surface failures via CatalystError
  > - @req FR:error-handling/catalyst-error
  - File errors propagate as-is from the underlying file write (`FilePermissionDenied`, `FileInvalidPath`, `FileDiskFull`)
  - Non-serializable Value (cyclic reference, BigInt, etc.) → `JsonStringifyError` with detail in guidance
- **FR:json-write.output** (P1):
  - Path (string) — Written file path
  - BytesWritten (number) — Bytes written to disk

## Data Model

None

## Architecture Constraints

- **Inherit I/O behavior, don't duplicate it**: File I/O semantics — path validation, encoding handling, atomic writes, file-error mapping — MUST come from playbook-actions-io's file actions rather than be reimplemented. This keeps the data-format layer thin and inherits I/O improvements automatically.

## External Dependencies

None
