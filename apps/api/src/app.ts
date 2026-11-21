import Fastify from 'fastify';
import swagger from '@fastify/swagger';
import { CONTRACT_VERSION, HealthSchema } from '@hockey-iq/contracts';
import { registerPlatform, type PlatformOptions } from './platform/routes.js';
import type { PlatformService } from './platform/service.js';
export async function buildApp(platform?: {
  service: PlatformService;
  options: PlatformOptions;
}) {
  const app = Fastify({
    logger: platform?.options.production
      ? {
          level: 'info',
          redact: [
            'req.headers.cookie',
            'req.headers.authorization',
            'req.headers.x-csrf-token',
          ],
        }
      : false,
    logController: new Fastify.LogController({ disableRequestLogging: true }),
    bodyLimit: platform ? 64 * 1024 * 1024 : 1_048_576,
  });
  await app.register(swagger, {
    openapi: {
      info: {
        title: platform ? 'Hockey Doo API' : 'Hockey IQ API — M0',
        version: platform ? '1.2.0' : '0.0.0',
      },
    },
  });
  app.get(
    '/api/health',
    {
      schema: {
        response: {
          200: {
            type: 'object',
            additionalProperties: false,
            required: ['status', 'milestone', 'schemaVersion'],
            properties: {
              status: { const: 'ok' },
              milestone: { const: 'M0' },
              schemaVersion: { const: CONTRACT_VERSION },
            },
          },
        },
      },
    },
    async () =>
      HealthSchema.parse({
        status: 'ok',
        milestone: 'M0',
        schemaVersion: CONTRACT_VERSION,
      }),
  );
  // Public operational metadata contains no private team data.
  if (platform) {
    app.addHook('onRequest', async (req, reply) => {
      reply.header('X-Request-Id', req.id);
    });
    app.addHook('onResponse', async (req, reply) => {
      app.log.info(
        {
          requestId: req.id,
          method: req.method,
          route: req.routeOptions.url ?? 'unmatched',
          status: reply.statusCode,
          durationMs: reply.elapsedTime,
        },
        'request',
      );
    });
    app.get('/api/ready', async (_req, reply) => {
      try {
        await platform.service.db.query('SELECT 1');
        return { status: 'ready', version: '1.2' };
      } catch {
        return reply.code(503).send({ status: 'unavailable' });
      }
    });
  }
  app.get('/api/openapi.json', async () => app.swagger());
  app.setNotFoundHandler(async (_request, reply) =>
    reply.code(404).send({
      error: { code: 'NOT_FOUND', message: 'Ressource introuvable.' },
    }),
  );
  app.setErrorHandler(async (_error, _request, reply) =>
    reply
      .code(500)
      .send({ error: { code: 'INTERNAL_ERROR', message: 'Erreur interne.' } }),
  );
  if (platform) await registerPlatform(app, platform.service, platform.options);
  return app;
}
