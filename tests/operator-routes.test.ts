import { describe, expect, it } from 'vitest';
import { buildApp } from '../src/app/build-app.js';
import type { OperatorIdentity } from '../src/operator/auth.js';
import type { WebsiteRegistryRepository } from '../src/operator/website-registry/repository.js';
import type {
  AdUnit,
  AdUnitInput,
  OperatorMutationResult,
  ServingConfiguration,
  WebsiteCreateInput,
  WebsiteDetail,
  WebsiteSummary,
  WebsiteUpdateInput,
} from '../src/operator/website-registry/types.js';
import { OperatorConflictError } from '../src/operator/website-registry/types.js';
import { generateWebsiteId } from '../src/utilities/index.js';
import { buildTestConfig } from './test-helpers.js';

const operatorSecret = 'test-operator-secret';
const authorization = `Basic ${Buffer.from(`operator:${operatorSecret}`).toString('base64')}`;

class RouteRepositoryFake implements WebsiteRegistryRepository {
  private readonly websites = new Map<string, WebsiteDetail>();

  constructor() {
    const websiteId = generateWebsiteId();
    this.websites.set(websiteId, {
      website_id: websiteId,
      domain: 'jobsthe.world',
      environment: 'pilot',
      gam_network_code: '23360556473',
      enabled: true,
      active_config_version: 1,
      ad_unit_count: 1,
      updated_at: '2026-07-31T00:00:00.000Z',
      site_key: 'jobsthe.world',
      display_name: 'jobsthe.world',
      created_at: '2026-07-31T00:00:00.000Z',
      configuration: {
        mode: 'default',
        traffic_split: { control_percentage: 100, experiment_percentage: 0 },
      },
      ad_units: [
        {
          placement_id: generateWebsiteId(),
          placement_key: 'native',
          gam_ad_unit_path: '/23360556473/jobsthe.world_Native',
          format: 'native',
          enabled: true,
          updated_at: '2026-07-31T00:00:00.000Z',
        },
      ],
    });
  }

  async listWebsites(): Promise<WebsiteSummary[]> {
    return [...this.websites.values()].map((website) => this.summary(website));
  }

  async getWebsite(websiteId: string): Promise<WebsiteDetail | null> {
    return this.websites.get(websiteId) ?? null;
  }

  async getWebsiteByDomain(domain: string): Promise<WebsiteDetail | null> {
    return [...this.websites.values()].find((website) => website.domain === domain) ?? null;
  }

  async createWebsite(
    input: WebsiteCreateInput,
    operator: OperatorIdentity,
  ): Promise<OperatorMutationResult<WebsiteDetail>> {
    if (await this.getWebsiteByDomain(input.domain)) {
      throw new OperatorConflictError('Website domain already exists.');
    }

    const websiteId = generateWebsiteId();
    const website: WebsiteDetail = {
      website_id: websiteId,
      domain: input.domain,
      environment: 'pilot',
      gam_network_code: input.gam_network_code,
      enabled: input.enabled,
      active_config_version: 1,
      ad_unit_count: 0,
      updated_at: '2026-07-31T00:00:00.000Z',
      site_key: input.domain,
      display_name: input.domain,
      created_at: '2026-07-31T00:00:00.000Z',
      configuration: {
        mode: 'default',
        traffic_split: { control_percentage: 100, experiment_percentage: 0 },
      },
      ad_units: [],
    };
    this.websites.set(websiteId, website);

    return this.result(website, operator);
  }

  async updateWebsite(
    websiteId: string,
    input: WebsiteUpdateInput,
    operator: OperatorIdentity,
  ): Promise<OperatorMutationResult<WebsiteDetail>> {
    const website = this.requireWebsite(websiteId);
    website.domain = input.domain;
    website.site_key = input.domain;
    website.display_name = input.domain;
    website.gam_network_code = input.gam_network_code;
    website.enabled = input.enabled;
    website.active_config_version += 1;

    return this.result(website, operator);
  }

  async setWebsiteEnabled(
    websiteId: string,
    enabled: boolean,
    operator: OperatorIdentity,
  ): Promise<OperatorMutationResult<WebsiteDetail>> {
    const website = this.requireWebsite(websiteId);
    website.enabled = enabled;
    website.active_config_version += 1;

    return this.result(website, operator);
  }

