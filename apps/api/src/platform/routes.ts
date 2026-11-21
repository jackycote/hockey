import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z, ZodError } from 'zod';
import { randomUUID } from 'node:crypto';
import {
  PlatformId,
  CreateProjectSchema,
  ProjectPatchSchema,
  PlanChangeSchema,
  ProgressSchema,
  TeamRoleSchema,
} from '@hockey-iq/contracts';
import { hashValue } from '@hockey-iq/tactical-engine';
import { permitted, canReadAssignment } from '@hockey-iq/authz';
import { validateSystem } from '@hockey-iq/play-systems';
import {
  PlatformService,
  Problem,
  required,
  secret,
  tokenHash,
  type Viewer,
} from './service.js';
import { registerAuth } from './auth.js';
declare module 'fastify' {
  interface FastifyRequest {
    viewer: Viewer | null;
  }
}
export interface PlatformOptions {
  demoAuth: boolean;
  production: boolean;
  publicUrl: string;
  oidcIssuer?: string;
  oidcClientId?: string;
  oidcClientSecret?: string;
  apiRateLimit?: number;
  authRateLimit?: number;
  /** Dependency injection for provider contract tests; never sourced from a request. */
  oidcFetch?: import('openid-client').CustomFetch;
}
const params = (request: FastifyRequest) =>
  z.record(z.string(), PlatformId).parse(request.params);
const viewer = (request: FastifyRequest) => {
  if (!request.viewer) throw new Problem(401, 'AUTH_REQUIRED');
  return request.viewer;
};
const key = (request: FastifyRequest) => request.headers['idempotency-key'];
const pagination = (req: FastifyRequest) => {
  const q = z
    .object({
      limit: z.coerce.number().int().min(1).max(100).default(100),
      offset: z.coerce.number().int().min(0).max(100000).default(0),
    })
    .strict()
    .parse(req.query);
  return [q.limit, q.offset];
};
const collections: Record<string, string> = {
  systems: 'system',
  scenarios: 'scenario',
  sequences: 'sequence',
  lessons: 'lesson',
};
const cookie = (header: string | undefined, name: string) =>
  header
    ?.split(';')
    .map((x) => x.trim())
    .find((x) => x.startsWith(name + '='))
    ?.slice(name.length + 1) ?? '';
