import type {
  AdGroupId,
  AdsAccountId,
  AdsNetworkId,
  CampaignId,
  CompanyId,
  CreativeId,
  ExternalProviderIdentifiers,
  LandingPageId,
  PageViewId,
  RouteId,
  SessionId,
  VisitorId,
  WebsiteId,
} from './identifiers.js';

export const ATTRIBUTION_CONTRACT_VERSION = 'thebes.attribution.v1' as const;

export interface ThebesAttributionV1 extends Pick<
  ExternalProviderIdentifiers,
  | 'google_ads_manager_customer_id'
  | 'google_ads_customer_id'
  | 'gclid'
  | 'dclid'
  | 'wbraid'
  | 'gbraid'
  | 'msclkid'
> {
  contract_version: typeof ATTRIBUTION_CONTRACT_VERSION;
  route_id?: RouteId;
  visitor_id: VisitorId;
  session_id: SessionId;
  page_view_id: PageViewId;
  company_id?: CompanyId;
  website_id?: WebsiteId;
  ads_network_id?: AdsNetworkId;
  ads_account_id?: AdsAccountId;
  campaign_id?: CampaignId;
  ad_group_id?: AdGroupId;
  creative_id?: CreativeId;
  landing_page_id?: LandingPageId;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  referrer?: string;
  landing_url?: string;
  first_seen_at: string;
  last_seen_at: string;
}
