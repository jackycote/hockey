import {
  CoachingSequenceSchema,
  MIN_STEP_GAP_MS,
  MAX_SEQUENCE_MS,
  type CoachingPose,
  type CoachingSequence,
  type CoachingStep,
  type Scenario,
} from '@hockey-iq/contracts';
import {
  EditorError,
  MAX_SCENARIO_BYTES,
  parseScenario,
} from '../editor/scenario';
export const MAX_SEQUENCE_BYTES = 4 * 1024 * 1024;
export const poseOf = (scenario: Scenario): CoachingPose =>
  JSON.parse(
    JSON.stringify({ players: scenario.players, puck: scenario.puck }),
  );
export const cloneSequence = (sequence: CoachingSequence) =>
  CoachingSequenceSchema.parse(sequence);
export const durationOf = (sequence: CoachingSequence) =>
  sequence.steps.at(-1)!.atMs;
export function createSequence(scenario: Scenario): CoachingSequence {
  return CoachingSequenceSchema.parse({
    kind: 'coaching_sequence',
    schemaVersion: 1,
    scenario,
    steps: [
      {
        id: 'step-1',
        label: 'Départ',
        atMs: 0,
        kind: 'play',
        pose: poseOf(scenario),
        observation: null,
      },
    ],
  });
}
export function stepScenario(
  sequence: CoachingSequence,
  step: CoachingStep,
): Scenario {
  return { ...sequence.scenario, ...JSON.parse(JSON.stringify(step.pose)) };
}
/** Authored poses are independent of the fixed-tick physical engine. No wall clock enters this function. */
export function sequenceFrame(sequence: CoachingSequence, timeMs: number) {
  const time = Math.max(0, Math.min(durationOf(sequence), timeMs));
  let index = 0;
  for (
    let i = 1;
    i < sequence.steps.length && sequence.steps[i]!.atMs <= time;
    i++
  )
    index = i;
  const from = sequence.steps[index]!;
  const to = sequence.steps[index + 1];
  const directions: Record<string, { x: number; y: number }> = {};
  const scenario = stepScenario(sequence, from);
  if (to) {
    const alpha = (time - from.atMs) / (to.atMs - from.atMs);
    const targets = new Map(to.pose.players.map((p) => [p.id, p]));
    const mix = (a: number, b: number) => a + (b - a) * alpha;
    for (const player of scenario.players) {
      const target = targets.get(player.id)!;
      const delta = {
        x: target.pos.x - player.pos.x,
        y: target.pos.y - player.pos.y,
      };
      if (Math.hypot(delta.x, delta.y) > 0.001) directions[player.id] = delta;
      player.pos = {
        x: mix(player.pos.x, target.pos.x),
        y: mix(player.pos.y, target.pos.y),
      };
      const turn = Math.atan2(
        Math.sin(target.heading - player.heading),
        Math.cos(target.heading - player.heading),
      );
      player.heading = Math.atan2(
        Math.sin(player.heading + turn * alpha),
        Math.cos(player.heading + turn * alpha),
      );
      player.vel = {
        x: (delta.x * 1000) / (to.atMs - from.atMs),
        y: (delta.y * 1000) / (to.atMs - from.atMs),
      };
    }
    scenario.puck.pos = {
      x: mix(from.pose.puck.pos.x, to.pose.puck.pos.x),
      y: mix(from.pose.puck.pos.y, to.pose.puck.pos.y),
    };
    // A changed holder transfers at the destination pose; the travelling puck is free.
    scenario.puck.holderId =
      from.pose.puck.holderId === to.pose.puck.holderId
        ? from.pose.puck.holderId
        : alpha === 0
          ? from.pose.puck.holderId
          : null;
    if (scenario.puck.holderId) {
      const holder = scenario.players.find(
        (p) => p.id === scenario.puck.holderId,
      )!;
      scenario.puck.pos = { ...holder.pos };
    }
  }
  return { scenario, directions, step: from, index };
}
export function insertionIndex(sequence: CoachingSequence, atMs: number) {
  return sequence.steps.findIndex(
    (step, index) =>
      index > 0 &&
      atMs >= sequence.steps[index - 1]!.atMs + MIN_STEP_GAP_MS &&
      atMs <= step.atMs - MIN_STEP_GAP_MS,
  );
}
export function retimeStep(
  sequence: CoachingSequence,
  id: string,
  atMs: number,
) {
  const index = sequence.steps.findIndex((step) => step.id === id);
  if (index <= 0 || !Number.isFinite(atMs))
    throw new EditorError('invalidValues');
  const min = sequence.steps[index - 1]!.atMs + MIN_STEP_GAP_MS;
  const max = sequence.steps[index + 1]
    ? sequence.steps[index + 1]!.atMs - MIN_STEP_GAP_MS
    : MAX_SEQUENCE_MS;
  sequence.steps[index]!.atMs = Math.round(Math.max(min, Math.min(max, atMs)));
}
export function parseDocument(text: string): Scenario | CoachingSequence {
  if (new TextEncoder().encode(text).length > MAX_SEQUENCE_BYTES)
    throw new EditorError('tooLarge');
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    if (new TextEncoder().encode(text).length > MAX_SCENARIO_BYTES)
      throw new EditorError('tooLarge');
    throw new EditorError('invalidFile');
  }
  if (
    typeof value === 'object' &&
    value !== null &&
    'kind' in value &&
    value.kind === 'coaching_sequence'
  ) {
    if ('schemaVersion' in value && value.schemaVersion !== 1)
      throw new EditorError('version');
    const parsed = CoachingSequenceSchema.safeParse(value);
    if (!parsed.success) throw new EditorError('invalidFile');
    return parsed.data;
  }
  return parseScenario(text);
}
export const isSequence = (
  value: Scenario | CoachingSequence,
): value is CoachingSequence =>
  'kind' in value && value.kind === 'coaching_sequence';
export const formatTime = (ms: number) =>
  `${Math.floor(ms / 60000)
    .toString()
    .padStart(2, '0')}:${((ms % 60000) / 1000).toFixed(2).padStart(5, '0')}`;

/** Stop at the first information-gathering step crossed; resume excludes the current step. */
export function advanceSequence(
  sequence: CoachingSequence,
  time: number,
  delta: number,
) {
  const end = durationOf(sequence);
  const next = Math.min(end, time + Math.max(0, delta));
  const observation = sequence.steps.find(
    (s) => s.kind === 'observation' && s.atMs > time && s.atMs <= next,
  );
  return {
    time: observation?.atMs ?? next,
    paused: !!observation || next >= end,
  };
}
