import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { database, type Database } from '../../src/platform/db.js';
import { blobs } from '../../src/platform/blobs.js';
import { PlatformService } from '../../src/platform/service.js';
import { buildApp } from '../../src/app.js';
import { templateSystem } from '@hockey-iq/play-systems';
import { templateScenario } from '@hockey-iq/scenario-schema';
let app: FastifyInstance,
  db: Database,
  service: PlatformService,
  directory: string;
type Headers = {
  cookie: string;
  'x-csrf-token': string;
  'idempotency-key': string;
};
let coach: Headers, player: Headers;
async function login(id: string): Promise<Headers> {
  const r = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/dev',
    payload: { userId: id },
  });
  expect(r.statusCode).toBe(200);
  return {
    cookie: String(r.headers['set-cookie']).split(';')[0]!,
    'x-csrf-token': r.json().csrf as string,
    'idempotency-key': randomUUID(),
  };
}
const headers = (auth: Headers) => ({
  ...auth,
  'idempotency-key': randomUUID(),
});
const call = (
  method: 'GET' | 'POST' | 'PATCH',
  url: string,
  auth: Headers,
  payload?: unknown,
) =>
  app.inject({
    method,
    url: '/api/v1' + url,
    headers: {
      ...headers(auth),
      ...(payload === undefined ? {} : { 'content-type': 'application/json' }),
    },
    ...(payload === undefined ? {} : { payload: JSON.stringify(payload) }),
  });
