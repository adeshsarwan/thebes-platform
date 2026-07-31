import { createHash } from 'node:crypto';
import {
  OperatorInputError,
  OperatorSafetyError,
  type PlacementFormat,
  type ServingConfiguration,
  type ServingConfigurationInput,
  type TrafficSplit,
  type WebsiteCreateInput,
  type WebsiteEnvironment,
  type WebsiteUpdateInput,
} from './types.js';

const DOMAIN_PATTERN = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;
const PLACEMENT_KEY_PATTERN = /^[a-z][a-z0-9_-]{0,63}$/;
const GAM_NETWORK_PATTERN = /^\d+$/;
const GAM_PATH_PATTERN = /^\/[0-9]+\/[A-Za-z0-9_./-]+$/;

export const DEFAULT_SERVING_CONFIGURATION: ServingConfiguration = {
  mode: 'default',
  traffic_split: { control_percentage: 100, experiment_percentage: 0 },
};

export const normalizeDomain = (input: string): string => {
  let value = input.trim().toLowerCase();
  value = value.replace(/^https?:\/\//i, '');
  value = value.split(/[/?#]/)[0] ?? '';
  value = value.replace(/\.+$/u, '').replace(/\/+$/u, '');
  if (value.startsWith('www.')) value = value.slice(4);

  if (!DOMAIN_PATTERN.test(value)) {
    throw new OperatorInputError('Domain must be a valid hostname.');
  }

  return value;
};

export const deriveSiteKey = (domain: string): string => domain;

export const deriveDisplayName = (domain: string): string => domain;

export const validatePilotEnvironment = (environment: WebsiteEnvironment): void => {
  if (environment !== 'pilot') {
    throw new OperatorSafetyError('Production website configuration is not enabled in ST-019.');
  }
};

export const normalizeWebsiteInput = <TInput extends WebsiteCreateInput | WebsiteUpdateInput>(
  input: TInput,
): TInput => {
  validatePilotEnvironment(input.environment);
  const domain = normalizeDomain(input.domain);
  const gamNetworkCode = input.gam_network_code.trim();
  if (!GAM_NETWORK_PATTERN.test(gamNetworkCode)) {
    throw new OperatorInputError('GAM network code must be numeric.');
  }

  return { ...input, domain, gam_network_code: gamNetworkCode };
};

export const validatePlacementKey = (placementKey: string): string => {
  const normalized = placementKey.trim().toLowerCase();
  if (!PLACEMENT_KEY_PATTERN.test(normalized)) {
    throw new OperatorInputError('Placement key must be a lowercase logical key.');
  }

  return normalized;
};

export const validateGamAdUnitPath = (path: string, networkCode: string): string => {
  const normalized = path.trim();
  if (!normalized.startsWith(`/${networkCode}/`)) {
    throw new OperatorInputError(`GAM ad unit path must begin with /${networkCode}/.`);
  }

  if (!GAM_PATH_PATTERN.test(normalized)) {
    throw new OperatorInputError('GAM ad unit path contains unsupported characters.');
  }

  return normalized;
};

export const inferPlacementFormat = (placementKey: string): PlacementFormat => {
  if (placementKey === 'anchor') return 'anchor';
  if (placementKey === 'native') return 'native';
  if (placementKey === 'rewarded') return 'rewarded';
  if (placementKey === 'interstitial') return 'interstitial';
  return 'banner';
};

export const validateTrafficSplit = (
  controlPercentage: number,
  experimentPercentage: number,
): TrafficSplit => {
  if (
    !Number.isInteger(controlPercentage) ||
    !Number.isInteger(experimentPercentage) ||
    controlPercentage < 0 ||
    controlPercentage > 100 ||
    experimentPercentage < 0 ||
    experimentPercentage > 100
  ) {
    throw new OperatorInputError('Traffic split percentages must be integers from 0 to 100.');
  }

  if (controlPercentage + experimentPercentage !== 100) {
    throw new OperatorInputError('Traffic split percentages must total 100.');
  }

  return {
    control_percentage: controlPercentage,
    experiment_percentage: experimentPercentage,
  };
};

export const normalizeServingConfiguration = (
  input: ServingConfigurationInput,
): ServingConfiguration => {
  validatePilotEnvironment(input.environment);
  if (!['default', 'waterfall', 'experiment'].includes(input.mode)) {
    throw new OperatorInputError('Serving mode must be Default, Waterfall, or Experiment.');
  }

  return {
    mode: input.mode,
    traffic_split: validateTrafficSplit(input.control_percentage, input.experiment_percentage),
  };
};

export const hashConfig = (config: unknown): string =>
  createHash('sha256').update(JSON.stringify(config)).digest('hex');
