/** Uses a uniquely named disposable PostgreSQL schema and S3 bucket, never existing domain data. */
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { database } from '../apps/api/dist/platform/db.js';
import { blobs } from '../apps/api/dist/platform/blobs.js';
import { PlatformService } from '../apps/api/dist/platform/service.js';
import { buildApp } from '../apps/api/dist/app.js';
const require = createRequire(
  new URL('../apps/api/package.json', import.meta.url),
);
const { Pool } = require('pg');
const {
  S3Client,
  CreateBucketCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand,
  DeleteBucketCommand,
} = require('@aws-sdk/client-s3');
if (!process.env.DATABASE_URL || !process.env.S3_ENDPOINT)
  throw new Error(
    'Run setup:env and start disposable local/CI services first.',
  );
const schema = 'v12_test_' + randomUUID().replaceAll('-', ''),
  bucket = schema.replaceAll('_', '-');
const admin = new Pool({ connectionString: process.env.DATABASE_URL });
const s3 = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  forcePathStyle: true,
  region: process.env.S3_REGION ?? 'us-east-1',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID || process.env.MINIO_ROOT_USER,
    secretAccessKey:
      process.env.S3_SECRET_ACCESS_KEY || process.env.MINIO_ROOT_PASSWORD,
  },
});
let db,
  app,
  createdBucket = false,
  createdSchema = false;
try {
  await admin.query(`CREATE SCHEMA ${schema}`);
  createdSchema = true;
  const url = new URL(process.env.DATABASE_URL);
  url.searchParams.set('options', `-csearch_path=${schema}`);
  db = await database({ url: url.href });
  await db.migrate();
  await db.migrate();
  await s3.send(new CreateBucketCommand({ Bucket: bucket }));
  createdBucket = true;
  const store = blobs({
    directory: 'unused',
    endpoint: process.env.S3_ENDPOINT,
    bucket,
    region: process.env.S3_REGION ?? 'us-east-1',
    accessKey: process.env.S3_ACCESS_KEY_ID || process.env.MINIO_ROOT_USER,
    secretKey:
      process.env.S3_SECRET_ACCESS_KEY || process.env.MINIO_ROOT_PASSWORD,
  });
  const service = new PlatformService(db, store);
  await service.seed();
  app = await buildApp({
    service,
    options: {
      demoAuth: true,
      production: false,
      publicUrl: 'http://localhost',
    },
  });
  const auth = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/dev',
    payload: { userId: 'demo-coach' },
  });
  const headers = {
    cookie: String(auth.headers['set-cookie']).split(';')[0],
    'x-csrf-token': auth.json().csrf,
  };
  const write = (url, payload) =>
    app.inject({
      method: 'POST',
      url: '/api/v1' + url,
      headers: { ...headers, 'idempotency-key': randomUUID() },
      payload,
    });
  const team = await write('/teams', {
    name: 'Disposable service test',
    ageDivision: 'M13',
    seasonId: 'test-season',
  });
  assert.equal(team.statusCode, 201);
  const results = await Promise.all([
    write(`/teams/${team.json().id}/projects`, {
      name: 'Concurrent A',
      scope: 'breakout',
    }),
    write(`/teams/${team.json().id}/projects`, {
      name: 'Concurrent B',
      scope: 'breakout',
    }),
  ]);
  assert.deepEqual(results.map((r) => r.statusCode).sort(), [201, 409]);
  const published = (
    await db.query(
      "SELECT blob_key,payload FROM resource_versions WHERE kind='lesson' LIMIT 1",
    )
  )[0];
  assert.deepEqual(await store.get(published.blob_key), published.payload);
  const object = await store.put({ probe: 'immutable' });
  assert.equal(await store.put({ probe: 'immutable' }), object);
  assert.deepEqual(await store.get(object), { probe: 'immutable' });
  console.info(
    'PASS: network PostgreSQL repeat migrations, transactional quota race, S3 gzip integrity and immutable duplicate writes.',
  );
} finally {
  await app?.close();
  await db?.close();
  if (createdSchema) await admin.query(`DROP SCHEMA ${schema} CASCADE`);
  await admin.end();
  if (createdBucket) {
    let token;
    do {
      const objects = await s3.send(
        new ListObjectsV2Command({ Bucket: bucket, ContinuationToken: token }),
      );
      if (objects.Contents?.length)
        await s3.send(
          new DeleteObjectsCommand({
            Bucket: bucket,
            Delete: { Objects: objects.Contents.map((o) => ({ Key: o.Key })) },
          }),
        );
      token = objects.NextContinuationToken;
    } while (token);
    await s3.send(new DeleteBucketCommand({ Bucket: bucket }));
  }
  s3.destroy();
}
