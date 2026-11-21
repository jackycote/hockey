import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { gzipSync, gunzipSync } from 'node:zlib';
import { readFile, writeFile, stat } from 'node:fs/promises';
import type { Database } from './db.js';
import type { Blobs } from './blobs.js';
const TABLES = [
  'organizations',
  'users',
  'teams',
  'memberships',
  'projects',
  'resources',
  'resource_versions',
  'catalog',
  'assignments',
  'progress',
  'invitations',
  'idempotency',
  'audit_events',
] as const;
const MAGIC = Buffer.from('HOCKEYDOO1');
function encryptionKey(value: string) {
  if (!/^[a-f0-9]{64}$/i.test(value))
    throw new Error('BACKUP_KEY_MUST_BE_32_BYTES_HEX');
  return Buffer.from(value, 'hex');
}
export async function backup(db: Database, path: string, key: string) {
  const snapshot = await db.transaction(async (tx) => {
    await tx.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
    const tables: Record<string, Record<string, unknown>[]> = {};
    for (const name of TABLES)
      tables[name] = await tx.query(`SELECT * FROM ${name}`);
    return { schemaVersion: 1, createdAt: new Date().toISOString(), tables };
  });
  const iv = randomBytes(12),
    cipher = createCipheriv('aes-256-gcm', encryptionKey(key), iv),
    body = Buffer.concat([
      cipher.update(gzipSync(JSON.stringify(snapshot))),
      cipher.final(),
    ]);
  await writeFile(path, Buffer.concat([MAGIC, iv, cipher.getAuthTag(), body]), {
    mode: 0o600,
    flag: 'wx',
  });
  return { tables: TABLES.length, bytes: body.length };
}
export async function restore(
  db: Database,
  blobs: Blobs,
  path: string,
  key: string,
) {
  if ((await stat(path)).size > 256 * 1024 * 1024)
    throw new Error('BACKUP_TOO_LARGE');
  const raw = await readFile(path);
  if (!raw.subarray(0, MAGIC.length).equals(MAGIC))
    throw new Error('BACKUP_FORMAT_INVALID');
  const decipher = createDecipheriv(
    'aes-256-gcm',
    encryptionKey(key),
    raw.subarray(MAGIC.length, MAGIC.length + 12),
  );
  decipher.setAuthTag(raw.subarray(MAGIC.length + 12, MAGIC.length + 28));
  const compressed = Buffer.concat([
    decipher.update(raw.subarray(MAGIC.length + 28)),
    decipher.final(),
  ]);
  const value = JSON.parse(
    gunzipSync(compressed, { maxOutputLength: 256 * 1024 * 1024 }).toString(
      'utf8',
    ),
  ) as {
    schemaVersion: number;
    tables: Record<string, Record<string, unknown>[]>;
  };
  if (
    value.schemaVersion !== 1 ||
    !value.tables ||
    TABLES.some((name) => !Array.isArray(value.tables[name]))
  )
    throw new Error('BACKUP_SCHEMA_INVALID');
  await db.transaction(async (tx) => {
    if (
      Number((await tx.query('SELECT count(*)::int AS n FROM users'))[0]!.n) !==
      0
    )
      throw new Error('RESTORE_REQUIRES_EMPTY_DATABASE');
    for (const name of TABLES) {
      const allowed = new Set(
        (
          await tx.query(
            "SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=$1",
            [name],
          )
        ).map((r) => r.column_name),
      );
      for (const row of value.tables[name]!) {
        const columns = Object.keys(row);
        if (columns.some((c) => !allowed.has(c) || !/^[a-z_]+$/.test(c)))
          throw new Error('BACKUP_COLUMNS_INVALID');
        const params = columns.map((c) =>
          typeof row[c] === 'object' && row[c] !== null
            ? JSON.stringify(row[c])
            : row[c],
        );
        await tx.query(
          `INSERT INTO ${name} (${columns.map((c) => '"' + c + '"').join(',')}) VALUES (${params.map((_, i) => '$' + (i + 1)).join(',')})`,
          params,
        );
      }
    }
    // Restore immutable objects before committing relational references. Failed object writes
    // leave the SQL transaction empty; harmless unreferenced content may be garbage-collected.
    for (const version of value.tables.resource_versions!) {
      if (!version.blob_key) continue;
      if ((await blobs.put(version.payload)) !== version.blob_key)
        throw new Error('RESTORED_BLOB_CHECKSUM_MISMATCH');
    }
    // Restoring a database never resurrects credentials or pending invitation links.
    await tx.query(
      'UPDATE invitations SET revoked_at=now() WHERE revoked_at IS NULL',
    );
  });
  return { tables: TABLES.length };
}
