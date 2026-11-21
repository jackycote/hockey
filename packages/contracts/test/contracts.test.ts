import { describe, expect, it } from 'vitest';
import {
  AssignmentSchema,
  DecisionTraceSchema,
  LessonSchema,
  MAX_RECORDING_TICKS,
  RecordingSchema,
  ScenarioSchema,
  SimEventSchema,
  WorldStateSchema,
} from '../src/index.js';
import { recordingFixture, scenarioFixture, worldFixture } from './fixtures.js';
describe('contract v1 scenarios and world state', () => {
  it('round-trips a complete ten-skater scenario and world', () => {
    const scenario = scenarioFixture();
    expect(ScenarioSchema.parse(JSON.parse(JSON.stringify(scenario)))).toEqual(
      scenario,
    );
    expect(WorldStateSchema.parse(worldFixture()).tick).toBe(0);
  });
  it.each([
    [
      'unknown schema version',
      (s: Record<string, unknown>) => {
        s.schemaVersion = 2;
      },
    ],
    [
      'unexpected personal data',
      (s: Record<string, unknown>) => {
        s.email = 'not-collected@example.invalid';
      },
    ],
  ])('rejects %s', (_name, mutate) => {
    const scenario = { ...scenarioFixture() };
    mutate(scenario);
    expect(ScenarioSchema.safeParse(scenario).success).toBe(false);
  });
  it.each([
    'duplicate-player',
    'unknown-team',
    'unknown-holder',
    'out-of-bounds',
    'wrong-roster',
    'missing-tactics',
    'duplicate-role',
    'same-direction',
    'nonfinite',
  ] as const)('rejects %s', (defect) => {
    const s = scenarioFixture();
    const p = s.players[0]!;
    switch (defect) {
      case 'duplicate-player':
        s.players[1]!.id = p.id;
        break;
      case 'unknown-team':
        p.teamId = 'outside';
        break;
      case 'unknown-holder':
        s.puck.holderId = 'outside';
        break;
      case 'out-of-bounds':
        p.pos.x = -1;
        break;
      case 'wrong-roster':
        s.players[1]!.nominalPosition = 'LW';
        break;
      case 'missing-tactics':
        delete s.tacticsByTeam.b;
        break;
      case 'duplicate-role':
        p.role = 'F1';
        s.players[1]!.role = 'F1';
        break;
      case 'same-direction':
        s.teams[1]!.attackDirection = 'positive_x';
        break;
      case 'nonfinite':
        p.vel.x = Infinity;
        break;
    }
    expect(ScenarioSchema.safeParse(s).success).toBe(false);
  });
  it('keeps tactical roles independent from nominal forward positions', () => {
    const s = scenarioFixture();
    s.players[0]!.role = 'F3';
    s.players[1]!.role = 'F1';
    s.players[2]!.role = 'F2';
    expect(ScenarioSchema.safeParse(s).success).toBe(true);
  });
});
describe('events and explainable decisions', () => {
  it('validates event variants and rejects unknown kinds', () => {
    expect(
      SimEventSchema.parse({
        schemaVersion: 1,
        tick: 10,
        sequence: 1,
        kind: 'possession_changed',
        holderId: 'a-0',
      }).kind,
    ).toBe('possession_changed');
    expect(
      SimEventSchema.safeParse({
        schemaVersion: 1,
        tick: 10,
        sequence: 1,
        kind: 'unversioned_action',
      }).success,
    ).toBe(false);
  });
  it('requires a reason for role decisions', () => {
    const trace = {
      schemaVersion: 1,
      tick: 10,
      playerId: 'a-0',
      oldRole: 'F1',
      newRole: 'F2',
      reasonCodes: ['PUCK_SWITCH_SIDE'],
      targetPoint: { x: 35, y: 8 },
    };
    expect(DecisionTraceSchema.safeParse(trace).success).toBe(true);
    expect(
      DecisionTraceSchema.safeParse({ ...trace, reasonCodes: [] }).success,
    ).toBe(false);
  });
});
describe('recording compatibility and replay boundaries', () => {
  it('accepts a fully captured recording without running any tactical code', () => {
    expect(RecordingSchema.parse(recordingFixture()).keyframes).toHaveLength(2);
  });
  it.each([
    'missing-frame',
    'tick-mismatch',
    'seed-mismatch',
    'hash-mismatch',
    'unordered-inputs',
    'late-annotation',
    'over-duration',
    'unknown-player',
    'out-of-bounds-input',
    'roster-change',
  ] as const)('rejects %s', (defect) => {
    const r = recordingFixture();
    switch (defect) {
      case 'missing-frame':
        r.keyframes.pop();
        break;
      case 'tick-mismatch':
        r.keyframes[1]!.state.tick = 2;
        break;
      case 'seed-mismatch':
        r.seed = 43;
        break;
      case 'hash-mismatch':
        r.stateHashes[1]!.tick = 0;
        break;
      case 'unordered-inputs':
        r.inputEvents = [1, 0].map((tick, sequence) => ({
          schemaVersion: 1,
          kind: 'player_repositioned',
          tick,
          sequence,
          playerId: 'a-0',
          pos: { x: 1, y: 1 },
        }));
        break;
      case 'late-annotation':
        r.annotations = [
          {
            schemaVersion: 1,
            id: 'note-1',
            kind: 'text',
            atTick: 2,
            text: 'Observer F3',
          },
        ];
        break;
      case 'over-duration':
        r.durationTicks = MAX_RECORDING_TICKS + 1;
        break;
      case 'unknown-player':
        r.inputEvents = [
          {
            schemaVersion: 1,
            kind: 'player_repositioned',
            tick: 1,
            sequence: 0,
            playerId: 'outside',
            pos: { x: 1, y: 1 },
          },
        ];
        break;
      case 'out-of-bounds-input':
        r.inputEvents = [
          {
            schemaVersion: 1,
            kind: 'puck_repositioned',
            tick: 1,
            sequence: 0,
            holderId: null,
            pos: { x: -1, y: 1 },
          },
        ];
        break;
      case 'roster-change':
        r.keyframes[1]!.state.players[0]!.id = 'replacement';
        break;
    }
    expect(RecordingSchema.safeParse(r).success).toBe(false);
  });
});
describe('lesson publication and assignment pointers', () => {
  const base = {
    schemaVersion: 1,
    id: 'lesson-1',
    teamId: 'a',
    authorId: 'coach-1',
    title: 'Lire la passe D-D',
    description: '',
  };
  it('requires version and integrity metadata on publication', () => {
    expect(
      LessonSchema.safeParse({ ...base, status: 'draft', recordingId: null })
        .success,
    ).toBe(true);
    expect(
      LessonSchema.safeParse({ ...base, status: 'published', recordingId: 'r' })
        .success,
    ).toBe(false);
    expect(
      LessonSchema.safeParse({
        ...base,
        status: 'published',
        recordingId: 'r',
        version: 1,
        checksum: 'a'.repeat(64),
        publishedAt: '2026-11-20T12:00:00Z',
      }).success,
    ).toBe(true);
  });
  it('assigns an explicit published version to a team or a subgroup', () => {
    const assignment = {
      schemaVersion: 1,
      id: 'assignment-1',
      teamId: 'a',
      lessonId: 'lesson-1',
      lessonVersion: 1,
      dueAt: null,
    };
    expect(
      AssignmentSchema.safeParse({ ...assignment, target: { type: 'team' } })
        .success,
    ).toBe(true);
    expect(
      AssignmentSchema.safeParse({
        ...assignment,
        target: { type: 'group', groupId: 'g-1' },
      }).success,
    ).toBe(true);
    expect(
      AssignmentSchema.safeParse({ ...assignment, target: { type: 'group' } })
        .success,
    ).toBe(false);
    expect(
      AssignmentSchema.safeParse({
        ...assignment,
        lessonVersion: 0,
        target: { type: 'team' },
      }).success,
    ).toBe(false);
  });
});
