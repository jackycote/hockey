import { z } from 'zod';
import {
  IdSchema,
  PlayerSchema,
  PuckSchema,
  ScenarioSchema,
  VectorSchema,
} from './domain.js';

export const MAX_SEQUENCE_STEPS = 120;
export const MAX_SEQUENCE_MS = 300_000;
export const MIN_STEP_GAP_MS = 100;
export const CoachingPoseSchema = z.strictObject({
  players: z.array(PlayerSchema).length(10),
  puck: PuckSchema,
});
export const ObservationSchema = z.strictObject({
  playerId: IdSchema,
  lookAt: z.discriminatedUnion('kind', [
    z.strictObject({ kind: z.literal('puck') }),
    z.strictObject({ kind: z.literal('player'), playerId: IdSchema }),
    z.strictObject({ kind: z.literal('point'), point: VectorSchema }),
  ]),
  prompt: z.string().trim().max(1000),
});
export const CoachingStepSchema = z.strictObject({
  id: IdSchema,
  label: z.string().trim().min(1).max(100),
  atMs: z.number().int().min(0).max(MAX_SEQUENCE_MS),
  kind: z.enum(['play', 'observation']),
  pose: CoachingPoseSchema,
  observation: ObservationSchema.nullable(),
});
export const CoachingSequenceSchema = z
  .strictObject({
    kind: z.literal('coaching_sequence'),
    schemaVersion: z.literal(1),
    scenario: ScenarioSchema,
    steps: z.array(CoachingStepSchema).min(1).max(MAX_SEQUENCE_STEPS),
  })
  .superRefine((sequence, ctx) => {
    const issue = (path: (string | number)[], message: string) =>
      ctx.addIssue({ code: 'custom', path, message });
    if (sequence.steps[0]?.atMs !== 0)
      issue(['steps', 0, 'atMs'], 'The initial pose must be at zero.');
    if (new Set(sequence.steps.map((s) => s.id)).size !== sequence.steps.length)
      issue(['steps'], 'Step IDs must be unique.');
    const identity = (players: z.infer<typeof PlayerSchema>[]) =>
      players
        .map((p) => `${p.id}:${p.teamId}:${p.nominalPosition}`)
        .sort()
        .join('|');
    const roster = identity(sequence.scenario.players);
    sequence.steps.forEach((step, index) => {
      if (
        index &&
        step.atMs - sequence.steps[index - 1]!.atMs < MIN_STEP_GAP_MS
      )
        issue(
          ['steps', index, 'atMs'],
          'Steps must be ordered and at least 100 ms apart.',
        );
      if (identity(step.pose.players) !== roster)
        issue(['steps', index, 'pose'], 'Roster identity must stay constant.');
      const pose = ScenarioSchema.safeParse({
        ...sequence.scenario,
        ...step.pose,
      });
      if (!pose.success)
        for (const error of pose.error.issues)
          issue(
            [
              'steps',
              index,
              'pose',
              ...error.path.filter(
                (p): p is string | number => typeof p !== 'symbol',
              ),
            ],
            error.message,
          );
      if ((step.kind === 'observation') !== (step.observation !== null))
        issue(
          ['steps', index, 'observation'],
          'Observation metadata must match the step type.',
        );
      const observation = step.observation;
      if (!observation) return;
      if (!step.pose.players.some((p) => p.id === observation.playerId))
        issue(['steps', index, 'observation', 'playerId'], 'Unknown observer.');
      const lookAt = observation.lookAt;
      if (
        lookAt.kind === 'player' &&
        (!step.pose.players.some((p) => p.id === lookAt.playerId) ||
          lookAt.playerId === observation.playerId)
      )
        issue(
          ['steps', index, 'observation', 'lookAt'],
          'Look at another rostered player.',
        );
      if (observation.lookAt.kind === 'point') {
        const { x, y } = observation.lookAt.point;
        if (
          x < 0 ||
          y < 0 ||
          x > sequence.scenario.rink.length ||
          y > sequence.scenario.rink.width
        )
          issue(
            ['steps', index, 'observation', 'lookAt'],
            'Look target is outside the rink.',
          );
      }
    });
  });
export type CoachingPose = z.infer<typeof CoachingPoseSchema>;
export type CoachingStep = z.infer<typeof CoachingStepSchema>;
export type CoachingSequence = z.infer<typeof CoachingSequenceSchema>;
export type Observation = z.infer<typeof ObservationSchema>;
