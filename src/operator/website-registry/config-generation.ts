import type { WebsiteId } from '../../contracts/index.js';
import { v7 as uuidv7 } from 'uuid';
import { DEFAULT_SERVING_CONFIGURATION, hashConfig } from './domain.js';
import type { PlacementFormat, ServingConfiguration } from './types.js';

export const SDK_VERSION = '0.1.0-st004';

export interface PublisherRecord {
  site_id: WebsiteId;
  site_key: string;
  domain: string;
  display_name: string;
  enabled: boolean;
  gam_network_code: string;
  telemetry_json: string;
  downstream_modes_json: string;
  created_at: string;
  updated_at: string;
}

export interface PlacementRecord {
  placement_id: string;
  site_id: WebsiteId;
  placement_key: string;
  format: PlacementFormat;
  gam_ad_unit_path: string;
  mobile_sizes_json: string;
  desktop_sizes_json: string;
  min_viewport_width?: number;
  request_mode: 'automatic' | 'publisher_triggered';
  trigger_json: string;
  pricing_json: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface ActiveConfigRecord {
  config_version_id: string;
  version: number;
  config_json: string;
  created_at: string;
}

interface RuntimePlacementConfig {
  placement_id: string;
  placement_key: string;
  gam_ad_unit_path: string;
  format: PlacementFormat;
  mobile_sizes: Array<[number, number]>;
  desktop_sizes: Array<[number, number]>;
  min_viewport_width?: number;
  request_mode: 'automatic' | 'publisher_triggered';
  trigger?: Record<string, unknown>;
  pricing: Record<string, unknown>;
  enabled: boolean;
  targeting: Record<string, string>;
}

export interface RuntimeConfig {
  site_id: WebsiteId;
  site_key: string;
  domain: string;
  display_name: string;
  enabled: boolean;
  gam_network_code: string;
  config_version_id: string;
  config_version: number;
  sdk_version: string;
  telemetry: Record<string, unknown>;
  downstream: Record<string, unknown>;
  placements: RuntimePlacementConfig[];
  generated_at: string;
  serving: ServingConfiguration;
}

const DEFAULT_TELEMETRY = { enabled: true, heartbeat_interval_seconds: 30 };
const DEFAULT_DOWNSTREAM = {
  google_analytics: 'DRY_RUN',
  google_ads: 'DRY_RUN',
  roi_engine: 'DRY_RUN',
};
const DEFAULT_PRICING = {
  baseFloor: null,
  ladder: [300],
  retryLimit: 1,
  retryDelayMs: 0,
  maxAttempts: 1,
  fallback: { enabled: false },
};

const parseJson = <TValue>(value: string | undefined, fallback: TValue): TValue => {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as TValue;
  } catch {
    return fallback;
  }
};

const normalizeSizes = (value: string): Array<[number, number]> =>
  parseJson<Array<[number, number]>>(value, []).filter(
    (entry): entry is [number, number] =>
      Array.isArray(entry) &&
      entry.length === 2 &&
      Number.isInteger(entry[0]) &&
      Number.isInteger(entry[1]) &&
      entry[0] > 0 &&
      entry[1] > 0,
  );

export const servingFromActiveConfig = (
  activeConfig: ActiveConfigRecord | null,
): ServingConfiguration => {
  const parsed = parseJson<{ serving?: ServingConfiguration } | null>(
    activeConfig?.config_json,
    null,
  );

  return parsed?.serving ?? DEFAULT_SERVING_CONFIGURATION;
};

export const buildRuntimeConfig = ({
  publisher,
  placements,
  version,
  serving,
}: {
  publisher: PublisherRecord;
  placements: PlacementRecord[];
  version: number;
  serving: ServingConfiguration;
}): { config: RuntimeConfig; manifest_hash: string } => {
  const configVersionId = uuidv7();
  const config: RuntimeConfig = {
    site_id: publisher.site_id,
    site_key: publisher.site_key,
    domain: publisher.domain,
    display_name: publisher.display_name,
    enabled: publisher.enabled,
    gam_network_code: publisher.gam_network_code,
    config_version_id: configVersionId,
    config_version: version,
    sdk_version: SDK_VERSION,
    telemetry: parseJson<Record<string, unknown>>(publisher.telemetry_json, DEFAULT_TELEMETRY),
    downstream: parseJson<Record<string, unknown>>(
      publisher.downstream_modes_json,
      DEFAULT_DOWNSTREAM,
    ),
    placements: placements.map((placement) => ({
      placement_id: placement.placement_id,
      placement_key: placement.placement_key,
      gam_ad_unit_path: placement.gam_ad_unit_path,
      format: placement.format,
      mobile_sizes: normalizeSizes(placement.mobile_sizes_json),
      desktop_sizes: normalizeSizes(placement.desktop_sizes_json),
      ...(placement.min_viewport_width == null
        ? {}
        : { min_viewport_width: placement.min_viewport_width }),
      request_mode: placement.request_mode,
      trigger: parseJson<Record<string, unknown>>(placement.trigger_json, {}),
      pricing: parseJson<Record<string, unknown>>(placement.pricing_json, DEFAULT_PRICING),
      enabled: placement.enabled,
      targeting: {},
    })),
    generated_at: new Date().toISOString(),
    serving,
  };

  return { config, manifest_hash: hashConfig(config) };
};

export const defaultPricingJson = (): string => JSON.stringify(DEFAULT_PRICING);
