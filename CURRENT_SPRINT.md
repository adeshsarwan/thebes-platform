# Sprint 1

## Completed Story

ST-001 - Define shared identifier and tracking contract

## Active Story

ST-002 - Bootstrap the Thebes Platform service

## ST-002 Goal

Create the minimum production-quality backend service that future Thebes modules can build upon while preserving the framework-independent ST-001 contracts.

## ST-002 Scope

- Fastify application factory
- Validated environment configuration
- Request ID handling using the ST-001 request ID contract
- `/health` liveness endpoint
- `/ready` readiness endpoint
- Stable JSON error responses
- Graceful shutdown for `SIGTERM` and `SIGINT`
- Automated service tests
- README updates for implemented service behaviour

## Explicit Non-goals

- No UI
- No authentication
- No database, ORM, MySQL, Redis, Docker, Kubernetes, or GraphQL
- No Google Ads or Google Ad Manager API integration
- No campaign management
- No SDK event ingestion service
- No event persistence
- No ROI or optimization workflows
- No deployment configuration
- No GitHub Actions

## Exit Criteria

- Fastify service starts successfully
- Application factory works without opening a network port
- Environment variables are validated with Zod
- Health and readiness contracts are implemented
- Every request receives a valid request ID
- Error responses use a stable safe JSON shape
- Graceful shutdown is implemented and tested
- Existing ST-001 tests continue to pass
- `npm run verify` passes
- No unrelated application features are added
