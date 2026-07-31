import type { WebsiteId } from '../../contracts/index.js';
import { generateWebsiteId } from '../../utilities/index.js';
import { v7 as uuidv7 } from 'uuid';
import type { D1Client } from '../d1-client.js';
import {
  deriveDisplayName,
  deriveSiteKey,
  inferPlacementFormat,
  validateGamAdUnitPath,
  validatePlacementKey,
} from './domain.js';
import {
  buildRuntimeConfig,
  defaultPricingJson,
  servingFromActiveConfig,
  type ActiveConfigRecord,
  type PlacementRecord,
  type PublisherRecord,
  type RuntimeConfig,
} from './config-generation.js';
import type { WebsiteRegistryRepository } from './repository.js';
import {
  OperatorConflictError,
  OperatorNotFoundError,
  type AdUnit,
  type AdUnitInput,
  type OperatorMutationResult,
  type ServingConfiguration,
  type WebsiteCreateInput,
  type WebsiteDetail,
  type WebsiteSummary,
  type WebsiteUpdateInput,
} from './types.js';
import type { OperatorIdentity } from '../auth.js';

interface PublisherRow extends Record<string, unknown> {
  site_id: string;
  site_key: string;
  domain: string;
  display_name: string;
  enabled: number;
  gam_network_code: string;
  telemetry_json: string;
  downstream_modes_json: string;
  created_at: string;
  updated_at: string;
  active_config_version?: number;
  ad_unit_count?: number;
}

interface PlacementRow extends Record<string, unknown> {
  placement_id: string;
  site_id: string;
  placement_key: string;
  format: string;
  gam_ad_unit_path: string;
  mobile_sizes_json: string;
  desktop_sizes_json: string;
  min_viewport_width: number | null;
  request_mode: 'automatic' | 'publisher_triggered';
  trigger_json: string;
  pricing_json: string;
  enabled: number;
  created_at: string;
  updated_at: string;
}

interface ConfigVersionRow extends Record<string, unknown> {
  config_version_id: string;
  version: number;
  config_json: string;
  created_at: string;
}

const asWebsiteId = (value: string): WebsiteId => value as WebsiteId;

const publisherFromRow = (row: PublisherRow): PublisherRecord => ({
  site_id: asWebsiteId(row.site_id),
  site_key: row.site_key,
  domain: row.domain,
  display_name: row.display_name,
  enabled: row.enabled === 1,
  gam_network_code: row.gam_network_code,
  telemetry_json: row.telemetry_json,
  downstream_modes_json: row.downstream_modes_json,
  created_at: row.created_at,
  updated_at: row.updated_at,
});

const placementFromRow = (row: PlacementRow): PlacementRecord => ({
  placement_id: row.placement_id,
  site_id: asWebsiteId(row.site_id),
  placement_key: row.placement_key,
  format: row.format as PlacementRecord['format'],
  gam_ad_unit_path: row.gam_ad_unit_path,
  mobile_sizes_json: row.mobile_sizes_json,
  desktop_sizes_json: row.desktop_sizes_json,
  ...(row.min_viewport_width == null ? {} : { min_viewport_width: row.min_viewport_width }),
  request_mode: row.request_mode,
  trigger_json: row.trigger_json,
  pricing_json: row.pricing_json,
  enabled: row.enabled === 1,
  created_at: row.created_at,
  updated_at: row.updated_at,
});

const activeConfigFromRow = (row: ConfigVersionRow | undefined): ActiveConfigRecord | null =>
  row
    ? {
        config_version_id: row.config_version_id,
        version: row.version,
        config_json: row.config_json,
        created_at: row.created_at,
      }
    : null;

const adUnitFromPlacement = (placement: PlacementRecord): AdUnit => ({
  placement_id: placement.placement_id,
  placement_key: placement.placement_key,
  gam_ad_unit_path: placement.gam_ad_unit_path,
  format: placement.format,
  enabled: placement.enabled,
  updated_at: placement.updated_at,
});

