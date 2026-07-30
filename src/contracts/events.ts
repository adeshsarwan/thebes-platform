import type { ThebesAttributionV1 } from './attribution.js';
import type {
  AdsAccountId,
  AdsNetworkId,
  CompanyId,
  EventId,
  PageViewId,
  RequestId,
  RouteId,
  SessionId,
  VisitorId,
  WebsiteId,
} from './identifiers.js';

export const EVENT_CONTRACT_VERSION = 'thebes.event.v1' as const;

export const EVENT_SOURCE_VALUES = [
  'publisher_sdk',
  'creative_central',
  'backend',
  'google_ads_import',
  'gam_import',
  'roi_engine',
  'operator_console',
] as const;

export type EventSource = (typeof EVENT_SOURCE_VALUES)[number];

export interface EventEnvelopeV1 {
  contract_version: typeof EVENT_CONTRACT_VERSION;
  event_id: EventId;
  event_name: string;
  occurred_at: string;
  received_at?: string;
  request_id?: RequestId;
  company_id?: CompanyId;
  website_id?: WebsiteId;
  ads_network_id?: AdsNetworkId;
  ads_account_id?: AdsAccountId;
  visitor_id: VisitorId;
  session_id: SessionId;
  page_view_id?: PageViewId;
  route_id?: RouteId;
  source: EventSource;
  attribution: ThebesAttributionV1;
  properties: Record<string, unknown>;
}
