import { z } from 'zod';

/** Contract v1. Coordinates: metres; velocities: m/s; headings: radians; time: ticks. */
export const CONTRACT_VERSION = 1 as const;
export const SIMULATION_HZ = 30 as const;
export const MAX_RECORDING_TICKS = 5 * 60 * SIMULATION_HZ;
const VersionSchema = z.literal(CONTRACT_VERSION);
export const IdSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[a-zA-Z0-9_-]+$/);
const TickSchema = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const SeedSchema = z.number().int().min(0).max(0xffff_ffff);
const TextSchema = z.string().trim().min(1).max(200);
const HashSchema = z.string().regex(/^[a-f0-9]{64}$/);
export const VectorSchema = z.strictObject({ x: z.number(), y: z.number() });
export const RinkSchema = z.strictObject({
  length: z.number().min(40).max(70),
  width: z.number().min(20).max(35),
});
export const PhaseSchema = z.enum([
  'neutral',
  'offensive_possession',
  'defensive_possession',
  'loose_puck',
  'transition_to_attack',
  'transition_to_defense',
]);
export const TacticalRoleSchema = z.enum(['F1', 'F2', 'F3', 'D1', 'D2']);
export const TacticsConfigSchema = z.strictObject({
  system: z.literal('forecheck_212'),
  roleHoldTicks: z.number().int().min(0).max(300),
  switchPenalty: z.number().min(0).max(100),
  coverageWeight: z.number().min(0).max(100),
  pressureWeight: z.number().min(0).max(100),
  defensiveGapMetres: z.number().min(0).max(30),
  offensiveRisk: z.number().min(0).max(1),
});
export const TeamSchema = z.strictObject({
  id: IdSchema,
  label: TextSchema,
  attackDirection: z.enum(['positive_x', 'negative_x']),
});
export const PlayerSchema = z.strictObject({
  id: IdSchema,
  teamId: IdSchema,
  label: z.string().trim().min(1).max(40),
  nominalPosition: z.enum(['LW', 'C', 'RW', 'LD', 'RD']),
  pos: VectorSchema,
  vel: VectorSchema,
  heading: z.number().min(-Math.PI).max(Math.PI),
  stamina: z.number().min(0).max(1).optional(),
  role: TacticalRoleSchema.nullable(),
  objective: z
    .strictObject({
      kind: z.enum(['pressure', 'support', 'cover', 'hold']),
      targetPoint: VectorSchema,
    })
    .nullable(),
});
export const PuckSchema = z.strictObject({
  pos: VectorSchema,
  vel: VectorSchema,
  holderId: IdSchema.nullable(),
});
const EntitySetSchema = z.strictObject({
  rink: RinkSchema,
  teams: z.array(TeamSchema).length(2),
  players: z.array(PlayerSchema).length(10),
  puck: PuckSchema,
  tacticsByTeam: z.record(IdSchema, TacticsConfigSchema),
});
type EntitySet = z.infer<typeof EntitySetSchema>;
export function validateEntities(value: EntitySet, ctx: z.RefinementCtx) {
  const issue = (path: (string | number)[], message: string) =>
    ctx.addIssue({ code: 'custom', path, message });
  const teamIds = new Set(value.teams.map((team) => team.id));
  if (teamIds.size !== 2) issue(['teams'], 'Two distinct teams are required.');
  if (new Set(value.teams.map((team) => team.attackDirection)).size !== 2)
    issue(['teams'], 'Teams must attack opposite ends.');
  if (new Set(value.players.map((player) => player.id)).size !== 10)
    issue(['players'], 'Player IDs must be unique.');
  for (const team of value.teams) {
    const roster = value.players.filter((player) => player.teamId === team.id);
    if (
      roster.length !== 5 ||
      new Set(roster.map((player) => player.nominalPosition)).size !== 5
    )
      issue(['players'], 'Each team requires LW, C, RW, LD and RD.');
    const roles = roster.flatMap((player) =>
      player.role === null ? [] : [player.role],
    );
    if (new Set(roles).size !== roles.length)
      issue(['players'], 'Tactical roles must be unique within a team.');
  }
  const tacticIds = Object.keys(value.tacticsByTeam);
  if (tacticIds.length !== 2 || tacticIds.some((id) => !teamIds.has(id)))
    issue(['tacticsByTeam'], 'Tactics must belong to the two scenario teams.');
  const inBounds = (point: z.infer<typeof VectorSchema>) =>
    point.x >= 0 &&
    point.x <= value.rink.length &&
    point.y >= 0 &&
    point.y <= value.rink.width;
  value.players.forEach((player, index) => {
    if (!teamIds.has(player.teamId))
      issue(['players', index, 'teamId'], 'Unknown team.');
    if (!inBounds(player.pos))
      issue(['players', index, 'pos'], 'Player is outside the rink.');
    if (player.objective && !inBounds(player.objective.targetPoint))
      issue(['players', index, 'objective'], 'Objective is outside the rink.');
  });
  if (!inBounds(value.puck.pos))
    issue(['puck', 'pos'], 'Puck is outside the rink.');
  if (
    value.puck.holderId !== null &&
    !value.players.some((player) => player.id === value.puck.holderId)
  )
    issue(['puck', 'holderId'], 'Puck holder must be a rostered player.');
}
export const ScenarioSchema = EntitySetSchema.extend({
  schemaVersion: VersionSchema,
  id: IdSchema,
  title: TextSchema,
  seed: SeedSchema,
  initialPhase: PhaseSchema,
}).superRefine(validateEntities);
export const WorldStateSchema = EntitySetSchema.extend({
  schemaVersion: VersionSchema,
  tick: TickSchema,
  seed: SeedSchema,
  /** Persist RNG state with snapshots; seed alone cannot resume an advanced stream. */
  rngState: SeedSchema,
  phase: PhaseSchema,
}).superRefine(validateEntities);

