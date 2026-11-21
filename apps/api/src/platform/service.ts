import { randomBytes, randomUUID, createHash } from 'node:crypto';
import type { Database, Sql } from './db.js';
import type { Blobs } from './blobs.js';
import { permitted, type Capability } from '@hockey-iq/authz';
import {
  effectivePlan,
  projectCapacity,
  type Entitlement,
} from '@hockey-iq/entitlements';
import {
  TacticalSystemSchema,
  PlatformScenarioSchema,
  LessonDraftSchema,
  SequenceV12Schema,
  type TeamRole,
  type TacticalSystem,
  type PlatformScenario,
  type SequenceV12,
  type LessonDraft,
} from '@hockey-iq/contracts';
import {
  validateSystem,
  templateSystem,
  TEMPLATE_NAMES,
} from '@hockey-iq/play-systems';
import { templateScenario } from '@hockey-iq/scenario-schema';
import { TacticalSimulation, hashValue } from '@hockey-iq/tactical-engine';
import { validateFrozenSequence } from '@hockey-iq/replay';
export class Problem extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message = code,
  ) {
    super(message);
  }
}
export type Row = Record<string, unknown>;
export interface Viewer {
  id: string;
  displayName: string;
  platformAdmin: boolean;
  csrf: string;
  sessionHash: string;
}
export const tokenHash = (value: string) =>
  createHash('sha256').update(value).digest('hex');
