# Naming Conventions

## JSON Properties

JSON payload properties use `snake_case`.

Examples:

- `company_id`
- `ads_network_id`
- `ads_account_id`
- `route_id`
- `first_seen_at`
- `google_ads_manager_customer_id`
- `google_ads_customer_id`

## TypeScript Types

TypeScript types and interfaces use `PascalCase`.

Examples:

- `CompanyId`
- `AdsNetworkId`
- `AdsAccountId`
- `RouteId`
- `ThebesAttributionV1`
- `EventEnvelopeV1`

Branded ID types are used where practical so one identifier cannot be accidentally passed as another identifier in TypeScript.

## TypeScript Functions

TypeScript functions use `camelCase`.

Examples:

- `generateCompanyId`
- `generateAdsNetworkId`
- `generateAdsAccountId`
- `generateRouteId`
- `isSessionId`
- `parseEventId`

## Timestamp Rules

Timestamps use ISO-8601 UTC strings with a trailing `Z`.

Example:

```text
2026-07-30T08:00:00.000Z
```

Offsets such as `+05:30` are not accepted by the current validation contract.

## Internal ID Names

Thebes internal identifiers use the entity name followed by `_id`.

Examples:

- `ads_network_id`
- `ads_account_id`
- `campaign_id`
- `creative_id`
- `landing_page_id`

Internal IDs are opaque. They must not be raw URLs, domains, provider IDs, database primary keys, or names.

## External ID Names

External provider identifiers include the provider prefix unless the identifier is already a widely recognized click ID name.

Examples:

- `google_ads_manager_customer_id`
- `google_ads_customer_id`
- `google_ads_campaign_id`
- `gam_line_item_id`
- `gclid`
- `msclkid`

External IDs are strings. They do not receive UUID validation and do not replace internal IDs.

## Event Names

Event names are lowercase namespaced strings. Use dot separators between namespaces and lower snake case inside each segment.

Examples:

- `sdk.session_started`
- `sdk.page_viewed`
- `sdk.ad_impression`
- `campaign.published`
- `import.google_ads.completed`
- `import.gam.completed`
- `roi.calculated`
- `optimization.run_completed`

Event names are intentionally open and are not a closed enum in ST-001.
