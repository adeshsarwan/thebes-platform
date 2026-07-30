import type {
  AdGroupId,
  AdsAccountId,
  AdsNetworkId,
  CampaignId,
  ClickId,
  CompanyId,
  CreativeId,
  EventId,
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
import {
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
} from '../validation/identifier.schemas.js';

const safelyMatches = (
  schema: { safeParse: (value: unknown) => { success: boolean } },
  value: unknown,
) => schema.safeParse(value).success;

export const isCompanyId = (value: unknown): value is CompanyId =>
  safelyMatches(companyIdSchema, value);
export const isWebsiteId = (value: unknown): value is WebsiteId =>
  safelyMatches(websiteIdSchema, value);
export const isAdsNetworkId = (value: unknown): value is AdsNetworkId =>
  safelyMatches(adsNetworkIdSchema, value);
export const isAdsAccountId = (value: unknown): value is AdsAccountId =>
  safelyMatches(adsAccountIdSchema, value);
export const isCampaignId = (value: unknown): value is CampaignId =>
  safelyMatches(campaignIdSchema, value);
export const isAdGroupId = (value: unknown): value is AdGroupId =>
  safelyMatches(adGroupIdSchema, value);
export const isCreativeId = (value: unknown): value is CreativeId =>
  safelyMatches(creativeIdSchema, value);
export const isLandingPageId = (value: unknown): value is LandingPageId =>
  safelyMatches(landingPageIdSchema, value);
export const isRouteId = (value: unknown): value is RouteId => safelyMatches(routeIdSchema, value);
export const isVisitorId = (value: unknown): value is VisitorId =>
  safelyMatches(visitorIdSchema, value);
export const isSessionId = (value: unknown): value is SessionId =>
  safelyMatches(sessionIdSchema, value);
export const isPageViewId = (value: unknown): value is PageViewId =>
  safelyMatches(pageViewIdSchema, value);
export const isEventId = (value: unknown): value is EventId => safelyMatches(eventIdSchema, value);
export const isRequestId = (value: unknown): value is RequestId =>
  safelyMatches(requestIdSchema, value);
export const isImpressionId = (value: unknown): value is ImpressionId =>
  safelyMatches(impressionIdSchema, value);
export const isClickId = (value: unknown): value is ClickId => safelyMatches(clickIdSchema, value);
export const isOptimizationRunId = (value: unknown): value is OptimizationRunId =>
  safelyMatches(optimizationRunIdSchema, value);

export const parseCompanyId = (value: unknown): CompanyId => companyIdSchema.parse(value);
export const parseWebsiteId = (value: unknown): WebsiteId => websiteIdSchema.parse(value);
export const parseAdsNetworkId = (value: unknown): AdsNetworkId => adsNetworkIdSchema.parse(value);
export const parseAdsAccountId = (value: unknown): AdsAccountId => adsAccountIdSchema.parse(value);
export const parseCampaignId = (value: unknown): CampaignId => campaignIdSchema.parse(value);
export const parseAdGroupId = (value: unknown): AdGroupId => adGroupIdSchema.parse(value);
export const parseCreativeId = (value: unknown): CreativeId => creativeIdSchema.parse(value);
export const parseLandingPageId = (value: unknown): LandingPageId =>
  landingPageIdSchema.parse(value);
export const parseRouteId = (value: unknown): RouteId => routeIdSchema.parse(value);
export const parseVisitorId = (value: unknown): VisitorId => visitorIdSchema.parse(value);
export const parseSessionId = (value: unknown): SessionId => sessionIdSchema.parse(value);
export const parsePageViewId = (value: unknown): PageViewId => pageViewIdSchema.parse(value);
export const parseEventId = (value: unknown): EventId => eventIdSchema.parse(value);
export const parseRequestId = (value: unknown): RequestId => requestIdSchema.parse(value);
export const parseImpressionId = (value: unknown): ImpressionId => impressionIdSchema.parse(value);
export const parseClickId = (value: unknown): ClickId => clickIdSchema.parse(value);
export const parseOptimizationRunId = (value: unknown): OptimizationRunId =>
  optimizationRunIdSchema.parse(value);
