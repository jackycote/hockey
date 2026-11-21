import { z } from 'zod';
import {
  ScenarioSchema,
  WorldStateSchema,
  InputEventSchema,
} from './domain.js';
import {
  SystemZoneSchema,
  SystemTargetSchema,
  PlaySystemContentSchema,
} from './play-systems.js';
export const PlatformId = z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,119}$/);
export const TeamRoleSchema = z.enum([
  'PLATFORM_ADMIN',
  'TEAM_ADMIN',
  'COACH',
  'PLAYER',
]);
export type TeamRole = z.infer<typeof TeamRoleSchema>;
export const TemplateSchema = z.enum([
  'FORECHECK_212',
  'BOARDS_BREAKOUT',
  'D_TO_D_REVERSE',
  'LOW_CENTER_SUPPORT',
  'UNDER_PRESSURE_BREAKOUT',
]);
export type TacticalTemplate = z.infer<typeof TemplateSchema>;
export const ProjectScopeSchema = z.enum(['forecheck', 'breakout']);
export const ContextRoleSchema = z.enum([
  'F1',
  'F2',
  'F3',
  'D1',
  'D2',
  'PUCK_RETRIEVER',
  'D_SUPPORT',
  'CENTER_LOW',
  'STRONG_SIDE_WINGER',
  'WEAK_SIDE_WINGER',
]);
export type ContextRole = z.infer<typeof ContextRoleSchema>;
export const ContextPhaseSchema = z.enum([
  'FORECHECK',
  'DEFENSIVE_ZONE_RECOVERY',
  'BREAKOUT_SETUP',
  'BREAKOUT_EXECUTION',
  'NEUTRAL_ZONE_TRANSITION',
  'TURNOVER_DEFENSE',
]);
export type ContextPhase = z.infer<typeof ContextPhaseSchema>;
export const RuleTriggerSchema = z.enum([
  'EVERY_TICK',
  'PUCK_ENTER_ZONE',
  'PUCK_SWITCH_SIDE',
  'POSSESSION_GAINED',
  'POSSESSION_LOST',
  'OPPONENT_PASS',
  'ROLE_UNAVAILABLE',
  'PHASE_CHANGED',
]);
export const RuleConditionSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('pressure'),
    operator: z.enum(['lt', 'gt']),
    metres: z.number().min(0).max(30),
  }),
  z.strictObject({
    kind: z.literal('intercept_time'),
    role: ContextRoleSchema,
    operator: z.enum(['lt', 'gt']),
    seconds: z.number().min(0).max(15),
  }),
  z.strictObject({
    kind: z.literal('pressure_angle'),
    role: ContextRoleSchema,
    operator: z.enum(['lt', 'gt']),
    degrees: z.number().min(0).max(180),
  }),
  z.strictObject({
    kind: z.literal('pass_lane'),
    from: ContextRoleSchema,
    to: ContextRoleSchema,
    clearanceMetres: z.number().min(0.1).max(5),
    open: z.boolean(),
  }),
  z.strictObject({
    kind: z.literal('puck_side'),
    side: z.enum(['strong', 'weak', 'center']),
  }),
  z.strictObject({
    kind: z.literal('possession'),
    value: z.enum(['own', 'opponent', 'none']),
  }),
  z.strictObject({ kind: z.literal('phase'), value: ContextPhaseSchema }),
  z.strictObject({ kind: z.literal('puck_zone'), zoneId: PlatformId }),
  z.strictObject({
    kind: z.literal('role_available'),
    role: ContextRoleSchema,
  }),
  z.strictObject({
    kind: z.literal('coverage'),
    zoneId: PlatformId,
    role: ContextRoleSchema,
  }),
  z.strictObject({
    kind: z.literal('distance'),
    from: ContextRoleSchema,
    to: ContextRoleSchema,
    operator: z.enum(['lt', 'gt']),
    metres: z.number().min(0).max(80),
  }),
]);
export const TacticalActionSchema = z.strictObject({
  kind: z.enum([
    'MOVE_TO_ZONE',
    'MOVE_TO_TARGET',
    'PRESS_PUCK_CARRIER',
    'HOLD_CENTER',
    'SUPPORT_PUCK',
    'OFFER_PASS',
    'PROTECT_INSIDE',
    'CARRY',
    'PASS',
    'REVERSE',
    'WAIT_SUPPORT',
    'RETREAT',
    'SET_ROLE_PRIORITY',
    'SET_PRESSURE_INTENSITY',
    'COVER_LANE',
  ]),
  role: ContextRoleSchema,
  targetRole: ContextRoleSchema.nullable().default(null),
  zoneId: PlatformId.nullable().default(null),
  targetId: PlatformId.nullable().optional(),
  intensity: z.number().min(0).max(1).default(0.7),
});
export const TacticalRuleSchema = z.strictObject({
  id: PlatformId,
  priority: z.number().int().min(0).max(1000),
  trigger: RuleTriggerSchema,
  match: z.enum(['all', 'any']).default('all'),
  conditions: z.array(RuleConditionSchema).max(8),
  actions: z.array(TacticalActionSchema).min(1).max(8),
  explanation: z.string().trim().min(1).max(500),
});
export type TacticalRule = z.infer<typeof TacticalRuleSchema>;
export const TacticalSystemSchema = z
  .strictObject({
    schemaVersion: z.literal(2),
    name: z.string().trim().min(1).max(120),
    description: z.string().max(4000).default(''),
    template: TemplateSchema,
    zones: z.array(SystemZoneSchema).max(32),
    targets: z.array(SystemTargetSchema).max(64).optional(),
    rules: z.array(TacticalRuleSchema).max(64),
    roleHoldTicks: z.number().int().min(1).max(300).default(15),
    reactionTicks: z.number().int().min(3).max(180).default(18),
    pressureMetres: z.number().min(1).max(15).default(5),
    legacy: PlaySystemContentSchema.optional(),
  })
  .superRefine((value, ctx) => {
    for (const key of ['zones', 'rules'] as const)
      if (new Set(value[key].map((x) => x.id)).size !== value[key].length)
        ctx.addIssue({
          code: 'custom',
          path: [key],
          message: 'Identifiants uniques requis.',
        });
    if (
      value.legacy &&
      (value.template !== 'FORECHECK_212' ||
        value.legacy.category !== 'forecheck' ||
        value.legacy.baseTemplate !== 'forecheck-212')
    )
      ctx.addIssue({
        code: 'custom',
        path: ['legacy'],
        message: 'Le format v1.1 exécutable exige le modèle forecheck-212.',
      });
    const breakout = value.template !== 'FORECHECK_212';
    const validRoles = new Set(
      breakout
        ? [
            'PUCK_RETRIEVER',
            'D_SUPPORT',
            'CENTER_LOW',
            'STRONG_SIDE_WINGER',
            'WEAK_SIDE_WINGER',
          ]
        : ['F1', 'F2', 'F3', 'D1', 'D2'],
    );
    const zones = new Set(value.zones.map((x) => x.id));
    value.rules.forEach((rule, i) => {
      for (const action of rule.actions) {
        if (
          !validRoles.has(action.role) ||
          (action.targetRole && !validRoles.has(action.targetRole))
        )
          ctx.addIssue({
            code: 'custom',
            path: ['rules', i],
            message: 'Rôle incompatible avec le contexte tactique.',
          });
        if (
          action.kind === 'MOVE_TO_TARGET' &&
          (!action.targetId ||
            !value.targets?.some((t) => t.id === action.targetId))
        )
          ctx.addIssue({
            code: 'custom',
            path: ['rules', i],
            message: 'Point-cible inconnu.',
          });
        if (action.zoneId && !zones.has(action.zoneId))
          ctx.addIssue({
            code: 'custom',
            path: ['rules', i],
            message: 'Zone inconnue.',
          });
        if (['MOVE_TO_ZONE', 'RETREAT'].includes(action.kind) && !action.zoneId)
          ctx.addIssue({
            code: 'custom',
            path: ['rules', i],
            message: 'Zone requise.',
          });
        if (['PASS', 'REVERSE'].includes(action.kind) && !action.targetRole)
          ctx.addIssue({
            code: 'custom',
            path: ['rules', i],
            message: 'Destinataire requis.',
          });
      }
      for (const condition of rule.conditions) {
        if ('zoneId' in condition && !zones.has(condition.zoneId))
          ctx.addIssue({
            code: 'custom',
            path: ['rules', i],
            message: 'Zone de condition inconnue.',
          });
        for (const key of ['role', 'from', 'to'] as const)
          if (
            key in condition &&
            !validRoles.has(String(condition[key as keyof typeof condition]))
          )
            ctx.addIssue({
              code: 'custom',
              path: ['rules', i],
              message: 'Rôle de condition incompatible.',
            });
      }
    });
  });
