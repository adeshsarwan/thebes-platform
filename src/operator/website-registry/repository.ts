import type { OperatorIdentity } from '../auth.js';
import type {
  AdUnit,
  AdUnitInput,
  OperatorMutationResult,
  ServingConfiguration,
  WebsiteCreateInput,
  WebsiteDetail,
  WebsiteSummary,
  WebsiteUpdateInput,
} from './types.js';
import { OperatorDependencyError } from './types.js';

export interface WebsiteRegistryRepository {
  listWebsites(): Promise<WebsiteSummary[]>;
  getWebsite(websiteId: string): Promise<WebsiteDetail | null>;
  getWebsiteByDomain(domain: string): Promise<WebsiteDetail | null>;
  createWebsite(
    input: WebsiteCreateInput,
    operator: OperatorIdentity,
  ): Promise<OperatorMutationResult<WebsiteDetail>>;
  updateWebsite(
    websiteId: string,
    input: WebsiteUpdateInput,
    operator: OperatorIdentity,
  ): Promise<OperatorMutationResult<WebsiteDetail>>;
  setWebsiteEnabled(
    websiteId: string,
    enabled: boolean,
    operator: OperatorIdentity,
  ): Promise<OperatorMutationResult<WebsiteDetail>>;
  listAdUnits(websiteId: string): Promise<AdUnit[]>;
  createAdUnit(
    websiteId: string,
    input: AdUnitInput,
    operator: OperatorIdentity,
  ): Promise<OperatorMutationResult<WebsiteDetail>>;
  updateAdUnit(
    websiteId: string,
    placementId: string,
    input: AdUnitInput,
    operator: OperatorIdentity,
  ): Promise<OperatorMutationResult<WebsiteDetail>>;
  setAdUnitEnabled(
    websiteId: string,
    placementId: string,
    enabled: boolean,
    operator: OperatorIdentity,
  ): Promise<OperatorMutationResult<WebsiteDetail>>;
  deleteAdUnit(
    websiteId: string,
    placementId: string,
    operator: OperatorIdentity,
  ): Promise<OperatorMutationResult<WebsiteDetail>>;
  updateServingConfiguration(
    websiteId: string,
    configuration: ServingConfiguration,
    operator: OperatorIdentity,
  ): Promise<OperatorMutationResult<WebsiteDetail>>;
}

export class UnconfiguredWebsiteRegistryRepository implements WebsiteRegistryRepository {
  private unavailable(): never {
    throw new OperatorDependencyError(
      'Pilot D1 adapter is not configured for the operator console.',
    );
  }

  listWebsites(): Promise<WebsiteSummary[]> {
    this.unavailable();
  }

  getWebsite(): Promise<WebsiteDetail | null> {
    this.unavailable();
  }

  getWebsiteByDomain(): Promise<WebsiteDetail | null> {
    this.unavailable();
  }

  createWebsite(): Promise<OperatorMutationResult<WebsiteDetail>> {
    this.unavailable();
  }

  updateWebsite(): Promise<OperatorMutationResult<WebsiteDetail>> {
    this.unavailable();
  }

  setWebsiteEnabled(): Promise<OperatorMutationResult<WebsiteDetail>> {
    this.unavailable();
  }

  listAdUnits(): Promise<AdUnit[]> {
    this.unavailable();
  }

  createAdUnit(): Promise<OperatorMutationResult<WebsiteDetail>> {
    this.unavailable();
  }

  updateAdUnit(): Promise<OperatorMutationResult<WebsiteDetail>> {
    this.unavailable();
  }

  setAdUnitEnabled(): Promise<OperatorMutationResult<WebsiteDetail>> {
    this.unavailable();
  }

  deleteAdUnit(): Promise<OperatorMutationResult<WebsiteDetail>> {
    this.unavailable();
  }

  updateServingConfiguration(): Promise<OperatorMutationResult<WebsiteDetail>> {
    this.unavailable();
  }
}
