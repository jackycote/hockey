import { buildApp } from './app.js';
import { storageConfig } from './platform/config.js';
import { z } from 'zod';
import { database } from './platform/db.js';
import { blobs } from './platform/blobs.js';
import { PlatformService } from './platform/service.js';
const config = z
  .object({
    API_HOST: z.string().default('127.0.0.1'),
    API_PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    API_RATE_LIMIT: z.coerce.number().int().min(1).max(100000).optional(),
    AUTH_RATE_LIMIT: z.coerce.number().int().min(1).max(100000).optional(),
  })
  .parse(process.env);
const production = process.env.NODE_ENV === 'production';
const demoAuth = process.env.ENABLE_DEMO_AUTH === 'true';
if (
  production &&
  (!process.env.DATABASE_URL ||
    demoAuth ||
    !process.env.OIDC_ISSUER ||
    !process.env.OIDC_CLIENT_ID ||
    !process.env.PUBLIC_APP_URL?.startsWith('https://') ||
    !process.env.S3_ENDPOINT ||
    process.env.BLOB_BACKEND !== 's3')
)
  throw new Error('PRODUCTION_CONFIGURATION_REQUIRED');
const storage = storageConfig();
const db = await database(storage.database);
await db.migrate();
const objectStore = blobs(storage.blobs);
const service = new PlatformService(db, objectStore);
if (demoAuth) await service.seed();
const app = await buildApp({
  service,
  options: {
    demoAuth,
    production,
    ...(config.API_RATE_LIMIT ? { apiRateLimit: config.API_RATE_LIMIT } : {}),
    ...(config.AUTH_RATE_LIMIT
      ? { authRateLimit: config.AUTH_RATE_LIMIT }
      : {}),
    publicUrl: process.env.PUBLIC_APP_URL ?? `http://127.0.0.1:5174`,
    ...(process.env.OIDC_ISSUER ? { oidcIssuer: process.env.OIDC_ISSUER } : {}),
    ...(process.env.OIDC_CLIENT_ID
      ? { oidcClientId: process.env.OIDC_CLIENT_ID }
      : {}),
    ...(process.env.OIDC_CLIENT_SECRET
      ? { oidcClientSecret: process.env.OIDC_CLIENT_SECRET }
      : {}),
  },
});
app.addHook('onClose', async () => db.close());
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    void app.close().catch(() => {
      process.exitCode = 1;
    });
  });
}
try {
  await app.listen({ host: config.API_HOST, port: config.API_PORT });
  console.info(`Hockey Doo API: http://${config.API_HOST}:${config.API_PORT}`);
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
