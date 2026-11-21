import { z } from 'zod';
import {
  AssignmentSchema,
  IdSchema,
  LessonSchema,
  RecordingSchema,
  ScenarioSchema,
  validateEntities,
  validateRecording,
} from './domain.js';
import {
  PlaySystemVersionRefSchema,
  PlaySystemVersionSchema,
} from './play-systems.js';
export const ScenarioSystemRefSchema = z.strictObject({
  sideTeamId: IdSchema,
  version: PlaySystemVersionRefSchema,
});
export const ScenarioV2Schema = z
  .strictObject({
    ...ScenarioSchema.shape,
    schemaVersion: z.literal(2),
    teamId: IdSchema,
    systemRefs: z.array(ScenarioSystemRefSchema).min(1).max(2),
  })
  .superRefine(validateEntities)
  .superRefine((scenario, ctx) => {
    if (
      new Set(scenario.systemRefs.map((ref) => ref.sideTeamId)).size !==
      scenario.systemRefs.length
    )
      ctx.addIssue({
        code: 'custom',
        path: ['systemRefs'],
        message: 'Each rink side can have only one system version.',
      });
    scenario.systemRefs.forEach((ref, index) => {
      if (!scenario.teams.some((team) => team.id === ref.sideTeamId))
        ctx.addIssue({
          code: 'custom',
          path: ['systemRefs', index, 'sideTeamId'],
          message: 'Unknown rink side.',
        });
      if (ref.version.teamId !== scenario.teamId)
        ctx.addIssue({
          code: 'custom',
          path: ['systemRefs', index, 'version', 'teamId'],
          message: 'System must belong to the scenario private team.',
        });
    });
  });
export const RecordingV2Schema = z
  .strictObject({
    ...RecordingSchema.shape,
    schemaVersion: z.literal(2),
    teamId: IdSchema,
    scenarioSnapshot: ScenarioV2Schema,
    playSystemSnapshots: z
      .array(
        z.strictObject({
          sideTeamId: IdSchema,
          version: PlaySystemVersionSchema,
        }),
      )
      .min(1)
      .max(2),
  })
  .superRefine(validateRecording)
  .superRefine((recording, ctx) => {
    if (recording.teamId !== recording.scenarioSnapshot.teamId)
      ctx.addIssue({
        code: 'custom',
        path: ['teamId'],
        message: 'Recording and scenario must belong to the same private team.',
      });
    const refs = recording.scenarioSnapshot.systemRefs;
    if (
      recording.playSystemSnapshots.length !== refs.length ||
      new Set(
        recording.playSystemSnapshots.map((snapshot) => snapshot.sideTeamId),
      ).size !== recording.playSystemSnapshots.length
    )
      ctx.addIssue({
        code: 'custom',
        path: ['playSystemSnapshots'],
        message:
          'Exactly one full system snapshot is required per referenced rink side.',
      });
    recording.playSystemSnapshots.forEach((snapshot, index) => {
      const reference = refs.find(
          (ref) => ref.sideTeamId === snapshot.sideTeamId,
        )?.version,
        version = snapshot.version;
      if (
        !reference ||
        reference.systemId !== version.systemId ||
        reference.systemVersionId !== version.id ||
        reference.teamId !== version.teamId ||
        reference.version !== version.version ||
        reference.rulesetVersion !== version.rulesetVersion ||
        reference.checksum !== version.checksum
      )
        ctx.addIssue({
          code: 'custom',
          path: ['playSystemSnapshots', index],
          message:
            'Embedded system snapshot must match the pinned scenario version.',
        });
      if (version.teamId !== recording.teamId)
        ctx.addIssue({
          code: 'custom',
          path: ['playSystemSnapshots', index, 'version', 'teamId'],
          message: 'Embedded system belongs to another private team.',
        });
    });
  });
const SystemRefs = z.array(PlaySystemVersionRefSchema).max(16);
const RecordingRef = z.strictObject({
  recordingId: IdSchema,
  checksum: z.string().regex(/^[a-f0-9]{64}$/),
});
export const LessonV2Schema = z
  .discriminatedUnion('status', [
    LessonSchema.options[0].omit({ recordingId: true }).extend({
      schemaVersion: z.literal(2),
      recordings: z.array(RecordingRef).max(20),
      systemRefs: SystemRefs,
    }),
    LessonSchema.options[1].omit({ recordingId: true }).extend({
      schemaVersion: z.literal(2),
      recordings: z.array(RecordingRef).min(1).max(20),
      systemRefs: SystemRefs,
    }),
  ])
  .superRefine((lesson, ctx) => {
    if (
      new Set(lesson.recordings.map((ref) => ref.recordingId)).size !==
      lesson.recordings.length
    )
      ctx.addIssue({
        code: 'custom',
        path: ['recordings'],
        message: 'Recording references must be unique.',
      });
    if (
      new Set(lesson.systemRefs.map((ref) => ref.systemVersionId)).size !==
      lesson.systemRefs.length
    )
      ctx.addIssue({
        code: 'custom',
        path: ['systemRefs'],
        message: 'System references must be unique.',
      });
    if (lesson.systemRefs.some((ref) => ref.teamId !== lesson.teamId))
      ctx.addIssue({
        code: 'custom',
        path: ['systemRefs'],
        message: 'Lesson systems must belong to the lesson private team.',
      });
  });
export const AssignmentV2Schema = z
  .strictObject({
    schemaVersion: z.literal(2),
    id: IdSchema,
    teamId: IdSchema,
    target: AssignmentSchema.shape.target,
    dueAt: AssignmentSchema.shape.dueAt,
    resource: z.discriminatedUnion('kind', [
      z.strictObject({
        kind: z.literal('lesson'),
        teamId: IdSchema,
        lessonId: IdSchema,
        lessonVersion: z.number().int().positive(),
      }),
      z.strictObject({
        kind: z.literal('play_system'),
        version: PlaySystemVersionRefSchema,
      }),
    ]),
  })
  .superRefine((assignment, ctx) => {
    const teamId =
      assignment.resource.kind === 'lesson'
        ? assignment.resource.teamId
        : assignment.resource.version.teamId;
    if (teamId !== assignment.teamId)
      ctx.addIssue({
        code: 'custom',
        path: ['resource'],
        message:
          'Assigned resource must belong to the assignment private team.',
      });
  });
export type ScenarioV2 = z.infer<typeof ScenarioV2Schema>;
export type RecordingV2 = z.infer<typeof RecordingV2Schema>;
export type LessonV2 = z.infer<typeof LessonV2Schema>;
export type AssignmentV2 = z.infer<typeof AssignmentV2Schema>;
