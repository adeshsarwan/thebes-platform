import { describe, expect, it } from 'vitest';
import { ATTRIBUTION_CONTRACT_VERSION } from '../src/contracts/index.js';
import { attributionContractV1Schema } from '../src/validation/index.js';
import {
  generateAdsAccountId,
  generateAdsNetworkId,
  generateCampaignId,
  generateCompanyId,
  generateLandingPageId,
  generatePageViewId,
  generateRouteId,
  generateSessionId,
  generateVisitorId,
  generateWebsiteId,
} from '../src/utilities/index.js';

const timestamp = '2026-07-30T08:00:00.000Z';
const laterTimestamp = '2026-07-30T08:05:00.000Z';

const buildAttribution = () => ({
  contract_version: ATTRIBUTION_CONTRACT_VERSION,
  route_id: generateRouteId(),
  visitor_id: generateVisitorId(),
  session_id: generateSessionId(),
  page_view_id: generatePageViewId(),
  company_id: generateCompanyId(),
  website_id: generateWebsiteId(),
  ads_network_id: generateAdsNetworkId(),
  ads_account_id: generateAdsAccountId(),
  campaign_id: generateCampaignId(),
  landing_page_id: generateLandingPageId(),
  utm_source: 'google',
  utm_medium: 'paid_search',
  utm_campaign: 'summer_launch',
  google_ads_manager_customer_id: '1234567890',
  google_ads_customer_id: '2345678901',
  gclid: 'test-gclid-123',
  referrer: 'https://www.google.com/search?q=example',
  landing_url: 'https://publisher.example/story?route_id=present',
  first_seen_at: timestamp,
  last_seen_at: laterTimestamp,
});

describe('attribution contract', () => {
  it('accepts a valid paid attribution object', () => {
    const attribution = buildAttribution();

    expect(attributionContractV1Schema.safeParse(attribution).success).toBe(true);
  });

  it('supports paid attribution with route_id', () => {
    const parsed = attributionContractV1Schema.parse(buildAttribution());

    expect(parsed.route_id?.startsWith('rte_')).toBe(true);
  });

  it('allows browser-boundary attribution to omit backend-enriched IDs', () => {
    const attribution = {
      contract_version: ATTRIBUTION_CONTRACT_VERSION,
      visitor_id: generateVisitorId(),
      session_id: generateSessionId(),
      page_view_id: generatePageViewId(),
      first_seen_at: timestamp,
      last_seen_at: timestamp,
    };

    expect(attributionContractV1Schema.safeParse(attribution).success).toBe(true);
  });

  it('enforces Google Ads account hierarchy when campaign/account fields are present', () => {
    const campaignWithoutAccount = {
      contract_version: ATTRIBUTION_CONTRACT_VERSION,
      visitor_id: generateVisitorId(),
      session_id: generateSessionId(),
      page_view_id: generatePageViewId(),
      ads_network_id: generateAdsNetworkId(),
      campaign_id: generateCampaignId(),
      first_seen_at: timestamp,
      last_seen_at: timestamp,
    };
    const accountWithoutNetwork = {
      contract_version: ATTRIBUTION_CONTRACT_VERSION,
      visitor_id: generateVisitorId(),
      session_id: generateSessionId(),
      page_view_id: generatePageViewId(),
      ads_account_id: generateAdsAccountId(),
      first_seen_at: timestamp,
      last_seen_at: timestamp,
    };

    expect(attributionContractV1Schema.safeParse(campaignWithoutAccount).success).toBe(false);
    expect(attributionContractV1Schema.safeParse(accountWithoutNetwork).success).toBe(false);
  });

  it('rejects invalid attribution objects', () => {
    const invalid = {
      ...buildAttribution(),
      route_id: 'bad_route_id',
    };

    expect(attributionContractV1Schema.safeParse(invalid).success).toBe(false);
  });

  it('rejects invalid dates and backwards timestamp windows', () => {
    expect(
      attributionContractV1Schema.safeParse({
        ...buildAttribution(),
        first_seen_at: '2026-07-30T08:00:00+05:30',
      }).success,
    ).toBe(false);

    expect(
      attributionContractV1Schema.safeParse({
        ...buildAttribution(),
        first_seen_at: laterTimestamp,
        last_seen_at: timestamp,
      }).success,
    ).toBe(false);
  });
});
