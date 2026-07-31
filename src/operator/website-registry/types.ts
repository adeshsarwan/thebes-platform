import type { WebsiteId } from '../../contracts/index.js';

export type WebsiteEnvironment = 'pilot' | 'production';
export type ServingMode = 'default' | 'waterfall' | 'experiment';
export type PlacementFormat = 'banner' | 'native' | 'anchor' | 'interstitial' | 'rewarded';

export interface TrafficSplit {
  control_percentage: number;
  experiment_percentage: number;
}

export interface ServingConfiguration {
  mode: ServingMode;
  traffic_split: TrafficSplit;
  updated_by?: string;
  updated_at?: string;
}

export interface WebsiteSummary {
  website_id: WebsiteId;
  domain: string;
  environment: WebsiteEnvironment;
  gam_network_code: string;
  enabled: boolean;
  active_config_version: number;
  ad_unit_count: number;
  updated_at: string;
}

export interface AdUnit {
  placement_id: string;
  placement_key: string;
  gam_ad_unit_path: string;
  format: PlacementFormat;
  enabled: boolean;
  updated_at: string;
}

export interface WebsiteDetail extends WebsiteSummary {
  site_key: string;
  display_name: string;
  created_at: string;
  configuration: ServingConfiguration;
  ad_units: AdUnit[];
}

export interface WebsiteCreateInput {
  domain: string;
  environment: WebsiteEnvironment;
  gam_network_code: string;
  enabled: boolean;
}

export interface WebsiteUpdateInput {
  domain: string;
  environment: WebsiteEnvironment;
  gam_network_code: string;
  enabled: boolean;
}

export interface AdUnitInput {
  placement_key: string;
  gam_ad_unit_path: string;
  enabled: boolean;
}

export interface ServingConfigurationInput {
  environment: WebsiteEnvironment;
  mode: ServingMode;
  control_percentage: number;
  experiment_percentage: number;
}

export interface OperatorMutationResult<TValue> {
  ok: true;
  value: TValue;
  config_version: number;
  updated_by: string;
  updated_at: string;
}

export class OperatorInputError extends Error {
  readonly statusCode = 400;
  readonly code = 'OPERATOR_INPUT_INVALID';
}

export class OperatorConflictError extends Error {
  readonly statusCode = 409;
  readonly code = 'OPERATOR_CONFLICT';
}

export class OperatorNotFoundError extends Error {
  readonly statusCode = 404;
  readonly code = 'OPERATOR_NOT_FOUND';
}

export class OperatorSafetyError extends Error {
  readonly statusCode = 409;
  readonly code = 'OPERATOR_PRODUCTION_BLOCKED';
}

export class OperatorDependencyError extends Error {
  readonly statusCode = 503;
  readonly code = 'OPERATOR_DEPENDENCY_UNAVAILABLE';
}