const EventBase = {
  schemaVersion: VersionSchema,
  tick: TickSchema,
  sequence: TickSchema,
};
export const SimEventSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    ...EventBase,
    kind: z.literal('player_repositioned'),
    playerId: IdSchema,
    pos: VectorSchema,
  }),
  z.strictObject({
    ...EventBase,
    kind: z.literal('puck_repositioned'),
    pos: VectorSchema,
    holderId: IdSchema.nullable(),
  }),
  z.strictObject({
    ...EventBase,
    kind: z.literal('tactics_changed'),
    teamId: IdSchema,
    tactics: TacticsConfigSchema,
  }),
  z.strictObject({
    ...EventBase,
    kind: z.literal('pass_requested'),
    fromPlayerId: IdSchema,
    targetPoint: VectorSchema,
  }),
  z.strictObject({
    ...EventBase,
    kind: z.literal('possession_changed'),
    holderId: IdSchema.nullable(),
  }),
  z.strictObject({
    ...EventBase,
    kind: z.literal('phase_changed'),
    phase: PhaseSchema,
  }),
]);
/** Only user interventions belong in the input journal; emitted events remain separate. */
export const InputEventSchema = z.discriminatedUnion('kind', [
  SimEventSchema.options[0],
  SimEventSchema.options[1],
  SimEventSchema.options[2],
  SimEventSchema.options[3],
]);
export const ReasonCodeSchema = z.enum([
  'PUCK_SWITCH_SIDE',
  'BEST_PRESSURE_ANGLE',
  'CENTER_COVERAGE',
  'ROLE_STABILITY',
  'POSSESSION_CHANGE',
  'DEFENSIVE_GAP',
  'PASS_LANE_COVERAGE',
]);
export const DecisionTraceSchema = z.strictObject({
  schemaVersion: VersionSchema,
  tick: TickSchema,
  playerId: IdSchema,
  oldRole: TacticalRoleSchema.nullable(),
  newRole: TacticalRoleSchema.nullable(),
  reasonCodes: z.array(ReasonCodeSchema).min(1).max(16),
  candidateScores: z
    .array(z.strictObject({ role: TacticalRoleSchema, score: z.number() }))
    .max(5)
    .optional(),
  targetPoint: VectorSchema,
});
const AnnotationBase = {
  schemaVersion: VersionSchema,
  id: IdSchema,
  atTick: TickSchema,
};
export const AnnotationSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    ...AnnotationBase,
    kind: z.literal('text'),
    text: z.string().trim().min(1).max(2000),
  }),
  z.strictObject({
    ...AnnotationBase,
    kind: z.literal('arrow'),
    from: VectorSchema,
    to: VectorSchema,
  }),
  z.strictObject({
    ...AnnotationBase,
    kind: z.literal('pause'),
    durationMs: z.number().int().min(1).max(60000),
  }),
]);
const RecordingBaseSchema = z.strictObject({
  schemaVersion: VersionSchema,
  id: IdSchema,
  engineVersion: z.string().min(1).max(64),
  rulesetVersion: z.string().min(1).max(64),
  tickRate: z.literal(SIMULATION_HZ),
  seed: SeedSchema,
  scenarioSnapshot: ScenarioSchema,
  durationTicks: TickSchema.max(MAX_RECORDING_TICKS),
  inputEvents: z.array(InputEventSchema).max(50000),
  /** M0 format stores every tick. Compression/delta encoding requires a new version. */
  keyframes: z
    .array(z.strictObject({ tick: TickSchema, state: WorldStateSchema }))
    .min(1)
    .max(MAX_RECORDING_TICKS + 1),
  annotations: z.array(AnnotationSchema).max(1000),
  stateHashes: z
    .array(z.strictObject({ tick: TickSchema, hash: HashSchema }))
    .min(1)
    .max(MAX_RECORDING_TICKS + 1),
});
type RecordingValidationInput = Omit<
  z.infer<typeof RecordingBaseSchema>,
  'schemaVersion' | 'scenarioSnapshot'
