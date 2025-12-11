# Sample Feature Spec

## Requirements

### Functional Requirements

#### FR:auth: Authentication

- **FR:auth.login**: Users MUST be able to log in with email and password
- **FR:auth.logout**: Users MUST be able to log out of the application
- **FR:auth.session**: Session management requirements
  - **FR:auth.session.expiry**: Sessions MUST expire after 90 minutes of inactivity
  - **FR:auth.session.refresh**: [deferred] Sessions MAY be refreshed without re-authentication

#### FR:data: Data Management

- **FR:data.create**: Users MUST be able to create new records
- **FR:data.read**: Users MUST be able to read their own records
- ~~**FR:data.legacy**~~: [deprecated: FR:data.create] Old data creation API

### Non-functional Requirements

- **NFR:perf.response**: API responses SHOULD complete in under 200ms
- **NFR:security.encrypt**: All data MUST be encrypted at rest
