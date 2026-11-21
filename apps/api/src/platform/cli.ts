import { storageConfig } from './config.js';
import { database } from './db.js';
import { blobs } from './blobs.js';
import { PlatformService } from './service.js';
import { backup, restore } from './operations.js';
const command = process.argv[2],
  path = process.argv[3];
const storage = storageConfig();
const db = await database(storage.database);
try {
  await db.migrate();
  const store = blobs(storage.blobs);
  if (command === 'migrate') console.info('Database migrations applied.');
  else if (command === 'seed') {
    if (process.env.NODE_ENV === 'production')
      throw new Error('SYNTHETIC_SEED_FORBIDDEN_IN_PRODUCTION');
    await new PlatformService(db, store).seed();
    console.info('Synthetic Hockey Doo data ready.');
  } else if (command === 'prune') {
    const counts = await db.transaction(async (tx) => {
      const sessions = await tx.query(
        'DELETE FROM sessions WHERE expires_at<now() RETURNING token_hash',
      );
      const states = await tx.query(
        'DELETE FROM oidc_states WHERE expires_at<now() RETURNING state_hash',
      );
      const invites = await tx.query(
        "DELETE FROM invitations WHERE expires_at<now()-interval '30 days' RETURNING id",
      );
      const retries = await tx.query(
        "DELETE FROM idempotency WHERE created_at<now()-interval '30 days' RETURNING key",
      );
      return {
        expiredSessions: sessions.length,
        expiredOidcStates: states.length,
        oldInvitations: invites.length,
        oldIdempotencyKeys: retries.length,
      };
    });
    console.info(counts);
  } else if (command === 'backup') {
    if (!path) throw new Error('BACKUP_PATH_REQUIRED');
    console.info(await backup(db, path, process.env.BACKUP_KEY ?? ''));
  } else if (command === 'restore') {
    if (!path) throw new Error('BACKUP_PATH_REQUIRED');
    console.info(await restore(db, store, path, process.env.BACKUP_KEY ?? ''));
  } else
    throw new Error(
      'Use migrate, seed, prune, backup <path>, or restore <path>.',
    );
} finally {
  await db.close();
}
