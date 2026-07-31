import { describe, expect, it } from 'vitest';
import type { WebsiteId } from '../src/contracts/index.js';
import { generateWebsiteId } from '../src/utilities/index.js';
import type { D1Client, D1QueryResult, D1Statement } from '../src/operator/d1-client.js';
import type { OperatorIdentity } from '../src/operator/auth.js';
import {
  DEFAULT_SERVING_CONFIGURATION,
  normalizeDomain,
  normalizeServingConfiguration,
  normalizeWebsiteInput,
  validateGamAdUnitPath,
} from '../src/operator/website-registry/domain.js';
import { PilotD1WebsiteRegistryRepository } from '../src/operator/website-registry/d1-repository.js';
import {
  buildRuntimeConfig,
  type PlacementRecord,
  type PublisherRecord,
} from '../src/operator/website-registry/config-generation.js';
import { WebsiteRegistryService } from '../src/operator/website-registry/service.js';
import {
  OperatorConflictError,
  OperatorDependencyError,
  OperatorSafetyError,
} from '../src/operator/website-registry/types.js';

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
}

interface PlacementRow extends Record<string, unknown> {
  placement_id: string;
  site_id: string;
  placement_key: string;
  format: string;
  gam_ad_unit_path: string;
  mobile_sizes_json: string;
  desktop_sizes_json: string;
  min_viewport_width: number;
  request_mode: 'publisher_triggered';
  trigger_json: string;
  pricing_json: string;
  enabled: number;
  created_at: string;
  updated_at: string;
}

interface ConfigVersionRow extends Record<string, unknown> {
  config_version_id: string;
  site_id: string;
  version: number;
  manifest_hash: string;
  config_json: string;
  active: number;
  created_at: string;
}

class ST004PilotD1Fake implements D1Client {
  failDuringActivation = false;
  forceBadConfirmation = false;
  readonly batchSqlOrder: string[] = [];
  readonly siteId = generateWebsiteId();
  readonly publishers: PublisherRow[] = [
    {
      site_id: this.siteId,
      site_key: 'jobsthe.world',
      domain: 'jobsthe.world',
      display_name: 'jobsthe.world',
      enabled: 1,
      gam_network_code: '23360556473',
      telemetry_json: JSON.stringify({ enabled: true, heartbeat_interval_seconds: 30 }),
      downstream_modes_json: JSON.stringify({
        google_analytics: 'DRY_RUN',
        google_ads: 'DRY_RUN',
        roi_engine: 'DRY_RUN',
      }),
      created_at: '2026-07-31T00:00:00.000Z',
      updated_at: '2026-07-31T00:00:00.000Z',
    },
  ];
  readonly placements: PlacementRow[] = [
    {
      placement_id: generateWebsiteId(),
      site_id: this.siteId,
      placement_key: 'native',
      format: 'native',
      gam_ad_unit_path: '/23360556473/jobsthe.world_Native',
      mobile_sizes_json: '[]',
      desktop_sizes_json: '[]',
      min_viewport_width: 0,
      request_mode: 'publisher_triggered',
      trigger_json: '{}',
      pricing_json: JSON.stringify({ ladder: [300], fallback: { enabled: false } }),
      enabled: 1,
      created_at: '2026-07-31T00:00:00.000Z',
      updated_at: '2026-07-31T00:00:00.000Z',
    },
  ];
  readonly versions: ConfigVersionRow[] = [
    {
      config_version_id: generateWebsiteId(),
      site_id: this.siteId,
      version: 1,
      manifest_hash: 'initial',
      config_json: JSON.stringify({
        serving: DEFAULT_SERVING_CONFIGURATION,
        placements: [{ placement_key: 'native', targeting: {} }],
      }),
      active: 1,
      created_at: '2026-07-31T00:00:00.000Z',
    },
  ];