beforeAll(async () => {
  directory = await mkdtemp(join(tmpdir(), 'hockey-v12-'));
  db = await database(
    process.env.HOCKEY_TEST_DATABASE_URL
      ? { url: process.env.HOCKEY_TEST_DATABASE_URL }
      : {},
  );
  await db.migrate();
  service = new PlatformService(db, blobs({ directory }));
  await service.seed();
  app = await buildApp({
    service,
    options: {
      demoAuth: true,
      production: false,
      publicUrl: 'http://localhost',
    },
  });
  coach = await login('demo-coach');
  player = await login('demo-player-m11');
}, 30000);
afterAll(async () => {
  await app?.close();
  await db?.close();
  if (directory) await rm(directory, { recursive: true, force: true });
});
async function createTeam() {
  const response = await call('POST', '/teams', coach, {
    name: 'Équipe test',
    ageDivision: 'M13',
    seasonId: '2026-2027',
  });
  expect(response.statusCode).toBe(201);
  return response.json().id as string;
}
describe('v1.2 actual PostgreSQL-backed private platform', () => {
  it('requires authentication, CSRF and valid origin, and isolates every team and player read', async () => {
    expect((await app.inject('/api/v1/me')).statusCode).toBe(401);
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/api/v1/teams',
          headers: { cookie: coach.cookie },
          payload: { name: 'x' },
        })
      ).statusCode,
    ).toBe(403);
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/api/v1/teams',
          headers: { ...coach, origin: 'https://attacker.invalid' },
          payload: { name: 'x' },
        })
      ).statusCode,
    ).toBe(403);
    expect(
      (await call('GET', '/teams/demo-m13/entitlements', player)).statusCode,
    ).toBe(404);
    expect(
      (await call('GET', '/teams/demo-m11/projects', player)).statusCode,
    ).toBe(403);
    expect(
      (await call('GET', '/me/lessons/demo-project-pro-1-assignment', player))
        .statusCode,
    ).toBe(404);
    const own = await call(
      'GET',
      '/me/lessons/demo-project-free-assignment',
      player,
    );
    expect(own.statusCode).toBe(200);
    expect(own.json().payload.sequences).toHaveLength(2);
    expect(
      (await call('GET', '/teams/demo-m11/completions', player)).statusCode,
    ).toBe(403);
    expect((await call('GET', '/me/teams', coach)).json()).toHaveLength(2);
  });
  it('enforces Free quota atomically on concurrent creates, while allowing multiple related scenarios', async () => {
    const team = await createTeam(),
      url = `/teams/${team}/projects`;
    const results = await Promise.all([
      call('POST', url, coach, { name: 'A', scope: 'breakout' }),
      call('POST', url, coach, { name: 'B', scope: 'breakout' }),
    ]);
    expect(results.map((r) => r.statusCode).sort()).toEqual([201, 409]);
    expect(results.find((r) => r.statusCode === 409)!.json().error.code).toBe(
      'PROJECT_QUOTA_EXCEEDED',
    );
    const project = results.find((r) => r.statusCode === 201)!.json()
      .id as string;
    const sys = await call(
      'POST',
      `${url}/${project}/systems`,
      coach,
      templateSystem('LOW_CENTER_SUPPORT'),
    );
    expect(sys.statusCode).toBe(201);
    for (let i = 0; i < 2; i++)
      expect(
        (
          await call('POST', `${url}/${project}/scenarios`, coach, {
            schemaVersion: 2,
            name: 'Cas ' + i,
            systemId: sys.json().id,
            systemVersion: 1,
            controlledTeamId: 'home',
            scenario: templateScenario('LOW_CENTER_SUPPORT'),
          })
        ).statusCode,
      ).toBe(201);
    expect(
      (await call('GET', `/teams/${team}/entitlements`, coach)).json().used,
    ).toBe(1);
    const wrong = await call(
      'POST',
      `${url}/${project}/systems`,
      coach,
      templateSystem('FORECHECK_212'),
    );
    expect(wrong.statusCode).toBe(422);
    expect(wrong.json().error.code).toBe('PROJECT_SCOPE_MISMATCH');
  });
  it('retries idempotently, rejects key reuse and stale editing, and keeps archived projects read-only', async () => {
    const team = await createTeam(),
      url = `/teams/${team}/projects`,
      auth = headers(coach),
      body = { name: 'Idempotent', scope: 'breakout' };
    const first = await app.inject({
      method: 'POST',
      url: '/api/v1' + url,
      headers: auth,
      payload: body,
    });
    const retry = await app.inject({
      method: 'POST',
      url: '/api/v1' + url,
      headers: auth,
      payload: body,
    });
    expect(retry.json().id).toBe(first.json().id);
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/api/v1' + url,
          headers: auth,
          payload: { ...body, name: 'changed' },
        })
      ).statusCode,
    ).toBe(409);
    const id = first.json().id as string;
    expect(
      (
        await call('PATCH', url + '/' + id, coach, {
          name: 'Nouveau',
          revision: 1,
        })
      ).statusCode,
    ).toBe(200);
    expect(
      (
        await call('PATCH', url + '/' + id, coach, {
          name: 'Périmé',
          revision: 1,
        })
      ).json().error.code,
    ).toBe('REVISION_CONFLICT');
    expect(
      (await call('POST', url + '/' + id + '/archive', coach)).statusCode,
    ).toBe(200);
    expect(
      (
        await call('PATCH', url + '/' + id, coach, {
          name: 'Interdit',
          revision: 3,
        })
      ).json().error.code,
    ).toBe('PROJECT_ARCHIVED');
    expect(
      (await call('POST', url + '/' + id + '/activate', coach)).statusCode,
    ).toBe(200);
  });
  it('downgrades Pro without deleting content and requires explicit project selection', async () => {
    const team = await createTeam();
    expect(
      (
        await call('POST', `/teams/${team}/subscription/simulate`, coach, {
          plan: 'TEAM_PRO',
          seasonId: '2026-2027',
        })
      ).statusCode,
    ).toBe(200);
    const a = await call('POST', `/teams/${team}/projects`, coach, {
        name: 'Premier',
        scope: 'breakout',
      }),
      b = await call('POST', `/teams/${team}/projects`, coach, {
        name: 'Deuxième',
        scope: 'forecheck',
      });
    expect(a.statusCode).toBe(201);
    expect(b.statusCode).toBe(201);
    expect(
      (
        await call('POST', `/teams/${team}/subscription/simulate`, coach, {
          plan: 'FREE',
          seasonId: '2026-2027',
        })
      ).json().error.code,
    ).toBe('DOWNGRADE_SELECTION_REQUIRED');
    expect(
      (
        await call('POST', `/teams/${team}/subscription/simulate`, coach, {
          plan: 'FREE',
          keepProjectId: a.json().id,
          seasonId: '2026-2027',
        })
      ).statusCode,
    ).toBe(200);
    const rows = (
      await call('GET', `/teams/${team}/projects`, coach)
    ).json() as { id: string; status: string }[];
    expect(rows).toHaveLength(2);
    expect(rows.find((r) => r.id === b.json().id)!.status).toBe('ARCHIVED');
    expect(
      (
        await call(
          'POST',
          `/teams/${team}/projects/${b.json().id}/activate`,
          coach,
        )
      ).json().error.code,
    ).toBe('PROJECT_QUOTA_EXCEEDED');
  });
  it('assigns catalogue without quota and tracks private progress', async () => {
    const before = (
      await call('GET', '/teams/demo-m11/entitlements', coach)
    ).json().used;
    const assigned = await call(
      'POST',
      '/teams/demo-m11/catalog/catalog-BOARDS_BREAKOUT/assign',
      coach,
      {},
    );
    expect(assigned.statusCode).toBe(201);
    const id = assigned.json()[0].id as string;
    expect((await call('GET', `/me/lessons/${id}`, player)).statusCode).toBe(
      200,
    );
    expect(
      (
        await call('PATCH', `/me/lesson-progress/${id}`, player, {
          status: 'COMPLETED',
          watchedTicks: 90,
        })
      ).statusCode,
    ).toBe(200);
    expect(
      (await call('GET', '/teams/demo-m11/entitlements', coach)).json().used,
    ).toBe(before);
    expect(
      (await call('GET', '/teams/demo-m11/completions', coach))
        .json()
        .some((r: { user_id: string }) => r.user_id === 'demo-player-m11'),
    ).toBe(true);
  });
  it('keeps published snapshots immutable after source edits and enforces immutability in SQL', async () => {
    const project = (
      await call('GET', '/teams/demo-m11/projects/demo-project-free', coach)
    ).json();
    const version = project.versions.find(
      (v: { kind: string }) => v.kind === 'lesson',
    );
    const old = (
      await call('GET', `/teams/demo-m11/versions/${version.id}`, coach)
    ).json();
    const system = project.resources.find(
      (r: { kind: string }) => r.kind === 'system',
    );
    expect(
      (
        await call(
          'PATCH',
          `/teams/demo-m11/projects/demo-project-free/systems/${system.id}`,
          coach,
          {
            revision: system.revision,
            payload: { ...system.payload, name: 'Nouveau système' },
          },
        )
      ).statusCode,
    ).toBe(200);
    expect(
      (
        await call('GET', `/teams/demo-m11/versions/${version.id}`, coach)
      ).json().checksum,
    ).toBe(old.checksum);
    const frozen = (
      await call('GET', '/me/lessons/demo-project-free-assignment', player)
    ).json().payload;
    expect(frozen.sequences[0].systemSnapshot.name).not.toBe('Nouveau système');
    await expect(
      db.query("UPDATE resource_versions SET checksum='corrupt' WHERE id=$1", [
        version.id,
      ]),
    ).rejects.toThrow('IMMUTABLE_PUBLISHED_VERSION');
  });
  it('uses hashed single-use expiring/revocable invitations and prevents admin escalation', async () => {
    await db.query(
      "INSERT INTO users(id,subject,display_name) VALUES('invite-test','invite-test','Invité fictif')",
    );
    const session = await service.session('invite-test');
    const invited: Headers = {
      cookie: 'hockey_session=' + session.token,
      'x-csrf-token': session.csrf,
      'idempotency-key': randomUUID(),
    };
    const invite = await call('POST', '/teams/demo-m11/invitations', coach, {
      role: 'PLAYER',
    });
    expect(invite.statusCode).toBe(201);
    const stored = (
      await db.query('SELECT token_hash FROM invitations WHERE id=$1', [
        invite.json().id,
      ])
    )[0]!;
    expect(stored.token_hash).not.toBe(invite.json().token);
    expect(
      (
        await call('POST', '/invitations/accept', invited, {
          token: invite.json().token,
        })
      ).statusCode,
    ).toBe(200);
    expect(
      (
        await call('POST', '/invitations/accept', invited, {
          token: invite.json().token,
        })
      ).statusCode,
    ).toBe(400);
    const expired = await call('POST', '/teams/demo-m11/invitations', coach, {
      role: 'COACH',
    });
    await db.query(
      "UPDATE invitations SET expires_at='2000-01-01' WHERE id=$1",
      [expired.json().id],
    );
    expect(
      (
        await call('POST', '/invitations/accept', invited, {
          token: expired.json().token,
        })
      ).statusCode,
    ).toBe(400);
    const revoked = await call('POST', '/teams/demo-m11/invitations', coach, {
      role: 'PLAYER',
    });
    await call(
      'POST',
      `/teams/demo-m11/invitations/${revoked.json().id}/revoke`,
      coach,
    );
    expect(
      (
        await call('POST', '/invitations/accept', invited, {
          token: revoked.json().token,
        })
      ).statusCode,
    ).toBe(400);
    expect(
      (
        await call('POST', '/teams/demo-m11/invitations', coach, {
          role: 'PLATFORM_ADMIN',
        })
      ).statusCode,
    ).toBe(400);
    expect(
      (
        await call('PATCH', '/teams/demo-m11/members/demo-coach', coach, {
          role: 'PLAYER',
          active: true,
        })
      ).json().error.code,
    ).toBe('LAST_TEAM_ADMIN');
  });
  it('migrates and seeds repeatedly without changing published data', async () => {
    const count = (
      await db.query('SELECT count(*)::int AS n FROM resource_versions')
    )[0]!.n;
    await db.migrate();
    await service.seed();
    expect(
      (await db.query('SELECT count(*)::int AS n FROM resource_versions'))[0]!
        .n,
    ).toBe(count);
  });
});

