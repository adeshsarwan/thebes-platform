export type Brand<TValue, TBrand extends string> = TValue & { readonly __brand: TBrand };

export type UuidV7String = Brand<string, 'UuidV7String'>;

export type CompanyId = Brand<string, 'CompanyId'>;
export type WebsiteId = Brand<string, 'WebsiteId'>;
export type AdsNetworkId = Brand<string, 'AdsNetworkId'>;
export type AdsAccountId = Brand<string, 'AdsAccountId'>;
export type CampaignId = Brand<string, 'CampaignId'>;
export type AdGroupId = Brand<string, 'AdGroupId'>;
export type CreativeId = Brand<string, 'CreativeId'>;
export type LandingPageId = Brand<string, 'LandingPageId'>;
export type EventId = Brand<string, 'EventId'>;
export type RequestId = Brand<string, 'RequestId'>;
export type OptimizationRunId = Brand<string, 'OptimizationRunId'>;

export type RouteId = Brand<string, 'RouteId'>;
export type VisitorId = Brand<string, 'VisitorId'>;
export type SessionId = Brand<string, 'SessionId'>;
export type PageViewId = Brand<string, 'PageViewId'>;
export type ImpressionId = Brand<string, 'ImpressionId'>;
export type ClickId = Brand<string, 'ClickId'>;

export const COMPACT_ID_PREFIXES = {
  route_id: 'rte_',
  visitor_id: 'vst_',
  session_id: 'ses_',
  page_view_id: 'pv_',
  impression_id: 'imp_',
  click_id: 'clk_',
} as const;

export const COMPACT_ID_MAX_LENGTHS = {
  route_id: 40,
  visitor_id: 50,
  session_id: 50,
  page_view_id: 50,
  impression_id: 50,
  click_id: 50,
} as const;

export const EXTERNAL_IDENTIFIER_KEYS = [
  'google_ads_manager_customer_id',
  'google_ads_customer_id',
  'google_ads_campaign_id',
  'google_ads_ad_group_id',
  'google_ads_asset_group_id',
  'google_ads_asset_id',
  'google_ads_criterion_id',
  'gam_network_code',
  'gam_order_id',
  'gam_line_item_id',
  'gam_creative_id',
  'gam_ad_unit_id',
  'gclid',
  'dclid',
  'wbraid',
  'gbraid',
  'msclkid',
] as const;

export type ExternalIdentifierKey = (typeof EXTERNAL_IDENTIFIER_KEYS)[number];

export interface ExternalProviderIdentifiers {
  google_ads_manager_customer_id?: string;
  google_ads_customer_id?: string;
  google_ads_campaign_id?: string;
  google_ads_ad_group_id?: string;
  google_ads_asset_group_id?: string;
  google_ads_asset_id?: string;
  google_ads_criterion_id?: string;
  gam_network_code?: string;
  gam_order_id?: string;
  gam_line_item_id?: string;
  gam_creative_id?: string;
  gam_ad_unit_id?: string;
  gclid?: string;
  dclid?: string;
  wbraid?: string;
  gbraid?: string;
  msclkid?: string;
}