  async listAdUnits(websiteId: string): Promise<AdUnit[]> {
    return this.requireWebsite(websiteId).ad_units;
  }

  async createAdUnit(
    websiteId: string,
    input: AdUnitInput,
    operator: OperatorIdentity,
  ): Promise<OperatorMutationResult<WebsiteDetail>> {
    const website = this.requireWebsite(websiteId);
    website.ad_units.push({
      placement_id: generateWebsiteId(),
      placement_key: input.placement_key,
      gam_ad_unit_path: input.gam_ad_unit_path,
      format: 'native',
      enabled: input.enabled,
      updated_at: '2026-07-31T00:00:00.000Z',
    });
    website.ad_unit_count = website.ad_units.length;
    website.active_config_version += 1;

    return this.result(website, operator);
  }

  async updateAdUnit(
    websiteId: string,
    placementId: string,
    input: AdUnitInput,
    operator: OperatorIdentity,
  ): Promise<OperatorMutationResult<WebsiteDetail>> {
    const website = this.requireWebsite(websiteId);
    const adUnit = website.ad_units.find((candidate) => candidate.placement_id === placementId);
    if (!adUnit) throw new Error('Ad unit not found.');
    adUnit.placement_key = input.placement_key;
    adUnit.gam_ad_unit_path = input.gam_ad_unit_path;
    adUnit.enabled = input.enabled;
    website.active_config_version += 1;

    return this.result(website, operator);
  }

  async setAdUnitEnabled(
    websiteId: string,
    placementId: string,
    enabled: boolean,
    operator: OperatorIdentity,
  ): Promise<OperatorMutationResult<WebsiteDetail>> {
    const website = this.requireWebsite(websiteId);
    const adUnit = website.ad_units.find((candidate) => candidate.placement_id === placementId);
    if (!adUnit) throw new Error('Ad unit not found.');
    adUnit.enabled = enabled;
    website.active_config_version += 1;

    return this.result(website, operator);
  }

  async deleteAdUnit(
    websiteId: string,
    placementId: string,
    operator: OperatorIdentity,
  ): Promise<OperatorMutationResult<WebsiteDetail>> {
    const website = this.requireWebsite(websiteId);
    website.ad_units = website.ad_units.filter((adUnit) => adUnit.placement_id !== placementId);
    website.ad_unit_count = website.ad_units.length;
    website.active_config_version += 1;

    return this.result(website, operator);
  }

  async updateServingConfiguration(
    websiteId: string,
    configuration: ServingConfiguration,
    operator: OperatorIdentity,
  ): Promise<OperatorMutationResult<WebsiteDetail>> {
    const website = this.requireWebsite(websiteId);
    website.configuration = configuration;
    website.active_config_version += 1;

    return this.result(website, operator);
  }

  firstWebsite(): WebsiteDetail {
    const website = [...this.websites.values()][0];
    if (!website) throw new Error('Expected seeded website.');

    return website;
  }

  private requireWebsite(websiteId: string): WebsiteDetail {
    const website = this.websites.get(websiteId);
    if (!website) throw new Error('Website not found.');

    return website;
  }

  private summary(website: WebsiteDetail): WebsiteSummary {
    return {
      website_id: website.website_id,
      domain: website.domain,
      environment: website.environment,
      gam_network_code: website.gam_network_code,
      enabled: website.enabled,
      active_config_version: website.active_config_version,
      ad_unit_count: website.ad_units.length,
      updated_at: website.updated_at,
    };
  }

  private result(
    website: WebsiteDetail,
    operator: OperatorIdentity,
  ): OperatorMutationResult<WebsiteDetail> {
    return {
      ok: true,
      value: website,
      config_version: website.active_config_version,
      updated_by: operator.updated_by,
      updated_at: '2026-07-31T00:00:00.000Z',
    };
  }
}

const buildOperatorApp = (repository = new RouteRepositoryFake()) =>
  buildApp({
    config: buildTestConfig({ OPERATOR_SECRET: operatorSecret }),
    logger: false,
    websiteRegistryRepository: repository,
  });