it('paginates tenant lists and applies quota to editable catalogue copies', async () => {
  const team = await createTeam();
  const catalog = (await call('GET', '/catalog', coach)).json() as {
    id: string;
  }[];
  const response = await call('POST', `/teams/${team}/projects`, coach, {
    name: 'Copie personnalisée',
    scope: 'breakout',
    catalogId: catalog[0]!.id,
  });
  expect(response.statusCode, response.body).toBe(201);
  const project = (
    await call('GET', `/teams/${team}/projects/${response.json().id}`, coach)
  ).json();
  expect(project.resources.map((r: { kind: string }) => r.kind).sort()).toEqual(
    ['scenario', 'system'],
  );
  expect(
    (
      await call('POST', `/teams/${team}/projects`, coach, {
        name: 'Deuxième copie',
        scope: 'breakout',
        catalogId: catalog[0]!.id,
      })
    ).statusCode,
  ).toBe(409);
  expect(
    (await call('GET', '/me/teams?limit=1&offset=0', coach)).json(),
  ).toHaveLength(1);
  expect((await call('GET', '/me/teams?limit=101', coach)).statusCode).toBe(
    400,
  );
  expect(
    (await call('GET', `/teams/${team}/projects?offset=1`, coach)).json(),
  ).toEqual([]);
});
it('publishes immutable increasing catalogue editions with idempotency and admin-only access', async () => {
  const admin = await login('demo-admin');
  const first = (await call('GET', '/catalog', admin)).json()[0];
  const source = (await call('GET', '/catalog/' + first.id, admin)).json();
  const body = {
    name: source.name,
    category: source.category,
    template: source.template,
    payload: source.payload,
    sourceId: source.id,
  };
  expect((await call('POST', '/catalog', coach, body)).statusCode).toBe(403);
  const auth = headers(admin),
    request = {
      method: 'POST' as const,
      url: '/api/v1/catalog',
      headers: auth,
      payload: body,
    };
  const next = await app.inject(request);
  expect(next.statusCode, next.body).toBe(201);
  expect((await app.inject(request)).json()).toEqual(next.json());
  const published = (
    await call('GET', '/catalog/' + next.json().id, admin)
  ).json();
  expect(published.version).toBe(2);
  expect(published.series_id).toBe(source.id);
  await expect(
    db.query('UPDATE catalog SET name=$1 WHERE id=$2', ['Mutation', source.id]),
  ).rejects.toThrow('IMMUTABLE_PUBLISHED_VERSION');
  expect(
    (await call('GET', '/teams/demo-m11/projects', admin)).statusCode,
  ).toBe(404);
});
it('offers a safe Free project selection after automatic Pro expiry without changing billing or deleting content', async () => {
  const team = await createTeam();
  await call('POST', `/teams/${team}/subscription/simulate`, coach, {
    plan: 'TEAM_PRO',
    seasonId: 'test-season',
  });
  const first = await call('POST', `/teams/${team}/projects`, coach, {
    name: 'Conserver',
    scope: 'breakout',
  });
  await call('POST', `/teams/${team}/projects`, coach, {
    name: 'Archiver',
    scope: 'breakout',
  });
  await db.query("UPDATE teams SET effective_to='2000-01-01' WHERE id=$1", [
    team,
  ]);
  expect(
    (await call('GET', `/teams/${team}/entitlements`, coach)).json(),
  ).toMatchObject({ plan: 'FREE', used: 2 });
  const selected = await call(
    'POST',
    `/teams/${team}/subscription/retain-project`,
    coach,
    { keepProjectId: first.json().id },
  );
  expect(selected.statusCode, selected.body).toBe(200);
  expect(selected.json()).toMatchObject({ plan: 'FREE', used: 1 });
  expect(
    (await call('GET', `/teams/${team}/projects`, coach)).json(),
  ).toHaveLength(2);
  expect(
    (
      await db.query(
        'SELECT plan_code,subscription_status FROM teams WHERE id=$1',
        [team],
      )
    )[0],
  ).toEqual({ plan_code: 'TEAM_PRO', subscription_status: 'ACTIVE' });
});