  async query<TRecord extends Record<string, unknown>>(
    sql: string,
    params: unknown[] = [],
  ): Promise<D1QueryResult<TRecord>> {
    const normalized = sql.replace(/\s+/gu, ' ').trim();

    if (normalized.startsWith('SELECT * FROM publishers WHERE domain = ?')) {
      return this.result(this.publishers.filter((publisher) => publisher.domain === params[0]));
    }

    if (normalized.startsWith('SELECT * FROM publishers WHERE site_id = ?')) {
      return this.result(this.publishers.filter((publisher) => publisher.site_id === params[0]));
    }

    if (normalized.startsWith('SELECT * FROM placements WHERE site_id = ? AND placement_id = ?')) {
      return this.result(
        this.placements.filter(
          (placement) => placement.site_id === params[0] && placement.placement_id === params[1],
        ),
      );
    }

    if (normalized.startsWith('SELECT * FROM placements WHERE site_id = ? AND placement_key = ?')) {
      return this.result(
        this.placements.filter(
          (placement) => placement.site_id === params[0] && placement.placement_key === params[1],
        ),
      );
    }

    if (
      normalized.startsWith('SELECT * FROM placements WHERE site_id = ? ORDER BY placement_key ASC')
    ) {
      return this.result(this.placements.filter((placement) => placement.site_id === params[0]));
    }

    if (normalized.startsWith('SELECT config_version_id, version, config_json, created_at')) {
      return this.result(
        this.versions
          .filter((version) => version.site_id === params[0] && version.active === 1)
          .sort((left, right) => right.version - left.version),
      );
    }

    if (normalized.startsWith('SELECT COALESCE(MAX(version), 0) + 1 AS next_version')) {
      const nextVersion =
        Math.max(
          0,
          ...this.versions
            .filter((version) => version.site_id === params[0])
            .map((version) => version.version),
        ) + 1;

      return this.result([{ next_version: nextVersion }]);
    }

    if (normalized.startsWith('INSERT INTO publisher_config_versions')) {
      const [configVersionId, siteId, version, manifestHash, configJson, createdAt] = params;
      this.versions.push({
        config_version_id: String(configVersionId),
        site_id: String(siteId),
        version: Number(version),
        manifest_hash: String(manifestHash),
        config_json: String(configJson),
        active: 0,
        created_at: String(createdAt),
      });

      return this.result([]);
    }

    if (normalized.startsWith('UPDATE publisher_config_versions SET active = 1')) {
      for (const version of this.versions) {
        if (version.site_id === params[0] && version.config_version_id === params[1]) {
          version.active = 1;
        }
      }

      return this.result([]);
    }

    if (normalized.startsWith('UPDATE publisher_config_versions SET active = 0')) {
      for (const version of this.versions) {
        if (version.site_id === params[0] && version.config_version_id !== params[1]) {
          version.active = 0;
        }
      }

      return this.result([]);
    }

    throw new Error(`Unexpected D1 query: ${normalized}`);
  }

  async batch(statements: D1Statement[]): Promise<Array<D1QueryResult<Record<string, unknown>>>> {
    const versionSnapshot = this.versions.map((version) => ({ ...version }));
    const results: Array<D1QueryResult<Record<string, unknown>>> = [];

    try {
      for (const statement of statements) {
        const normalized = statement.sql.replace(/\s+/gu, ' ').trim();
        this.batchSqlOrder.push(normalized);

        if (
          this.failDuringActivation &&
          normalized.startsWith('UPDATE publisher_config_versions SET active = CASE')
        ) {
          throw new Error('Simulated activation failure');
        }

        results.push(this.executeBatchStatement(normalized, statement.params ?? []));
      }
    } catch (error) {
      this.versions.splice(0, this.versions.length, ...versionSnapshot);
      throw error;
    }

    return results;
  }

  private executeBatchStatement(
    normalized: string,
    params: unknown[],
  ): D1QueryResult<Record<string, unknown>> {
    if (normalized.startsWith('INSERT INTO publisher_config_versions')) {
      const [configVersionId, siteId, version, manifestHash, configJson, createdAt] = params;
      this.versions.push({
        config_version_id: String(configVersionId),
        site_id: String(siteId),
        version: Number(version),
        manifest_hash: String(manifestHash),
        config_json: String(configJson),
        active: 0,
        created_at: String(createdAt),
      });

      return this.result([]);
    }

    if (normalized.startsWith('UPDATE publisher_config_versions SET active = CASE')) {
      const [configVersionId, siteId] = params;
      for (const version of this.versions) {
        if (version.site_id === siteId) {
          version.active = version.config_version_id === configVersionId ? 1 : 0;
        }
      }

      return this.result([]);
    }

    if (normalized.startsWith('SELECT COUNT(*) AS active_count')) {
      const activeVersions = this.versions.filter(
        (version) => version.site_id === params[0] && version.active === 1,
      );
      const activeConfigVersionId = activeVersions[0]?.config_version_id ?? null;

      return this.result([
        {
          active_count: this.forceBadConfirmation ? 2 : activeVersions.length,
          active_config_version_id: activeConfigVersionId,
        },
      ]);
    }

    throw new Error(`Unexpected D1 batch statement: ${normalized}`);
  }

