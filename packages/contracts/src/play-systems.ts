import { z } from 'zod';
import {
  DecisionTraceSchema,
  IdSchema,
  PhaseSchema,
  ReasonCodeSchema,
  TacticalRoleSchema,
} from './domain.js';

/** Contract limits, not coach-editable execution privileges. Runtime interpretation is a later milestone. */
export const PLAY_SYSTEM_SCHEMA_VERSION = 1 as const;
export const COACH_RULESET_VERSION = 'coach-rules-1' as const;
export const INITIAL_SYSTEM_TEMPLATE = 'forecheck-212' as const;
export const DSL_LIMITS = Object.freeze({
  rules: 64,
  actionsPerRule: 8,
  conditionDepth: 3,
  childrenPerGroup: 8,
  conditionNodesPerRule: 128,
  zones: 32,
  polygonVertices: 16,
  targets: 64,
  evaluationsPerTick: 8192,
});
const Text = z.string().trim().min(1).max(200);
const Hash = z.string().regex(/^[a-f0-9]{64}$/);
export const SystemTriggerSchema = z.enum([
  'PUCK_ENTER_ZONE',
  'PUCK_SWITCH_SIDE',
  'POSSESSION_GAINED',
  'POSSESSION_LOST',
  'OPPONENT_PASS',
  'ROLE_UNAVAILABLE',
  'PHASE_CHANGED',
]);
export const NormalizedPointSchema = z.strictObject({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
});
const pointKey = (point: { x: number; y: number }) => `${point.x}:${point.y}`;
function crosses(
  a: { x: number; y: number },
  b: { x: number; y: number },
  c: { x: number; y: number },
) {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}
function onSegment(
  a: { x: number; y: number },
  b: { x: number; y: number },
  p: { x: number; y: number },
) {
  return (
    Math.abs(crosses(a, b, p)) < 1e-10 &&
    p.x >= Math.min(a.x, b.x) - 1e-10 &&
    p.x <= Math.max(a.x, b.x) + 1e-10 &&
    p.y >= Math.min(a.y, b.y) - 1e-10 &&
    p.y <= Math.max(a.y, b.y) + 1e-10
  );
}
function intersects(
  a: { x: number; y: number },
  b: { x: number; y: number },
  c: { x: number; y: number },
  d: { x: number; y: number },
) {
  const abC = crosses(a, b, c),
    abD = crosses(a, b, d),
    cdA = crosses(c, d, a),
    cdB = crosses(c, d, b);
  return (
    (abC * abD < 0 && cdA * cdB < 0) ||
    onSegment(a, b, c) ||
    onSegment(a, b, d) ||
    onSegment(c, d, a) ||
    onSegment(c, d, b)
  );
}
export const SystemZoneSchema = z
  .strictObject({
    id: IdSchema,
    name: Text,
    geometry: z.discriminatedUnion('kind', [
      z.strictObject({
        kind: z.literal('rectangle'),
        x: z.number().min(0).max(1),
        y: z.number().min(0).max(1),
        width: z.number().positive().max(1),
        height: z.number().positive().max(1),
      }),
      z.strictObject({
        kind: z.literal('polygon'),
        points: z
          .array(NormalizedPointSchema)
          .min(3)
          .max(DSL_LIMITS.polygonVertices),
      }),
    ]),
  })
  .superRefine((zone, ctx) => {
    const g = zone.geometry;
    if (g.kind === 'rectangle') {
      if (g.x + g.width > 1 + 1e-10 || g.y + g.height > 1 + 1e-10)
        ctx.addIssue({
          code: 'custom',
          path: ['geometry'],
          message: 'Rectangle extends outside normalized rink bounds.',
        });
      return;
    }
    const points = g.points;
    if (new Set(points.map(pointKey)).size !== points.length)
      ctx.addIssue({
        code: 'custom',
        path: ['geometry', 'points'],
        message: 'Polygon vertices must be distinct.',
      });
    const area = points.reduce((sum, p, i) => {
      const next = points[(i + 1) % points.length]!;
      return sum + p.x * next.y - next.x * p.y;
    }, 0);
    if (Math.abs(area) < 1e-10)
      ctx.addIssue({
        code: 'custom',
        path: ['geometry', 'points'],
        message: 'Polygon area must be nonzero.',
      });
    for (let i = 0; i < points.length; i++)
      for (let j = i + 1; j < points.length; j++) {
        if (j === i + 1 || (i === 0 && j === points.length - 1)) continue;
        if (
          intersects(
            points[i]!,
            points[(i + 1) % points.length]!,
            points[j]!,
            points[(j + 1) % points.length]!,
          )
        ) {
          ctx.addIssue({
            code: 'custom',
            path: ['geometry', 'points'],
            message: 'Polygon must not intersect itself.',
          });
          return;
        }
      }
  });
