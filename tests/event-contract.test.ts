import { describe, expect, it } from 'vitest';
import { ATTRIBUTION_CONTRACT_VERSION, EVENT_CONTRACT_VERSION } from '../src/contracts/index.js';
import { eventEnvelopeV1Schema, eventNameSchema } from '../src/validation/index.js';
import {
  generateAdsAccountId,
  generateAdsNetworkId,
  generateEventId,
  generatePageViewId,
  generateRequestId,
  generateRouteId,
  generateSessionId,
  generateVisitorId,
  generateWebsiteId,
} from '../src/utilities/index.js';

const timestamp = '2026-07-30T08:00:00.000Z';

const buildAttribution = (includeRoute = true) => {
  const routeId = includeRoute ? generateRouteId() : undefined;

  return {
    contract_version: ATTRIBUTION_CONTRACT_VERSION,
    ...(routeId === undefined ? {} : { route_id: routeId }),
    visitor_id: generateVisitorId(),
    session_id: generateSessionId(),
    page_view_id: generatePageViewId(),
    first_seen_at: timestamp,
    last_seen_at: timestamp,
  };
};

const buildEvent = () => {
  const attribution = buildAttribution();

  return {
    contract_version: EVENT_CONTRACT_VERSION,
    event_id: generateEventId(),
    event_name: 'sdk.page_viewed',
    occurred_at: timestamp,
    received_at: timestamp,
    request_id: generateRequestId(),
    website_id: generateWebsiteId(),
    visitor_id: attribution.visitor_id,
    session_id: attribution.session_id,
    page_view_id: attribution.page_view_id,
    route_id: attribution.route_id,
    source: 'publisher_sdk',
    attribution,
    properties: {
      path: '/story/example',
    },
  };
};

describe('event contract', () => {
  it('accepts a valid event envelope', () => {
    expect(eventEnvelopeV1Schema.safeParse(buildEvent()).success).toBe(true);
  });

  it('rejects malformed event names while allowing future namespaced names', () => {
    expect(eventNameSchema.safeParse('sdk.page_viewed').success).toBe(true);
    expect(eventNameSchema.safeParse('import.google_ads.completed').success).toBe(true);
    expect(eventNameSchema.safeParse('optimization.run_completed').success).toBe(true);
    expect(eventNameSchema.safeParse('PageViewed').success).toBe(false);
    expect(eventNameSchema.safeParse('sdk').success).toBe(false);
    expect(eventNameSchema.safeParse('sdk.page viewed').success).toBe(false);
  });

  it('accepts google ads import events with internal account hierarchy', () => {
    const attribution = buildAttribution();
    const adsNetworkId = generateAdsNetworkId();
    const adsAccountId = generateAdsAccountId();
    const event = {
      contract_version: EVENT_CONTRACT_VERSION,
      event_id: generateEventId(),
      event_name: 'import.google_ads.completed',
      occurred_at: timestamp,
      visitor_id: attribution.visitor_id,
      session_id: attribution.session_id,
      page_view_id: attribution.page_view_id,
      route_id: attribution.route_id,
      ads_network_id: adsNetworkId,
      ads_account_id: adsAccountId,
      source: 'google_ads_import',
      attribution: {
        ...attribution,
        ads_network_id: adsNetworkId,
        ads_account_id: adsAccountId,
        google_ads_manager_customer_id: '1234567890',
        google_ads_customer_id: '2345678901',
      },
      properties: {
        google_ads_manager_customer_id: '1234567890',
        google_ads_customer_id: '2345678901',
      },
    };

    expect(eventEnvelopeV1Schema.safeParse(event).success).toBe(true);
  });

  it('rejects mismatched google ads hierarchy between envelope and attribution', () => {
    const event = buildEvent();
    const mismatchedEvent = {
      ...event,
      ads_network_id: generateAdsNetworkId(),
      ads_account_id: generateAdsAccountId(),
      attribution: {
        ...event.attribution,
        ads_network_id: generateAdsNetworkId(),
        ads_account_id: generateAdsAccountId(),
      },
    };

    expect(eventEnvelopeV1Schema.safeParse(mismatchedEvent).success).toBe(false);
  });

  it('allows organic events to omit route_id', () => {
    const attribution = buildAttribution(false);
    const event = {
      contract_version: EVENT_CONTRACT_VERSION,
      event_id: generateEventId(),
      event_name: 'sdk.session_started',
      occurred_at: timestamp,
      visitor_id: attribution.visitor_id,
      session_id: attribution.session_id,
      page_view_id: attribution.page_view_id,
      source: 'publisher_sdk',
      attribution,
      properties: {},
    };

    expect(eventEnvelopeV1Schema.safeParse(event).success).toBe(true);
  });

  it('requires envelope correlation fields to match attribution', () => {
    const event = {
      ...buildEvent(),
      session_id: generateSessionId(),
    };

    expect(eventEnvelopeV1Schema.safeParse(event).success).toBe(false);
  });

  it('rejects missing required event fields', () => {
    expect(eventEnvelopeV1Schema.safeParse({}).success).toBe(false);
  });
});