> & { scenarioSnapshot: Omit<z.infer<typeof ScenarioSchema>, 'schemaVersion'> };
export function validateRecording(
  recording: RecordingValidationInput,
  ctx: z.RefinementCtx,
) {
  const issue = (path: (string | number)[], message: string) =>
    ctx.addIssue({ code: 'custom', path, message });
  if (recording.seed !== recording.scenarioSnapshot.seed)
    issue(['seed'], 'Recording seed differs from scenario.');
  if (recording.keyframes.length !== recording.durationTicks + 1)
    issue(
      ['keyframes'],
      'A full snapshot is required for every tick, including tick zero.',
    );
  if (recording.stateHashes.length !== recording.keyframes.length)
    issue(['stateHashes'], 'Every snapshot requires a hash.');
  const scenario = recording.scenarioSnapshot;
  const rosterKey = (players: EntitySet['players']) =>
    players
      .map((p) => `${p.id}:${p.teamId}:${p.nominalPosition}`)
      .sort()
      .join('|');
  const initialRoster = rosterKey(scenario.players);
  recording.keyframes.forEach((frame, index) => {
    if (frame.tick !== index || frame.state.tick !== frame.tick)
      issue(
        ['keyframes', index],
        'Snapshot ticks must be contiguous and match world ticks.',
      );
    if (frame.state.seed !== recording.seed)
      issue(
        ['keyframes', index, 'state', 'seed'],
        'Snapshot seed must match recording.',
      );
    if (
      frame.state.rink.length !== scenario.rink.length ||
      frame.state.rink.width !== scenario.rink.width ||
      rosterKey(frame.state.players) !== initialRoster
    )
      issue(
        ['keyframes', index],
        'Rink and roster identity must remain stable.',
      );
    if (recording.stateHashes[index]?.tick !== frame.tick)
      issue(['stateHashes', index], 'Hash tick must match the snapshot tick.');
  });
  const ids = new Set(scenario.players.map((p) => p.id));
  let previousTick = -1;
  let previousSequence = -1;
  recording.inputEvents.forEach((event, index) => {
    if (
      event.tick > recording.durationTicks ||
      event.tick < previousTick ||
      event.sequence <= previousSequence
    )
      issue(
        ['inputEvents', index],
        'Inputs must be within duration, ordered by tick, with increasing sequence.',
      );
    previousTick = event.tick;
    previousSequence = event.sequence;
    if ('playerId' in event && !ids.has(event.playerId))
      issue(['inputEvents', index], 'Unknown player.');
    if ('fromPlayerId' in event && !ids.has(event.fromPlayerId))
      issue(['inputEvents', index], 'Unknown passer.');
    if (
      'holderId' in event &&
      event.holderId !== null &&
      !ids.has(event.holderId)
    )
      issue(['inputEvents', index], 'Unknown holder.');
    if ('teamId' in event && !scenario.teams.some((t) => t.id === event.teamId))
      issue(['inputEvents', index], 'Unknown team.');
    const point =
      'pos' in event
        ? event.pos
        : 'targetPoint' in event
          ? event.targetPoint
          : null;
    if (
      point &&
      (point.x < 0 ||
        point.x > scenario.rink.length ||
        point.y < 0 ||
        point.y > scenario.rink.width)
    )
      issue(['inputEvents', index], 'Input point is outside rink.');
  });
  const annotationIds = new Set<string>();
  recording.annotations.forEach((annotation, index) => {
    if (annotation.atTick > recording.durationTicks)
      issue(['annotations', index], 'Annotation exceeds duration.');
    if (annotationIds.has(annotation.id))
      issue(['annotations', index], 'Annotation IDs must be unique.');
    annotationIds.add(annotation.id);
    if (
      annotation.kind === 'arrow' &&
      [annotation.from, annotation.to].some(
        (p) =>
          p.x < 0 ||
          p.x > scenario.rink.length ||
          p.y < 0 ||
          p.y > scenario.rink.width,
      )
    )
      issue(['annotations', index], 'Arrow is outside rink.');
  });
}
export const RecordingSchema =
  RecordingBaseSchema.superRefine(validateRecording);