  private result<TRecord extends Record<string, unknown>>(
    results: Record<string, unknown>[],
  ): D1QueryResult<TRecord> {
    return { results: results as TRecord[] };
  }
}

const publisherRecord = (): PublisherRecord => ({
  site_id: generateWebsiteId(),
  site_key: 'jobsthe.world',
  domain: 'jobsthe.world',
  display_name: 'jobsthe.world',
  enabled: true,
  gam_network_code: '23360556473',
  telemetry_json: '{}',
  downstream_modes_json: '{}',
  created_at: '2026-07-31T00:00:00.000Z',
  updated_at: '2026-07-31T00:00:00.000Z',
});

const placementRecord = (siteId: WebsiteId): PlacementRecord => ({
  placement_id: generateWebsiteId(),
  site_id: siteId,
  placement_key: 'native',
  format: 'native',
  gam_ad_unit_path: '/23360556473/jobsthe.world_Native',
  mobile_sizes_json: '[[320,50]]',
  desktop_sizes_json: '[[817,90]]',
  min_viewport_width: 768,
  request_mode: 'publisher_triggered',
  trigger_json: '{}',
  pricing_json: '{}',
  enabled: true,
  created_at: '2026-07-31T00:00:00.000Z',
  updated_at: '2026-07-31T00:00:00.000Z',
});

describe('website registry validation', () => {
  it('normalizes domains and internally derives website fields', () => {
    const input = normalizeWebsiteInput({
      domain: 'https://www.Jobsthe.World/jobs?q=1',
      environment: 'pilot',
      gam_network_code: ' 23360556473 ',
      enabled: true,
    });

    expect(input.domain).toBe('jobsthe.world');
    expect(input.gam_network_code).toBe('23360556473');
    expect(normalizeDomain('www.jobsthe.world/')).toBe('jobsthe.world');
  });

  it('blocks production writes and invalid GAM ad unit paths', () => {
    expect(() =>
      normalizeWebsiteInput({
        domain: 'jobsthe.world',
        environment: 'production',
        gam_network_code: '23360556473',
        enabled: true,
      }),
    ).toThrow(OperatorSafetyError);

    expect(() => validateGamAdUnitPath('/999/jobsthe.world_Native', '23360556473')).toThrow(
      '/23360556473/',
    );
  });

  it('validates serving mode and traffic split totals', () => {
    expect(
      normalizeServingConfiguration({
        environment: 'pilot',
        mode: 'experiment',
        control_percentage: 90,
        experiment_percentage: 10,
      }),
    ).toEqual({
      mode: 'experiment',
      traffic_split: { control_percentage: 90, experiment_percentage: 10 },
    });

    expect(() =>
      normalizeServingConfiguration({
        environment: 'pilot',
        mode: 'experiment',
        control_percentage: 90,
        experiment_percentage: 20,
      }),
    ).toThrow('must total 100');
  });
});

describe('ST-004 runtime compatibility', () => {
  it('builds active runtime config without Thebes custom targeting', () => {
    const publisher = publisherRecord();
    const { config } = buildRuntimeConfig({
      publisher,
      placements: [placementRecord(publisher.site_id)],
      version: 2,
      serving: DEFAULT_SERVING_CONFIGURATION,
    });
    const serialized = JSON.stringify(config);

    expect(config.placements).toHaveLength(1);
    expect(config.placements[0]?.targeting).toEqual({});
    expect(config.placements[0]?.gam_ad_unit_path).toBe('/23360556473/jobsthe.world_Native');
    expect(config.serving.mode).toBe('default');
    expect(serialized).not.toContain('thebes_site_key');
    expect(serialized).not.toContain('thebes_placement_key');
    expect(serialized).not.toContain('thebes_sdk');
  });
});