export async function registerPlatform(
  app: FastifyInstance,
  service: PlatformService,
  options: PlatformOptions,
) {
  if (options.production && options.demoAuth)
    throw new Error('DEMO_AUTH_FORBIDDEN_IN_PRODUCTION');
  await app.register(
    async (api) => {
      api.decorateRequest('viewer', null);
      const apiLimit = z
        .number()
        .int()
        .min(1)
        .max(100000)
        .parse(options.apiRateLimit ?? (options.production ? 180 : 5000));
      const authLimit = z
        .number()
        .int()
        .min(1)
        .max(100000)
        .parse(options.authRateLimit ?? (options.production ? 30 : 5000));
      const rates = new Map<string, { start: number; count: number }>();
      api.addHook('onRequest', async (req, reply) => {
        reply
          .header('Cache-Control', 'no-store')
          .header('X-Content-Type-Options', 'nosniff')
          .header('Referrer-Policy', 'no-referrer');
        const now = service.now().getTime(),
          rateKey =
            req.ip + ':' + (req.url.includes('/auth/') ? 'auth' : 'api');
        let rate = rates.get(rateKey);
        if (!rate || now - rate.start > 60_000) {
          rate = { start: now, count: 0 };
          rates.set(rateKey, rate);
        }
        if (++rate.count > (req.url.includes('/auth/') ? authLimit : apiLimit))
          throw new Problem(429, 'RATE_LIMITED');
        if (rates.size > 10000)
          for (const [id, r] of rates)
            if (now - r.start > 60_000) rates.delete(id);
        if (
          !['GET', 'HEAD', 'OPTIONS'].includes(req.method) &&
          req.headers.origin
        ) {
          const expected = new URL(options.publicUrl).origin;
          if (
            req.headers.origin !== expected &&
            (options.production ||
              req.headers.origin !== `http://${req.headers.host}`)
          )
            throw new Problem(403, 'ORIGIN_REJECTED');
        }
        const publicAuth = [
          '/api/v1/auth/methods',
          '/api/v1/auth/dev',
          '/api/v1/auth/start',
          '/api/v1/auth/callback',
        ].includes(req.url.split('?')[0]!);
        if (publicAuth) return;
        req.viewer = await service.viewer(
          cookie(req.headers.cookie, 'hockey_session'),
        );
        if (
          !['GET', 'HEAD', 'OPTIONS'].includes(req.method) &&
          req.headers['x-csrf-token'] !== req.viewer.csrf
        )
          throw new Problem(403, 'CSRF_REQUIRED');
      });
      api.setErrorHandler((error, _req, reply) => {
        if (error instanceof Problem)
          return reply
            .code(error.status)
            .send({ error: { code: error.code, message: error.message } });
        if (error instanceof ZodError)
          return reply.code(400).send({
            error: {
              code: 'INVALID_PAYLOAD',
              message: 'Valeurs invalides.',
              issues: error.issues.map((i) => ({
                path: i.path,
                message: i.message,
              })),
            },
          });
        if (error instanceof Error && error.message === 'OBJECT_TOO_LARGE')
          return reply.code(413).send({
            error: {
              code: 'OBJECT_TOO_LARGE',
              message:
                'La leçon dépasse 64 Mio. Réduisez sa durée ou le nombre de séquences.',
            },
          });
        if (
          error instanceof Error &&
          'statusCode' in error &&
          error.statusCode === 413
        )
          return reply.code(413).send({
            error: {
              code: 'PAYLOAD_TOO_LARGE',
              message: 'Fichier trop volumineux.',
            },
          });
        if (
          error instanceof Error &&
          'statusCode' in error &&
          typeof error.statusCode === 'number' &&
          error.statusCode >= 400 &&
          error.statusCode < 500
        )
          return reply.code(error.statusCode).send({
            error: { code: 'INVALID_REQUEST', message: 'Requête invalide.' },
          });
        // Never log raw SQL errors, payloads, cookies, tokens or callback query strings.
        app.log.error(
          { requestId: _req.id, code: 'INTERNAL_ERROR' },
          'Platform request failed',
        );
        return reply.code(500).send({
          error: {
            code: 'INTERNAL_ERROR',
            message: 'La requête n’a pas pu être traitée.',
          },
        });
      });
      await registerAuth(api, service, options);
      api.get('/me', async (req) => {
        const v = viewer(req);
        return {
          user: {
            id: v.id,
            displayName: v.displayName,
            platformAdmin: v.platformAdmin,
          },
          csrf: v.csrf,
        };
      });
      api.get('/me/teams', async (req) =>
        service.db.query(
          'SELECT t.id,t.name,t.age_division,t.season_id,t.organization_id,m.role FROM teams t JOIN memberships m ON m.team_id=t.id WHERE m.user_id=$1 AND m.active=true ORDER BY t.name,t.id LIMIT $2 OFFSET $3',
          [viewer(req).id, ...pagination(req)],
        ),
      );
      api.post('/teams', async (req, reply) => {
        const v = viewer(req),
          body = z
            .strictObject({
              name: z.string().trim().min(1).max(120),
              ageDivision: z.enum(['M11', 'M13', 'M15', 'M18']),
              seasonId: z.string().min(1).max(60),
            })
            .parse(req.body);
        const result = await service.db.transaction(async (tx) => {
          await tx.query('SELECT id FROM users WHERE id=$1 FOR UPDATE', [v.id]);
          return service.idempotent(
            tx,
            v,
            'create-team',
            key(req),
            body,
            async () => {
              const id = randomUUID();
              const row = (
                await tx.query(
                  'INSERT INTO teams(id,name,age_division,season_id) VALUES($1,$2,$3,$4) RETURNING *',
                  [id, body.name, body.ageDivision, body.seasonId],
                )
              )[0]!;
              await tx.query(
                "INSERT INTO memberships(team_id,user_id,role) VALUES($1,$2,'TEAM_ADMIN')",
                [id, v.id],
              );
              await service.audit(tx, v, id, 'TEAM_CREATED', id);
              return row;
            },
          );
        });
        return reply.code(201).send(result);
      });
      api.get('/teams/:teamId/entitlements', async (req) => {
        const { teamId } = params(req);
        await service.membership(service.db, viewer(req), teamId!);
        return service.entitlement(service.db, teamId!);
      });
      api.get('/teams/:teamId/projects', async (req) => {
        const { teamId } = params(req);
        await service.membership(service.db, viewer(req), teamId!, 'read');
        return service.db.query(
          'SELECT * FROM projects WHERE team_id=$1 ORDER BY created_at,id LIMIT $2 OFFSET $3',
          [teamId, ...pagination(req)],
        );
      });
      api.post('/teams/:teamId/projects', async (req, reply) => {
        const { teamId } = params(req),
          v = viewer(req),
          body = CreateProjectSchema.parse(req.body);
        const result = await service.db.transaction(async (tx) => {
          await service.teamLock(tx, teamId!);
          await service.membership(tx, v, teamId!, 'edit');
          return service.idempotent(
            tx,
            v,
            'create-project:' + teamId,
            key(req),
            body,
            async () => {
              if (!(await service.entitlement(tx, teamId!)).canCreate)
                throw new Problem(
                  409,
                  'PROJECT_QUOTA_EXCEEDED',
                  'Le plan Free autorise un seul projet non archivé. Archivez-le ou utilisez Pro.',
                );
              const row = (
                await tx.query(
                  'INSERT INTO projects(id,team_id,name,scope) VALUES($1,$2,$3,$4) RETURNING *',
                  [randomUUID(), teamId, body.name, body.scope],
                )
              )[0]!;
              if (body.catalogId) {
                const item = required(
                  (
                    await tx.query('SELECT * FROM catalog WHERE id=$1', [
                      body.catalogId,
                    ])
                  )[0],
                );
                if (item.category !== body.scope)
                  throw new Problem(422, 'PROJECT_SCOPE_MISMATCH');
                const published = item.payload as {
                  sequences: import('@hockey-iq/contracts').SequenceV12[];
                };
                const source = published.sequences[0]!;
                const systemId = randomUUID();
                const scenario = {
                  schemaVersion: 2,
                  name: body.name,
                  systemId,
                  systemVersion: 1,
                  controlledTeamId: source.controlledTeamId,
                  scenario: source.scenarioSnapshot,
                };
                for (const [kind, id, payload] of [
                  ['system', systemId, source.systemSnapshot],
                  ['scenario', randomUUID(), scenario],
                ] as const) {
                  const valid = await service.validateResource(
                    tx,
                    teamId!,
                    row,
                    kind,
                    payload,
                  );
                  const resource = (
                    await tx.query(
                      'INSERT INTO resources(id,team_id,project_id,kind,name,payload) VALUES($1,$2,$3,$4,$5,$6) RETURNING *',
                      [
                        id,
                        teamId,
                        row.id,
                        kind,
                        valid.name,
                        JSON.stringify(valid),
                      ],
                    )
                  )[0]!;
                  await service.writeVersion(tx, v, resource, valid);
                }
              }
              await service.audit(
                tx,
                v,
                teamId!,
                'PROJECT_CREATED',
                String(row.id),
              );
              return row;
            },
          );
        });
        return reply.code(201).send(result);
      });
      api.get('/teams/:teamId/projects/:projectId', async (req) => {
        const { teamId, projectId } = params(req);
        await service.membership(service.db, viewer(req), teamId!, 'read');
        const project = required(
          (
            await service.db.query(
              'SELECT * FROM projects WHERE id=$1 AND team_id=$2',
              [projectId, teamId],
            )
          )[0],
        );
        return {
          ...project,
          resources: await service.db.query(
            'SELECT * FROM resources WHERE team_id=$1 AND project_id=$2 ORDER BY created_at,id',
            [teamId, projectId],
          ),
          versions: await service.db.query(
            'SELECT v.id,v.resource_id,v.version,v.kind,v.checksum,v.created_at FROM resource_versions v JOIN resources r ON r.id=v.resource_id WHERE v.team_id=$1 AND r.project_id=$2 ORDER BY v.version',
            [teamId, projectId],
          ),
        };
      });
      api.patch('/teams/:teamId/projects/:projectId', async (req) => {
        const { teamId, projectId } = params(req),
          v = viewer(req),
          body = ProjectPatchSchema.parse(req.body);
        return service.db.transaction(async (tx) => {
          await service.teamLock(tx, teamId!);
          await service.membership(tx, v, teamId!, 'edit');
          const project = await service.editableProject(
            tx,
            teamId!,
            projectId!,
          );
          if (project.revision !== body.revision)
            throw new Problem(409, 'REVISION_CONFLICT');
          const row = (
            await tx.query(
              'UPDATE projects SET name=$1,revision=revision+1 WHERE id=$2 RETURNING *',
              [body.name, projectId],
            )
          )[0]!;
          await service.audit(tx, v, teamId!, 'PROJECT_UPDATED', projectId!);
          return row;
        });
      });
      for (const action of ['archive', 'activate'] as const)
        api.post(
          '/teams/:teamId/projects/:projectId/' + action,
          async (req) => {
            const { teamId, projectId } = params(req),
              v = viewer(req);
            return service.db.transaction(async (tx) => {
              await service.teamLock(tx, teamId!);
              await service.membership(tx, v, teamId!, 'edit');
              const project = required(
                (
                  await tx.query(
                    'SELECT * FROM projects WHERE id=$1 AND team_id=$2',
                    [projectId, teamId],
                  )
                )[0],
              );
              if (
                action === 'activate' &&
                project.status === 'ARCHIVED' &&
                !(await service.entitlement(tx, teamId!)).canCreate
              )
                throw new Problem(409, 'PROJECT_QUOTA_EXCEEDED');
              const row = (
                await tx.query(
                  'UPDATE projects SET status=$1,revision=revision+1 WHERE id=$2 RETURNING *',
                  [action === 'archive' ? 'ARCHIVED' : 'ACTIVE', projectId],
                )
              )[0]!;
              await service.audit(
                tx,
                v,
                teamId!,
                'PROJECT_' + action.toUpperCase(),
                projectId!,
              );
              return row;
            });
          },
        );
      api.post('/teams/:teamId/subscription/retain-project', async (req) => {
        const { teamId } = params(req),
          v = viewer(req),
          body = z.strictObject({ keepProjectId: PlatformId }).parse(req.body);
        return service.db.transaction(async (tx) => {
          await service.teamLock(tx, teamId!);
          await service.membership(tx, v, teamId!, 'plan');
          return service.idempotent(
            tx,
            v,
            'retain-project:' + teamId,
            key(req),
            body,
            async () => {
              if ((await service.entitlement(tx, teamId!)).plan !== 'FREE')
                throw new Problem(409, 'FREE_PLAN_REQUIRED');
              const kept = required(
                (
                  await tx.query(
                    "SELECT id FROM projects WHERE id=$1 AND team_id=$2 AND status<>'ARCHIVED'",
                    [body.keepProjectId, teamId],
                  )
                )[0],
              );
              await tx.query(
                "UPDATE projects SET status='ARCHIVED',revision=revision+1 WHERE team_id=$1 AND id<>$2 AND status<>'ARCHIVED'",
                [teamId, kept.id],
              );
              await tx.query(
                "UPDATE projects SET status='ACTIVE',revision=revision+1 WHERE id=$1",
                [kept.id],
              );
              await service.audit(
                tx,
                v,
                teamId!,
                'FREE_PROJECT_SELECTED',
                String(kept.id),
              );
              return service.entitlement(tx, teamId!);
            },
          );
        });
      });
      api.post('/teams/:teamId/subscription/simulate', async (req) => {
        if (!options.demoAuth) throw new Problem(404, 'NOT_FOUND');
        const { teamId } = params(req),
          v = viewer(req),
          body = PlanChangeSchema.parse(req.body);
        return service.db.transaction(async (tx) => {
          await service.teamLock(tx, teamId!);
          await service.membership(tx, v, teamId!, 'plan');
          const active = await tx.query(
            "SELECT * FROM projects WHERE team_id=$1 AND status<>'ARCHIVED' ORDER BY id",
            [teamId],
          );
          if (body.plan === 'FREE' && active.length > 1 && !body.keepProjectId)
            throw new Problem(409, 'DOWNGRADE_SELECTION_REQUIRED');
          if (
            body.keepProjectId &&
            !active.some((p) => p.id === body.keepProjectId)
          )
            throw new Problem(400, 'INVALID_KEEP_PROJECT');
          if (body.plan === 'FREE' && active.length > 1)
            await tx.query(
              "UPDATE projects SET status='ARCHIVED',revision=revision+1 WHERE team_id=$1 AND id<>$2",
              [teamId, body.keepProjectId],
            );
          await tx.query(
            'UPDATE teams SET plan_code=$1,subscription_status=$2,season_id=$3,effective_from=$4,effective_to=$5 WHERE id=$6',
            [
              body.plan,
              body.plan === 'FREE' ? 'FREE' : 'ACTIVE',
              body.seasonId,
              service.now().toISOString(),
              body.plan === 'FREE'
                ? null
                : new Date(
                    service.now().getTime() + 365 * 86400_000,
                  ).toISOString(),
              teamId,
            ],
          );
          await service.audit(tx, v, teamId!, 'DEMO_PLAN_CHANGED', teamId!);
          return service.entitlement(tx, teamId!);
        });
      });
      api.post(
        '/teams/:teamId/projects/:projectId/:collection',
        async (req, reply) => {
          const { teamId, projectId, collection } = params(req),
            kind = collections[collection!];
          if (!kind) throw new Problem(404, 'NOT_FOUND');
          const v = viewer(req);
          const result = await service.db.transaction(async (tx) => {
            await service.teamLock(tx, teamId!);
            await service.membership(tx, v, teamId!, 'edit');
            const project = await service.editableProject(
              tx,
              teamId!,
              projectId!,
            );
            return service.idempotent(
              tx,
              v,
              `create-${collection}:${projectId}`,
              key(req),
              req.body,
              async () => {
                const payload = await service.validateResource(
                  tx,
                  teamId!,
                  project,
                  kind,
                  req.body,
                );
                const row = (
                  await tx.query(
                    'INSERT INTO resources(id,team_id,project_id,kind,name,payload) VALUES($1,$2,$3,$4,$5,$6) RETURNING *',
                    [
                      randomUUID(),
                      teamId,
                      projectId,
                      kind,
                      payload.name,
                      JSON.stringify(payload),
                    ],
                  )
                )[0]!;
                if (kind !== 'lesson')
                  await service.writeVersion(tx, v, row, payload);
                await service.audit(
                  tx,
                  v,
                  teamId!,
                  'RESOURCE_CREATED',
                  String(row.id),
                );
                return row;
              },
            );
          });
          return reply.code(201).send(result);
        },
      );
      api.patch(
        '/teams/:teamId/projects/:projectId/:collection/:resourceId',
        async (req) => {
          const { teamId, projectId, collection, resourceId } = params(req),
            kind = collections[collection!],
            v = viewer(req);
          if (!kind) throw new Problem(404, 'NOT_FOUND');
          if (kind === 'sequence') throw new Problem(409, 'IMMUTABLE_SEQUENCE');
          const body = z
            .strictObject({
              revision: z.number().int().positive(),
              payload: z.unknown(),
            })
            .parse(req.body);
          return service.db.transaction(async (tx) => {
            await service.teamLock(tx, teamId!);
            await service.membership(tx, v, teamId!, 'edit');
            const project = await service.editableProject(
              tx,
              teamId!,
              projectId!,
            );
            const old = required(
              (
                await tx.query(
                  'SELECT * FROM resources WHERE id=$1 AND team_id=$2 AND project_id=$3 AND kind=$4 FOR UPDATE',
                  [resourceId, teamId, projectId, kind],
                )
              )[0],
            );
            if (old.revision !== body.revision)
              throw new Problem(409, 'REVISION_CONFLICT');
            const payload = await service.validateResource(
              tx,
              teamId!,
              project,
              kind,
              body.payload,
            );
            const row = (
              await tx.query(
                'UPDATE resources SET payload=$1,name=$2,revision=revision+1 WHERE id=$3 RETURNING *',
                [JSON.stringify(payload), payload.name, resourceId],
              )
            )[0]!;
            if (kind !== 'lesson')
              await service.writeVersion(tx, v, row, payload);
            await service.audit(
              tx,
              v,
              teamId!,
              'RESOURCE_UPDATED',
              resourceId!,
            );
            return row;
          });
        },
      );
      api.get(
        '/teams/:teamId/systems/:systemId/versions/:version',
        async (req) => {
          const p = z
            .object({
              teamId: PlatformId,
              systemId: PlatformId,
              version: z.coerce.number().int().positive(),
            })
            .parse(req.params);
          await service.membership(service.db, viewer(req), p.teamId, 'read');
          const row = await service.version(
            service.db,
            p.teamId,
            p.systemId,
            p.version,
          );
          if (row.kind !== 'system') throw new Problem(404, 'NOT_FOUND');
          return row;
        },
      );
      api.post('/teams/:teamId/systems/validate', async (req) => {
        const { teamId } = params(req);
        await service.membership(service.db, viewer(req), teamId!, 'edit');
        return validateSystem(req.body);
      });
      api.post(
        '/teams/:teamId/lessons/:lessonId/publish',
        async (req, reply) => {
          const { teamId, lessonId } = params(req),
            v = viewer(req),
            body = z
              .strictObject({ revision: z.number().int().positive() })
              .parse(req.body);
          const result = await service.db.transaction(async (tx) => {
            await service.teamLock(tx, teamId!);
            await service.membership(tx, v, teamId!, 'publish');
            return service.idempotent(
              tx,
              v,
              'publish:' + lessonId,
              key(req),
              body,
              async () => {
                const lesson = required(
                  (
                    await tx.query(
                      'SELECT revision FROM resources WHERE id=$1 AND team_id=$2',
                      [lessonId, teamId],
                    )
                  )[0],
                );
                if (lesson.revision !== body.revision)
                  throw new Problem(409, 'REVISION_CONFLICT');
                const version = await service.publishLesson(
                  tx,
                  v,
                  teamId!,
                  lessonId!,
                );
                await service.audit(
                  tx,
                  v,
                  teamId!,
                  'LESSON_PUBLISHED',
                  String(version.id),
                );
                return version;
              },
            );
          });
          return reply.code(201).send(result);
        },
      );
      api.get('/teams/:teamId/versions/:versionId', async (req) => {
        const { teamId, versionId } = params(req);
        await service.membership(service.db, viewer(req), teamId!, 'read');
        return required(
          (
            await service.db.query(
              'SELECT * FROM resource_versions WHERE id=$1 AND team_id=$2',
              [versionId, teamId],
            )
          )[0],
        );
      });
      const assignmentBody = z.strictObject({
        versionId: PlatformId.nullable().default(null),
        targetUserIds: z.array(PlatformId).max(100).default([]),
        dueAt: z.iso.datetime().nullable().default(null),
      });
      async function assign(req: FastifyRequest, catalogId: string | null) {
        const { teamId } = params(req),
          v = viewer(req),
          body = assignmentBody.parse(req.body);
        return service.db.transaction(async (tx) => {
          await service.teamLock(tx, teamId!);
          await service.membership(tx, v, teamId!, 'assign');
          return service.idempotent(
            tx,
            v,
            'assign:' + teamId + ':' + (catalogId ?? body.versionId),
            key(req),
            body,
            async () => {
              if (catalogId)
                required(
                  (
                    await tx.query('SELECT id FROM catalog WHERE id=$1', [
                      catalogId,
                    ])
                  )[0],
                );
              else if (
                !body.versionId ||
                !(
                  await tx.query(
                    "SELECT id FROM resource_versions WHERE id=$1 AND team_id=$2 AND kind='lesson'",
                    [body.versionId, teamId],
                  )
                ).length
              )
                throw new Problem(404, 'NOT_FOUND');
              const targets = body.targetUserIds.length
                ? [...new Set(body.targetUserIds)]
                : [null];
              const results = [];
              for (const target of targets) {
                if (
                  target &&
                  !(
                    await tx.query(
                      "SELECT user_id FROM memberships WHERE team_id=$1 AND user_id=$2 AND active=true AND role='PLAYER'",
                      [teamId, target],
                    )
                  ).length
                )
                  throw new Problem(422, 'INVALID_ASSIGNMENT_TARGET');
                const row = (
                  await tx.query(
                    'INSERT INTO assignments(id,team_id,lesson_version_id,catalog_id,target_user_id,assigned_by,due_at) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *',
                    [
                      randomUUID(),
                      teamId,
                      catalogId ? null : body.versionId,
                      catalogId,
                      target,
                      v.id,
                      body.dueAt,
                    ],
                  )
                )[0]!;
                await service.audit(
                  tx,
                  v,
                  teamId!,
                  'LESSON_ASSIGNED',
                  String(row.id),
                );
                results.push(row);
              }
              return results;
            },
          );
        });
      }
      api.post(
        '/teams/:teamId/lessons/:lessonId/assign',
        async (req, reply) => {
          const { teamId, lessonId } = params(req),
            body = assignmentBody.parse(req.body);
          await service.membership(service.db, viewer(req), teamId!, 'assign');
          if (
            !(
              await service.db.query(
                'SELECT id FROM resource_versions WHERE id=$1 AND resource_id=$2 AND team_id=$3',
                [body.versionId, lessonId, teamId],
              )
            ).length
          )
            throw new Problem(404, 'NOT_FOUND');
          return reply.code(201).send(await assign(req, null));
        },
      );
      api.get('/catalog', async (req) => {
        const query = z
          .strictObject({
            category: z.enum(['breakout', 'forecheck']).optional(),
            limit: z.coerce.number().int().min(1).max(100).default(50),
            offset: z.coerce.number().int().min(0).default(0),
          })
          .parse(req.query);
        return service.db.query(
          'SELECT id,name,category,template,version,checksum FROM catalog WHERE ($1::text IS NULL OR category=$1) ORDER BY name LIMIT $2 OFFSET $3',
          [query.category ?? null, query.limit, query.offset],
        );
      });
      api.get('/catalog/:catalogId', async (req) =>
        required(
          (
            await service.db.query('SELECT * FROM catalog WHERE id=$1', [
              params(req).catalogId,
            ])
          )[0],
        ),
      );
      api.post('/teams/:teamId/catalog/:catalogId/assign', async (req, reply) =>
        reply.code(201).send(await assign(req, params(req).catalogId!)),
      );
      api.get('/me/lessons', async (req) =>
        service.db.query(
          `SELECT a.id,a.team_id,a.lesson_version_id,a.catalog_id,a.due_at,t.name AS team_name,COALESCE(v.payload->>'name',c.name) AS name,COALESCE(p.status,'NOT_STARTED') AS status,COALESCE(p.watched_ticks,0) AS watched_ticks FROM assignments a JOIN memberships m ON m.team_id=a.team_id AND m.user_id=$1 AND m.active=true JOIN teams t ON t.id=a.team_id LEFT JOIN resource_versions v ON v.id=a.lesson_version_id LEFT JOIN catalog c ON c.id=a.catalog_id LEFT JOIN progress p ON p.assignment_id=a.id AND p.user_id=$1 WHERE a.target_user_id IS NULL OR a.target_user_id=$1 ORDER BY a.created_at DESC,a.id LIMIT $2 OFFSET $3`,
          [viewer(req).id, ...pagination(req)],
        ),
      );
      async function readableAssignment(req: FastifyRequest) {
        const v = viewer(req),
          id = params(req).assignmentId!;
        const row = required(
          (
            await service.db.query('SELECT * FROM assignments WHERE id=$1', [
              id,
            ])
          )[0],
        );
        await service.membership(service.db, v, String(row.team_id));
        if (!canReadAssignment(v.id, row.target_user_id as string | null))
          throw new Problem(404, 'NOT_FOUND');
        return row;
      }
      api.get('/me/lessons/:assignmentId', async (req) => {
        const assignment = await readableAssignment(req);
        const row = assignment.catalog_id
          ? required(
              (
                await service.db.query(
                  'SELECT payload,checksum FROM catalog WHERE id=$1',
                  [assignment.catalog_id],
                )
              )[0],
            )
          : required(
              (
                await service.db.query(
                  'SELECT payload,checksum,blob_key FROM resource_versions WHERE id=$1 AND team_id=$2',
                  [assignment.lesson_version_id, assignment.team_id],
                )
              )[0],
            );
        await service.audit(
          service.db,
          viewer(req),
          String(assignment.team_id),
          'LESSON_OPENED',
          String(assignment.id),
        );
        const payload = row.blob_key
          ? await service.blobs.get(String(row.blob_key))
          : row.payload;
        if (hashValue(payload) !== row.checksum)
          throw new Problem(500, 'CHECKSUM_MISMATCH');
        return { assignment, payload, checksum: row.checksum };
      });
      api.patch('/me/lesson-progress/:assignmentId', async (req) => {
        const assignment = await readableAssignment(req),
          v = viewer(req),
          body = ProgressSchema.parse(req.body);
        return service.db.transaction(async (tx) => {
          const row = (
            await tx.query(
              `INSERT INTO progress(assignment_id,user_id,status,watched_ticks) VALUES($1,$2,$3,$4) ON CONFLICT(assignment_id,user_id) DO UPDATE SET status=CASE WHEN progress.status='COMPLETED' THEN 'COMPLETED' ELSE EXCLUDED.status END,watched_ticks=GREATEST(progress.watched_ticks,EXCLUDED.watched_ticks),updated_at=now() RETURNING *`,
              [assignment.id, v.id, body.status, body.watchedTicks],
            )
          )[0]!;
          return row;
        });
      });
      api.get('/teams/:teamId/completions', async (req) => {
        const { teamId } = params(req);
        await service.membership(service.db, viewer(req), teamId!, 'assign');
        return service.db.query(
          'SELECT a.id AS assignment_id,u.id AS user_id,u.display_name,p.status,p.watched_ticks,p.updated_at FROM progress p JOIN assignments a ON a.id=p.assignment_id JOIN users u ON u.id=p.user_id WHERE a.team_id=$1 ORDER BY p.updated_at DESC,a.id,u.id LIMIT $2 OFFSET $3',
          [teamId, ...pagination(req)],
        );
      });
      api.get('/teams/:teamId/members', async (req) => {
        const { teamId } = params(req);
        await service.membership(service.db, viewer(req), teamId!, 'assign');
        return service.db.query(
          'SELECT m.user_id,m.role,m.active,u.display_name FROM memberships m JOIN users u ON u.id=m.user_id WHERE m.team_id=$1 ORDER BY u.display_name,u.id LIMIT $2 OFFSET $3',
          [teamId, ...pagination(req)],
        );
      });
      api.patch('/teams/:teamId/members/:userId', async (req) => {
        const { teamId, userId } = params(req),
          v = viewer(req),
          body = z
            .strictObject({
              role: z.enum(['TEAM_ADMIN', 'COACH', 'PLAYER']),
              active: z.boolean(),
            })
            .parse(req.body);
        return service.db.transaction(async (tx) => {
          await service.teamLock(tx, teamId!);
          await service.membership(tx, v, teamId!, 'members');
          const member = required(
            (
              await tx.query(
                'SELECT * FROM memberships WHERE team_id=$1 AND user_id=$2',
                [teamId, userId],
              )
            )[0],
          );
          if (
            member.role === 'TEAM_ADMIN' &&
            (!body.active || body.role !== 'TEAM_ADMIN') &&
            (
              await tx.query(
                "SELECT user_id FROM memberships WHERE team_id=$1 AND role='TEAM_ADMIN' AND active=true",
                [teamId],
              )
            ).length <= 1
          )
            throw new Problem(409, 'LAST_TEAM_ADMIN');
          await tx.query(
            'UPDATE memberships SET role=$1,active=$2 WHERE team_id=$3 AND user_id=$4',
            [body.role, body.active, teamId, userId],
          );
          await service.audit(tx, v, teamId!, 'MEMBERSHIP_CHANGED', userId!);
          return { ok: true };
        });
      });
      api.post('/teams/:teamId/invitations', async (req, reply) => {
        const { teamId } = params(req),
          v = viewer(req),
          body = z
            .strictObject({
              role: TeamRoleSchema.exclude(['PLATFORM_ADMIN']),
              expiresInHours: z.number().int().min(1).max(168).default(48),
            })
            .parse(req.body);
        const result = await service.db.transaction(async (tx) => {
          await service.membership(tx, v, teamId!, 'members');
          const token = secret(),
            id = randomUUID(),
            expiresAt = new Date(
              service.now().getTime() + body.expiresInHours * 3600_000,
            ).toISOString();
          await tx.query(
            'INSERT INTO invitations(id,team_id,token_hash,role,expires_at,created_by) VALUES($1,$2,$3,$4,$5,$6)',
            [id, teamId, tokenHash(token), body.role, expiresAt, v.id],
          );
          await service.audit(tx, v, teamId!, 'INVITATION_CREATED', id);
          return { id, token, expiresAt };
        });
        return reply.code(201).send(result);
      });
      api.post(
        '/teams/:teamId/invitations/:invitationId/revoke',
        async (req) => {
          const { teamId, invitationId } = params(req),
            v = viewer(req);
          return service.db.transaction(async (tx) => {
            await service.membership(tx, v, teamId!, 'members');
            const row = (
              await tx.query(
                'UPDATE invitations SET revoked_at=$1 WHERE id=$2 AND team_id=$3 RETURNING id',
                [service.now().toISOString(), invitationId, teamId],
              )
            )[0];
            required(row);
            await service.audit(
              tx,
              v,
              teamId!,
              'INVITATION_REVOKED',
              invitationId!,
            );
            return { ok: true };
          });
        },
      );
      api.post('/invitations/accept', async (req) => {
        const v = viewer(req),
          body = z
            .strictObject({ token: z.string().min(20).max(200) })
            .parse(req.body);
        return service.db.transaction(async (tx) => {
          const invite = (
            await tx.query(
              'SELECT * FROM invitations WHERE token_hash=$1 FOR UPDATE',
              [tokenHash(body.token)],
            )
          )[0];
          if (
            !invite ||
            invite.used_at ||
            invite.revoked_at ||
            new Date(String(invite.expires_at)) <= service.now()
          )
            throw new Problem(400, 'INVALID_INVITATION');
          if (
            (
              await tx.query(
                'SELECT user_id FROM memberships WHERE team_id=$1 AND user_id=$2',
                [invite.team_id, v.id],
              )
            ).length
          )
            throw new Problem(409, 'MEMBERSHIP_EXISTS');
          await tx.query(
            'INSERT INTO memberships(team_id,user_id,role) VALUES($1,$2,$3)',
            [invite.team_id, v.id, invite.role],
          );
          await tx.query('UPDATE invitations SET used_at=$1 WHERE id=$2', [
            service.now().toISOString(),
            invite.id,
          ]);
          await service.audit(
            tx,
            v,
            String(invite.team_id),
            'INVITATION_ACCEPTED',
            String(invite.id),
          );
          return { teamId: invite.team_id };
        });
      });
      api.get('/teams/:teamId/audit', async (req) => {
        const { teamId } = params(req);
        await service.membership(service.db, viewer(req), teamId!, 'members');
        return service.db.query(
          'SELECT id,action,target_id,created_at FROM audit_events WHERE team_id=$1 ORDER BY created_at DESC,id LIMIT $2 OFFSET $3',
          [teamId, ...pagination(req)],
        );
      });
      api.post('/catalog', async (req, reply) => {
        const v = viewer(req);
        if (!v.platformAdmin || !permitted('PLATFORM_ADMIN', 'catalogue'))
          throw new Problem(403, 'FORBIDDEN');
        const body = z
          .strictObject({
            name: z.string().min(1).max(120),
            category: z.enum(['breakout', 'forecheck']),
            template: z.string().max(80),
            payload: z.unknown(),
            sourceId: PlatformId.optional(),
          })
          .parse(req.body);
        // Catalogue publication uses the same complete, frozen sequence validation as private lessons.
        const lesson = z
          .strictObject({
            schemaVersion: z.literal(2),
            name: z.string().min(1).max(120),
            description: z.string().max(4000),
            sequences: z.array(z.unknown()).min(1).max(12),
          })
          .parse(body.payload);
        const { validateFrozenSequence } = await import('@hockey-iq/replay');
        for (const seq of lesson.sequences) validateFrozenSequence(seq);
        const id = randomUUID();
        const result = await service.db.transaction(async (tx) => {
          await tx.query('SELECT id FROM users WHERE id=$1 FOR UPDATE', [v.id]);
          return service.idempotent(
            tx,
            v,
            'publish-catalog',
            key(req),
            body,
            async () => {
              const source = body.sourceId
                ? required(
                    (
                      await tx.query('SELECT * FROM catalog WHERE id=$1', [
                        body.sourceId,
                      ])
                    )[0],
                  )
                : null;
              const series = String(source?.series_id ?? source?.id ?? id);
              const version = Number(
                (
                  await tx.query(
                    'SELECT COALESCE(max(version),0)+1 AS next FROM catalog WHERE COALESCE(series_id,id)=$1',
                    [series],
                  )
                )[0]!.next,
              );
              if (
                lesson.sequences.some((seq) => {
                  const s = validateFrozenSequence(seq);
                  return (
                    s.systemSnapshot.template !== body.template ||
                    (body.category === 'forecheck') !==
                      (s.systemSnapshot.template === 'FORECHECK_212')
                  );
                })
              )
                throw new Problem(422, 'CATALOG_SCOPE_MISMATCH');
              await tx.query(
                'INSERT INTO catalog(id,name,category,template,version,payload,checksum,created_by,series_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',
                [
                  id,
                  body.name,
                  body.category,
                  body.template,
                  version,
                  JSON.stringify(lesson),
                  hashValue(lesson),
                  v.id,
                  series,
                ],
              );
              await service.audit(tx, v, null, 'CATALOG_PUBLISHED', id);
              return { id };
            },
          );
        });
        return reply.code(201).send(result);
      });
    },
    { prefix: '/api/v1' },
  );
}
