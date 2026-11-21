import { it, expect } from 'vitest';
import { randomBytes } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { database } from '../../src/platform/db.js';
import { blobs } from '../../src/platform/blobs.js';
import { PlatformService } from '../../src/platform/service.js';
import { backup, restore } from '../../src/platform/operations.js';
it('backs up encrypted relational data, restores immutable lessons and blobs, and invalidates sessions', async () => {
  const root = await mkdtemp(join(tmpdir(), 'hockey-backup-')),
    source = await database(),
    target = await database();
  try {
    await source.migrate();
    await target.migrate();
    const a = blobs({ directory: join(root, 'a') }),
      b = blobs({ directory: join(root, 'b') });
    const service = new PlatformService(source, a);
    await service.seed();
    await service.session('demo-coach');
    const key = randomBytes(32).toString('hex'),
      path = join(root, 'backup.hockeydoo');
    await backup(source, path, key);
    await expect(
      restore(target, b, path, randomBytes(32).toString('hex')),
    ).rejects.toThrow();
    await expect(
      restore(
        target,
        {
          ...b,
          put: async () => {
            throw new Error('OBJECT_STORE_UNAVAILABLE');
          },
        },
        path,
        key,
      ),
    ).rejects.toThrow('OBJECT_STORE_UNAVAILABLE');
    expect(
      (await target.query('SELECT count(*)::int AS n FROM users'))[0]!.n,
    ).toBe(0);
    await restore(target, b, path, key);
    expect(
      (await target.query('SELECT count(*)::int AS n FROM projects'))[0]!.n,
    ).toBe(3);
    expect(
      (await target.query('SELECT count(*)::int AS n FROM sessions'))[0]!.n,
    ).toBe(0);
    const old = (
        await source.query(
          "SELECT * FROM resource_versions WHERE kind='lesson' ORDER BY id",
        )
      )[0]!,
      restored = (
        await target.query('SELECT * FROM resource_versions WHERE id=$1', [
          old.id,
        ])
      )[0]!;
    expect(restored.checksum).toBe(old.checksum);
    expect(await b.get(String(restored.blob_key))).toEqual(old.payload);
    await expect(restore(target, b, path, key)).rejects.toThrow(
      'RESTORE_REQUIRES_EMPTY_DATABASE',
    );
    await expect(
      target.query('DELETE FROM resource_versions WHERE id=$1', [old.id]),
    ).rejects.toThrow('IMMUTABLE_PUBLISHED_VERSION');
  } finally {
    await source.close();
    await target.close();
    await rm(root, { recursive: true, force: true });
  }
}, 30000);