export const SystemTargetSchema = z.strictObject({
  id: IdSchema,
  name: Text,
  point: NormalizedPointSchema,
});
export const SystemObjectiveSchema = z.enum([
  'PRESS_PUCK_CARRIER',
  'COVER_LANE',
  'HOLD_CENTER',
  'SUPPORT_PUCK',
  'RETREAT_TO_ZONE',
  'SET_TARGET_ZONE',
]);
export const SystemActionSchema = z.discriminatedUnion('action', [
  z.strictObject({
    action: z.literal('SET_ROLE_PRIORITY'),
    role: TacticalRoleSchema,
    value: SystemObjectiveSchema,
    weight: z.number().min(0).max(100),
  }),
  z.strictObject({
    action: z.literal('SET_TARGET_ZONE'),
    role: TacticalRoleSchema,
    zoneId: IdSchema,
  }),
  z.strictObject({
    action: z.literal('PRESS_PUCK_CARRIER'),
    role: TacticalRoleSchema,
  }),
  z.strictObject({
    action: z.literal('COVER_LANE'),
    role: TacticalRoleSchema,
    fromTargetId: IdSchema,
    toTargetId: IdSchema,
  }),
  z.strictObject({
    action: z.literal('HOLD_CENTER'),
    role: TacticalRoleSchema,
  }),
  z.strictObject({
    action: z.literal('SUPPORT_PUCK'),
    role: TacticalRoleSchema,
    distanceMetres: z.number().min(0.5).max(20),
  }),
  z.strictObject({
    action: z.literal('RETREAT_TO_ZONE'),
    role: TacticalRoleSchema,
    zoneId: IdSchema,
  }),
  z.strictObject({
    action: z.literal('SET_PRESSURE_INTENSITY'),
    role: TacticalRoleSchema,
    value: z.number().min(0).max(1),
  }),
]);
export const DistanceSubjectSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('puck') }),
  z.strictObject({ kind: z.literal('role'), role: TacticalRoleSchema }),
  z.strictObject({ kind: z.literal('target'), targetId: IdSchema }),
]);
export const SystemConditionLeafSchema = z.discriminatedUnion('condition', [
  z.strictObject({ condition: z.literal('PUCK_IN_ZONE'), zoneId: IdSchema }),
  z.strictObject({
    condition: z.literal('PUCK_SIDE'),
    side: z.enum(['left', 'center', 'right']),
  }),
  z.strictObject({
    condition: z.literal('POSSESSION'),
    team: z.enum(['own', 'opponent', 'none']),
  }),
  z.strictObject({ condition: z.literal('PHASE'), phase: PhaseSchema }),
  z.strictObject({
    condition: z.literal('DISTANCE'),
    from: DistanceSubjectSchema,
    to: DistanceSubjectSchema,
    operator: z.enum(['lt', 'lte', 'gt', 'gte']),
    metres: z.number().min(0).max(100),
  }),
  z.strictObject({
    condition: z.literal('CURRENT_ROLE'),
    role: TacticalRoleSchema,
  }),
  z.strictObject({
    condition: z.literal('ZONE_COVERED'),
    zoneId: IdSchema,
    byRole: TacticalRoleSchema.nullable(),
  }),
]);
function conditionLevel<T extends z.ZodType>(child: T) {
  return z.union([
    SystemConditionLeafSchema,
    z.strictObject({
      operator: z.enum(['all', 'any']),
      conditions: z.array(child).min(1).max(DSL_LIMITS.childrenPerGroup),
    }),
    z.strictObject({ operator: z.literal('not'), condition: child }),
  ]);
}
const ConditionTree = conditionLevel(
  conditionLevel(conditionLevel(SystemConditionLeafSchema)),
);
/** Preflight bounds traversal before Zod visits children; no recursive schema or expression parser. */
export const SystemConditionSchema = z
  .unknown()
  .superRefine((value, ctx) => {
    const pending: { value: unknown; depth: number }[] = [{ value, depth: 0 }];
    let nodes = 0;
    while (pending.length) {
      const item = pending.pop()!;
      nodes++;
      if (nodes > DSL_LIMITS.conditionNodesPerRule) {
        ctx.addIssue({
          code: 'custom',
          message: 'Condition node budget exceeded.',
        });
        return;
      }
      if (typeof item.value !== 'object' || item.value === null) continue;
      const object = item.value as Record<string, unknown>;
      if (
        object.operator === 'all' ||
        object.operator === 'any' ||
        object.operator === 'not'
      ) {
        if (item.depth >= DSL_LIMITS.conditionDepth) {
          ctx.addIssue({
            code: 'custom',
            message: 'Condition nesting limit exceeded.',
          });
          return;
        }
        if (object.operator === 'not')
          pending.push({ value: object.condition, depth: item.depth + 1 });
        else if (Array.isArray(object.conditions)) {
          if (object.conditions.length > DSL_LIMITS.childrenPerGroup) {
            ctx.addIssue({
              code: 'custom',
              message: 'Condition group limit exceeded.',
            });
            return;
          }
          for (const child of object.conditions)
            pending.push({ value: child, depth: item.depth + 1 });
        }
      }
    }
  })
  .pipe(ConditionTree);