const LessonBase = {
  schemaVersion: VersionSchema,
  id: IdSchema,
  teamId: IdSchema,
  authorId: IdSchema,
  title: TextSchema,
  description: z.string().max(4000),
};
export const LessonSchema = z.discriminatedUnion('status', [
  z.strictObject({
    ...LessonBase,
    status: z.literal('draft'),
    recordingId: IdSchema.nullable(),
  }),
  z.strictObject({
    ...LessonBase,
    status: z.literal('published'),
    version: z.number().int().positive(),
    recordingId: IdSchema,
    checksum: HashSchema,
    publishedAt: z.iso.datetime({ offset: true }),
  }),
]);
export const AssignmentSchema = z.strictObject({
  schemaVersion: VersionSchema,
  id: IdSchema,
  teamId: IdSchema,
  lessonId: IdSchema,
  lessonVersion: z.number().int().positive(),
  target: z.discriminatedUnion('type', [
    z.strictObject({ type: z.literal('team') }),
    z.strictObject({ type: z.literal('group'), groupId: IdSchema }),
  ]),
  dueAt: z.iso.datetime({ offset: true }).nullable(),
});
export const HealthSchema = z.strictObject({
  status: z.literal('ok'),
  milestone: z.literal('M0'),
  schemaVersion: VersionSchema,
});
export type Scenario = z.infer<typeof ScenarioSchema>;
export type WorldState = z.infer<typeof WorldStateSchema>;
export type SimEvent = z.infer<typeof SimEventSchema>;
export type InputEvent = z.infer<typeof InputEventSchema>;
export type DecisionTrace = z.infer<typeof DecisionTraceSchema>;
export type Recording = z.infer<typeof RecordingSchema>;
export type Annotation = z.infer<typeof AnnotationSchema>;
export type Lesson = z.infer<typeof LessonSchema>;
export type Assignment = z.infer<typeof AssignmentSchema>;
export type TacticsConfig = z.infer<typeof TacticsConfigSchema>;
export type TacticalRole = z.infer<typeof TacticalRoleSchema>;
export type Phase = z.infer<typeof PhaseSchema>;
