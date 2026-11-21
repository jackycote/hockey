import { it, expect } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { database } from '../../src/platform/db.js';
it('boots a fresh nested data directory and preserves the embedded PostgreSQL database across restarts', async () => {
  const root = await mkdtemp(join(tmpdir(), 'hockey-persist-')),
    directory = join(root, 'new', 'data', 'postgres');
  let db = await database({ directory });
  try {
    await db.migrate();
    await db.query(
      "INSERT INTO users(id,subject,display_name) VALUES('persistent','test-subject','Compte fictif')",
    );
    await db.close();
    db = await database({ directory });
    await db.migrate();
    expect(
      (
        await db.query("SELECT display_name FROM users WHERE id='persistent'")
      )[0]!.display_name,
    ).toBe('Compte fictif');
  } finally {
    await db.close();
    await rm(root, { recursive: true, force: true });
  }
}, 30000);