export const secret = () => randomBytes(32).toString('base64url');
export function required<T>(value: T | undefined, code = 'NOT_FOUND'): T {
  if (value === undefined) throw new Problem(404, code);
  return value;
}
export class PlatformService {
  constructor(
    readonly db: Database,
    readonly blobs: Blobs,
    readonly now: () => Date = () => new Date(),
  ) {}
  async membership(
    tx: Sql,
    viewer: Viewer,
    teamId: string,
    capability?: Capability,
  ) {
    const member = (
      await tx.query(
        'SELECT * FROM memberships WHERE team_id=$1 AND user_id=$2 AND active=true',
        [teamId, viewer.id],
      )
    )[0];
    if (!member) throw new Problem(404, 'NOT_FOUND');
    if (capability && !permitted(member.role as TeamRole, capability))
      throw new Problem(403, 'FORBIDDEN');
    return member;
  }
  async teamLock(tx: Sql, teamId: string) {
    return required(
      (
        await tx.query('SELECT * FROM teams WHERE id=$1 FOR UPDATE', [teamId])
      )[0],
    );
  }
  async entitlement(tx: Sql, teamId: string) {
    const team = required(
      (await tx.query('SELECT * FROM teams WHERE id=$1', [teamId]))[0],
    );
    const plan = effectivePlan(
      {
        planCode: team.plan_code,
        subscriptionStatus: team.subscription_status,
        effectiveFrom: team.effective_from
          ? new Date(String(team.effective_from)).toISOString()
          : null,
        effectiveTo: team.effective_to
          ? new Date(String(team.effective_to)).toISOString()
          : null,
        seasonId: team.season_id,
      } as Entitlement,
      this.now(),
    );
    const rows = await tx.query(
      "SELECT count(*)::int AS used FROM projects WHERE team_id=$1 AND status<>'ARCHIVED'",
      [teamId],
    );
    return {
      ...projectCapacity(plan, Number(rows[0]!.used)),
      season: team.season_id,
      subscriptionStatus: team.subscription_status,
      proposedSeasonPriceCAD: Number(
        process.env.PROPOSED_SEASON_PRICE_CAD ?? 49,
      ),
      priceFinalized: false,
    };
  }
  async audit(
    tx: Sql,
    viewer: Viewer,
    teamId: string | null,
    action: string,
    id: string,
  ) {
    await tx.query(
      'INSERT INTO audit_events(id,actor_id,team_id,action,target_id) VALUES($1,$2,$3,$4,$5)',
      [randomUUID(), viewer.id, teamId, action, id],
    );
  }
  async idempotent(
    tx: Sql,
    viewer: Viewer,
    operation: string,
    key: unknown,
    body: unknown,
    work: () => Promise<unknown>,
  ) {
    if (typeof key !== 'string' || !/^[a-zA-Z0-9_-]{8,120}$/.test(key))
      throw new Problem(400, 'IDEMPOTENCY_KEY_REQUIRED');
    const digest = hashValue(body),
      previous = (
        await tx.query(
          'SELECT * FROM idempotency WHERE actor_id=$1 AND operation=$2 AND key=$3',
          [viewer.id, operation, key],
        )
      )[0];
    if (previous) {
      if (previous.body_hash !== digest)
        throw new Problem(409, 'IDEMPOTENCY_KEY_REUSED');
      return previous.result;
    }
    const result = await work();
    await tx.query(
      'INSERT INTO idempotency(actor_id,operation,key,body_hash,result) VALUES($1,$2,$3,$4,$5)',
      [viewer.id, operation, key, digest, JSON.stringify(result)],
    );
    return result;
  }
  async editableProject(tx: Sql, teamId: string, id: string) {
    const p = required(
      (
        await tx.query('SELECT * FROM projects WHERE id=$1 AND team_id=$2', [
          id,
          teamId,
        ])
      )[0],
    );
    if (p.status === 'ARCHIVED') throw new Problem(409, 'PROJECT_ARCHIVED');
    const capacity = await this.entitlement(tx, teamId);
    if (capacity.plan === 'FREE' && capacity.used > 1)
      throw new Problem(409, 'DOWNGRADE_SELECTION_REQUIRED');
    return p;
  }
  async version(tx: Sql, teamId: string, resourceId: string, version: number) {
    return required(
      (
        await tx.query(
          'SELECT * FROM resource_versions WHERE resource_id=$1 AND team_id=$2 AND version=$3',
          [resourceId, teamId, version],
        )
      )[0],
    );
  }
  async validateResource(
    tx: Sql,
    teamId: string,
    project: Row,
    kind: string,
    raw: unknown,
  ) {
    if (kind === 'system') {
      const value = TacticalSystemSchema.parse(raw);
      if (
        (value.template === 'FORECHECK_212' ? 'forecheck' : 'breakout') !==
        project.scope
      )
        throw new Problem(422, 'PROJECT_SCOPE_MISMATCH');
      const validation = validateSystem(value);
      if (!validation.valid)
        throw new Problem(
          422,
          'SYSTEM_CONFLICT',
          validation.issues.map((x) => x.message).join(' '),
        );
      return value;
    }
    if (kind === 'scenario') {
      const value = PlatformScenarioSchema.parse(raw),
        system = await this.version(
          tx,
          teamId,
          value.systemId,
          value.systemVersion,
        );
      const source = required(
        (
          await tx.query(
            'SELECT project_id,kind FROM resources WHERE id=$1 AND team_id=$2',
            [value.systemId, teamId],
          )
        )[0],
      );
      if (
        source.project_id !== project.id ||
        source.kind !== 'system' ||
        system.kind !== 'system'
      )
        throw new Problem(422, 'PROJECT_SCOPE_MISMATCH');
      return value;
    }
    if (kind === 'sequence') {
      const value = validateFrozenSequence(raw),
        source = required(
          (
            await tx.query(
              'SELECT project_id,kind FROM resources WHERE id=$1 AND team_id=$2',
              [value.systemId, teamId],
            )
          )[0],
        );
      const version = await this.version(
        tx,
        teamId,
        value.systemId,
        value.systemVersion,
      );
      if (
        source.project_id !== project.id ||
        source.kind !== 'system' ||
        version.checksum !== hashValue(value.systemSnapshot)
      )
        throw new Problem(422, 'SYSTEM_SNAPSHOT_MISMATCH');
      return value;
    }
    if (kind === 'lesson') {
      const value = LessonDraftSchema.parse(raw);
      for (const id of value.sequenceIds) {
        const sequence = required(
          (
            await tx.query(
              'SELECT project_id,kind FROM resources WHERE id=$1 AND team_id=$2',
              [id, teamId],
            )
          )[0],
        );
        if (sequence.project_id !== project.id || sequence.kind !== 'sequence')
          throw new Problem(422, 'PROJECT_SCOPE_MISMATCH');
      }
      return value;
    }
    throw new Problem(400, 'INVALID_RESOURCE_KIND');
  }
  async writeVersion(tx: Sql, viewer: Viewer, row: Row, payload: unknown) {
    const blobKey = await this.blobs.put(payload);
    return (
      await tx.query(
        'INSERT INTO resource_versions(id,team_id,resource_id,version,kind,payload,checksum,blob_key,published_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',
        [
          randomUUID(),
          row.team_id,
          row.id,
          row.revision,
          row.kind,
          JSON.stringify(payload),
          hashValue(payload),
          blobKey,
          viewer.id,
        ],
      )
    )[0]!;
  }
  async publishLesson(
    tx: Sql,
    viewer: Viewer,
    teamId: string,
    lessonId: string,
  ) {
    const lesson = required(
      (
        await tx.query(
          "SELECT * FROM resources WHERE id=$1 AND team_id=$2 AND kind='lesson' FOR UPDATE",
          [lessonId, teamId],
        )
      )[0],
    );
    await this.editableProject(tx, teamId, String(lesson.project_id));
    const draft = LessonDraftSchema.parse(lesson.payload),
      sequences: SequenceV12[] = [];
    for (const id of draft.sequenceIds) {
      const r = required(
        (
          await tx.query(
            "SELECT * FROM resources WHERE id=$1 AND team_id=$2 AND project_id=$3 AND kind='sequence'",
            [id, teamId, lesson.project_id],
          )
        )[0],
      );
      sequences.push(SequenceV12Schema.parse(r.payload));
    }
    if (
      (
        await tx.query(
          'SELECT id FROM resource_versions WHERE resource_id=$1 AND version=$2',
          [lessonId, lesson.revision],
        )
      ).length
    )
      throw new Problem(409, 'ALREADY_PUBLISHED');
    return this.writeVersion(tx, viewer, lesson, {
      schemaVersion: 2,
      name: draft.name,
      description: draft.description,
      sequences,
    });
  }
  async session(viewerId: string) {
    const token = secret(),
      csrf = secret();
    await this.db.query(
      'INSERT INTO sessions(token_hash,user_id,csrf_token,expires_at) VALUES($1,$2,$3,$4)',
      [
        tokenHash(token),
        viewerId,
        csrf,
        new Date(this.now().getTime() + 8 * 3600_000).toISOString(),
      ],
    );
    return { token, csrf };
  }
  async viewer(token: string): Promise<Viewer> {
    const row = (
      await this.db.query(
        'SELECT s.*,u.display_name,u.platform_admin FROM sessions s JOIN users u ON u.id=s.user_id WHERE token_hash=$1 AND expires_at>$2',
        [tokenHash(token), this.now().toISOString()],
      )
    )[0];
    if (!row) throw new Problem(401, 'AUTH_REQUIRED');
    return {
      id: String(row.user_id),
      displayName: String(row.display_name),
      platformAdmin: Boolean(row.platform_admin),
      csrf: String(row.csrf_token),
      sessionHash: String(row.token_hash),
    };
  }
  async seed() {
    if (
      (await this.db.query("SELECT id FROM users WHERE id='demo-coach'")).length
    )
      return;
    await this.db.transaction(async (tx) => {
      await tx.query(
        "INSERT INTO organizations(id,name) VALUES('demo-association','Association Démo') ON CONFLICT DO NOTHING",
      );
      await tx.query(
        "SELECT id FROM organizations WHERE id='demo-association' FOR UPDATE",
      );
      if ((await tx.query("SELECT id FROM users WHERE id='demo-coach'")).length)
        return;
      for (const [id, name, admin] of [
        ['demo-coach', 'Coach Démo', false],
        ['demo-player-m11', 'Joueur M11', false],
        ['demo-player-m13', 'Joueur M13', false],
        ['demo-admin', 'Administration catalogue', true],
      ] as const)
        await tx.query(
          'INSERT INTO users(id,subject,display_name,platform_admin) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING',
          [id, 'demo:' + id, name, admin],
        );
      for (const [id, name, age, plan] of [
        ['demo-m11', 'M11 Démo', 'M11', 'FREE'],
        ['demo-m13', 'M13 Démo', 'M13', 'TEAM_PRO'],
      ] as const) {
        await tx.query(
          "INSERT INTO teams(id,organization_id,name,age_division,season_id,plan_code,subscription_status) VALUES($1,'demo-association',$2,$3,'2026-2027',$4,$5) ON CONFLICT DO NOTHING",
          [id, name, age, plan, plan === 'FREE' ? 'FREE' : 'ACTIVE'],
        );
        await tx.query(
          "INSERT INTO memberships(team_id,user_id,role) VALUES($1,'demo-coach','TEAM_ADMIN') ON CONFLICT DO NOTHING",
          [id],
        );
        await tx.query(
          "INSERT INTO memberships(team_id,user_id,role) VALUES($1,$2,'PLAYER') ON CONFLICT DO NOTHING",
          [id, age === 'M11' ? 'demo-player-m11' : 'demo-player-m13'],
        );
      }
      const actor: Viewer = {
        id: 'demo-coach',
        displayName: 'Coach Démo',
        platformAdmin: false,
        csrf: '',
        sessionHash: '',
      };
      const templates = [
        'BOARDS_BREAKOUT',
        'D_TO_D_REVERSE',
        'LOW_CENTER_SUPPORT',
        'UNDER_PRESSURE_BREAKOUT',
      ] as const;
      for (const template of templates) {
        const system = templateSystem(template),
          sim = new TacticalSimulation(
            templateScenario(template),
            system,
            'home',
          );
        for (let i = 0; i < 90; i++) sim.step();
        const sequence = sim.recording(
          TEMPLATE_NAMES[template],
          'catalog-' + template,
          1,
        );
        const lesson = {
          schemaVersion: 2,
          name: TEMPLATE_NAMES[template],
          description:
            'Démonstration pédagogique générique. À adapter et à valider avec votre entraîneur.',
          sequences: [sequence],
        };
        await tx.query(
          "INSERT INTO catalog(id,name,category,template,version,payload,checksum,created_by) VALUES($1,$2,'breakout',$3,1,$4,$5,'demo-admin') ON CONFLICT DO NOTHING",
          [
            'catalog-' + template,
            TEMPLATE_NAMES[template],
            template,
            JSON.stringify(lesson),
            hashValue(lesson),
          ],
        );
      }
      for (const [id, team, name] of [
        ['demo-project-free', 'demo-m11', 'Sorties de zone M11'],
        ['demo-project-pro-1', 'demo-m13', 'Sorties de zone M13'],
        ['demo-project-pro-2', 'demo-m13', 'Renversements M13'],
      ]) {
        await tx.query(
          "INSERT INTO projects(id,team_id,name,scope,status) VALUES($1,$2,$3,'breakout','ACTIVE')",
          [id, team, name],
        );
        const system = templateSystem('LOW_CENTER_SUPPORT');
        for (const [kind, payload, suffix] of [
          ['system', system, 'system'],
          [
            'scenario',
            {
              schemaVersion: 2,
              name: 'Centre bas',
              systemId: id + '-system',
              systemVersion: 1,
              controlledTeamId: 'home',
              scenario: templateScenario('LOW_CENTER_SUPPORT'),
            },
            'scenario',
          ],
          [
            'scenario',
            {
              schemaVersion: 2,
              name: 'Centre sous pression',
              systemId: id + '-system',
              systemVersion: 1,
              controlledTeamId: 'home',
              scenario: templateScenario('UNDER_PRESSURE_BREAKOUT'),
            },
            'scenario-2',
          ],
        ] as const) {
          const row = (
            await tx.query(
              'INSERT INTO resources(id,team_id,project_id,kind,name,payload) VALUES($1,$2,$3,$4,$5,$6) RETURNING *',
              [
                id + '-' + suffix,
                team,
                id,
                kind,
                payload.name,
                JSON.stringify(payload),
              ],
            )
          )[0]!;
          await this.writeVersion(tx, actor, row, payload);
        }
        const sequences: string[] = [];
        for (let i = 1; i <= 2; i++) {
          const sim = new TacticalSimulation(
            templateScenario(
              i === 1 ? 'LOW_CENTER_SUPPORT' : 'UNDER_PRESSURE_BREAKOUT',
            ),
            system,
            'home',
          );
          for (let t = 0; t < 90; t++) sim.step();
          const payload = sim.recording(
            'Démonstration ' + i,
            id + '-system',
            1,
          );
          const sid = id + '-sequence-' + i;
          sequences.push(sid);
          const row = (
            await tx.query(
              "INSERT INTO resources(id,team_id,project_id,kind,name,payload) VALUES($1,$2,$3,'sequence',$4,$5) RETURNING *",
              [sid, team, id, payload.name, JSON.stringify(payload)],
            )
          )[0]!;
          await this.writeVersion(tx, actor, row, payload);
        }
        const lesson: LessonDraft = {
          name: 'Lire la sortie de zone',
          description: 'Observer le centre bas puis le soutien opposé.',
          sequenceIds: sequences,
        };
        await tx.query(
          "INSERT INTO resources(id,team_id,project_id,kind,name,payload) VALUES($1,$2,$3,'lesson',$4,$5)",
          [id + '-lesson', team, id, lesson.name, JSON.stringify(lesson)],
        );
        const version = await this.publishLesson(
          tx,
          actor,
          String(team),
          id + '-lesson',
        );
        await tx.query(
          "INSERT INTO assignments(id,team_id,lesson_version_id,assigned_by) VALUES($1,$2,$3,'demo-coach')",
          [id + '-assignment', team, version.id],
        );
      }
    });
  }
}
export function resourceSchema(kind: string) {
  return kind === 'system'
    ? TacticalSystemSchema
    : kind === 'scenario'
      ? PlatformScenarioSchema
      : kind === 'sequence'
        ? SequenceV12Schema
        : LessonDraftSchema;
}
export type ResourcePayload =
  TacticalSystem | PlatformScenario | SequenceV12 | LessonDraft;
