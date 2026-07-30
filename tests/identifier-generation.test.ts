import { describe, expect, it } from 'vitest';
import {
  UUID_V7_PATTERN,
  adGroupIdSchema,
  adsAccountIdSchema,
  adsNetworkIdSchema,
  campaignIdSchema,
  clickIdSchema,
  companyIdSchema,
  creativeIdSchema,
  eventIdSchema,
  impressionIdSchema,
  landingPageIdSchema,
  optimizationRunIdSchema,
  pageViewIdSchema,
  requestIdSchema,
  routeIdSchema,
  sessionIdSchema,
  visitorIdSchema,
  websiteIdSchema,
} from '../src/validation/index.js';
import {
  generateAdGroupId,
  generateAdsAccountId,
  generateAdsNetworkId,
  generateCampaignId,
  generateClickId,
  generateCompanyId,
  generateCreativeId,
  generateEventId,
  generateImpressionId,
  generateLandingPageId,
  generateOptimizationRunId,
  generatePageViewId,
  generateRequestId,
  generateRouteId,
  generateSessionId,
  generateVisitorId,
  generateWebsiteId,
} from '../src/utilities/index.js';

const uuidGeneratorCases = [
  { name: 'company_id', generate: generateCompanyId, schema: companyIdSchema },
  { name: 'website_id', generate: generateWebsiteId, schema: websiteIdSchema },
  { name: 'ads_network_id', generate: generateAdsNetworkId, schema: adsNetworkIdSchema },
  { name: 'ads_account_id', generate: generateAdsAccountId, schema: adsAccountIdSchema },
  { name: 'campaign_id', generate: generateCampaignId, schema: campaignIdSchema },
  { name: 'ad_group_id', generate: generateAdGroupId, schema: adGroupIdSchema },
  { name: 'creative_id', generate: generateCreativeId, schema: creativeIdSchema },
  { name: 'landing_page_id', generate: generateLandingPageId, schema: landingPageIdSchema },
  { name: 'event_id', generate: generateEventId, schema: eventIdSchema },
  { name: 'request_id', generate: generateRequestId, schema: requestIdSchema },
  {
    name: 'optimization_run_id',
    generate: generateOptimizationRunId,
    schema: optimizationRunIdSchema,
  },
] as const;

const compactGeneratorCases = [
  { name: 'route_id', prefix: 'rte_', generate: generateRouteId, schema: routeIdSchema },
  { name: 'visitor_id', prefix: 'vst_', generate: generateVisitorId, schema: visitorIdSchema },
  { name: 'session_id', prefix: 'ses_', generate: generateSessionId, schema: sessionIdSchema },
  { name: 'page_view_id', prefix: 'pv_', generate: generatePageViewId, schema: pageViewIdSchema },
  {
    name: 'impression_id',
    prefix: 'imp_',
    generate: generateImpressionId,
    schema: impressionIdSchema,
  },
  { name: 'click_id', prefix: 'clk_', generate: generateClickId, schema: clickIdSchema },
] as const;

describe('identifier generation', () => {
  it.each(uuidGeneratorCases)(
    'generates valid UUID v7 values for $name',
    ({ generate, schema }) => {
      const value = generate();

      expect(value).toMatch(UUID_V7_PATTERN);
      expect(schema.safeParse(value).success).toBe(true);
    },
  );

  it.each(compactGeneratorCases)(
    'generates valid compact values for $name',
    ({ generate, prefix, schema }) => {
      const value = generate();

      expect(value.startsWith(prefix)).toBe(true);
      expect(encodeURIComponent(value)).toBe(value);
      expect(schema.safeParse(value).success).toBe(true);
    },
  );

  it('generates unique UUID values across a reasonable sample', () => {
    for (const { generate } of uuidGeneratorCases) {
      const values = new Set<string>();

      for (let index = 0; index < 500; index += 1) {
        values.add(generate());
      }

      expect(values.size).toBe(500);
    }
  });

  it('generates unique compact values across a reasonable sample', () => {
    for (const { generate } of compactGeneratorCases) {
      const values = new Set<string>();

      for (let index = 0; index < 500; index += 1) {
        values.add(generate());
      }

      expect(values.size).toBe(500);
    }
  });

  it('does not produce collisions in a mixed duplicate-generation smoke test', () => {
    const generatedValues = new Set<string>();

    for (let index = 0; index < 1_000; index += 1) {
      generatedValues.add(generateRouteId());
      generatedValues.add(generateVisitorId());
      generatedValues.add(generateSessionId());
      generatedValues.add(generatePageViewId());
      generatedValues.add(generateEventId());
    }

    expect(generatedValues.size).toBe(5_000);
  });
});
