import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { AppConfig } from '../config/env.js';
import { REQUEST_ID_HEADER, getRequestId } from '../plugins/request-context.js';
import { requireOperator } from './auth.js';
import type { WebsiteRegistryService } from './website-registry/service.js';
import { renderWebsiteDetail, renderWebsiteList } from './website-registry/ui.js';
import type {
  AdUnitInput,
  ServingConfigurationInput,
  WebsiteCreateInput,
  WebsiteEnvironment,
  WebsiteUpdateInput,
} from './website-registry/types.js';

type FormBody = Record<string, unknown>;

const isFormBody = (value: unknown): value is FormBody =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const formBody = (request: FastifyRequest): FormBody =>
  isFormBody(request.body) ? request.body : {};

const stringValue = (body: FormBody, key: string): string => {
  const value = body[key];
  if (Array.isArray(value)) return value[0] === undefined ? '' : String(value[0]);

  return value === undefined || value === null ? '' : String(value);
};

const booleanValue = (body: FormBody, key: string): boolean =>
  ['1', 'true', 'on', 'yes'].includes(stringValue(body, key).toLowerCase());

const numberValue = (body: FormBody, key: string): number => Number(stringValue(body, key));

const websiteInputFromBody = (body: FormBody): WebsiteCreateInput | WebsiteUpdateInput => ({
  domain: stringValue(body, 'domain'),
  environment: (stringValue(body, 'environment') || 'pilot') as WebsiteEnvironment,
  gam_network_code: stringValue(body, 'gam_network_code'),
  enabled: booleanValue(body, 'enabled'),
});

const adUnitInputFromBody = (body: FormBody): AdUnitInput => ({
  placement_key: stringValue(body, 'placement_key'),
  gam_ad_unit_path: stringValue(body, 'gam_ad_unit_path'),
  enabled: booleanValue(body, 'enabled'),
});

const servingInputFromBody = (body: FormBody): ServingConfigurationInput => {
  const preset = stringValue(body, 'preset');
  const presetSplit =
    preset === '90-10'
      ? { control_percentage: 90, experiment_percentage: 10 }
      : preset === '80-20'
        ? { control_percentage: 80, experiment_percentage: 20 }
        : preset === '70-30'
          ? { control_percentage: 70, experiment_percentage: 30 }
          : preset === '60-40'
            ? { control_percentage: 60, experiment_percentage: 40 }
            : preset === '50-50'
              ? { control_percentage: 50, experiment_percentage: 50 }
              : {
                  control_percentage: numberValue(body, 'control_percentage'),
                  experiment_percentage: numberValue(body, 'experiment_percentage'),
                };

  return {
    environment: (stringValue(body, 'environment') || 'pilot') as WebsiteEnvironment,
    mode: stringValue(body, 'mode') as ServingConfigurationInput['mode'],
    ...presetSplit,
  };
};

const authenticate = (request: FastifyRequest, reply: FastifyReply, config: AppConfig) =>
  requireOperator(request, reply, config);

const redirectToWebsite = (reply: FastifyReply, websiteId: string, notice: string): void => {
  reply
    .status(303)
    .header(
      'location',
      `/operator/websites/${encodeURIComponent(websiteId)}?notice=${encodeURIComponent(notice)}`,
    )
    .send();
};

const readNotice = (request: FastifyRequest): string | undefined => {
  const query = request.query as { notice?: unknown };

  return typeof query.notice === 'string' ? query.notice : undefined;
};

const getParams = (request: FastifyRequest): { websiteId: string; placementId?: string } =>
  request.params as { websiteId: string; placementId?: string };

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : 'Request failed';

const getErrorStatusCode = (error: unknown): number => {
  const candidate =
    typeof error === 'object' &&
    error !== null &&
    'statusCode' in error &&
    typeof error.statusCode === 'number'
      ? error.statusCode
      : 500;

  return candidate >= 400 && candidate <= 599 ? candidate : 500;
};