const websiteSummaryFromPublisher = (
  publisher: PublisherRecord,
  activeConfigVersion: number,
  adUnitCount: number,
): WebsiteSummary => ({
  website_id: publisher.site_id,
  domain: publisher.domain,
  environment: 'pilot',
  gam_network_code: publisher.gam_network_code,
  enabled: publisher.enabled,
  active_config_version: activeConfigVersion,
  ad_unit_count: adUnitCount,
  updated_at: publisher.updated_at,
});

export class PilotD1WebsiteRegistryRepository implements WebsiteRegistryRepository {
  constructor(private readonly d1: D1Client) {}

  async listWebsites(): Promise<WebsiteSummary[]> {
    const rows = await this.d1.query<PublisherRow>(`
      SELECT p.*, COALESCE(MAX(v.version), 0) AS active_config_version,
             COUNT(DISTINCT pl.placement_id) AS ad_unit_count
      FROM publishers p
      LEFT JOIN publisher_config_versions v ON v.site_id = p.site_id AND v.active = 1
      LEFT JOIN placements pl ON pl.site_id = p.site_id
      GROUP BY p.site_id
      ORDER BY p.domain ASC
    `);

    return rows.results.map((row) =>
      websiteSummaryFromPublisher(
        publisherFromRow(row),
        Number(row.active_config_version ?? 0),
        Number(row.ad_unit_count ?? 0),
      ),
    );
  }

  async getWebsite(websiteId: string): Promise<WebsiteDetail | null> {
    const publisher = await this.getPublisherById(websiteId);
    return publisher ? this.detailForPublisher(publisher) : null;
  }

  async getWebsiteByDomain(domain: string): Promise<WebsiteDetail | null> {
    const publisher = await this.getPublisherByDomain(domain);
    return publisher ? this.detailForPublisher(publisher) : null;
  }

