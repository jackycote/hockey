import {
  ENGINE_VERSION,
  PHYSICS_VERSION,
  InputEventSchema,
  PhysicsConfigSchema,
  ScenarioSchema,
  SIMULATION_HZ,
  SimulationSnapshotSchema,
  type InputEvent,
  type PhysicsConfig,
  type Scenario,
  type SimEvent,
  type SimulationSnapshot,
  type TickTrace,
  type WorldState,
} from '@hockey-iq/contracts';
import {
  clampToRink,
  closestPointOnSegment,
  constrainMotion,
  limitVector,
  quantizeAngle,
  quantizePoint,
  wrapAngle,
} from './geometry.js';
import { compareIds, hashSnapshot } from './hash.js';
import { nextRandom } from './rng.js';
import { SimEventBus } from './events.js';
export const DT = 1 / SIMULATION_HZ;
export const DEFAULT_PHYSICS: Readonly<PhysicsConfig> = Object.freeze({
  maxPlayerSpeed: 8,
  acceleration: 4,
  maxTurnRate: 3.5,
  playerRadius: 0.7,
  puckRadius: 0.3,
  maxPuckSpeed: 25,
  puckDrag: 0.12,
  restitution: 0.65,
  passSpeed: 12,
  passSpreadRadians: 0.02,
  pickupRadius: 1.1,
  pickupFacingCos: -0.25,
  pickupDelayTicks: 3,
  passerDelayTicks: 15,
});
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
function canonicalize(world: WorldState) {
  world.players.sort((a, b) => compareIds(a.id, b.id));
  world.teams.sort((a, b) => compareIds(a.id, b.id));
  for (const player of world.players) {
    player.pos = quantizePoint(player.pos);
    player.vel = quantizePoint(player.vel);
    player.heading = quantizeAngle(player.heading);
    if (player.objective)
      player.objective.targetPoint = quantizePoint(
        player.objective.targetPoint,
      );
  }
  world.puck.pos = quantizePoint(world.puck.pos);
  world.puck.vel = quantizePoint(world.puck.vel);
}
export function createSnapshot(
  rawScenario: Scenario,
  physics: PhysicsConfig = DEFAULT_PHYSICS,
): SimulationSnapshot {
  const scenario = ScenarioSchema.parse(rawScenario),
    config = PhysicsConfigSchema.parse(physics);
  const world: WorldState = {
    schemaVersion: 1,
    tick: 0,
    seed: scenario.seed,
    rngState: scenario.seed,
    rink: scenario.rink,
    teams: scenario.teams,
    players: scenario.players,
    puck: scenario.puck,
    phase: scenario.initialPhase,
    tacticsByTeam: scenario.tacticsByTeam,
  };
  for (const player of world.players) {
    player.pos = clampToRink(player.pos, world.rink, config.playerRadius);
    player.vel = limitVector(player.vel, config.maxPlayerSpeed);
    if (player.objective)
      player.objective.targetPoint = clampToRink(
        player.objective.targetPoint,
        world.rink,
        config.playerRadius,
      );
  }
  world.puck.pos = clampToRink(world.puck.pos, world.rink, config.puckRadius);
  world.puck.vel = limitVector(world.puck.vel, config.maxPuckSpeed);
  const holder = world.players.find(
    (player) => player.id === world.puck.holderId,
  );
  if (holder) {
    world.puck.pos = { ...holder.pos };
    world.puck.vel = { ...holder.vel };
  }
  canonicalize(world);
  return SimulationSnapshotSchema.parse({
    snapshotVersion: 1,
    engineVersion: ENGINE_VERSION,
    physicsVersion: PHYSICS_VERSION,
    config,
    world,
    pickupBlockedUntilTick: 0,
    passerBlockedUntilTick: 0,
    lastPasserId: null,
    lastInputSequence: -1,
    eventSequence: 0,
  });
}
function movePlayers(world: WorldState, config: PhysicsConfig) {
  for (const player of world.players) {
    if (player.objective) {
      const delta = {
          x: player.objective.targetPoint.x - player.pos.x,
          y: player.objective.targetPoint.y - player.pos.y,
        },
        distance = Math.hypot(delta.x, delta.y);
      const angle =
        distance > 0.02 ? Math.atan2(delta.y, delta.x) : player.heading;
      const turn = Math.max(
        -config.maxTurnRate * DT,
        Math.min(config.maxTurnRate * DT, wrapAngle(angle - player.heading)),
      );
      player.heading = wrapAngle(player.heading + turn);
      const speed =
        distance < 0.15
          ? 0
          : Math.min(config.maxPlayerSpeed, distance * 2) *
            Math.max(0, Math.cos(wrapAngle(angle - player.heading)));
      const desired = {
        x: Math.cos(player.heading) * speed,
        y: Math.sin(player.heading) * speed,
      };
      const change = limitVector(
        { x: desired.x - player.vel.x, y: desired.y - player.vel.y },
        config.acceleration * DT,
      );
      player.vel = limitVector(
        { x: player.vel.x + change.x, y: player.vel.y + change.y },
        config.maxPlayerSpeed,
      );
    } else if (Math.hypot(player.vel.x, player.vel.y) > 0.02) {
      const angle = Math.atan2(player.vel.y, player.vel.x);
      player.heading = wrapAngle(
        player.heading +
          Math.max(
            -config.maxTurnRate * DT,
            Math.min(
              config.maxTurnRate * DT,
              wrapAngle(angle - player.heading),
            ),
          ),
      );
    }
    const motion = constrainMotion(
      {
        x: player.pos.x + player.vel.x * DT,
        y: player.pos.y + player.vel.y * DT,
      },
      player.vel,
      world.rink,
      config.playerRadius,
      0,
    );
    player.pos = motion.pos;
    player.vel = motion.vel;
  }
  // Fixed passes and stable pair ordering: a deliberately simple overlap solver, not body-check physics.
  for (let pass = 0; pass < 4; pass++)
    for (let i = 0; i < world.players.length; i++)
      for (let j = i + 1; j < world.players.length; j++) {
        const a = world.players[i]!,
          b = world.players[j]!;
        const dx = b.pos.x - a.pos.x,
          dy = b.pos.y - a.pos.y,
          distance = Math.hypot(dx, dy),
          minimum = 2 * config.playerRadius;
        if (distance >= minimum) continue;
        const nx = distance > 1e-10 ? dx / distance : (i + j) % 2 === 0 ? 1 : 0;
        const ny = distance > 1e-10 ? dy / distance : nx === 0 ? 1 : 0;
        const shift = (minimum - distance) / 2;
        a.pos = clampToRink(
          { x: a.pos.x - nx * shift, y: a.pos.y - ny * shift },
          world.rink,
          config.playerRadius,
        );
        b.pos = clampToRink(
          { x: b.pos.x + nx * shift, y: b.pos.y + ny * shift },
          world.rink,
          config.playerRadius,
        );
        const closing = (a.vel.x - b.vel.x) * nx + (a.vel.y - b.vel.y) * ny;
        if (closing > 0) {
          a.vel = {
            x: a.vel.x - (closing * nx) / 2,
            y: a.vel.y - (closing * ny) / 2,
          };
          b.vel = {
            x: b.vel.x + (closing * nx) / 2,
            y: b.vel.y + (closing * ny) / 2,
          };
        }
      }
}
export interface SimulationFrame {
  snapshot: SimulationSnapshot;
  trace: TickTrace;
}
export class DeterministicSimulation {
  private state: SimulationSnapshot;
  readonly events = new SimEventBus();
  private stepping = false;
  constructor(scenario: Scenario, config: PhysicsConfig = DEFAULT_PHYSICS) {
    this.state = createSnapshot(scenario, config);
  }
  static restore(snapshot: SimulationSnapshot): DeterministicSimulation {
    const valid = SimulationSnapshotSchema.parse(snapshot);
    const engine = Object.create(
      DeterministicSimulation.prototype,
    ) as DeterministicSimulation;
    Object.defineProperty(engine, 'events', {
      value: new SimEventBus(),
      enumerable: true,
    });
    for (const player of valid.world.players) {
      const bounded = clampToRink(
        player.pos,
        valid.world.rink,
        valid.config.playerRadius,
      );
      if (
        Math.hypot(bounded.x - player.pos.x, bounded.y - player.pos.y) >
          0.000002 ||
        Math.hypot(player.vel.x, player.vel.y) >
          valid.config.maxPlayerSpeed + 0.000002
      )
        throw new Error('INVALID_PHYSICAL_SNAPSHOT');
    }
    const puck = valid.world.puck,
      bounded = clampToRink(
        puck.pos,
        valid.world.rink,
        valid.config.puckRadius,
      );
    if (
      Math.hypot(bounded.x - puck.pos.x, bounded.y - puck.pos.y) > 0.000002 ||
      Math.hypot(puck.vel.x, puck.vel.y) > valid.config.maxPuckSpeed + 0.000002
    )
      throw new Error('INVALID_PHYSICAL_SNAPSHOT');
    engine.state = clone(valid);
    engine.stepping = false;
    canonicalize(engine.state.world);
    return engine;
  }
  get snapshot(): SimulationSnapshot {
    return clone(this.state);
  }
  get hash(): string {
    return hashSnapshot(this.state);
  }
  step(rawInputs: readonly InputEvent[] = []): SimulationFrame {
    if (this.stepping) throw new Error('REENTRANT_STEP');
    this.stepping = true;
    try {
      if (
        this.state.world.tick >= Number.MAX_SAFE_INTEGER ||
        this.state.eventSequence > Number.MAX_SAFE_INTEGER - 130
      )
        throw new Error('COUNTER_LIMIT');
      if (rawInputs.length > 64) throw new Error('TOO_MANY_INPUTS');
      const inputs = rawInputs
        .map((input) => InputEventSchema.parse(input))
        .sort((a, b) => a.sequence - b.sequence);
      const state = clone(this.state),
        { world, config } = state;
      const tick = world.tick + 1;
      let sequence = state.lastInputSequence;
      for (const input of inputs) {
        if (input.tick !== tick || input.sequence <= sequence)
          throw new Error('INVALID_INPUT_ORDER');
        sequence = input.sequence;
        if (
          'playerId' in input &&
          !world.players.some((p) => p.id === input.playerId)
        )
          throw new Error('UNKNOWN_PLAYER');
        if (
          'fromPlayerId' in input &&
          !world.players.some((p) => p.id === input.fromPlayerId)
        )
          throw new Error('UNKNOWN_PLAYER');
        if (
          'holderId' in input &&
          input.holderId !== null &&
          !world.players.some((p) => p.id === input.holderId)
        )
          throw new Error('UNKNOWN_HOLDER');
        if (
          'teamId' in input &&
          !world.teams.some((t) => t.id === input.teamId)
        )
          throw new Error('UNKNOWN_TEAM');
        const point =
          'pos' in input
            ? input.pos
            : 'targetPoint' in input
              ? input.targetPoint
              : null;
        if (
          point &&
          (point.x < 0 ||
            point.x > world.rink.length ||
            point.y < 0 ||
            point.y > world.rink.width)
        )
          throw new Error('INPUT_OUT_OF_BOUNDS');
      }
      world.tick = tick;
      const emitted: SimEvent[] = [],
        rejected: TickTrace['rejectedInputs'] = [];
      const emit = (
        event: Omit<
          Extract<SimEvent, { kind: 'possession_changed' }>,
          'sequence'
        >,
      ) => emitted.push({ ...event, sequence: state.eventSequence++ });
      const possession = (holderId: string | null) => {
        if (world.puck.holderId !== holderId) {
          world.puck.holderId = holderId;
          emit({
            schemaVersion: 1,
            tick,
            kind: 'possession_changed',
            holderId,
          });
        }
      };
      for (const input of inputs) {
        state.lastInputSequence = input.sequence;
        if (input.kind === 'player_repositioned') {
          world.players.find((player) => player.id === input.playerId)!.pos =
            clampToRink(input.pos, world.rink, config.playerRadius);
        } else if (input.kind === 'puck_repositioned') {
          world.puck.pos = clampToRink(
            input.pos,
            world.rink,
            config.puckRadius,
          );
          world.puck.vel = { x: 0, y: 0 };
          possession(input.holderId);
          state.pickupBlockedUntilTick = tick + config.pickupDelayTicks;
        } else if (input.kind === 'tactics_changed') {
          Object.defineProperty(world.tacticsByTeam, input.teamId, {
            value: clone(input.tactics),
            enumerable: true,
            writable: true,
            configurable: true,
          });
        } else {
          if (world.puck.holderId !== input.fromPlayerId) {
            rejected.push({
              sequence: input.sequence,
              reason: 'NOT_PUCK_HOLDER',
            });
            continue;
          }
          const from = world.players.find(
            (player) => player.id === input.fromPlayerId,
          )!;
          const distance = Math.hypot(
            input.targetPoint.x - from.pos.x,
            input.targetPoint.y - from.pos.y,
          );
          if (distance < 0.5) {
            rejected.push({
              sequence: input.sequence,
              reason: 'TARGET_TOO_CLOSE',
            });
            continue;
          }
          const rng = nextRandom(world.rngState);
          world.rngState = rng.state;
          const angle =
            Math.atan2(
              input.targetPoint.y - from.pos.y,
              input.targetPoint.x - from.pos.x,
            ) +
            (rng.value - 0.5) * config.passSpreadRadians;
          world.puck.pos = { ...from.pos };
          world.puck.vel = {
            x: Math.cos(angle) * config.passSpeed,
            y: Math.sin(angle) * config.passSpeed,
          };
          possession(null);
          state.lastPasserId = from.id;
          state.passerBlockedUntilTick = tick + config.passerDelayTicks;
          state.pickupBlockedUntilTick = tick + config.pickupDelayTicks;
        }
        emitted.push({ ...clone(input), sequence: state.eventSequence++ });
      }
      movePlayers(world, config);
      const holder = world.players.find(
        (player) => player.id === world.puck.holderId,
      );
      if (holder) {
        world.puck.pos = { ...holder.pos };
        world.puck.vel = { ...holder.vel };
      } else {
        const before = { ...world.puck.pos };
        const velocity = limitVector(
          {
            x: world.puck.vel.x * (1 - config.puckDrag * DT),
            y: world.puck.vel.y * (1 - config.puckDrag * DT),
          },
          config.maxPuckSpeed,
        );
        const motion = constrainMotion(
          { x: before.x + velocity.x * DT, y: before.y + velocity.y * DT },
          velocity,
          world.rink,
          config.puckRadius,
          config.restitution,
        );
        world.puck.pos = motion.pos;
        world.puck.vel = motion.vel;
        if (tick >= state.pickupBlockedUntilTick) {
          const candidates = world.players
            .flatMap((player) => {
              if (
                player.id === state.lastPasserId &&
                tick < state.passerBlockedUntilTick
              )
                return [];
              const point = closestPointOnSegment(
                  player.pos,
                  before,
                  world.puck.pos,
                ),
                dx = point.x - player.pos.x,
                dy = point.y - player.pos.y,
                distance = Math.hypot(dx, dy);
              const facing =
                distance < 0.01
                  ? 1
                  : (Math.cos(player.heading) * dx +
                      Math.sin(player.heading) * dy) /
                    distance;
              return distance <= config.pickupRadius &&
                facing >= config.pickupFacingCos
                ? [{ player, distance }]
                : [];
            })
            .sort(
              (a, b) =>
                a.distance - b.distance || compareIds(a.player.id, b.player.id),
            );
          const recipient = candidates[0]?.player;
          if (recipient) {
            possession(recipient.id);
            world.puck.pos = { ...recipient.pos };
            world.puck.vel = { ...recipient.vel };
          }
        }
      }
      for (const player of world.players)
        player.vel = limitVector(player.vel, config.maxPlayerSpeed);
      canonicalize(world);
      this.state = state;
      const trace: TickTrace = {
        tick,
        hash: hashSnapshot(state),
        inputs,
        events: emitted,
        rejectedInputs: rejected,
      };
      const frame = { snapshot: clone(state), trace: clone(trace) };
      this.events.publish(emitted);
      return frame;
    } finally {
      this.stepping = false;
    }
  }
}