describe('pilot D1 integration semantics', () => {
  const operator: OperatorIdentity = { updated_by: 'st019-test' };

  it('preserves jobsthe.world while creating a new active config version', async () => {
    const d1 = new ST004PilotD1Fake();
    const service = new WebsiteRegistryService(new PilotD1WebsiteRegistryRepository(d1));
    const before = await service.getWebsiteByDomain('jobsthe.world');

    expect(before?.domain).toBe('jobsthe.world');
    expect(before?.ad_units[0]?.gam_ad_unit_path).toBe('/23360556473/jobsthe.world_Native');

    const result = await service.updateServingConfiguration(
      before?.website_id ?? '',
      {
        environment: 'pilot',
        mode: 'experiment',
        control_percentage: 90,
        experiment_percentage: 10,
      },
      operator,
    );
    const after = await service.getWebsiteByDomain('https://www.jobsthe.world/path');
    const activeVersions = d1.versions.filter((version) => version.active === 1);
    const activeConfig = JSON.parse(activeVersions[0]?.config_json ?? '{}') as {
      config_version_id?: string;
      serving?: unknown;
      placements?: Array<{ targeting?: Record<string, string> }>;
    };

    expect(result.config_version).toBe(2);
    expect(after?.website_id).toBe(before?.website_id);
    expect(after?.domain).toBe('jobsthe.world');
    expect(after?.ad_units[0]?.gam_ad_unit_path).toBe('/23360556473/jobsthe.world_Native');
    expect(d1.versions).toHaveLength(2);
    expect(activeVersions).toHaveLength(1);
    expect(activeConfig.config_version_id).toBe(activeVersions[0]?.config_version_id);
    expect(d1.batchSqlOrder[0]).toMatch(/^INSERT INTO publisher_config_versions/u);
    expect(d1.batchSqlOrder[1]).toMatch(/^UPDATE publisher_config_versions SET active = CASE/u);
    expect(d1.batchSqlOrder[2]).toMatch(/^SELECT COUNT\(\*\) AS active_count/u);
    expect(activeConfig.serving).toMatchObject({
      mode: 'experiment',
      traffic_split: { control_percentage: 90, experiment_percentage: 10 },
      updated_by: 'st019-test',
    });
    expect(activeConfig.placements?.[0]?.targeting).toEqual({});
  });

  it('rolls back the new version when activation fails in the D1 batch', async () => {
    const d1 = new ST004PilotD1Fake();
    d1.failDuringActivation = true;
    const service = new WebsiteRegistryService(new PilotD1WebsiteRegistryRepository(d1));
    const beforeVersions = d1.versions.map((version) => ({ ...version }));

    await expect(
      service.updateServingConfiguration(
        d1.siteId,
        {
          environment: 'pilot',
          mode: 'experiment',
          control_percentage: 80,
          experiment_percentage: 20,
        },
        operator,
      ),
    ).rejects.toThrow('Simulated activation failure');

    expect(d1.versions).toEqual(beforeVersions);
    expect(d1.versions.filter((version) => version.active === 1)).toHaveLength(1);
  });

  it('returns an error when active-version confirmation is not exactly one', async () => {
    const d1 = new ST004PilotD1Fake();
    d1.forceBadConfirmation = true;
    const service = new WebsiteRegistryService(new PilotD1WebsiteRegistryRepository(d1));

    await expect(
      service.updateServingConfiguration(
        d1.siteId,
        {
          environment: 'pilot',
          mode: 'experiment',
          control_percentage: 70,
          experiment_percentage: 30,
        },
        operator,
      ),
    ).rejects.toThrow(OperatorDependencyError);
  });

  it('rejects duplicate domains and duplicate placement keys', async () => {
    const d1 = new ST004PilotD1Fake();
    const repository = new PilotD1WebsiteRegistryRepository(d1);

    await expect(
      repository.createWebsite(
        {
          domain: 'jobsthe.world',
          environment: 'pilot',
          gam_network_code: '23360556473',
          enabled: true,
        },
        operator,
      ),
    ).rejects.toThrow(OperatorConflictError);

    await expect(
      repository.createAdUnit(
        d1.siteId,
        {
          placement_key: 'native',
          gam_ad_unit_path: '/23360556473/jobsthe.world_Native',
          enabled: true,
        },
        operator,
      ),
    ).rejects.toThrow(OperatorConflictError);
  });
});
