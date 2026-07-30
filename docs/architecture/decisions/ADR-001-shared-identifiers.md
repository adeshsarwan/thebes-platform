# ADR-001: Shared Identifiers

## Status

Accepted

## Decision

Thebes Platform systems will use a shared identifier contract from Thebes Intelligence. Durable business, entity, advertising hierarchy, event, request, and optimization identifiers use public UUID v7 values. Browser, URL transport, impression, and click identifiers use compact cryptographically random URL-safe values with fixed prefixes.

Internal Thebes identifiers remain separate from external provider identifiers. External IDs are stored as provider-specific strings and never replace internal IDs.

Google Ads hierarchy is represented internally by `ads_network_id` and `ads_account_id`. Campaigns belong to `ads_account_id`, and ads accounts belong to `ads_network_id`. Companies may own multiple ads networks, and each ads network may own multiple ads accounts.

## Context

Thebes will coordinate data across Creative Central, the publisher SDK, backend event ingestion, Google Ads imports, Google Ad Manager imports, ROI calculation, and the operator console. These systems need stable joins without leaking database keys, names, domains, provider IDs, or personal information into public identifiers or URLs.

Provider IDs are useful for imports and reconciliation, but they are not controlled by Thebes, may change shape, and may not be globally unique without provider context. Google Ads manager/customer IDs are therefore modeled as external strings, while `ads_network_id` and `ads_account_id` are internal UUID v7 identifiers used for hierarchy and ownership joins.

## Alternatives Considered

- Use database primary keys publicly: rejected because it exposes internal storage details and creates migration risk.
- Use provider manager, customer, campaign, and line item IDs as primary identifiers: rejected because external systems do not cover all Thebes entities and should not control internal identity.
- Use raw URLs or domains as identifiers: rejected because destinations can change while the logical landing page remains the same.
- Use UUID v4 everywhere: acceptable for uniqueness but less useful for durable event ordering and operational debugging than UUID v7.
- Encode route context directly inside `route_id`: rejected because it would leak sensitive context and make route changes harder.

## Why Internal IDs Are Separate From Provider IDs

Thebes needs a stable identity model that survives provider migrations, manager account changes, customer account restructures, and import differences. External IDs are stored as attributes or mappings so provider data can enrich Thebes records without becoming the source of truth.

## Why Public Opaque IDs Are Used

Opaque public IDs avoid exposing internal database structure, business names, website domains, campaign names, provider IDs, or personal information. They are safe to move between systems and logs when normal access controls are followed.

## Why UUID v7 Is Used

UUID v7 provides globally unique durable identifiers with time-ordering properties. It is suitable for company, website, ads network, ads account, campaign, creative, landing page, event, request, and optimization identifiers that benefit from stable uniqueness and operational sortability.

## Why Compact Random IDs Are Used

`route_id`, `visitor_id`, `session_id`, `page_view_id`, `impression_id`, and `click_id` may appear in browser storage, URLs, or high-volume event payloads. Compact random URL-safe IDs reduce payload size while remaining opaque and hard to guess.

## Consequences

- Systems must map route IDs to context instead of decoding context from the token.
- Runtime validation is required at public and system boundaries.
- External provider IDs must be modeled as separate strings.
- Google Ads campaigns must join through `ads_account_id`; ads accounts must join through `ads_network_id`.
- Future migrations can add contract versions without breaking the v1 contract.

## Future Migration Considerations

Future versions may add consent-state fields, asset-level IDs, provider-specific mapping objects, stricter event property schemas, additional source values, or more detailed account ownership policies. Contract versions allow those changes to be introduced deliberately while preserving compatibility with v1 data.
