import { randomBytes } from 'node:crypto';
import { v7 as uuidv7 } from 'uuid';
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

const COMPACT_RANDOM_BYTES = 24;

const generateUuidV7 = <TIdentifier extends string>(): TIdentifier => uuidv7() as TIdentifier;

const generateCompactIdentifier = <TIdentifier extends string>(
  prefix: string,
  maximumLength: number,
): TIdentifier => {
  const token = randomBytes(COMPACT_RANDOM_BYTES).toString('base64url');
  const identifier = `${prefix}${token}`;

  if (identifier.length > maximumLength) {
    throw new Error(`Generated identifier exceeds ${maximumLength} characters`);
  }

  return identifier as TIdentifier;
};

export const generateCompanyId = (): CompanyId => generateUuidV7<CompanyId>();
export const generateWebsiteId = (): WebsiteId => generateUuidV7<WebsiteId>();
export const generateAdsNetworkId = (): AdsNetworkId => generateUuidV7<AdsNetworkId>();
export const generateAdsAccountId = (): AdsAccountId => generateUuidV7<AdsAccountId>();
export const generateCampaignId = (): CampaignId => generateUuidV7<CampaignId>();
export const generateAdGroupId = (): AdGroupId => generateUuidV7<AdGroupId>();
export const generateCreativeId = (): CreativeId => generateUuidV7<CreativeId>();
export const generateLandingPageId = (): LandingPageId => generateUuidV7<LandingPageId>();
export const generateEventId = (): EventId => generateUuidV7<EventId>();
export const generateRequestId = (): RequestId => generateUuidV7<RequestId>();
export const generateOptimizationRunId = (): OptimizationRunId =>
  generateUuidV7<OptimizationRunId>();

export const generateRouteId = (): RouteId =>
  generateCompactIdentifier<RouteId>(COMPACT_ID_PREFIXES.route_id, COMPACT_ID_MAX_LENGTHS.route_id);

export const generateVisitorId = (): VisitorId =>
  generateCompactIdentifier<VisitorId>(
    COMPACT_ID_PREFIXES.visitor_id,
    COMPACT_ID_MAX_LENGTHS.visitor_id,
  );

export const generateSessionId = (): SessionId =>
  generateCompactIdentifier<SessionId>(
    COMPACT_ID_PREFIXES.session_id,
    COMPACT_ID_MAX_LENGTHS.session_id,
  );

export const generatePageViewId = (): PageViewId =>
  generateCompactIdentifier<PageViewId>(
    COMPACT_ID_PREFIXES.page_view_id,
    COMPACT_ID_MAX_LENGTHS.page_view_id,
  );

export const generateImpressionId = (): ImpressionId =>
  generateCompactIdentifier<ImpressionId>(
    COMPACT_ID_PREFIXES.impression_id,
    COMPACT_ID_MAX_LENGTHS.impression_id,
  );

export const generateClickId = (): ClickId =>
  generateCompactIdentifier<ClickId>(COMPACT_ID_PREFIXES.click_id, COMPACT_ID_MAX_LENGTHS.click_id);