export const SystemRuleSchema = z
  .strictObject({
    id: IdSchema,
    priority: z.number().int().min(0).max(1000),
    when: z.strictObject({
      event: SystemTriggerSchema,
      phase: PhaseSchema.optional(),
      zoneId: IdSchema.optional(),
      role: TacticalRoleSchema.optional(),
      conditions: SystemConditionSchema.optional(),
    }),
    then: z.array(SystemActionSchema).min(1).max(DSL_LIMITS.actionsPerRule),
    explanation: z.string().trim().min(1).max(1000),
  })
  .superRefine((rule, ctx) => {
    if (rule.when.event === 'PUCK_ENTER_ZONE' && !rule.when.zoneId)
      ctx.addIssue({
        code: 'custom',
        path: ['when', 'zoneId'],
        message: 'Zone-entry trigger requires a zone.',
      });
    if (rule.when.event === 'ROLE_UNAVAILABLE' && !rule.when.role)
      ctx.addIssue({
        code: 'custom',
        path: ['when', 'role'],
        message: 'Unavailable-role trigger requires a role.',
      });
  });
const RoleSettings = z.strictObject({
  defaultObjective: SystemActionSchema,
  coverageZoneId: IdSchema.nullable(),
  priority: z.number().min(0).max(100),
});
const RoleSettingsSchema = z.strictObject({
  F1: RoleSettings,
  F2: RoleSettings,
  F3: RoleSettings,
  D1: RoleSettings,
  D2: RoleSettings,
});
export const PlaySystemContentSchema = z
  .strictObject({
    schemaVersion: z.literal(1),
    name: Text,
    description: z.string().max(4000),
    category: z.enum([
      'forecheck',
      'breakout',
      'neutral_zone',
      'defensive_zone',
      'power_play',
      'penalty_kill',
      'other',
    ]),
    baseTemplate: z.string().trim().min(1).max(80),
    coordinateSpace: z.literal('rink-normalized'),
    supportedPhases: z.array(PhaseSchema).min(1).max(6),
    zones: z.array(SystemZoneSchema).max(DSL_LIMITS.zones),
    targets: z.array(SystemTargetSchema).max(DSL_LIMITS.targets),
    roleSettings: RoleSettingsSchema,
    rules: z.array(SystemRuleSchema).max(DSL_LIMITS.rules),
    fallbackStrategy: z.literal('forecheck-212-default'),
    antiOscillation: z.strictObject({
      roleHoldTicks: z.number().int().min(0).max(300),
      switchPenalty: z.number().min(0).max(100),
    }),
  })
  .superRefine((system, ctx) => {
    const issue = (path: (string | number)[], message: string) =>
      ctx.addIssue({ code: 'custom', path, message });
    const zones = new Set(system.zones.map((zone) => zone.id)),
      targets = new Set(system.targets.map((target) => target.id));
    if (zones.size !== system.zones.length)
      issue(['zones'], 'Zone IDs must be unique.');
    if (targets.size !== system.targets.length)
      issue(['targets'], 'Target IDs must be unique.');
    if (
      new Set(system.rules.map((rule) => rule.id)).size !== system.rules.length
    )
      issue(['rules'], 'Rule IDs must be unique.');
    if (new Set(system.supportedPhases).size !== system.supportedPhases.length)
      issue(['supportedPhases'], 'Phases must be unique.');
    const checkAction = (
      action: z.infer<typeof SystemActionSchema>,
      path: (string | number)[],
    ) => {
      if ('zoneId' in action && !zones.has(action.zoneId))
        issue([...path, 'zoneId'], 'Unknown zone.');
      if (action.action === 'COVER_LANE') {
        if (
          !targets.has(action.fromTargetId) ||
          !targets.has(action.toTargetId)
        )
          issue(path, 'Lane endpoints must refer to known targets.');
        if (action.fromTargetId === action.toTargetId)
          issue(path, 'Lane endpoints must be distinct.');
      }
    };
    for (const [role, settings] of Object.entries(system.roleSettings)) {
      if (settings.defaultObjective.role !== role)
        issue(
          ['roleSettings', role, 'defaultObjective', 'role'],
          'Default action must address its owning role.',
        );
      if (
        settings.coverageZoneId !== null &&
        !zones.has(settings.coverageZoneId)
      )
        issue(
          ['roleSettings', role, 'coverageZoneId'],
          'Unknown coverage zone.',
        );
      checkAction(settings.defaultObjective, [
        'roleSettings',
        role,
        'defaultObjective',
      ]);
    }
    system.rules.forEach((rule, index) => {
      if (rule.when.zoneId && !zones.has(rule.when.zoneId))
        issue(['rules', index, 'when', 'zoneId'], 'Unknown trigger zone.');
      if (rule.when.phase && !system.supportedPhases.includes(rule.when.phase))
        issue(
          ['rules', index, 'when', 'phase'],
          'Rule phase is not supported by this system.',
        );
      rule.then.forEach((action, actionIndex) =>
        checkAction(action, ['rules', index, 'then', actionIndex]),
      );
      const pending: z.infer<typeof SystemConditionSchema>[] = rule.when
        .conditions
        ? [rule.when.conditions]
        : [];
      while (pending.length) {
        const condition = pending.pop()!;
        if ('operator' in condition && condition.operator === 'not')
          pending.push(condition.condition);
        else if ('conditions' in condition)
          pending.push(...condition.conditions);
        else if ('condition' in condition) {
          if ('zoneId' in condition && !zones.has(condition.zoneId))
            issue(
              ['rules', index, 'when', 'conditions'],
              'Unknown condition zone.',
            );
          if (condition.condition === 'DISTANCE')
            for (const subject of [condition.from, condition.to])
              if (subject.kind === 'target' && !targets.has(subject.targetId))
                issue(
                  ['rules', index, 'when', 'conditions'],
                  'Unknown distance target.',
                );
          if (
            condition.condition === 'PHASE' &&
            !system.supportedPhases.includes(condition.phase)
          )
            issue(
              ['rules', index, 'when', 'conditions'],
              'Condition phase is not supported by this system.',
            );
        }
      }
    });
  });
