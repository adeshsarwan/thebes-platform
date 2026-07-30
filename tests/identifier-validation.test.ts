import { describe, expect, it } from 'vitest';
import { COMPACT_ID_MAX_LENGTHS } from '../src/contracts/index.js';
import {
  adsAccountIdSchema,
  adsNetworkIdSchema,
  companyIdSchema,
  eventIdSchema,
  externalProviderIdentifiersSchema,
  routeIdSchema,
  sessionIdSchema,
} from '../src/validation/index.js';
import {
  generateAdsAccountId,
  generateAdsNetworkId,
  generateCompanyId,
  generateRouteId,
  generateSessionId,
} from '../src/utilities/index.js';
import {
  isAdsAccountId,
  isAdsNetworkId,
  isCompanyId,
  isRouteId,
  isSessionId,
} from '../src/utilities/identifier-validation.js';

describe('identifier validation', () => {
  it('accepts generated identifiers through schemas and type guards', () => {
    const companyId = generateCompanyId();
    const adsNetworkId = generateAdsNetworkId();
    const adsAccountId = generateAdsAccountId();
    const routeId = generateRouteId();
    const sessionId = generateSessionId();

    expect(companyIdSchema.safeParse(companyId).success).toBe(true);
    expect(adsNetworkIdSchema.safeParse(adsNetworkId).success).toBe(true);
    expect(adsAccountIdSchema.safeParse(adsAccountId).success).toBe(true);
    expect(routeIdSchema.safeParse(routeId).success).toBe(true);
    expect(sessionIdSchema.safeParse(sessionId).success).toBe(true);
    expect(isCompanyId(companyId)).toBe(true);
    expect(isAdsNetworkId(adsNetworkId)).toBe(true);
    expect(isAdsAccountId(adsAccountId)).toBe(true);
    expect(isRouteId(routeId)).toBe(true);
    expect(isSessionId(sessionId)).toBe(true);
  });

  it('rejects invalid compact prefixes', () => {
    expect(routeIdSchema.safeParse('ses_abc123').success).toBe(false);
    expect(sessionIdSchema.safeParse('vst_abc123').success).toBe(false);
  });

  it('rejects malformed UUIDs', () => {
    expect(companyIdSchema.safeParse('not-a-uuid').success).toBe(false);
    expect(eventIdSchema.safeParse('018ff6fb-6b1f-4000-8000-4bd8efc60000').success).toBe(false);
  });

  it('rejects overlong route identifiers', () => {
    const overlongRouteId = `rte_${'a'.repeat(COMPACT_ID_MAX_LENGTHS.route_id)}`;

    expect(routeIdSchema.safeParse(overlongRouteId).success).toBe(false);
  });

  it('rejects unsafe route identifiers', () => {
    expect(routeIdSchema.safeParse('rte_abc+123').success).toBe(false);
    expect(routeIdSchema.safeParse('rte_abc/123').success).toBe(false);
  });

  it('keeps external provider identifiers as strings instead of UUID contracts', () => {
    const parsed = externalProviderIdentifiersSchema.parse({
      google_ads_manager_customer_id: '1234567890',
      google_ads_customer_id: '2345678901',
      google_ads_campaign_id: '3456789012',
      gam_line_item_id: 'line-item-42',
      gclid: 'not-a-thebes-uuid',
    });

    expect(parsed.google_ads_manager_customer_id).toBe('1234567890');
    expect(parsed.google_ads_customer_id).toBe('2345678901');
    expect(parsed.google_ads_campaign_id).toBe('3456789012');
    expect(typeof parsed.gclid).toBe('string');
    expect(externalProviderIdentifiersSchema.safeParse({ gclid: '' }).success).toBe(false);
  });
});
