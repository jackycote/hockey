import { describe, expect, it } from 'vitest';
import {
  DSL_LIMITS,
  ExecutableSystemContentSchema,
  PlaySystemContentSchema,
  PlaySystemSchema,
  PlaySystemVersionSchema,
  SystemActionSchema,
  SystemConditionSchema,
  SystemDecisionTraceSchema,
  SystemRuleSchema,
  SystemZoneSchema,
  type PlaySystemContent,
} from '../src/index.js';
import {
  systemContentFixture,
  systemDraftFixture,
  systemRefFixture,
  systemVersionFixture,
} from './system-fixtures.js';

describe('v1.1 tactical system contracts', () => {
  it('round-trips a complete private draft and published version', () => {
    for (const [schema, value] of [
      [PlaySystemSchema, systemDraftFixture()],
      [PlaySystemVersionSchema, systemVersionFixture()],
    ] as const)
      expect(schema.parse(JSON.parse(JSON.stringify(value)))).toEqual(value);
  });
  it('allows other family drafts but rejects executable publication', () => {
    const draft = {
      ...systemDraftFixture(),
      baseTemplate: 'breakout-custom',
      category: 'breakout',
    };
    expect(PlaySystemSchema.safeParse(draft).success).toBe(true);
    expect(ExecutableSystemContentSchema.safeParse(draft).success).toBe(false);
    expect(
      PlaySystemVersionSchema.safeParse({
        ...systemVersionFixture(),
        content: {
          ...systemContentFixture(),
          baseTemplate: 'breakout-custom',
          category: 'breakout',
        },
      }).success,
    ).toBe(false);
  });
  it('clones the published content so draft edits do not alias the snapshot', () => {
    const draft = systemContentFixture();
    const version = PlaySystemVersionSchema.parse({
      ...systemVersionFixture(),
      content: draft,
    });
    draft.rules[0]!.then = [{ action: 'HOLD_CENTER', role: 'F2' }];
    draft.name = 'Changed draft';
    expect(version.content.name).toBe('Notre 2-1-2');
    expect(version.content.rules[0]!.then[0]!.action).toBe('SET_ROLE_PRIORITY');
  });
  it('checks same-team derivation and archive metadata', () => {
    const draft = systemDraftFixture();
    expect(
      PlaySystemSchema.safeParse({ ...draft, derivedFrom: systemRefFixture() })
        .success,
    ).toBe(true);
    expect(
      PlaySystemSchema.safeParse({
        ...draft,
        derivedFrom: { ...systemRefFixture(), teamId: 'other' },
      }).success,
    ).toBe(false);
    expect(
      PlaySystemSchema.safeParse({ ...draft, status: 'archived' }).success,
    ).toBe(false);
    expect(
      PlaySystemSchema.safeParse({
        ...draft,
        status: 'archived',
        archivedAt: draft.updatedAt,
      }).success,
    ).toBe(true);
  });
  it.each([
    ['duplicate zones', (s: PlaySystemContent) => s.zones.push(s.zones[0]!)],
    [
      'duplicate targets',
      (s: PlaySystemContent) => s.targets.push(s.targets[0]!),
    ],
    ['duplicate rules', (s: PlaySystemContent) => s.rules.push(s.rules[0]!)],
    [
      'duplicate phases',
      (s: PlaySystemContent) => s.supportedPhases.push('neutral'),
    ],
    [
      'unknown coverage',
      (s: PlaySystemContent) => {
        s.roleSettings.F3.coverageZoneId = 'missing';
      },
    ],
    [
      'wrong owning role',
      (s: PlaySystemContent) => {
        s.roleSettings.F3.defaultObjective.role = 'F2';
      },
    ],
    [
      'unknown trigger zone',
      (s: PlaySystemContent) => {
        s.rules[0]!.when.zoneId = 'missing';
      },
    ],
    [
      'unsupported trigger phase',
      (s: PlaySystemContent) => {
        s.rules[0]!.when.phase = 'transition_to_attack';
      },
    ],
    [
      'unknown action zone',
      (s: PlaySystemContent) => {
        s.rules[0]!.then = [
          { action: 'SET_TARGET_ZONE', role: 'F2', zoneId: 'missing' },
        ];
      },
    ],
    [
      'unknown lane target',
      (s: PlaySystemContent) => {
        s.rules[0]!.then = [
          {
            action: 'COVER_LANE',
            role: 'F2',
            fromTargetId: 'left',
            toTargetId: 'missing',
          },
        ];
      },
    ],
    [
      'degenerate lane',
      (s: PlaySystemContent) => {
        s.rules[0]!.then = [
          {
            action: 'COVER_LANE',
            role: 'F2',
            fromTargetId: 'left',
            toTargetId: 'left',
          },
        ];
      },
    ],
    [
      'nested unknown zone',
      (s: PlaySystemContent) => {
        s.rules[0]!.when.conditions = {
          operator: 'not',
          condition: { condition: 'PUCK_IN_ZONE', zoneId: 'missing' },
        };
      },
    ],
    [
      'nested unknown target',
      (s: PlaySystemContent) => {
        s.rules[0]!.when.conditions = {
          operator: 'any',
          conditions: [
            {
              condition: 'DISTANCE',
              from: { kind: 'puck' },
              to: { kind: 'target', targetId: 'missing' },
              operator: 'lt',
              metres: 5,
            },
          ],
        };
      },
    ],
    [
      'unsupported nested phase',
      (s: PlaySystemContent) => {
        s.rules[0]!.when.conditions = {
          operator: 'not',
          condition: { condition: 'PHASE', phase: 'transition_to_attack' },
        };
      },
    ],
  ])('rejects %s', (_label, mutate) => {
    const system = systemContentFixture();
    mutate(system);
    expect(PlaySystemContentSchema.safeParse(system).success).toBe(false);
  });
  it('rejects unknown executable fields, actions and out-of-range parameters', () => {
    const rule = systemContentFixture().rules[0]!;
    expect(
      SystemRuleSchema.safeParse({
        ...rule,
        when: { event: 'PUCK_SWITCH_SIDE', expression: 'eval(1)' },
      }).success,
    ).toBe(false);
    expect(
      SystemActionSchema.safeParse({
        action: 'EXECUTE_SCRIPT',
        code: 'return 1',
      }).success,
    ).toBe(false);
    expect(
      SystemActionSchema.safeParse({
        action: 'SET_PRESSURE_INTENSITY',
        role: 'F1',
        value: 1.01,
      }).success,
    ).toBe(false);
    expect(
      SystemActionSchema.safeParse({
        action: 'SUPPORT_PUCK',
        role: 'F1',
        distanceMetres: Infinity,
      }).success,
    ).toBe(false);
    expect(
      PlaySystemVersionSchema.safeParse({
        ...systemVersionFixture(),
        checksum: 'wrong',
      }).success,
    ).toBe(false);
  });
  it('requires contextual filters for zone-entry and unavailable-role triggers', () => {
    const rule = systemContentFixture().rules[0]!;
    for (const event of ['PUCK_ENTER_ZONE', 'ROLE_UNAVAILABLE'])
      expect(
        SystemRuleSchema.safeParse({ ...rule, when: { event } }).success,
      ).toBe(false);
    expect(
      SystemRuleSchema.safeParse({
        ...rule,
        when: { event: 'PUCK_ENTER_ZONE', zoneId: 'center' },
      }).success,
    ).toBe(true);
  });
  it('bounds rules and actions at the declared limits', () => {
    const system = systemContentFixture();
    system.rules = Array.from({ length: DSL_LIMITS.rules }, (_, i) => ({
      ...system.rules[0]!,
      id: `rule-${i}`,
      then: Array.from({ length: DSL_LIMITS.actionsPerRule }, () => ({
        action: 'HOLD_CENTER' as const,
        role: 'F3' as const,
      })),
    }));
    expect(PlaySystemContentSchema.safeParse(system).success).toBe(true);
    expect(
      SystemRuleSchema.safeParse({
        ...system.rules[0],
        then: [...system.rules[0]!.then, { action: 'HOLD_CENTER', role: 'F3' }],
      }).success,
    ).toBe(false);
    system.rules.push({ ...system.rules[0]!, id: 'too-many' });
    expect(PlaySystemContentSchema.safeParse(system).success).toBe(false);
  });
  it('bounds boolean depth, fan-out and total nodes before traversing the schema', () => {
    const leaf = { condition: 'POSSESSION', team: 'opponent' };
    let tree: unknown = leaf;
    for (let i = 0; i < DSL_LIMITS.conditionDepth; i++)
      tree = { operator: 'not', condition: tree };
    expect(SystemConditionSchema.safeParse(tree).success).toBe(true);
    expect(
      SystemConditionSchema.safeParse({ operator: 'not', condition: tree })
        .success,
    ).toBe(false);
    expect(
      SystemConditionSchema.safeParse({
        operator: 'all',
        conditions: Array(9).fill(leaf),
      }).success,
    ).toBe(false);
    const group = { operator: 'all', conditions: Array(8).fill(leaf) };
    const large = {
      operator: 'all',
      conditions: Array(8).fill({
        operator: 'any',
        conditions: Array(8).fill(group),
      }),
    };
    const result = SystemConditionSchema.safeParse(large);
    expect(result.success).toBe(false);
    if (!result.success)
      expect(result.error.issues[0]?.message).toBe(
        'Condition node budget exceeded.',
      );
    const cyclic: { operator: string; condition?: unknown } = {
      operator: 'not',
    };
    cyclic.condition = cyclic;
    expect(SystemConditionSchema.safeParse(cyclic).success).toBe(false);
  });
  it('accepts simple polygons and rejects bounds, crossing, repeated and collinear vertices', () => {
    const zone = {
      id: 'zone',
      name: 'Zone',
      geometry: {
        kind: 'polygon',
        points: [
          { x: 0.1, y: 0.1 },
          { x: 0.8, y: 0.1 },
          { x: 0.5, y: 0.8 },
        ],
      },
    };
    expect(SystemZoneSchema.safeParse(zone).success).toBe(true);
    for (const points of [
      [
        { x: -0.1, y: 0.1 },
        { x: 0.8, y: 0.1 },
        { x: 0.5, y: 0.8 },
      ],
      [
        { x: 0, y: 0 },
        { x: 1, y: 1 },
        { x: 0, y: 0.8 },
        { x: 0.8, y: 0 },
      ],
      [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 0, y: 0 },
      ],
      [
        { x: 0, y: 0 },
        { x: 0.5, y: 0.5 },
        { x: 1, y: 1 },
      ],
    ])
      expect(
        SystemZoneSchema.safeParse({
          ...zone,
          geometry: { kind: 'polygon', points },
        }).success,
      ).toBe(false);
    expect(
      SystemZoneSchema.safeParse({
        ...zone,
        geometry: { kind: 'rectangle', x: 0.8, y: 0, width: 0.3, height: 0.5 },
      }).success,
    ).toBe(false);
  });
  it('requires versioned rule decisions with candidate actions and explanations', () => {
    const trace = {
      schemaVersion: 1,
      tick: 12,
      playerId: 'a-0',
      oldRole: 'F1',
      newRole: 'F2',
      reasonCodes: ['PUCK_SWITCH_SIDE', 'RULE_MATCHED'],
      targetPoint: { x: 20, y: 12 },
      systemVersionId: 'system-version-1',
      ruleId: 'rule-switch',
      trigger: 'PUCK_SWITCH_SIDE',
      candidateActions: systemContentFixture().rules[0]!.then,
      chosenAction: systemContentFixture().rules[0]!.then[0],
    };
    expect(SystemDecisionTraceSchema.safeParse(trace).success).toBe(true);
    expect(
      SystemDecisionTraceSchema.safeParse({
        ...trace,
        ruleId: null,
        chosenAction: null,
        candidateActions: [],
        reasonCodes: ['BUDGET_EXCEEDED', 'FALLBACK'],
      }).success,
    ).toBe(true);
    expect(
      SystemDecisionTraceSchema.safeParse({ ...trace, reasonCodes: [] })
        .success,
    ).toBe(false);
  });
});
