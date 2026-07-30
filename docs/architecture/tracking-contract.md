# Tracking Contract

Thebes Intelligence defines the shared identifier and tracking contract for systems that create, publish, collect, import, enrich, and analyze acquisition and publisher events.

The current contract versions are:

- Attribution: `thebes.attribution.v1`
- Event envelope: `thebes.event.v1`

## Identifier Rules

| Identifier            | Format                                          | Generator                                      | Lifecycle                                                 | Main Usage                                   |
| --------------------- | ----------------------------------------------- | ---------------------------------------------- | --------------------------------------------------------- | -------------------------------------------- |
| `company_id`          | UUID v7                                         | Backend                                        | Stable for company lifetime                               | Customer isolation and reporting             |
| `website_id`          | UUID v7                                         | Backend                                        | Stable for website lifetime                               | Publisher website identity                   |
| `ads_network_id`      | UUID v7                                         | Backend                                        | Stable for one advertising network or manager account     | Google Ads hierarchy and ownership joins     |
| `ads_account_id`      | UUID v7                                         | Backend                                        | Stable for one advertising account                        | Campaign ownership and account-level imports |
| `campaign_id`         | UUID v7                                         | Creative Central or backend                    | Stable for internal campaign lifetime                     | Internal campaign joins                      |
| `ad_group_id`         | UUID v7                                         | Creative Central or backend                    | Stable for internal ad-group or asset-group lifetime      | Internal ad grouping                         |
| `creative_id`         | UUID v7                                         | Creative Central or backend                    | Stable while the logical creative is unchanged            | Creative attribution and performance         |
| `landing_page_id`     | UUID v7                                         | Creative Central or backend                    | Stable while the logical destination is unchanged         | Destination attribution                      |
| `route_id`            | `rte_` plus URL-safe random token, max 40 chars | Creative Central or backend before publication | Stable for one configured acquisition route               | URL transport and acquisition joins          |
| `visitor_id`          | `vst_` plus URL-safe random token, max 50 chars | Publisher SDK                                  | May persist across sessions under future consent policy   | Anonymous browser-level identity             |
| `session_id`          | `ses_` plus URL-safe random token, max 50 chars | Publisher SDK                                  | New after 30 minutes of inactivity                        | Session correlation                          |
| `page_view_id`        | `pv_` plus URL-safe random token, max 50 chars  | Publisher SDK                                  | New for each page load or virtual page view               | Page-view correlation                        |
| `event_id`            | UUID v7                                         | Event producer                                 | One per event                                             | Idempotency and deduplication                |
| `request_id`          | UUID v7                                         | System boundary                                | May change between retries                                | Logs and API correlation                     |
| `impression_id`       | `imp_` plus URL-safe random token               | Publisher SDK or rendering boundary            | One logical impression opportunity or rendered impression | Ad impression joins                          |
| `click_id`            | `clk_` plus URL-safe random token               | Publisher SDK or click boundary                | One internal click event                                  | Click joins distinct from provider IDs       |
| `optimization_run_id` | UUID v7                                         | ROI or automation engine                       | Immutable for one run                                     | Optimization lineage                         |

Internal identifiers are public opaque identifiers. They must never expose database primary keys, company names, website domains, campaign names, Google Ads customer IDs, or other sensitive values.

## Google Ads Hierarchy

The internal Google Ads hierarchy is represented with Thebes IDs:

- Companies may own multiple `ads_network_id` values.
- Each `ads_network_id` may own multiple `ads_account_id` values.
- Campaigns belong to `ads_account_id`.
- Each `ads_account_id` belongs to `ads_network_id`.

`ads_network_id` represents one advertising network or manager account. `ads_account_id` represents one advertising account. Both are UUID v7 strings and are distinct from Google Ads provider IDs.

## Internal Versus External IDs

Thebes internal IDs are authoritative inside Thebes. External provider IDs remain separate strings and must never replace internal IDs.

External IDs include:

- `google_ads_manager_customer_id`
- `google_ads_customer_id`
- `google_ads_campaign_id`
- `google_ads_ad_group_id`
- `google_ads_asset_group_id`
- `google_ads_asset_id`
- `google_ads_criterion_id`
- `gam_network_code`
- `gam_order_id`
- `gam_line_item_id`
- `gam_creative_id`
- `gam_ad_unit_id`
- `gclid`
- `dclid`
- `wbraid`
- `gbraid`
- `msclkid`

Provider IDs may be numeric, opaque, or provider-specific strings. They are stored alongside Thebes IDs only as mapping or enrichment fields. `google_ads_manager_customer_id` identifies the provider-side manager account, while `google_ads_customer_id` identifies the provider-side advertising account. The internal equivalents are `ads_network_id` and `ads_account_id`.

## URL Transport Rules

`route_id` is the only current internal identifier intended for campaign URL transport. It is compact, URL-safe, opaque, and generated before campaign URLs are published.

A route maps to campaign and destination context in backend storage. The route ID itself must not encode:

- Company names
- Website domains
- Database IDs
- Campaign names
- Google Ads customer IDs
- Personal information
- Commercially sensitive configuration

Future route records may map to `company_id`, `website_id`, `ads_network_id`, `ads_account_id`, `campaign_id`, `ad_group_id`, `creative_id`, `landing_page_id`, source platform, campaign type, country, language, and active date range. These values remain outside the route token.

## Attribution Object

`thebes.attribution.v1` captures browser-boundary attribution facts. `route_id` is present for paid acquisition and may be absent for organic traffic. Backend-enriched IDs such as `company_id`, `website_id`, `ads_network_id`, `ads_account_id`, `campaign_id`, `ad_group_id`, `creative_id`, and `landing_page_id` are optional at the browser boundary.

When hierarchy fields are present, `ads_account_id` requires `ads_network_id`, and `campaign_id` requires `ads_account_id`. Google Ads manager and customer IDs remain external provider strings.

Timestamps must be ISO-8601 UTC strings with a trailing `Z`.

## Event Envelope

`thebes.event.v1` wraps events from the publisher SDK, Creative Central, backend jobs, imports, ROI engine, and operator console. Required correlation fields are:

- `event_id`
- `event_name`
- `occurred_at`
- `visitor_id`
- `session_id`
- `source`
- `attribution`
- `properties`

`page_view_id` is optional for event types that are not tied to a page view. `route_id` is optional for organic traffic. `ads_network_id` and `ads_account_id` are optional top-level enrichment fields. `received_at` and `request_id` may be added at the producer or backend boundary.

Event names are open, namespaced strings such as `sdk.page_viewed` and `import.google_ads.completed`. They are not a closed enum, so future event names can be added without changing the package.

## Event Correlation Rules

Events should carry the most specific correlation fields available at the producer boundary. The event envelope validates that top-level `visitor_id`, `session_id`, `page_view_id`, `route_id`, `ads_network_id`, and `ads_account_id` remain consistent with the nested attribution object when both values are present.

Backend systems may enrich events with internal campaign, ads account, ads network, or destination IDs after resolving `route_id`. Google Ads and GAM imports attach external provider IDs to internal records without replacing Thebes IDs.

## Idempotency Expectations

Every event has an `event_id`. Producers generate `event_id` values before sending. The backend must eventually reject or safely ignore duplicate `event_id` values, making retries safe.

`request_id` is for request and log correlation only. It must not be used as a business identifier and may change between retries.

## Privacy Constraints

The contract forbids deriving public identifiers from personal data or business names. Browser IDs must not contain IP addresses, email addresses, phone numbers, advertising IDs, fingerprints, domains, company names, campaign names, or Google Ads provider IDs. Future consent policy will decide persistence rules for `visitor_id`.
