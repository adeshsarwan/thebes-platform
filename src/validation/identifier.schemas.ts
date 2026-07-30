import { z } from 'zod';
import { COMPACT_ID_MAX_LENGTHS, COMPACT_ID_PREFIXES } from '../contracts/identifiers.js';
import type {
  AdGroupId,
  AdsAccountId,
  AdsNetworkId,
  CampaignId,
  ClickId,
  CompanyId,
  CreativeId,
  EventId,
  ExternalProviderIdentifiers,
  ImpressionId,
  LandingPageId,
  OptimizationRunId,
  PageViewId,
  RequestId,
  RouteId,
  SessionId,
  VisitorId,
  WebsiteId,
} from '../contracts/identifiers.js';

export const UUID_V7_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const URL_SAFE_RANDOM_PATTERN = /^[A-Za-z0-9_-]+$/;

const uuidV7StringSchema = z.string().min(1).regex(UUID_V7_PATTERN, 'Must be a UUID v7 string');

const compactIdentifierSchema = (prefix: string, maximumLength: number) =>
  z
    .string()
    .min(prefix.length + 1)
    .max(maximumLength)
    .refine((value) => value.startsWith(prefix), `Must start with ${prefix}`)
    .refine(
      (value) => URL_SAFE_RANDOM_PATTERN.test(value.slice(prefix.length)),
      'Must contain only URL-safe random characters after the prefix',
    );

export const companyIdSchema = uuidV7StringSchema.transform((value) => value as CompanyId);
export const websiteIdSchema = uuidV7StringSchema.transform((value) => value as WebsiteId);
export const adsNetworkIdSchema = uuidV7StringSchema.transform((value) => value as AdsNetworkId);
export const adsAccountIdSchema = uuidV7StringSchema.transform((value) => value as AdsAccountId);
export const campaignIdSchema = uuidV7StringSchema.transform((value) => value as CampaignId);
export const adGroupIdSchema = uuidV7StringSchema.transform((value) => value as AdGroupId);
export const creativeIdSchema = uuidV7StringSchema.transform((value) => value as CreativeId);
export const landingPageIdSchema = uuidV7StringSchema.transform((value) => value as LandingPageId);
export const eventIdSchema = uuidV7StringSchema.transform((value) => value as EventId);
export const requestIdSchema = uuidV7StringSchema.transform((value) => value as RequestId);
export const optimizationRunIdSchema = uuidV7StringSchema.transform(
  (value) => value as OptimizationRunId,
);

export const routeIdSchema = compactIdentifierSchema(
  COMPACT_ID_PREFIXES.route_id,
  COMPACT_ID_MAX_LENGTHS.route_id,
).transform((value) => value as RouteId);

export const visitorIdSchema = compactIdentifierSchema(
  COMPACT_ID_PREFIXES.visitor_id,
  COMPACT_ID_MAX_LENGTHS.visitor_id,
).transform((value) => value as VisitorId);

export const sessionIdSchema = compactIdentifierSchema(
  COMPACT_ID_PREFIXES.session_id,
  COMPACT_ID_MAX_LENGTHS.session_id,
).transform((value) => value as SessionId);

export const pageViewIdSchema = compactIdentifierSchema(
  COMPACT_ID_PREFIXES.page_view_id,
  COMPACT_ID_MAX_LENGTHS.page_view_id,
).transform((value) => value as PageViewId);

export const impressionIdSchema = compactIdentifierSchema(
  COMPACT_ID_PREFIXES.impression_id,
  COMPACT_ID_MAX_LENGTHS.impression_id,
).transform((value) => value as ImpressionId);

export const clickIdSchema = compactIdentifierSchema(
  COMPACT_ID_PREFIXES.click_id,
  COMPACT_ID_MAX_LENGTHS.click_id,
).transform((value) => value as ClickId);

export const externalProviderIdentifierSchema = z
  .string()
  .min(1)
  .max(255)
  .refine((value) => value.trim() === value, 'Must not contain surrounding whitespace');

export const externalProviderIdentifiersSchema = z
  .object({
    google_ads_manager_customer_id: externalProviderIdentifierSchema.optional(),
    google_ads_customer_id: externalProviderIdentifierSchema.optional(),
    google_ads_campaign_id: externalProviderIdentifierSchema.optional(),
    google_ads_ad_group_id: externalProviderIdentifierSchema.optional(),
    google_ads_asset_group_id: externalProviderIdentifierSchema.optional(),
    google_ads_asset_id: externalProviderIdentifierSchema.optional(),
    google_ads_criterion_id: externalProviderIdentifierSchema.optional(),
    gam_network_code: externalProviderIdentifierSchema.optional(),
    gam_order_id: externalProviderIdentifierSchema.optional(),
    gam_line_item_id: externalProviderIdentifierSchema.optional(),
    gam_creative_id: externalProviderIdentifierSchema.optional(),
    gam_ad_unit_id: externalProviderIdentifierSchema.optional(),
    gclid: externalProviderIdentifierSchema.optional(),
    dclid: externalProviderIdentifierSchema.optional(),
    wbraid: externalProviderIdentifierSchema.optional(),
    gbraid: externalProviderIdentifierSchema.optional(),
    msclkid: externalProviderIdentifierSchema.optional(),
  })
  .strict()
  .transform((value) => value as ExternalProviderIdentifiers);

export const identifierSchemas = {
  company_id: companyIdSchema,
  website_id: websiteIdSchema,
  ads_network_id: adsNetworkIdSchema,
  ads_account_id: adsAccountIdSchema,
  campaign_id: campaignIdSchema,
  ad_group_id: adGroupIdSchema,
  creative_id: creativeIdSchema,
  landing_page_id: landingPageIdSchema,
  route_id: routeIdSchema,
  visitor_id: visitorIdSchema,
  session_id: sessionIdSchema,
  page_view_id: pageViewIdSchema,
  event_id: eventIdSchema,
  request_id: requestIdSchema,
  impression_id: impressionIdSchema,
  click_id: clickIdSchema,
  optimization_run_id: optimizationRunIdSchema,
} as const;
