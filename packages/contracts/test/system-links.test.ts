import { describe, expect, it } from 'vitest';
import {
  AssignmentV2Schema,
  LessonV2Schema,
  RecordingSchema,
  RecordingV2Schema,
  ScenarioSchema,
  ScenarioV2Schema,
  type RecordingV2,
  type ScenarioV2,
} from '../src/index.js';
import { recordingFixture, scenarioFixture } from './fixtures.js';
import {
  recordingV2Fixture,
  scenarioV2Fixture,
  systemRefFixture,
} from './system-fixtures.js';

describe('v1.1 associations and backwards compatibility', () => {
  it('leaves v1 editor and replay formats readable and requires explicit v2 parsing', () => {
    expect(ScenarioSchema.parse(scenarioFixture()).schemaVersion).toBe(1);
    expect(RecordingSchema.parse(recordingFixture()).schemaVersion).toBe(1);
    expect(ScenarioV2Schema.parse(scenarioV2Fixture()).schemaVersion).toBe(2);
    expect(
      RecordingV2Schema.parse(recordingV2Fixture()).playSystemSnapshots[0]!
        .version.content.rules,
    ).toHaveLength(1);
    expect(ScenarioSchema.safeParse(scenarioV2Fixture()).success).toBe(false);
    expect(RecordingSchema.safeParse(recordingV2Fixture()).success).toBe(false);
  });
  it.each([
    [
      'unknown side',
      (s: ScenarioV2) => {
        s.systemRefs[0]!.sideTeamId = 'outside';
      },
    ],
    ['duplicate side', (s: ScenarioV2) => s.systemRefs.push(s.systemRefs[0]!)],
    [
      'foreign owner',
      (s: ScenarioV2) => {
        s.systemRefs[0]!.version.teamId = 'other';
      },
    ],
    [
      'invalid roster',
      (s: ScenarioV2) => {
        s.players[0]!.teamId = 'outside';
      },
    ],
    [
      'out-of-bounds player',
      (s: ScenarioV2) => {
        s.players[0]!.pos.x = -1;
      },
    ],
    [
      'missing tactics',
      (s: ScenarioV2) => {
        delete s.tacticsByTeam.b;
      },
    ],
  ])('rejects v2 scenario with %s', (_label, mutate) => {
    const s = scenarioV2Fixture();
    mutate(s);
    expect(ScenarioV2Schema.safeParse(s).success).toBe(false);
  });
  it.each([
    [
      'missing snapshot',
      (r: RecordingV2) => {
        r.playSystemSnapshots = [];
      },
    ],
    [
      'duplicate snapshot',
      (r: RecordingV2) => r.playSystemSnapshots.push(r.playSystemSnapshots[0]!),
    ],
    [
      'unreferenced side',
      (r: RecordingV2) => {
        r.playSystemSnapshots[0]!.sideTeamId = 'b';
      },
    ],
    [
      'different version ID',
      (r: RecordingV2) => {
        r.playSystemSnapshots[0]!.version.id = 'version-other';
      },
    ],
    [
      'different version number',
      (r: RecordingV2) => {
        r.playSystemSnapshots[0]!.version.version = 2;
      },
    ],
    [
      'different checksum',
      (r: RecordingV2) => {
        r.playSystemSnapshots[0]!.version.checksum = 'b'.repeat(64);
      },
    ],
    [
      'foreign snapshot',
      (r: RecordingV2) => {
        r.playSystemSnapshots[0]!.version.teamId = 'other';
      },
    ],
    [
      'foreign scenario',
      (r: RecordingV2) => {
        r.teamId = 'other';
      },
    ],
    ['missing frame', (r: RecordingV2) => r.keyframes.pop()],
    [
      'wrong seed',
      (r: RecordingV2) => {
        r.seed = 123;
      },
    ],
    [
      'unordered frames',
      (r: RecordingV2) => {
        r.keyframes[1]!.tick = 0;
      },
    ],
    [
      'late input',
      (r: RecordingV2) =>
        r.inputEvents.push({
          schemaVersion: 1,
          kind: 'puck_repositioned',
          tick: 2,
          sequence: 1,
          pos: { x: 1, y: 1 },
          holderId: null,
        }),
    ],
  ])('rejects recording with %s', (_label, mutate) => {
    const r = recordingV2Fixture();
    mutate(r);
    expect(RecordingV2Schema.safeParse(r).success).toBe(false);
  });
  it('requires a separate matching snapshot for each referenced side', () => {
    const r = recordingV2Fixture();
    r.scenarioSnapshot.systemRefs.push({
      sideTeamId: 'b',
      version: systemRefFixture(),
    });
    expect(RecordingV2Schema.safeParse(r).success).toBe(false);
    r.playSystemSnapshots.push({
      ...r.playSystemSnapshots[0]!,
      sideTeamId: 'b',
    });
    expect(RecordingV2Schema.safeParse(r).success).toBe(true);
  });
});