  async createWebsite(
    input: WebsiteCreateInput,
    operator: OperatorIdentity,
  ): Promise<OperatorMutationResult<WebsiteDetail>> {
    const existing = await this.getPublisherByDomain(input.domain);
    if (existing) throw new OperatorConflictError('Website domain already exists.');

    const now = new Date().toISOString();
    const siteId = generateWebsiteId();
    await this.d1.query(
      `
      INSERT INTO publishers (
        site_id, site_key, domain, display_name, enabled, gam_network_code,
        telemetry_json, downstream_modes_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        siteId,
        deriveSiteKey(input.domain),
        input.domain,
        deriveDisplayName(input.domain),
        input.enabled ? 1 : 0,
        input.gam_network_code,
        JSON.stringify({ enabled: true, heartbeat_interval_seconds: 30 }),
        JSON.stringify({
          google_analytics: 'DRY_RUN',
          google_ads: 'DRY_RUN',
          roi_engine: 'DRY_RUN',
        }),
        now,
        now,
      ],
    );

    const result = await this.createConfigVersion(siteId, operator);
    const value = await this.requireWebsite(siteId);
    return this.mutationResult(value, result.config.config_version, operator, now);
  }

  async updateWebsite(
    websiteId: string,
    input: WebsiteUpdateInput,
    operator: OperatorIdentity,
  ): Promise<OperatorMutationResult<WebsiteDetail>> {
    const publisher = await this.requirePublisher(websiteId);
    const duplicate = await this.getPublisherByDomain(input.domain);
    if (duplicate && duplicate.site_id !== publisher.site_id) {
      throw new OperatorConflictError('Website domain already exists.');
    }

    const now = new Date().toISOString();
    const displayName =
      input.domain === publisher.domain ? publisher.display_name : deriveDisplayName(input.domain);
    await this.d1.query(
      `
      UPDATE publishers
      SET site_key = ?, domain = ?, display_name = ?, enabled = ?, gam_network_code = ?, updated_at = ?
      WHERE site_id = ?
      `,
      [
        deriveSiteKey(input.domain),
        input.domain,
        displayName,
        input.enabled ? 1 : 0,
        input.gam_network_code,
        now,
        publisher.site_id,
      ],
    );

    const result = await this.createConfigVersion(publisher.site_id, operator);
    const value = await this.requireWebsite(publisher.site_id);
    return this.mutationResult(value, result.config.config_version, operator, now);
  }

  async setWebsiteEnabled(
    websiteId: string,
    enabled: boolean,
    operator: OperatorIdentity,
  ): Promise<OperatorMutationResult<WebsiteDetail>> {
    const publisher = await this.requirePublisher(websiteId);
    const now = new Date().toISOString();
    await this.d1.query('UPDATE publishers SET enabled = ?, updated_at = ? WHERE site_id = ?', [
      enabled ? 1 : 0,
      now,
      publisher.site_id,
    ]);
    const result = await this.createConfigVersion(publisher.site_id, operator);
    const value = await this.requireWebsite(publisher.site_id);
    return this.mutationResult(value, result.config.config_version, operator, now);
  }

  async listAdUnits(websiteId: string): Promise<AdUnit[]> {
    await this.requirePublisher(websiteId);
    const placements = await this.getPlacements(websiteId);
    return placements.map(adUnitFromPlacement);
  }

  async createAdUnit(
    websiteId: string,
    input: AdUnitInput,
    operator: OperatorIdentity,
  ): Promise<OperatorMutationResult<WebsiteDetail>> {
    const publisher = await this.requirePublisher(websiteId);
    const placementKey = validatePlacementKey(input.placement_key);
    const existing = await this.getPlacementByKey(publisher.site_id, placementKey);
    if (existing) throw new OperatorConflictError('Placement key already exists for this website.');

    const now = new Date().toISOString();
    const placementId = uuidv7();
    const format = inferPlacementFormat(placementKey);
    await this.d1.query(
      `
      INSERT INTO placements (
        placement_id, site_id, placement_key, format, dom_id, gam_ad_unit_path,
        mobile_sizes_json, desktop_sizes_json, min_viewport_width, request_mode,
        trigger_json, pricing_json, enabled, created_at, updated_at
      ) VALUES (?, ?, ?, ?, NULL, ?, '[]', '[]', 0, ?, ?, ?, ?, ?, ?)
      `,
      [
        placementId,
        publisher.site_id,
        placementKey,
        format,
        validateGamAdUnitPath(input.gam_ad_unit_path, publisher.gam_network_code),
        'publisher_triggered',
        format === 'rewarded' ? JSON.stringify({ reward_context: 'publisher_reward' }) : '{}',
        defaultPricingJson(),
        input.enabled ? 1 : 0,
        now,
        now,
      ],
    );

    const result = await this.createConfigVersion(publisher.site_id, operator);
    const value = await this.requireWebsite(publisher.site_id);
    return this.mutationResult(value, result.config.config_version, operator, now);
  }

  async updateAdUnit(
    websiteId: string,
    placementId: string,
    input: AdUnitInput,
    operator: OperatorIdentity,
  ): Promise<OperatorMutationResult<WebsiteDetail>> {
    const publisher = await this.requirePublisher(websiteId);
    const placement = await this.requirePlacement(publisher.site_id, placementId);
    const placementKey = validatePlacementKey(input.placement_key);
    const duplicate = await this.getPlacementByKey(publisher.site_id, placementKey);
    if (duplicate && duplicate.placement_id !== placement.placement_id) {
      throw new OperatorConflictError('Placement key already exists for this website.');
    }

    const now = new Date().toISOString();
    await this.d1.query(
      `
      UPDATE placements
      SET placement_key = ?, gam_ad_unit_path = ?, enabled = ?, updated_at = ?
      WHERE site_id = ? AND placement_id = ?
      `,
      [
        placementKey,
        validateGamAdUnitPath(input.gam_ad_unit_path, publisher.gam_network_code),
        input.enabled ? 1 : 0,
        now,
        publisher.site_id,
        placement.placement_id,
      ],
    );

    const result = await this.createConfigVersion(publisher.site_id, operator);
    const value = await this.requireWebsite(publisher.site_id);
    return this.mutationResult(value, result.config.config_version, operator, now);
  }

  async setAdUnitEnabled(
    websiteId: string,
    placementId: string,
    enabled: boolean,
    operator: OperatorIdentity,
  ): Promise<OperatorMutationResult<WebsiteDetail>> {
    const publisher = await this.requirePublisher(websiteId);
    const placement = await this.requirePlacement(publisher.site_id, placementId);
    const now = new Date().toISOString();
    await this.d1.query(
      'UPDATE placements SET enabled = ?, updated_at = ? WHERE site_id = ? AND placement_id = ?',
      [enabled ? 1 : 0, now, publisher.site_id, placement.placement_id],
    );
    const result = await this.createConfigVersion(publisher.site_id, operator);
    const value = await this.requireWebsite(publisher.site_id);
    return this.mutationResult(value, result.config.config_version, operator, now);
  }

  async deleteAdUnit(
    websiteId: string,
    placementId: string,
    operator: OperatorIdentity,
  ): Promise<OperatorMutationResult<WebsiteDetail>> {
    const publisher = await this.requirePublisher(websiteId);
    const placement = await this.requirePlacement(publisher.site_id, placementId);
    const now = new Date().toISOString();
    await this.d1.query('DELETE FROM placements WHERE site_id = ? AND placement_id = ?', [
      publisher.site_id,
      placement.placement_id,
    ]);
    const result = await this.createConfigVersion(publisher.site_id, operator);
    const value = await this.requireWebsite(publisher.site_id);
    return this.mutationResult(value, result.config.config_version, operator, now);
  }

  async updateServingConfiguration(
    websiteId: string,
    configuration: ServingConfiguration,
    operator: OperatorIdentity,
  ): Promise<OperatorMutationResult<WebsiteDetail>> {
    const publisher = await this.requirePublisher(websiteId);
    const now = new Date().toISOString();
    const result = await this.createConfigVersion(publisher.site_id, operator, {
      ...configuration,
      updated_by: operator.updated_by,
      updated_at: now,
    });
    const value = await this.requireWebsite(publisher.site_id);
    return this.mutationResult(value, result.config.config_version, operator, now);
  }

  private async getPublisherById(siteId: string): Promise<PublisherRecord | null> {
    const rows = await this.d1.query<PublisherRow>('SELECT * FROM publishers WHERE site_id = ?', [
      siteId,
    ]);
    return rows.results[0] ? publisherFromRow(rows.results[0]) : null;
  }

  private async getPublisherByDomain(domain: string): Promise<PublisherRecord | null> {
    const rows = await this.d1.query<PublisherRow>('SELECT * FROM publishers WHERE domain = ?', [
      domain,
    ]);
    return rows.results[0] ? publisherFromRow(rows.results[0]) : null;
  }

  private async requirePublisher(siteId: string): Promise<PublisherRecord> {
    const publisher = await this.getPublisherById(siteId);
    if (!publisher) throw new OperatorNotFoundError('Website not found.');
    return publisher;
  }

  private async requireWebsite(siteId: string): Promise<WebsiteDetail> {
    const website = await this.getWebsite(siteId);
    if (!website) throw new OperatorNotFoundError('Website not found.');
    return website;
  }

  private async getPlacements(siteId: string): Promise<PlacementRecord[]> {
    const rows = await this.d1.query<PlacementRow>(
      'SELECT * FROM placements WHERE site_id = ? ORDER BY placement_key ASC',
      [siteId],
    );
    return rows.results.map(placementFromRow);
  }

  private async getPlacementByKey(
    siteId: string,
    placementKey: string,
  ): Promise<PlacementRecord | null> {
    const rows = await this.d1.query<PlacementRow>(
      'SELECT * FROM placements WHERE site_id = ? AND placement_key = ?',
      [siteId, placementKey],
    );
    return rows.results[0] ? placementFromRow(rows.results[0]) : null;
  }

  private async requirePlacement(siteId: string, placementId: string): Promise<PlacementRecord> {
    const rows = await this.d1.query<PlacementRow>(
      'SELECT * FROM placements WHERE site_id = ? AND placement_id = ?',
      [siteId, placementId],
    );
    const placement = rows.results[0] ? placementFromRow(rows.results[0]) : null;
    if (!placement) throw new OperatorNotFoundError('Ad unit not found.');
    return placement;
  }

  private async getActiveConfig(siteId: string): Promise<ActiveConfigRecord | null> {
    const rows = await this.d1.query<ConfigVersionRow>(
      `
      SELECT config_version_id, version, config_json, created_at
      FROM publisher_config_versions
      WHERE site_id = ? AND active = 1
      ORDER BY version DESC
      LIMIT 1
      `,
      [siteId],
    );
    return activeConfigFromRow(rows.results[0]);
  }

  private async getNextVersion(siteId: string): Promise<number> {
    const rows = await this.d1.query<{ next_version: number }>(
      'SELECT COALESCE(MAX(version), 0) + 1 AS next_version FROM publisher_config_versions WHERE site_id = ?',
      [siteId],
    );
    return Number(rows.results[0]?.next_version ?? 1);
  }

  private async detailForPublisher(publisher: PublisherRecord): Promise<WebsiteDetail> {
    const [placements, activeConfig] = await Promise.all([
      this.getPlacements(publisher.site_id),
      this.getActiveConfig(publisher.site_id),
    ]);
    const summary = websiteSummaryFromPublisher(
      publisher,
      activeConfig?.version ?? 0,
      placements.length,
    );

    return {
      ...summary,
      site_key: publisher.site_key,
      display_name: publisher.display_name,
      created_at: publisher.created_at,
      configuration: servingFromActiveConfig(activeConfig),
      ad_units: placements.map(adUnitFromPlacement),
    };
  }

  private async createConfigVersion(
    siteId: WebsiteId,
    operator: OperatorIdentity,
    servingOverride?: ServingConfiguration,
  ): Promise<{ config: RuntimeConfig }> {
    const [publisher, placements, activeConfig, version] = await Promise.all([
      this.requirePublisher(siteId),
      this.getPlacements(siteId),
      this.getActiveConfig(siteId),
      this.getNextVersion(siteId),
    ]);
    const serving = servingOverride ?? servingFromActiveConfig(activeConfig);
    const { config, manifest_hash } = buildRuntimeConfig({
      publisher,
      placements,
      version,
      serving: {
        ...serving,
        updated_by: serving.updated_by ?? operator.updated_by,
        updated_at: serving.updated_at ?? new Date().toISOString(),
      },
    });

    await this.d1.query(
      `
      INSERT INTO publisher_config_versions (
        config_version_id, site_id, version, manifest_hash, config_json, active, created_at
      ) VALUES (?, ?, ?, ?, ?, 0, ?)
      `,
      [
        config.config_version_id,
        publisher.site_id,
        config.config_version,
        manifest_hash,
        JSON.stringify(config),
        config.generated_at,
      ],
    );
    await this.d1.query(
      'UPDATE publisher_config_versions SET active = 1 WHERE site_id = ? AND config_version_id = ?',
      [publisher.site_id, config.config_version_id],
    );
    await this.d1.query(
      'UPDATE publisher_config_versions SET active = 0 WHERE site_id = ? AND config_version_id <> ?',
      [publisher.site_id, config.config_version_id],
    );

    return { config };
  }

  private mutationResult<TValue>(
    value: TValue,
    configVersion: number,
    operator: OperatorIdentity,
    updatedAt: string,
  ): OperatorMutationResult<TValue> {
    return {
      ok: true,
      value,
      config_version: configVersion,
      updated_by: operator.updated_by,
      updated_at: updatedAt,
    };
  }
}
