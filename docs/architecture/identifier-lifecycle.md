# Identifier Lifecycle

This document describes how identifiers move through the future Thebes Platform. It is a contract lifecycle, not an implementation of those systems.

## Acquisition Route Setup

1. Creative Central or the backend creates durable internal IDs such as `company_id`, `website_id`, `ads_network_id`, `ads_account_id`, `campaign_id`, `creative_id`, and `landing_page_id`.
2. A company may own multiple ads networks. An ads network represents a manager account or network-level advertising container and may own multiple ads accounts.
3. Campaign records belong to `ads_account_id`, not directly to the external Google Ads customer ID.
4. Creative Central creates a `route_id` for one intentional mapping between campaign context and destination context.
5. The route record stores the mapping from `route_id` to internal IDs, including `ads_network_id` and `ads_account_id` when paid acquisition context is known, plus source platform, campaign type, country, language, and active date range when known.
6. Google Ads landing URLs are published with the compact `route_id` in the query string.

## Visitor Arrival

1. A visitor arrives at the publisher website.
2. The publisher SDK captures `route_id` when present.
3. The SDK creates or reuses a first-party `visitor_id` according to future consent policy.
4. The SDK creates a `session_id`; a new session begins after 30 minutes of inactivity.
5. The SDK creates a new `page_view_id` for the page load or virtual page view.
6. The SDK creates a `thebes.attribution.v1` object with the route, visitor, session, page view, UTM, click ID, referrer, URL, and timestamp fields available at the browser boundary.

## Event Emission

1. The producer creates a UUID v7 `event_id` for every event.
2. The producer emits a `thebes.event.v1` envelope.
3. Paid events include `route_id` when available; organic events may omit it.
4. `request_id` may be added at the system boundary for log correlation.
5. The backend stores events and uses `event_id` for idempotency.

## Backend Enrichment

1. The backend resolves `route_id` to internal campaign, ads account, ads network, and destination context.
2. The backend associates events with `company_id`, `website_id`, `ads_network_id`, `ads_account_id`, `campaign_id`, `ad_group_id`, `creative_id`, and `landing_page_id` when known.
3. Google Ads imports attach manager/customer provider IDs and cost data as external string identifiers.
4. GAM imports attach provider IDs and revenue data as external string identifiers.
5. External IDs never replace Thebes internal IDs.

## ROI Join

1. The ROI engine joins acquisition cost from Google Ads with publisher revenue from GAM.
2. The join uses Thebes internal IDs, including the ads network/account hierarchy, plus route/session/page/event correlation.
3. The ROI engine emits `optimization_run_id` for decisions and later outcome analysis.
4. Inputs, decisions, actions, and outcomes link back to immutable internal IDs and event IDs.

## End-to-End Flow

```text
Creative Central
  -> ads_network_id and ads_account_id mapped
  -> route_id created
  -> Google Ads landing URL published
  -> visitor arrives
  -> SDK captures route_id
  -> visitor_id created or reused
  -> session_id created
  -> page_view_id created
  -> events emitted with event_id
  -> backend stores and enriches events
  -> Google Ads and GAM imports attach external IDs
  -> ROI engine joins acquisition cost and publisher revenue
```
