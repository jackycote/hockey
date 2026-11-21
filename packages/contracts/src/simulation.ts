import { z } from 'zod';
import {
  IdSchema,
  InputEventSchema,
  ScenarioSchema,
  SimEventSchema,
  WorldStateSchema,
} from './domain.js';
export const ENGINE_VERSION = '0.1.0' as const;
export const PHYSICS_VERSION = 'm2-1' as const;
export const WORKER_PROTOCOL_VERSION = 1 as const;
const Counter = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
export const PhysicsConfigSchema = z.strictObject({
  maxPlayerSpeed: z.number().min(1).max(15),
  acceleration: z.number().min(0.1).max(20),
  maxTurnRate: z.number().min(0.1).max(10),
  playerRadius: z.number().min(0.3).max(1),
  puckRadius: z.number().min(0.05).max(0.5),
  maxPuckSpeed: z.number().min(5).max(40),
  puckDrag: z.number().min(0).max(10),
  restitution: z.number().min(0).max(1),
  passSpeed: z.number().min(1).max(40),
  passSpreadRadians: z.number().min(0).max(0.2),
  pickupRadius: z.number().min(0.5).max(2),
  pickupFacingCos: z.number().min(-1).max(1),
  pickupDelayTicks: z.number().int().min(1).max(30),
  passerDelayTicks: z.number().int().min(1).max(60),
});
export const SimulationSnapshotSchema = z
  .strictObject({
    snapshotVersion: z.literal(1),
    engineVersion: z.literal(ENGINE_VERSION),
    physicsVersion: z.literal(PHYSICS_VERSION),
    config: PhysicsConfigSchema,
    world: WorldStateSchema,
    pickupBlockedUntilTick: Counter,
    passerBlockedUntilTick: Counter,
    lastPasserId: IdSchema.nullable(),
    lastInputSequence: z.number().int().min(-1).max(Number.MAX_SAFE_INTEGER),
    eventSequence: Counter,
  })
  .superRefine((snapshot, ctx) => {
    if (
      snapshot.lastPasserId !== null &&
      !snapshot.world.players.some(
        (player) => player.id === snapshot.lastPasserId,
      )
    )
      ctx.addIssue({
        code: 'custom',
        path: ['lastPasserId'],
        message: 'Unknown passer.',
      });
    if (snapshot.config.passSpeed > snapshot.config.maxPuckSpeed)
      ctx.addIssue({
        code: 'custom',
        path: ['config', 'passSpeed'],
        message: 'Pass speed exceeds maximum puck speed.',
      });
  });
export const TickTraceSchema = z.strictObject({
  tick: Counter,
  hash: z.string().regex(/^[a-f0-9]{64}$/),
  inputs: z.array(InputEventSchema).max(64),
  events: z.array(SimEventSchema).max(128),
  rejectedInputs: z
    .array(
      z.strictObject({
        sequence: Counter,
        reason: z.enum(['NOT_PUCK_HOLDER', 'TARGET_TOO_CLOSE']),
      }),
    )
    .max(64),
});
const CommandBase = {
  protocolVersion: z.literal(WORKER_PROTOCOL_VERSION),
  sessionId: Counter,
  requestId: Counter.min(1),
};
export const SimulationCommandSchema = z.discriminatedUnion('type', [
  z.strictObject({
    ...CommandBase,
    type: z.literal('initialize'),
    scenario: ScenarioSchema,
  }),
  z.strictObject({ ...CommandBase, type: z.literal('play') }),
  z.strictObject({ ...CommandBase, type: z.literal('pause') }),
  z.strictObject({ ...CommandBase, type: z.literal('step') }),
  z.strictObject({ ...CommandBase, type: z.literal('reset') }),
  z.strictObject({
    ...CommandBase,
    type: z.literal('pass'),
    toPlayerId: IdSchema,
  }),
]);
export const SimulationResponseSchema = z.discriminatedUnion('type', [
  z.strictObject({
    protocolVersion: z.literal(1),
    sessionId: Counter,
    requestId: Counter,
    type: z.literal('frame'),
    mode: z.enum(['paused', 'running', 'ended']),
    snapshot: SimulationSnapshotSchema,
    previousWorld: WorldStateSchema,
    hash: z.string().regex(/^[a-f0-9]{64}$/),
    trace: TickTraceSchema.nullable(),
    pendingInputs: z.array(InputEventSchema).max(64),
  }),
  z.strictObject({
    protocolVersion: z.literal(1),
    sessionId: Counter,
    requestId: Counter,
    type: z.literal('error'),
    code: z.enum([
      'INVALID_COMMAND',
      'NO_SESSION',
      'INVALID_PASS',
      'INVALID_INPUT',
      'WORKER_FAILURE',
    ]),
  }),
]);
export type PhysicsConfig = z.infer<typeof PhysicsConfigSchema>;
export type SimulationSnapshot = z.infer<typeof SimulationSnapshotSchema>;
export type TickTrace = z.infer<typeof TickTraceSchema>;
export type SimulationCommand = z.infer<typeof SimulationCommandSchema>;
export type SimulationResponse = z.infer<typeof SimulationResponseSchema>;