describe('operator website registry routes', () => {
  it('fails closed without operator authentication', async () => {
    const app = buildOperatorApp();
    const response = await app.inject({ method: 'GET', url: '/api/operator/websites' });
    const body = response.json();

    expect(response.statusCode).toBe(401);
    expect(body.error.code).toBe('OPERATOR_AUTH_REQUIRED');
    expect(JSON.stringify(body)).not.toContain(operatorSecret);

    await app.close();
  });

  it('renders the approved Website > General, Ad Units, Configuration hierarchy', async () => {
    const repository = new RouteRepositoryFake();
    const app = buildOperatorApp(repository);
    const website = repository.firstWebsite();
    const response = await app.inject({
      method: 'GET',
      url: `/operator/websites/${website.website_id}`,
      headers: { authorization },
    });
    const body = response.body;

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('text/html');
    expect(body).toContain('Website &gt; General');
    expect(body).toContain('Website &gt; Ad Units');
    expect(body).toContain('Website &gt; Configuration');
    expect(body).toContain('Coming in a future story.');
    expect(body).toContain('Pricing');
    expect(body).toContain('Retry');
    expect(body).not.toContain('Site Key');
    expect(body).not.toContain('DOM ID');
    expect(body).not.toContain(operatorSecret);

    await app.close();
  });

  it('normalizes website creation through the authenticated operator API', async () => {
    const repository = new RouteRepositoryFake();
    const app = buildOperatorApp(repository);
    const response = await app.inject({
      method: 'POST',
      url: '/api/operator/websites',
      headers: { authorization },
      payload: {
        domain: 'https://www.Example-Publisher.com/news',
        environment: 'pilot',
        gam_network_code: '123456',
        enabled: true,
      },
    });
    const body = response.json() as OperatorMutationResult<WebsiteDetail>;

    expect(response.statusCode).toBe(201);
    expect(body.ok).toBe(true);
    expect(body.value.domain).toBe('example-publisher.com');
    expect(body.value.site_key).toBe('example-publisher.com');
    expect(body.value.display_name).toBe('example-publisher.com');

    await app.close();
  });

  it('lists logical ad units through the authenticated operator API', async () => {
    const repository = new RouteRepositoryFake();
    const app = buildOperatorApp(repository);
    const website = repository.firstWebsite();
    const response = await app.inject({
      method: 'GET',
      url: `/api/operator/websites/${website.website_id}/ad-units`,
      headers: { authorization },
    });
    const body = response.json() as { ok: boolean; ad_units: AdUnit[] };

    expect(response.statusCode).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.ad_units).toHaveLength(1);
    expect(body.ad_units[0]?.placement_key).toBe('native');
    expect(body.ad_units[0]?.gam_ad_unit_path).toBe('/23360556473/jobsthe.world_Native');

    await app.close();
  });

  it('blocks production writes through the authenticated operator API', async () => {
    const app = buildOperatorApp();
    const response = await app.inject({
      method: 'POST',
      url: '/api/operator/websites',
      headers: { authorization },
      payload: {
        domain: 'future.example',
        environment: 'production',
        gam_network_code: '123456',
        enabled: true,
      },
    });
    const body = response.json();

    expect(response.statusCode).toBe(409);
    expect(body.error.code).toBe('OPERATOR_PRODUCTION_BLOCKED');

    await app.close();
  });

  it('updates traffic split with a new audit-friendly operator result', async () => {
    const repository = new RouteRepositoryFake();
    const app = buildOperatorApp(repository);
    const website = repository.firstWebsite();
    const response = await app.inject({
      method: 'POST',
      url: `/api/operator/websites/${website.website_id}/configuration`,
      headers: {
        authorization,
        'x-thebes-operator-id': 'qa-operator',
      },
      payload: {
        environment: 'pilot',
        mode: 'experiment',
        control_percentage: 80,
        experiment_percentage: 20,
      },
    });
    const body = response.json() as OperatorMutationResult<WebsiteDetail>;

    expect(response.statusCode).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.updated_by).toBe('operator');
    expect(body.config_version).toBe(2);
    expect(body.value.configuration).toEqual({
      mode: 'experiment',
      traffic_split: { control_percentage: 80, experiment_percentage: 20 },
    });

    await app.close();
  });
});
