# Design Decisions: Playbook Actions - I/O Operations

## HTTP client: native fetch
**Decision**: Use Node.js native fetch API (18+) as the HTTP client with custom retry logic.

**Date**: <!-- TODO: determine from git history -->

**Why**: No additional dependencies needed; fetch is modern and promise-based.

**Rejected**: axios — external dependency, larger bundle; http/https modules — too low-level and verbose.

## Exponential backoff retry strategy
**Decision**: Retry on network errors and 5xx responses using exponential backoff (delay = attempt² × 1000ms, max 30s).

**Date**: <!-- TODO: determine from git history -->

**Why**: Prevents thundering herd on transient failures; 4xx client errors are not retried since they indicate caller mistakes.

## Atomic file writes via temp-file rename
**Decision**: Write to a `.tmp` file, then rename to the target path atomically; clean up the temp file on error.

**Date**: <!-- TODO: determine from git history -->

**Why**: POSIX rename is atomic on most filesystems, preventing state file corruption on crash or interruption.

**Rejected**: Direct write — corruption risk; write-ahead log — too complex for this use case.

## Sensitive header masking
**Decision**: Mask headers matching keywords (authorization, token, key, secret, password, api-key) in logs only; original values are still sent in requests.

**Date**: <!-- TODO: determine from git history -->

**Why**: Prevents credential leakage in logs without affecting actual request behavior.

## No HTTP DELETE, no binary file support in MVP
**Decision**: Omit HTTP DELETE and binary file content from the initial implementation.

**Date**: <!-- TODO: determine from git history -->

**Why**: YAGNI — these can be added based on user demand; MVP covers the dominant use cases (GET/POST/PUT/PATCH, text files).

## Path traversal prevention
**Decision**: Reject paths containing `..` segments after normalization; resolve relative paths against CWD.

**Date**: <!-- TODO: determine from git history -->

**Why**: Prevents directory escape attacks; explicit encoding prevents encoding-based attacks.
