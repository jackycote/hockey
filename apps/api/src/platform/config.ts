/** Shared runtime/operations selection: production never silently falls back to local data. */
export function storageConfig(env: NodeJS.ProcessEnv = process.env) {
  const production = env.NODE_ENV === 'production';
  const directory = env.API_DATA_DIR ?? '.data';
  const postgres = production || env.API_DB_MODE === 'postgres';
  const remote = env.BLOB_BACKEND === 's3';
  if (postgres && !env.DATABASE_URL) throw new Error('DATABASE_URL_REQUIRED');
  if (production && !env.S3_ENDPOINT?.startsWith('https://'))
    throw new Error('PRODUCTION_S3_HTTPS_REQUIRED');
  if (production && !remote)
    throw new Error('PRODUCTION_OBJECT_STORAGE_REQUIRED');
  const accessKey = env.S3_ACCESS_KEY_ID || env.MINIO_ROOT_USER;
  const secretKey = env.S3_SECRET_ACCESS_KEY || env.MINIO_ROOT_PASSWORD;
  if (
    remote &&
    (!env.S3_ENDPOINT || !env.S3_BUCKET || !accessKey || !secretKey)
  )
    throw new Error('S3_CONFIGURATION_REQUIRED');
  return {
    database: postgres
      ? { url: env.DATABASE_URL! }
      : env.API_DB_MODE === 'memory'
        ? {}
        : { directory: directory + '/postgres' },
    blobs: remote
      ? {
          directory: directory + '/blobs',
          endpoint: env.S3_ENDPOINT!,
          bucket: env.S3_BUCKET!,
          region: env.S3_REGION ?? 'us-east-1',
          accessKey: accessKey!,
          secretKey: secretKey!,
        }
      : { directory: directory + '/blobs' },
  };
}