export const registerOperatorRoutes = (
  app: FastifyInstance,
  config: AppConfig,
  service: WebsiteRegistryService,
): void => {
  app.addContentTypeParser(
    'application/x-www-form-urlencoded',
    { parseAs: 'string' },
    (_request, body, done) => {
      const parsed: FormBody = {};
      const rawBody = Buffer.isBuffer(body) ? body.toString('utf8') : body;
      for (const [key, value] of new URLSearchParams(rawBody)) parsed[key] = value;
      done(null, parsed);
    },
  );

  app.addHook('onSend', (request, reply, payload, done) => {
    if (request.url.startsWith('/operator') || request.url.startsWith('/api/operator')) {
      reply.header(REQUEST_ID_HEADER, getRequestId(request));
    }
    done(null, payload);
  });

  app.get('/operator', (_request, reply) => {
    reply.status(302).header('location', '/operator/websites').send();
  });

  app.get('/operator/websites', async (request, reply) => {
    if (!authenticate(request, reply, config)) return;

    try {
      const websites = await service.listWebsites();
      const notice = readNotice(request);
      reply.type('text/html').send(
        renderWebsiteList({
          websites,
          flash: notice ? { kind: 'notice', message: notice } : undefined,
        }),
      );
    } catch (error) {
      reply
        .status(getErrorStatusCode(error))
        .type('text/html')
        .send(
          renderWebsiteList({
            websites: [],
            flash: { kind: 'error', message: getErrorMessage(error) },
          }),
        );
    }
  });

  app.post('/operator/websites', async (request, reply) => {
    const operator = authenticate(request, reply, config);
    if (!operator) return;

    try {
      const result = await service.createWebsite(websiteInputFromBody(formBody(request)), operator);
      redirectToWebsite(
        reply,
        result.value.website_id,
        'Website saved and configuration version activated.',
      );
    } catch (error) {
      const websites = await service.listWebsites().catch(() => []);
      reply
        .status(getErrorStatusCode(error))
        .type('text/html')
        .send(
          renderWebsiteList({
            websites,
            flash: { kind: 'error', message: getErrorMessage(error) },
          }),
        );
    }
  });

  app.get('/operator/websites/:websiteId', async (request, reply) => {
    if (!authenticate(request, reply, config)) return;

    try {
      const website = await service.getWebsite(getParams(request).websiteId);
      const notice = readNotice(request);
      reply.type('text/html').send(
        renderWebsiteDetail({
          website,
          flash: notice ? { kind: 'notice', message: notice } : undefined,
        }),
      );
    } catch (error) {
      reply
        .status(getErrorStatusCode(error))
        .type('text/html')
        .send(
          renderWebsiteList({
            websites: await service.listWebsites().catch(() => []),
            flash: { kind: 'error', message: getErrorMessage(error) },
          }),
        );
    }
  });

  app.post('/operator/websites/:websiteId/general', async (request, reply) => {
    const operator = authenticate(request, reply, config);
    if (!operator) return;

    const { websiteId } = getParams(request);
    const result = await service.updateWebsite(
      websiteId,
      websiteInputFromBody(formBody(request)),
      operator,
    );
    redirectToWebsite(
      reply,
      result.value.website_id,
      'General settings saved and configuration version activated.',
    );
  });

  app.post('/operator/websites/:websiteId/ad-units', async (request, reply) => {
    const operator = authenticate(request, reply, config);
    if (!operator) return;

    const { websiteId } = getParams(request);
    const result = await service.createAdUnit(
      websiteId,
      adUnitInputFromBody(formBody(request)),
      operator,
    );
    redirectToWebsite(
      reply,
      result.value.website_id,
      'Ad unit saved and configuration version activated.',
    );
  });

  app.post('/operator/websites/:websiteId/ad-units/:placementId', async (request, reply) => {
    const operator = authenticate(request, reply, config);
    if (!operator) return;

    const { websiteId, placementId } = getParams(request);
    const result = await service.updateAdUnit(
      websiteId,
      placementId ?? '',
      adUnitInputFromBody(formBody(request)),
      operator,
    );
    redirectToWebsite(
      reply,
      result.value.website_id,
      'Ad unit saved and configuration version activated.',
    );
  });

  app.post('/operator/websites/:websiteId/ad-units/:placementId/delete', async (request, reply) => {
    const operator = authenticate(request, reply, config);
    if (!operator) return;

    const { websiteId, placementId } = getParams(request);
    const result = await service.deleteAdUnit(websiteId, placementId ?? '', operator);
    redirectToWebsite(
      reply,
      result.value.website_id,
      'Ad unit deleted and configuration version activated.',
    );
  });

  app.post('/operator/websites/:websiteId/configuration', async (request, reply) => {
    const operator = authenticate(request, reply, config);
    if (!operator) return;

    const { websiteId } = getParams(request);
    const result = await service.updateServingConfiguration(
      websiteId,
      servingInputFromBody(formBody(request)),
      operator,
    );
    redirectToWebsite(reply, result.value.website_id, 'Configuration saved and version activated.');
  });

  app.get('/api/operator/websites', async (request, reply) => {
    if (!authenticate(request, reply, config)) return;

    return { ok: true, websites: await service.listWebsites() };
  });

  app.get('/api/operator/websites/:websiteId', async (request, reply) => {
    if (!authenticate(request, reply, config)) return;

    return { ok: true, website: await service.getWebsite(getParams(request).websiteId) };
  });

  app.post('/api/operator/websites', async (request, reply) => {
    const operator = authenticate(request, reply, config);
    if (!operator) return;

    const result = await service.createWebsite(websiteInputFromBody(formBody(request)), operator);
    reply.status(201);

    return result;
  });

  app.post('/api/operator/websites/:websiteId/general', async (request, reply) => {
    const operator = authenticate(request, reply, config);
    if (!operator) return;

    const { websiteId } = getParams(request);

    return service.updateWebsite(websiteId, websiteInputFromBody(formBody(request)), operator);
  });

  app.post('/api/operator/websites/:websiteId/enable', async (request, reply) => {
    const operator = authenticate(request, reply, config);
    if (!operator) return;

    return service.setWebsiteEnabled(getParams(request).websiteId, true, operator);
  });

  app.post('/api/operator/websites/:websiteId/disable', async (request, reply) => {
    const operator = authenticate(request, reply, config);
    if (!operator) return;

    return service.setWebsiteEnabled(getParams(request).websiteId, false, operator);
  });

  app.post('/api/operator/websites/:websiteId/ad-units', async (request, reply) => {
    const operator = authenticate(request, reply, config);
    if (!operator) return;

    const { websiteId } = getParams(request);
    reply.status(201);

    return service.createAdUnit(websiteId, adUnitInputFromBody(formBody(request)), operator);
  });

  app.get('/api/operator/websites/:websiteId/ad-units', async (request, reply) => {
    if (!authenticate(request, reply, config)) return;

    return { ok: true, ad_units: await service.listAdUnits(getParams(request).websiteId) };
  });

  app.post('/api/operator/websites/:websiteId/ad-units/:placementId', async (request, reply) => {
    const operator = authenticate(request, reply, config);
    if (!operator) return;

    const { websiteId, placementId } = getParams(request);

    return service.updateAdUnit(
      websiteId,
      placementId ?? '',
      adUnitInputFromBody(formBody(request)),
      operator,
    );
  });

  app.post(
    '/api/operator/websites/:websiteId/ad-units/:placementId/enable',
    async (request, reply) => {
      const operator = authenticate(request, reply, config);
      if (!operator) return;

      const { websiteId, placementId } = getParams(request);

      return service.setAdUnitEnabled(websiteId, placementId ?? '', true, operator);
    },
  );

  app.post(
    '/api/operator/websites/:websiteId/ad-units/:placementId/disable',
    async (request, reply) => {
      const operator = authenticate(request, reply, config);
      if (!operator) return;

      const { websiteId, placementId } = getParams(request);

      return service.setAdUnitEnabled(websiteId, placementId ?? '', false, operator);
    },
  );

  app.delete('/api/operator/websites/:websiteId/ad-units/:placementId', async (request, reply) => {
    const operator = authenticate(request, reply, config);
    if (!operator) return;

    const { websiteId, placementId } = getParams(request);

    return service.deleteAdUnit(websiteId, placementId ?? '', operator);
  });

  app.post('/api/operator/websites/:websiteId/configuration', async (request, reply) => {
    const operator = authenticate(request, reply, config);
    if (!operator) return;

    const { websiteId } = getParams(request);

    return service.updateServingConfiguration(
      websiteId,
      servingInputFromBody(formBody(request)),
      operator,
    );
  });

  app.get('/api/operator/websites/by-domain/:domain', async (request, reply) => {
    if (!authenticate(request, reply, config)) return;
    const params = request.params as { domain: string };

    return { ok: true, website: await service.getWebsiteByDomain(params.domain) };
  });
};
