import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { gzipSync, gunzipSync } from 'node:zlib';
import { hashValue } from '@hockey-iq/tactical-engine';
export const BLOB_JSON_LIMIT_BYTES = 64 * 1024 * 1024;
export interface Blobs {
  put(value: unknown): Promise<string>;
  get(key: string): Promise<unknown>;
}
export function blobs(options: {
  directory: string;
  endpoint?: string;
  bucket?: string;
  region?: string;
  accessKey?: string;
  secretKey?: string;
}): Blobs {
  const s3 = options.endpoint
    ? new S3Client({
        endpoint: options.endpoint,
        region: options.region ?? 'us-east-1',
        forcePathStyle: true,
        credentials: {
          accessKeyId: options.accessKey ?? '',
          secretAccessKey: options.secretKey ?? '',
        },
      })
    : null;
  const directory = resolve(options.directory);
  return {
    put: async (value) => {
      const serialized = JSON.stringify(value);
      if (Buffer.byteLength(serialized) > BLOB_JSON_LIMIT_BYTES)
        throw new Error('OBJECT_TOO_LARGE');
      const key = hashValue(value) + '.json.gz',
        body = gzipSync(serialized);
      if (s3)
        await s3
          .send(
            new PutObjectCommand({
              Bucket: options.bucket!,
              Key: key,
              Body: body,
              ContentType: 'application/json',
              ContentEncoding: 'gzip',
              IfNoneMatch: '*',
            }),
          )
          .catch((e) => {
            if (!(
              e instanceof Error &&
              '$metadata' in e &&
              (e as { $metadata: { httpStatusCode?: number } }).$metadata
                .httpStatusCode === 412
            ))
              throw e;
          });
      else {
        await mkdir(directory, { recursive: true });
        await writeFile(join(directory, key), body, { flag: 'wx' }).catch(
          (e) => {
            if (!(e instanceof Error && 'code' in e && e.code === 'EEXIST'))
              throw e;
          },
        );
      }
      return key;
    },
    get: async (key) => {
      if (!/^[a-f0-9]{64}\.json\.gz$/.test(key))
        throw new Error('INVALID_OBJECT_KEY');
      const compressed = s3
        ? await (
            await s3.send(
              new GetObjectCommand({ Bucket: options.bucket!, Key: key }),
            )
          ).Body!.transformToByteArray()
        : await readFile(join(directory, key));
      const value: unknown = JSON.parse(
        gunzipSync(compressed, {
          maxOutputLength: BLOB_JSON_LIMIT_BYTES,
        }).toString('utf8'),
      );
      if (hashValue(value) + '.json.gz' !== key)
        throw new Error('BLOB_CHECKSUM_MISMATCH');
      return value;
    },
  };
}
