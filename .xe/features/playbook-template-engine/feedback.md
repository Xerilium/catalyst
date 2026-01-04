# Feedback for playbook-template-engine

## Path Protocol Resolution

- Move the protocol map from PathProtocolResolver.ctor() to config (one internal to Catalyst, one configurable by users) to support custom protocols
- **BUG**: Path protocols (xe://, catalyst://) only resolve when wrapped in `{{}}` brackets, but FR-4.1 and FR-4.3 require resolution in ALL string values (e.g., `bash: node catalyst://playbooks/script.js` should work without `{{}}`)
  - Root cause: `interpolateVariablesAndProtocols()` only scans for `{{...}}` patterns, missing raw protocol references in the string
  - Fix: Add a separate pass to scan for and resolve raw protocol patterns (`xe://...`, `catalyst://...`) anywhere in the string