export const ExecutableSystemContentSchema = PlaySystemContentSchema.safeExtend(
  {
    baseTemplate: z.literal(INITIAL_SYSTEM_TEMPLATE),
    category: z.literal('forecheck'),
  },
);
export const PlaySystemVersionRefSchema = z.strictObject({
  schemaVersion: z.literal(1),
  systemId: IdSchema,
  systemVersionId: IdSchema,
  teamId: IdSchema,
  version: z.number().int().positive(),
  rulesetVersion: z.literal(COACH_RULESET_VERSION),
  checksum: Hash,
});
export const PlaySystemSchema = PlaySystemContentSchema.safeExtend({
  id: IdSchema,
  teamId: IdSchema,
  ownerId: IdSchema,
  status: z.enum(['draft', 'archived']),
  revision: z.number().int().positive(),
  derivedFrom: PlaySystemVersionRefSchema.nullable(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  archivedAt: z.iso.datetime({ offset: true }).nullable(),
}).superRefine((system, ctx) => {
  if (system.derivedFrom && system.derivedFrom.teamId !== system.teamId)
    ctx.addIssue({
      code: 'custom',
      path: ['derivedFrom', 'teamId'],
      message: 'Derived system must belong to the same private team.',
    });
  if ((system.status === 'archived') !== (system.archivedAt !== null))
    ctx.addIssue({
      code: 'custom',
      path: ['archivedAt'],
      message: 'Archive status and timestamp must agree.',
    });
});
export const PlaySystemVersionSchema = z.strictObject({
  schemaVersion: z.literal(1),
  id: IdSchema,
  systemId: IdSchema,
  teamId: IdSchema,
  version: z.number().int().positive(),
  status: z.literal('published'),
  rulesetVersion: z.literal(COACH_RULESET_VERSION),
  checksum: Hash,
  content: ExecutableSystemContentSchema,
  publishedBy: IdSchema,
  publishedAt: z.iso.datetime({ offset: true }),
});
export const SystemReasonCodeSchema = z.enum([
  'RULE_MATCHED',
  'PRIORITY_ARBITRATION',
  'COVERAGE_REQUIRED',
  'ROLE_STABILITY',
  'FALLBACK',
  'BUDGET_EXCEEDED',
]);
export const SystemDecisionTraceSchema = DecisionTraceSchema.extend({
  systemVersionId: IdSchema,
  ruleId: IdSchema.nullable(),
  trigger: SystemTriggerSchema,
  candidateActions: z
    .array(SystemActionSchema)
    .max(DSL_LIMITS.rules * DSL_LIMITS.actionsPerRule),
  chosenAction: SystemActionSchema.nullable(),
  reasonCodes: z
    .array(z.union([ReasonCodeSchema, SystemReasonCodeSchema]))
    .min(1)
    .max(16),
});
export type PlaySystem = z.infer<typeof PlaySystemSchema>;
export type PlaySystemContent = z.infer<typeof PlaySystemContentSchema>;
export type PlaySystemVersion = z.infer<typeof PlaySystemVersionSchema>;
export type PlaySystemVersionRef = z.infer<typeof PlaySystemVersionRefSchema>;
export type SystemRule = z.infer<typeof SystemRuleSchema>;
export type SystemCondition = z.infer<typeof SystemConditionSchema>;
export type SystemAction = z.infer<typeof SystemActionSchema>;
export type SystemDecisionTrace = z.infer<typeof SystemDecisionTraceSchema>;
