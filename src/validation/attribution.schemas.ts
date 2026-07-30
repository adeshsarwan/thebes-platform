import { z } from 'zod';
import { ATTRIBUTION_CONTRACT_VERSION } from '../contracts/attribution.js';
import {
  adGroupIdSchema,
  adsAccountIdSchema,
  adsNetworkIdSchema,
  campaignIdSchema,
  companyIdSchema,
  creativeIdSchema,
  externalProviderIdentifierSchema,
  landingPageIdSchema,
  pageViewIdSchema,
  routeIdSchema,
  sessionIdSchema,
  visitorIdSchema,
  websiteIdSchema,
} from './identifier.schemas.js';

export const ISO_UTC_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z$/;

export const isoUtcTimestampSchema = z
  .string()
  .refine(
    (value) => ISO_UTC_TIMESTAMP_PATTERN.test(value),
    'Must be an ISO-8601 timestamp in UTC with a trailing Z',
  )
  .refine((value) => !Number.isNaN(Date.parse(value)), 'Must be a valid calendar date');

const utmValueSchema = z.string().min(1).max(1024);
const urlValueSchema = z.string().min(1).max(4096).url();

export const attributionContractV1Schema = z
  .object({
    contract_version: z.literal(ATTRIBUTION_CONTRACT_VERSION),
    route_id: routeIdSchema.optional(),
    visitor_id: visitorIdSchema,
    session_id: sessionIdSchema,
    page_view_id: pageViewIdSchema,
    company_id: companyIdSchema.optional(),
    website_id: websiteIdSchema.optional(),
    ads_network_id: adsNetworkIdSchema.optional(),
    ads_account_id: adsAccountIdSchema.optional(),
    campaign_id: campaignIdSchema.optional(),
    ad_group_id: adGroupIdSchema.optional(),
    creative_id: creativeIdSchema.optional(),
    landing_page_id: landingPageIdSchema.optional(),
    utm_source: utmValueSchema.optional(),
    utm_medium: utmValueSchema.optional(),
    utm_campaign: utmValueSchema.optional(),
    utm_term: utmValueSchema.optional(),
    utm_content: utmValueSchema.optional(),
    google_ads_manager_customer_id: externalProviderIdentifierSchema.optional(),
    google_ads_customer_id: externalProviderIdentifierSchema.optional(),
    gclid: externalProviderIdentifierSchema.optional(),
    dclid: externalProviderIdentifierSchema.optional(),
    wbraid: externalProviderIdentifierSchema.optional(),
    gbraid: externalProviderIdentifierSchema.optional(),
    msclkid: externalProviderIdentifierSchema.optional(),
    referrer: urlValueSchema.optional(),
    landing_url: urlValueSchema.optional(),
    first_seen_at: isoUtcTimestampSchema,
    last_seen_at: isoUtcTimestampSchema,
  })
  .strict()
  .refine((value) => value.ads_account_id === undefined || value.ads_network_id !== undefined, {
    message: 'ads_account_id requires ads_network_id',
    path: ['ads_network_id'],
  })
  .refine((value) => value.campaign_id === undefined || value.ads_account_id !== undefined, {
    message: 'campaign_id requires ads_account_id',
    path: ['ads_account_id'],
  })
  .refine((value) => Date.parse(value.last_seen_at) >= Date.parse(value.first_seen_at), {
    message: 'last_seen_at must be equal to or later than first_seen_at',
    path: ['last_seen_at'],
  });

export type AttributionContractV1Input = z.input<typeof attributionContractV1Schema>;
export type AttributionContractV1Output = z.output<typeof attributionContractV1Schema>;
