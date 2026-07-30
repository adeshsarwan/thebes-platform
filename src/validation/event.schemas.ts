import { z } from 'zod';
import { EVENT_CONTRACT_VERSION, EVENT_SOURCE_VALUES } from '../contracts/events.js';
import { attributionContractV1Schema, isoUtcTimestampSchema } from './attribution.schemas.js';
import {
  adsAccountIdSchema,
  adsNetworkIdSchema,
  companyIdSchema,
  eventIdSchema,
  pageViewIdSchema,
  requestIdSchema,
  routeIdSchema,
  sessionIdSchema,
  visitorIdSchema,
  websiteIdSchema,
} from './identifier.schemas.js';

export const EVENT_NAME_PATTERN =
  /^[a-z][a-z0-9]*(?:_[a-z0-9]+)*(?:\.[a-z][a-z0-9]*(?:_[a-z0-9]+)*)+$/;

export const eventNameSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(EVENT_NAME_PATTERN, 'Must be a lowercase namespaced event name');

export const eventSourceSchema = z.enum(EVENT_SOURCE_VALUES);

export const eventEnvelopeV1Schema = z
  .object({
    contract_version: z.literal(EVENT_CONTRACT_VERSION),
    event_id: eventIdSchema,
    event_name: eventNameSchema,
    occurred_at: isoUtcTimestampSchema,
    received_at: isoUtcTimestampSchema.optional(),
    request_id: requestIdSchema.optional(),
    company_id: companyIdSchema.optional(),
    website_id: websiteIdSchema.optional(),
    ads_network_id: adsNetworkIdSchema.optional(),
    ads_account_id: adsAccountIdSchema.optional(),
    visitor_id: visitorIdSchema,
    session_id: sessionIdSchema,
    page_view_id: pageViewIdSchema.optional(),
    route_id: routeIdSchema.optional(),
    source: eventSourceSchema,
    attribution: attributionContractV1Schema,
    properties: z.record(z.string(), z.unknown()),
  })
  .strict()
  .refine((value) => value.ads_account_id === undefined || value.ads_network_id !== undefined, {
    message: 'ads_account_id requires ads_network_id',
    path: ['ads_network_id'],
  })
  .refine((value) => value.visitor_id === value.attribution.visitor_id, {
    message: 'visitor_id must match attribution.visitor_id',
    path: ['visitor_id'],
  })
  .refine((value) => value.session_id === value.attribution.session_id, {
    message: 'session_id must match attribution.session_id',
    path: ['session_id'],
  })
  .refine(
    (value) =>
      value.page_view_id === undefined || value.page_view_id === value.attribution.page_view_id,
    {
      message: 'page_view_id must match attribution.page_view_id when present',
      path: ['page_view_id'],
    },
  )
  .refine(
    (value) =>
      value.route_id === undefined ||
      value.attribution.route_id === undefined ||
      value.route_id === value.attribution.route_id,
    {
      message: 'route_id must match attribution.route_id when both are present',
      path: ['route_id'],
    },
  )
  .refine(
    (value) =>
      value.ads_network_id === undefined ||
      value.attribution.ads_network_id === undefined ||
      value.ads_network_id === value.attribution.ads_network_id,
    {
      message: 'ads_network_id must match attribution.ads_network_id when both are present',
      path: ['ads_network_id'],
    },
  )
  .refine(
    (value) =>
      value.ads_account_id === undefined ||
      value.attribution.ads_account_id === undefined ||
      value.ads_account_id === value.attribution.ads_account_id,
    {
      message: 'ads_account_id must match attribution.ads_account_id when both are present',
      path: ['ads_account_id'],
    },
  );

export type EventEnvelopeV1Input = z.input<typeof eventEnvelopeV1Schema>;
export type EventEnvelopeV1Output = z.output<typeof eventEnvelopeV1Schema>;