export type TacticalSystem = z.infer<typeof TacticalSystemSchema>;
export const PlatformScenarioSchema = z
  .strictObject({
    schemaVersion: z.literal(2),
    name: z.string().trim().min(1).max(120),
    systemId: PlatformId,
    systemVersion: z.number().int().positive(),
    controlledTeamId: PlatformId,
    scenario: ScenarioSchema,
  })
  .superRefine((v, ctx) => {
    if (!v.scenario.teams.some((t) => t.id === v.controlledTeamId))
      ctx.addIssue({
        code: 'custom',
        message: 'Équipe de patinoire inconnue.',
      });
  });
export type PlatformScenario = z.infer<typeof PlatformScenarioSchema>;
export const TacticalDecisionSchema = z.strictObject({
  tick: z.number().int().nonnegative(),
  playerId: PlatformId,
  role: ContextRoleSchema,
  phase: ContextPhaseSchema,
  ruleId: PlatformId.nullable(),
  trigger: z.string().max(80),
  action: z.string().max(80),
  reasonCodes: z.array(z.string().max(80)).max(16),
  candidateActions: z.array(z.string().max(200)).max(64).optional(),
  target: z.strictObject({ x: z.number().finite(), y: z.number().finite() }),
  explanation: z.string().max(1000),
});
export type TacticalDecision = z.infer<typeof TacticalDecisionSchema>;
export const FrozenFrameSchema = z.strictObject({
  tick: z.number().int().nonnegative(),
  world: WorldStateSchema,
  phase: ContextPhaseSchema,
  roles: z.record(PlatformId, ContextRoleSchema),
  decisions: z.array(TacticalDecisionSchema).max(32),
  physicsHash: z.string().regex(/^[a-f0-9]{64}$/),
  hash: z.string().regex(/^[a-f0-9]{64}$/),
});
export type FrozenFrame = z.infer<typeof FrozenFrameSchema>;
export const AnnotationV12Schema = z.strictObject({
  id: PlatformId,
  atTick: z.number().int().min(0).max(9000),
  kind: z.enum(['text', 'pause', 'arrow', 'focus']),
  text: z.string().max(1000),
  playerId: PlatformId.nullable().default(null),
  point: z
    .strictObject({
      x: z.number().min(0).max(70),
      y: z.number().min(0).max(35),
    })
    .nullable()
    .default(null),
});
export const TacticalInputSchema = z.union([
  InputEventSchema,
  z.strictObject({
    schemaVersion: z.literal(2),
    kind: z.literal('instruction_changed'),
    tick: z.number().int().positive().max(9000),
    sequence: z.number().int().nonnegative(),
    system: TacticalSystemSchema,
  }),
]);
export type TacticalInput = z.infer<typeof TacticalInputSchema>;
export const SequenceV12Schema = z
  .strictObject({
    schemaVersion: z.literal(2),
    name: z.string().trim().min(1).max(120),
    engineVersion: z.literal('hockey-doo-tactics-1'),
    rulesetVersion: z.literal('tactics-1'),
    seed: z.number().int().min(0).max(4294967295),
    systemId: PlatformId,
    systemVersion: z.number().int().positive(),
    systemSnapshot: TacticalSystemSchema,
    scenarioSnapshot: ScenarioSchema,
    controlledTeamId: PlatformId,
    frames: z.array(FrozenFrameSchema).min(1).max(9001),
    inputs: z.array(TacticalInputSchema).max(50000),
    annotations: z.array(AnnotationV12Schema).max(500),
  })
  .superRefine((v, ctx) => {
    const roster = v.scenarioSnapshot.players
      .map((p) => [p.id, p.teamId, p.nominalPosition].join(':'))
      .sort()
      .join('|');
    const controlled = v.scenarioSnapshot.players
      .filter((p) => p.teamId === v.controlledTeamId)
      .map((p) => p.id)
      .sort()
      .join('|');
    if (
      !v.scenarioSnapshot.teams.some((t) => t.id === v.controlledTeamId) ||
      v.seed !== v.scenarioSnapshot.seed
    )
      ctx.addIssue({
        code: 'custom',
        message: 'Contexte initial de séquence incohérent.',
      });
    let lastInputTick = 0,
      lastSequence = -1;
    for (const input of v.inputs) {
      if (
        input.tick < 1 ||
        input.tick >= v.frames.length ||
        input.tick < lastInputTick ||
        input.sequence <= lastSequence
      )
        ctx.addIssue({
          code: 'custom',
          path: ['inputs'],
          message: 'Journal ordonné et borné requis.',
        });
      lastInputTick = input.tick;
      lastSequence = input.sequence;
    }
    v.frames.forEach((f, i) => {
      if (
        f.world.players
          .map((p) => [p.id, p.teamId, p.nominalPosition].join(':'))
          .sort()
          .join('|') !== roster ||
        f.world.seed !== v.seed ||
        f.world.rink.length !== v.scenarioSnapshot.rink.length ||
        f.world.rink.width !== v.scenarioSnapshot.rink.width ||
        Object.keys(f.roles).sort().join('|') !== controlled ||
        new Set(Object.values(f.roles)).size !== 5
      )
        ctx.addIssue({
          code: 'custom',
          path: ['frames', i],
          message:
            'Identités, patinoire et responsabilités doivent rester cohérentes.',
        });
      if (f.tick !== i || f.world.tick !== i)
        ctx.addIssue({
          code: 'custom',
          path: ['frames', i],
          message: 'Piste de snapshots contigus requise.',
        });
    });
    for (const a of v.annotations)
      if (
        a.atTick >= v.frames.length ||
        (a.point &&
          (a.point.x > v.scenarioSnapshot.rink.length ||
            a.point.y > v.scenarioSnapshot.rink.width)) ||
        (a.playerId &&
          !v.frames[0]!.world.players.some((p) => p.id === a.playerId))
      )
        ctx.addIssue({
          code: 'custom',
          path: ['annotations'],
          message: 'Annotation hors séquence.',
        });
  });
