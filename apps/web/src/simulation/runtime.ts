import {
  MAX_RECORDING_TICKS,
  SimulationCommandSchema,
  type InputEvent,
  type Scenario,
  type SimulationCommand,
  type SimulationResponse,
  type TickTrace,
  type WorldState,
} from '@hockey-iq/contracts';
import { DeterministicSimulation } from '@hockey-iq/simulation-core';
/** Command handling is also headless: the Worker is responsible only for transport and pacing. */
export class SimulationRuntime {
  private engine: DeterministicSimulation | null = null;
  private initial: Scenario | null = null;
  private sessionId = 0;
  private nextSequence = 0;
  private pending: InputEvent[] = [];
  mode: 'paused' | 'running' | 'ended' = 'paused';
  get currentSessionId() {
    return this.sessionId;
  }
  private frame(
    requestId: number,
    previousWorld?: WorldState,
    trace: TickTrace | null = null,
  ): SimulationResponse {
    if (!this.engine) throw new Error('NO_SESSION');
    const snapshot = this.engine.snapshot;
    return {
      protocolVersion: 1,
      type: 'frame',
      requestId,
      sessionId: this.sessionId,
      mode: this.mode,
      snapshot,
      previousWorld: previousWorld ?? snapshot.world,
      hash: this.engine.hash,
      trace,
      pendingInputs: this.pending.map((input) => ({ ...input })),
    };
  }
  handle(raw: unknown): SimulationResponse {
    const command = SimulationCommandSchema.parse(raw);
    if (command.type === 'initialize') {
      const engine = new DeterministicSimulation(command.scenario);
      this.engine = engine;
      this.initial = command.scenario;
      this.sessionId = command.sessionId;
      this.pending = [];
      this.nextSequence = 0;
      this.mode = 'paused';
      return this.frame(command.requestId);
    }
    if (!this.engine || this.sessionId !== command.sessionId)
      throw new Error('NO_SESSION');
    if (command.type === 'reset') {
      this.engine = new DeterministicSimulation(this.initial!);
      this.pending = [];
      this.nextSequence = 0;
      this.mode = 'paused';
    } else if (command.type === 'play') {
      if (this.mode !== 'ended') this.mode = 'running';
    } else if (command.type === 'pause') {
      if (this.mode !== 'ended') this.mode = 'paused';
    } else if (command.type === 'step') {
      if (this.mode === 'running') throw new Error('INVALID_COMMAND');
      return this.advance(command.requestId);
    } else {
      this.queuePass(command);
    }
    return this.frame(command.requestId);
  }
  private queuePass(command: Extract<SimulationCommand, { type: 'pass' }>) {
    const world = this.engine!.snapshot.world;
    const holder = world.players.find(
        (player) => player.id === world.puck.holderId,
      ),
      recipient = world.players.find(
        (player) => player.id === command.toPlayerId,
      );
    if (
      this.mode === 'ended' ||
      this.pending.length > 0 ||
      !holder ||
      !recipient ||
      recipient.id === holder.id ||
      recipient.teamId !== holder.teamId ||
      Math.hypot(
        recipient.pos.x - holder.pos.x,
        recipient.pos.y - holder.pos.y,
      ) < 0.5
    )
      throw new Error('INVALID_PASS');
    this.pending.push({
      schemaVersion: 1,
      tick: world.tick + 1,
      sequence: this.nextSequence++,
      kind: 'pass_requested',
      fromPlayerId: holder.id,
      targetPoint: { ...recipient.pos },
    });
  }
  advance(requestId = 0): SimulationResponse {
    if (!this.engine) throw new Error('NO_SESSION');
    const previousWorld = this.engine.snapshot.world;
    if (previousWorld.tick >= MAX_RECORDING_TICKS) {
      this.mode = 'ended';
      return this.frame(requestId);
    }
    const { trace } = this.engine.step(this.pending);
    this.pending = [];
    if (trace.tick >= MAX_RECORDING_TICKS) this.mode = 'ended';
    return this.frame(requestId, previousWorld, trace);
  }
}
