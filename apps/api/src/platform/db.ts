import { PGlite } from '@electric-sql/pglite';
import { Pool } from 'pg';
import { readFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
export interface Sql {
  query<T extends Record<string, unknown> = Record<string, unknown>>(
    sql: string,
    params?: unknown[],
  ): Promise<T[]>;
}
export interface Database extends Sql {
  transaction<T>(work: (tx: Sql) => Promise<T>): Promise<T>;
  close(): Promise<void>;
  migrate(): Promise<void>;
}
export async function database(
  options: { url?: string; directory?: string } = {},
): Promise<Database> {
  const sql = await readFile(
    new URL('../../migrations/001_v12.sql', import.meta.url),
    'utf8',
  ).catch(() =>
    readFile(
      new URL('../../../migrations/001_v12.sql', import.meta.url),
      'utf8',
    ),
  );
  if (options.url) {
    const pool = new Pool({ connectionString: options.url, max: 10 });
    return {
      query: async <T extends Record<string, unknown>>(
        q: string,
        p: unknown[] = [],
      ) => (await pool.query<T>(q, p)).rows,
      transaction: async (work) => {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          const result = await work({
            query: async <T extends Record<string, unknown>>(
              q: string,
              p: unknown[] = [],
            ) => (await client.query<T>(q, p)).rows,
          });
          await client.query('COMMIT');
          return result;
        } catch (e) {
          await client.query('ROLLBACK');
          throw e;
        } finally {
          client.release();
        }
      },
      migrate: async () => {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          await client.query('SELECT pg_advisory_xact_lock(712120)');
          await client.query(sql);
          await client.query('COMMIT');
        } catch (e) {
          await client.query('ROLLBACK');
          throw e;
        } finally {
          client.release();
        }
      },
      close: () => pool.end(),
    };
  }
  if (options.directory)
    await mkdir(dirname(options.directory), { recursive: true, mode: 0o700 });
  const pg = new PGlite(options.directory);
  await pg.waitReady;
  let queue: Promise<unknown> = Promise.resolve();
  const locked = <T>(task: () => Promise<T>) => {
    const next = queue.then(task, task);
    queue = next.catch(() => undefined);
    return next;
  };
  return {
    query: async <T extends Record<string, unknown>>(
      q: string,
      p: unknown[] = [],
    ) => locked(async () => (await pg.query<T>(q, p)).rows),
    transaction: (work) =>
      locked(() =>
        pg.transaction((tx) =>
          work({
            query: async <T extends Record<string, unknown>>(
              q: string,
              p: unknown[] = [],
            ) => (await tx.query<T>(q, p)).rows,
          }),
        ),
      ),
    migrate: () =>
      locked(async () => {
        await pg.exec(sql);
      }),
    close: async () => {
      await queue;
      await pg.close();
    },
  };
}