export type SequenceV12 = z.infer<typeof SequenceV12Schema>;
export const LessonDraftSchema = z
  .strictObject({
    name: z.string().trim().min(1).max(120),
    description: z.string().max(4000),
    sequenceIds: z.array(PlatformId).min(1).max(12),
  })
  .superRefine((v, ctx) => {
    if (new Set(v.sequenceIds).size !== v.sequenceIds.length)
      ctx.addIssue({
        code: 'custom',
        message: 'Séquences distinctes requises.',
      });
  });
export type LessonDraft = z.infer<typeof LessonDraftSchema>;
export const CreateProjectSchema = z.strictObject({
  catalogId: PlatformId.optional(),
  name: z.string().trim().min(1).max(120),
  scope: ProjectScopeSchema,
});
export const ProjectPatchSchema = z.strictObject({
  name: z.string().trim().min(1).max(120),
  revision: z.number().int().positive(),
});
export const PlanChangeSchema = z.strictObject({
  plan: z.enum(['FREE', 'TEAM_PRO']),
  keepProjectId: PlatformId.nullable().default(null),
  seasonId: z.string().min(1).max(60),
});
export const ProgressSchema = z.strictObject({
  status: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED']),
  watchedTicks: z.number().int().min(0).max(108000).default(0),
});
export const PLATFORM_VERSION = '1.2' as const;
