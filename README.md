# Thebes Intelligence

Thebes Intelligence is the shared backend and intelligence contract layer for the Thebes Platform. The current package defines the authoritative identifiers, attribution payload, and event envelope that future systems will share.

## Current Scope

This repository currently implements ST-001: Define shared identifier and tracking contract.

Included:

- Branded TypeScript identifier types
- UUID v7 and compact URL-safe identifier generators
- Zod runtime validation for identifiers, attribution, event envelopes, and external provider IDs
- Architecture documentation and ADR-001
- Vitest coverage for generation and validation rules

Deliberately not implemented yet:

- UI
- Authentication
- HTTP services or endpoints
- Campaign management
- Google Ads or GAM import execution
- ROI calculations or optimization workflows
- SDK event ingestion services
- Databases, queues, Docker, or infrastructure code

## Installation

```bash
npm install
```

## Scripts

```bash
npm run typecheck
npm run lint
npm run format:check
npm test
npm run build
npm run verify
```

`npm run verify` runs the required quality gates in sequence.

## Folder Structure

```text
docs/architecture/        Tracking contract documentation and decisions
src/contracts/            Branded TypeScript contracts
src/validation/           Zod schemas for runtime validation
src/utilities/            Identifier generation and validation helpers
tests/                    Vitest contract tests
```

## Generate IDs

```ts
import {
  generateAdsAccountId,
  generateAdsNetworkId,
  generateCompanyId,
  generateRouteId,
  generateSessionId,
} from 'thebes-intelligence/utilities';

const company_id = generateCompanyId();
const ads_network_id = generateAdsNetworkId();
const ads_account_id = generateAdsAccountId();
const route_id = generateRouteId();
const session_id = generateSessionId();
```

Durable entity and event IDs use UUID v7. This includes `ads_network_id` for a Google Ads manager or network account and `ads_account_id` for an advertising account. Browser and URL transport IDs use compact random URL-safe values with fixed prefixes.

## Validate Attribution

```ts
import { attributionContractV1Schema } from 'thebes-intelligence/validation';

const parsed = attributionContractV1Schema.parse({
  contract_version: 'thebes.attribution.v1',
  route_id: 'rte_exampleValue123',
  visitor_id: 'vst_exampleValue123',
  session_id: 'ses_exampleValue123',
  page_view_id: 'pv_exampleValue123',
  first_seen_at: '2026-07-30T08:00:00.000Z',
  last_seen_at: '2026-07-30T08:00:00.000Z',
});
```

## Validate Event Envelopes

```ts
import { eventEnvelopeV1Schema } from 'thebes-intelligence/validation';

const parsed = eventEnvelopeV1Schema.parse({
  contract_version: 'thebes.event.v1',
  event_id: '0198614b-75cc-7122-8ff0-6d9e9bc8f801',
  event_name: 'sdk.page_viewed',
  occurred_at: '2026-07-30T08:00:00.000Z',
  visitor_id: 'vst_exampleValue123',
  session_id: 'ses_exampleValue123',
  page_view_id: 'pv_exampleValue123',
  source: 'publisher_sdk',
  attribution: {
    contract_version: 'thebes.attribution.v1',
    visitor_id: 'vst_exampleValue123',
    session_id: 'ses_exampleValue123',
    page_view_id: 'pv_exampleValue123',
    first_seen_at: '2026-07-30T08:00:00.000Z',
    last_seen_at: '2026-07-30T08:00:00.000Z',
  },
  properties: {},
});
```

Use `safeParse` when callers need a non-throwing validation path.
