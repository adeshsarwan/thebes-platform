import type { OperatorIdentity } from '../auth.js';
import {
  normalizeDomain,
  normalizeServingConfiguration,
  normalizeWebsiteInput,
  validateGamAdUnitPath,
  validatePlacementKey,
} from './domain.js';
import type { WebsiteRegistryRepository } from './repository.js';
import type {
  AdUnit,
  AdUnitInput,
  OperatorMutationResult,
  ServingConfigurationInput,
  WebsiteCreateInput,
  WebsiteDetail,
  WebsiteSummary,
  WebsiteUpdateInput,
} from './types.js';
import { OperatorNotFoundError } from './types.js';

export class WebsiteRegistryService {
  constructor(private readonly repository: WebsiteRegistryRepository) {}

  listWebsites(): Promise<WebsiteSummary[]> {
    return this.repository.listWebsites();
  }

  async getWebsite(websiteId: string): Promise<WebsiteDetail> {
    const website = await this.repository.getWebsite(websiteId);
    if (!website) throw new OperatorNotFoundError('Website not found.');

    return website;
  }

  async getWebsiteByDomain(domain: string): Promise<WebsiteDetail | null> {
    return this.repository.getWebsiteByDomain(normalizeDomain(domain));
  }

  createWebsite(
    input: WebsiteCreateInput,
    operator: OperatorIdentity,
  ): Promise<OperatorMutationResult<WebsiteDetail>> {
    return this.repository.createWebsite(normalizeWebsiteInput(input), operator);
  }

  updateWebsite(
    websiteId: string,
    input: WebsiteUpdateInput,
    operator: OperatorIdentity,
  ): Promise<OperatorMutationResult<WebsiteDetail>> {
    return this.repository.updateWebsite(websiteId, normalizeWebsiteInput(input), operator);
  }

  setWebsiteEnabled(
    websiteId: string,
    enabled: boolean,
    operator: OperatorIdentity,
  ): Promise<OperatorMutationResult<WebsiteDetail>> {
    return this.repository.setWebsiteEnabled(websiteId, enabled, operator);
  }

  async createAdUnit(
    websiteId: string,
    input: AdUnitInput,
    operator: OperatorIdentity,
  ): Promise<OperatorMutationResult<WebsiteDetail>> {
    const website = await this.getWebsite(websiteId);

    return this.repository.createAdUnit(
      websiteId,
      this.normalizeAdUnitInput(input, website),
      operator,
    );
  }

  async listAdUnits(websiteId: string): Promise<AdUnit[]> {
    await this.getWebsite(websiteId);

    return this.repository.listAdUnits(websiteId);
  }

  async updateAdUnit(
    websiteId: string,
    placementId: string,
    input: AdUnitInput,
    operator: OperatorIdentity,
  ): Promise<OperatorMutationResult<WebsiteDetail>> {
    const website = await this.getWebsite(websiteId);

    return this.repository.updateAdUnit(
      websiteId,
      placementId,
      this.normalizeAdUnitInput(input, website),
      operator,
    );
  }

  deleteAdUnit(
    websiteId: string,
    placementId: string,
    operator: OperatorIdentity,
  ): Promise<OperatorMutationResult<WebsiteDetail>> {
    return this.repository.deleteAdUnit(websiteId, placementId, operator);
  }

  setAdUnitEnabled(
    websiteId: string,
    placementId: string,
    enabled: boolean,
    operator: OperatorIdentity,
  ): Promise<OperatorMutationResult<WebsiteDetail>> {
    return this.repository.setAdUnitEnabled(websiteId, placementId, enabled, operator);
  }

  updateServingConfiguration(
    websiteId: string,
    input: ServingConfigurationInput,
    operator: OperatorIdentity,
  ): Promise<OperatorMutationResult<WebsiteDetail>> {
    return this.repository.updateServingConfiguration(
      websiteId,
      normalizeServingConfiguration(input),
      operator,
    );
  }

  private normalizeAdUnitInput(input: AdUnitInput, website: WebsiteDetail): AdUnitInput {
    return {
      placement_key: validatePlacementKey(input.placement_key),
      gam_ad_unit_path: validateGamAdUnitPath(input.gam_ad_unit_path, website.gam_network_code),
      enabled: input.enabled,
    };
  }
}