describe('v1.1 lessons and private assignment contracts', () => {
  const lesson = {
    schemaVersion: 2,
    id: 'lesson-1',
    teamId: 'private-team-1',
    authorId: 'coach-1',
    title: 'Lire la passe',
    description: '',
    status: 'draft',
    recordings: [],
    systemRefs: [],
  };
  const recordings = [
    { recordingId: 'recording-1', checksum: 'a'.repeat(64) },
    { recordingId: 'recording-2', checksum: 'b'.repeat(64) },
  ];
  it('supports multiple ordered replay references and optional systems', () => {
    expect(LessonV2Schema.safeParse(lesson).success).toBe(true);
    const published = {
      ...lesson,
      status: 'published',
      version: 1,
      publishedAt: '2026-11-20T12:00:00Z',
      checksum: 'c'.repeat(64),
      recordings,
      systemRefs: [systemRefFixture()],
    };
    expect(LessonV2Schema.parse(published).recordings).toEqual(recordings);
    expect(
      LessonV2Schema.safeParse({ ...published, recordings: [] }).success,
    ).toBe(false);
    expect(LessonV2Schema.safeParse({ ...published, version: 0 }).success).toBe(
      false,
    );
  });
  it('rejects duplicate recordings/systems and cross-team system links', () => {
    expect(
      LessonV2Schema.safeParse({
        ...lesson,
        recordings: [recordings[0], recordings[0]],
      }).success,
    ).toBe(false);
    expect(
      LessonV2Schema.safeParse({
        ...lesson,
        systemRefs: [systemRefFixture(), systemRefFixture()],
      }).success,
    ).toBe(false);
    expect(
      LessonV2Schema.safeParse({
        ...lesson,
        systemRefs: [{ ...systemRefFixture(), teamId: 'other' }],
      }).success,
    ).toBe(false);
  });
  it('assigns a published system alone or an explicit lesson version', () => {
    const assignment = {
      schemaVersion: 2,
      id: 'assignment-1',
      teamId: 'private-team-1',
      target: { type: 'team' },
      dueAt: null,
    };
    const system = {
      ...assignment,
      resource: { kind: 'play_system', version: systemRefFixture() },
    };
    const linkedLesson = {
      ...assignment,
      target: { type: 'group', groupId: 'group-1' },
      resource: {
        kind: 'lesson',
        teamId: assignment.teamId,
        lessonId: 'lesson-1',
        lessonVersion: 1,
      },
    };
    expect(AssignmentV2Schema.safeParse(system).success).toBe(true);
    expect(AssignmentV2Schema.safeParse(linkedLesson).success).toBe(true);
    expect(
      AssignmentV2Schema.safeParse({ ...system, teamId: 'other' }).success,
    ).toBe(false);
    expect(
      AssignmentV2Schema.safeParse({
        ...linkedLesson,
        resource: { ...linkedLesson.resource, teamId: 'other' },
      }).success,
    ).toBe(false);
    expect(
      AssignmentV2Schema.safeParse({
        ...system,
        resource: { kind: 'draft_system', systemId: 'system-1' },
      }).success,
    ).toBe(false);
  });
});
