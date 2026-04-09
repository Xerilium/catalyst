# Feedback: playbook-engine

- **Variable append**: No way to append to array variables incrementally. Would need `append` property on var action or a `var-append` action. Kitchen-sink finale uses a static list as workaround.
- **Key Entities placement**: The "Key Entities" section is under Architecture Constraints but entities should be defined as sub-FRs within the relevant scenario, or in a dedicated `data-model.md` file. Current placement mixes data model concerns with architectural constraints.
