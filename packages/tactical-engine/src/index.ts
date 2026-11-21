import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils.js';
import {
  ScenarioSchema,
  TacticalSystemSchema,
  type TacticalSystem,
  type ContextRole,
  type ContextPhase,
  type FrozenFrame,
  type TacticalDecision,
  TacticalInputSchema,
  type TacticalInput,
  type InputEvent,
  type Scenario,
  type WorldState,
  type SequenceV12,
} from '@hockey-iq/contracts';
import {
  DeterministicSimulation,
  canonicalJson,
  clampToRink,
  closestPointOnSegment,
} from '@hockey-iq/simulation-core';
import {
  legacyActions,
  legacyTarget,
  matchingRules,
  zoneContains,
  validateSystem,
} from '@hockey-iq/play-systems';
export const hashValue = (value: unknown) =>
  bytesToHex(sha256(utf8ToBytes(canonicalJson(value))));
const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
type Player = WorldState['players'][number];
const distance = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y);
export function hashFrame(frame: Omit<FrozenFrame, 'hash'>) {
  return hashValue(frame);
}
export class TacticalSimulation {
  private engine: DeterministicSimulation;
  system: TacticalSystem;
  readonly initialSystem: TacticalSystem;
  readonly scenario: Scenario;
  readonly teamId: string;
  private roles: Record<string, ContextRole> = {};
  private lastRoles = -1000;
  private lastPass = -1000;
  private inputSequence = 0;
  private previousHolder: string | null = null;
  private pendingReceiver: string | null = null;
  private opponentPassed = false;
  private reversed = false;
  private previousSide = '';
  private previousPhase: ContextPhase = 'DEFENSIVE_ZONE_RECOVERY';
  private previousZones = new Set<string>();
  readonly frames: FrozenFrame[] = [];
  readonly inputs: TacticalInput[] = [];
  constructor(
    rawScenario: Scenario,
    rawSystem: TacticalSystem,
    teamId: string,
  ) {
    this.scenario = ScenarioSchema.parse(rawScenario);
    this.system = TacticalSystemSchema.parse(rawSystem);
    this.teamId = teamId;
    this.initialSystem = copy(this.system);
    if (!this.scenario.teams.some((t) => t.id === teamId))
      throw new Error('UNKNOWN_CONTROLLED_TEAM');
    if (!validateSystem(this.system).valid)
      throw new Error('INVALID_TACTICAL_RULES');
    this.engine = new DeterministicSimulation(this.scenario);
    this.assign(this.engine.snapshot.world);
    this.frames.push(this.frame([], this.phase(this.engine.snapshot.world)));
  }
  private phase(world: WorldState): ContextPhase {
    if (this.system.template === 'FORECHECK_212') return 'FORECHECK';
    const holder = world.players.find((p) => p.id === world.puck.holderId);
    if (holder && holder.teamId !== this.teamId) return 'TURNOVER_DEFENSE';
    if (!holder) return 'DEFENSIVE_ZONE_RECOVERY';
    const team = world.teams.find((t) => t.id === this.teamId)!;
    const x =
      team.attackDirection === 'positive_x'
        ? world.puck.pos.x
        : world.rink.length - world.puck.pos.x;
    if (x > world.rink.length / 3) return 'NEUTRAL_ZONE_TRANSITION';
    return world.tick < this.system.reactionTicks
      ? 'BREAKOUT_SETUP'
      : 'BREAKOUT_EXECUTION';
  }
  private assign(world: WorldState) {
    if (
      world.tick - this.lastRoles <
      (this.system.legacy?.antiOscillation.roleHoldTicks ??
        this.system.roleHoldTicks)
    )
      return;
    const own = world.players
      .filter((p) => p.teamId === this.teamId)
      .sort((a, b) => (a.id < b.id ? -1 : 1));
    const defenders = own.filter(
      (p) => p.nominalPosition === 'LD' || p.nominalPosition === 'RD',
    );
    const next: Record<string, ContextRole> = {};
    if (this.system.template !== 'FORECHECK_212') {
      const ranked = [...defenders].sort(
        (a, b) =>
          distance(a.pos, world.puck.pos) - distance(b.pos, world.puck.pos) ||
          (a.id < b.id ? -1 : 1),
      );
      const retriever =
        defenders.find((p) => p.id === world.puck.holderId) ?? ranked[0]!;
      next[retriever.id] = 'PUCK_RETRIEVER';
      next[defenders.find((p) => p.id !== retriever.id)!.id] = 'D_SUPPORT';
      next[own.find((p) => p.nominalPosition === 'C')!.id] = 'CENTER_LOW';
      const wingers = own
        .filter((p) => p.nominalPosition === 'LW' || p.nominalPosition === 'RW')
        .sort((a, b) => a.pos.y - b.pos.y || (a.id < b.id ? -1 : 1));
      const strong =
        world.puck.pos.y <= world.rink.width / 2 ? wingers[0]! : wingers[1]!;
      next[strong.id] = 'STRONG_SIDE_WINGER';
      next[wingers.find((p) => p.id !== strong.id)!.id] = 'WEAK_SIDE_WINGER';
    } else {
      const attackSign =
        world.teams.find((t) => t.id === this.teamId)!.attackDirection ===
        'positive_x'
          ? 1
          : -1;
      const forwards = own.filter((p) => !defenders.includes(p));
      const permutations = forwards.flatMap((a) =>
        forwards
          .filter((b) => b !== a)
          .map((b) => [a, b, forwards.find((c) => c !== a && c !== b)!]),
      );
      const score = (players: Player[]) =>
        players.reduce(
          (total, p, i) =>
            total +
            (i === 0
              ? distance(p.pos, world.puck.pos) / 8
              : i === 1
                ? distance(p.pos, {
                    x: world.puck.pos.x - 5 * attackSign,
                    y: world.puck.pos.y,
                  }) / 8
                : distance(p.pos, {
                    x: world.puck.pos.x - 10 * attackSign,
                    y: world.rink.width / 2,
                  }) / 8) +
            (this.roles[p.id] && this.roles[p.id] !== `F${i + 1}`
              ? (this.system.legacy?.antiOscillation.switchPenalty ?? 1)
              : 0),
          0,
        );
      permutations.sort(
        (a, b) =>
          score(a) - score(b) ||
          (a.map((p) => p.id).join() < b.map((p) => p.id).join() ? -1 : 1),
      );
      permutations[0]!.forEach(
        (p, i) => (next[p.id] = `F${i + 1}` as ContextRole),
      );
      defenders.sort(
        (a, b) =>
          distance(a.pos, world.puck.pos) - distance(b.pos, world.puck.pos) ||
          (a.id < b.id ? -1 : 1),
      );
      next[defenders[0]!.id] = 'D1';
      next[defenders[1]!.id] = 'D2';
    }
    this.roles = next;
    this.lastRoles = world.tick;
  }
  private frame(
    decisions: TacticalDecision[],
    phase: ContextPhase,
  ): FrozenFrame {
    const snapshot = this.engine.snapshot;
    const content = {
      tick: snapshot.world.tick,
      world: snapshot.world,
      phase,
      roles: copy(this.roles),
      decisions,
      physicsHash: this.engine.hash,
    };
    return { ...content, hash: hashFrame(content) };
  }
  step(rawInputs: readonly TacticalInput[] = []): FrozenFrame {
    if (this.frames.length > 9000) throw new Error('RECORDING_LIMIT');
    const snapshot = this.engine.snapshot,
      world = snapshot.world,
      tick = world.tick + 1;
    const coachInputs = rawInputs.map((input) =>
      TacticalInputSchema.parse(input),
    );
    if (coachInputs.length > 64) throw new Error('TOO_MANY_INPUTS');
    for (const input of coachInputs)
      if (input.kind === 'instruction_changed') {
        if (
          input.system.template !== this.initialSystem.template ||
          !validateSystem(input.system).valid
        )
          throw new Error('INVALID_INSTRUCTION');
        this.system = copy(input.system);
      }

    this.assign(world);
    const phase = this.phase(world),
      holder = world.players.find((p) => p.id === world.puck.holderId);
    const previousGenericPhase = world.phase;
    const previous = world.players.find((p) => p.id === this.previousHolder);
    world.phase = !holder
      ? 'loose_puck'
      : holder.teamId === this.teamId
        ? previous && previous.teamId !== this.teamId
          ? 'transition_to_attack'
          : 'offensive_possession'
        : previous?.teamId === this.teamId
          ? 'transition_to_defense'
          : 'defensive_possession';
    const direction =
      world.teams.find((t) => t.id === this.teamId)!.attackDirection ===
      'positive_x'
        ? 1
        : -1;
    const xy = (x: number, y: number) => ({
      x: direction === 1 ? x * world.rink.length : (1 - x) * world.rink.length,
      y: y * world.rink.width,
    });
    if (holder) this.pendingReceiver = null;
    const strong = world.puck.pos.y < world.rink.width / 2 ? 0.12 : 0.88;
    const rolePlayer = (role: ContextRole) =>
      world.players.find((p) => this.roles[p.id] === role);
    const own = world.players.filter((p) => p.teamId === this.teamId),
      opponents = world.players.filter((p) => p.teamId !== this.teamId);
    const pressure = Math.min(
      ...opponents.map((p) => distance(p.pos, world.puck.pos)),
    );
    const side = strong === 0.12 ? 'left' : 'right';
    const events: string[] = [];
    if (this.system.legacy && world.phase !== previousGenericPhase)
      events.push('PHASE_CHANGED');
    if (side !== this.previousSide && this.previousSide)
      events.push('PUCK_SWITCH_SIDE');
    if (phase !== this.previousPhase) events.push('PHASE_CHANGED');
    if (this.opponentPassed) events.push('OPPONENT_PASS');
    if (
      Object.keys(this.roles).some(
        (id) =>
          distance(
            world.players.find((p) => p.id === id)!.pos,
            world.puck.pos,
          ) > 25,
      )
    )
      events.push('ROLE_UNAVAILABLE');
    if (world.puck.holderId !== this.previousHolder) {
      if (holder?.teamId === this.teamId) events.push('POSSESSION_GAINED');
      else if (
        this.previousHolder &&
        own.some((p) => p.id === this.previousHolder)
      )
        events.push('POSSESSION_LOST');
    }
    const zones = new Set(
      this.system.zones
        .filter((z) =>
          zoneContains(this.system, z.id, world.puck.pos, world, this.teamId),
        )
        .map((z) => z.id),
    );
    if ([...zones].some((z) => !this.previousZones.has(z)))
      events.push('PUCK_ENTER_ZONE');
    const rules = matchingRules(this.system, {
      world,
      teamId: this.teamId,
      phase,
      roles: this.roles,
      events,
      previousSide: this.previousSide,
    });
    const inherited = this.system.legacy
      ? legacyActions(this.system.legacy, {
          world,
          teamId: this.teamId,
          phase,
          roles: this.roles,
          events,
          previousSide: this.previousSide,
        })
      : {};
    const decisions: TacticalDecision[] = [];
    let automaticPass: { from: Player; to: Player } | null = null;
    const laneOpen = (from: Player, to: Player) =>
      opponents.every(
        (p) =>
          distance(p.pos, closestPointOnSegment(p.pos, from.pos, to.pos)) > 1.3,
      );
    for (const player of own) {
      const role = this.roles[player.id]!;
      let target: { x: number; y: number };
      let action = 'SUPPORT';
      let explanation =
        'Conserver une ligne de soutien et la couverture de l’axe.';
      const reasons = ['ROLE_STABILITY'];
      if (this.system.legacy && !Object.keys(inherited).length)
        reasons.push('BUDGET_EXCEEDED', 'TEMPLATE_FALLBACK');
      let ruleId: string | null = null;
      const defaults: Record<ContextRole, { x: number; y: number }> = {
        PUCK_RETRIEVER:
          holder?.teamId === this.teamId ? xy(0.38, strong) : world.puck.pos,
        D_SUPPORT: xy(0.1, 1 - strong),
        CENTER_LOW: xy(0.2, 0.5),
        STRONG_SIDE_WINGER: xy(0.32, strong),
        WEAK_SIDE_WINGER: xy(0.3, 1 - strong),
        F1: world.puck.pos,
        F2: {
          x: world.puck.pos.x - 4 * direction,
          y:
            world.puck.pos.y +
            (world.puck.pos.y < world.rink.width / 2 ? 4 : -4),
        },
        F3: { x: world.puck.pos.x - 10 * direction, y: world.rink.width / 2 },
        D1: {
          x: world.puck.pos.x - 17 * direction,
          y: world.rink.width * 0.35,
        },
        D2: {
          x: world.puck.pos.x - 20 * direction,
          y: world.rink.width * 0.65,
        },
      };
      target = defaults[role];
      if (role === 'PUCK_RETRIEVER' && !holder) {
        action = 'RECOVER';
        explanation = 'Le défenseur disponible récupère la rondelle.';
        reasons.push('PUCK_RECOVERY');
      }
      if (role === 'F1') {
        action = 'PRESS';
        explanation = 'Le meilleur temps d’interception prend la pression.';
        reasons.push('BEST_INTERCEPT_TIME');
      }
      if (phase === 'TURNOVER_DEFENSE') {
        target =
          role === 'PUCK_RETRIEVER'
            ? world.puck.pos
            : xy(
                0.13,
                role === 'CENTER_LOW' ? 0.5 : player.pos.y / world.rink.width,
              );
        action = 'RETREAT';
        explanation =
          'Perte de possession : protéger le centre et revenir côté défensif.';
        reasons.push('POSSESSION_LOST');
      }
      if (
        holder?.id === player.id &&
        this.system.template !== 'FORECHECK_212'
      ) {
        target = xy(0.52, strong);
        action = 'CARRY';
        explanation = 'Avancer avec du soutien pour franchir la ligne bleue.';
        if (role === 'PUCK_RETRIEVER' || role === 'D_SUPPORT') {
          const preferred =
            this.system.template === 'LOW_CENTER_SUPPORT'
              ? 'CENTER_LOW'
              : !this.reversed &&
                  (this.system.template === 'D_TO_D_REVERSE' ||
                    pressure < this.system.pressureMetres)
                ? 'D_SUPPORT'
                : 'STRONG_SIDE_WINGER';
          const candidates = [
            rolePlayer(preferred),
            rolePlayer('CENTER_LOW'),
            rolePlayer('STRONG_SIDE_WINGER'),
          ].filter((p): p is Player => !!p && p.id !== player.id);
          const receiver = candidates.find(
            (p) => distance(player.pos, p.pos) > 2 && laneOpen(player, p),
          );
          if (
            receiver &&
            world.tick - this.lastPass >= this.system.reactionTicks &&
            world.tick >= this.system.reactionTicks
          ) {
            automaticPass = { from: player, to: receiver };
            action = receiver === rolePlayer('D_SUPPORT') ? 'REVERSE' : 'PASS';
            target = receiver.pos;
            reasons.push(
              action === 'REVERSE'
                ? 'PRESSURE_CLOSES_BOARDS'
                : 'CENTER_OR_WING_AVAILABLE',
            );
            explanation =
              action === 'REVERSE'
                ? 'La pression ferme la bande : renverser vers le défenseur en soutien.'
                : 'La ligne de passe est disponible : utiliser le soutien.';
          } else if (pressure < this.system.pressureMetres) {
            action = 'WAIT_SUPPORT';
            explanation =
              'Ligne fermée : protéger la rondelle en attendant une solution.';
            target = xy(0.07, 0.5);
          }
        }
      }
      const legacy = inherited[role];
      if (legacy && this.system.legacy) {
        target = legacyTarget(
          this.system.legacy,
          legacy.action,
          world,
          player.pos,
          direction,
        );
        action = legacy.action.action;
        ruleId = legacy.ruleId;
        explanation = legacy.explanation;
        reasons.push('COACH_RULE');
      }
      for (const rule of rules) {
        const a = rule.actions.find(
          (a) => a.role === role && !(a.kind === 'REVERSE' && this.reversed),
        );
        if (!a) continue;
        ruleId = rule.id;
        action = a.kind;
        explanation = rule.explanation;
        reasons.push('COACH_RULE', rule.trigger);
        const zone = this.system.zones.find((z) => z.id === a.zoneId);
        if (zone) {
          const g = zone.geometry;
          target =
            g.kind === 'rectangle'
              ? xy(g.x + g.width / 2, g.y + g.height / 2)
              : xy(
                  g.points.reduce((s, p) => s + p.x, 0) / g.points.length,
                  g.points.reduce((s, p) => s + p.y, 0) / g.points.length,
                );
        }
        const receiver = a.targetRole ? rolePlayer(a.targetRole) : null;
        if (
          receiver &&
          holder?.id === player.id &&
          laneOpen(player, receiver) &&
          world.tick - this.lastPass >= this.system.reactionTicks &&
          world.tick >= this.system.reactionTicks
        ) {
          automaticPass = { from: player, to: receiver };
          target = receiver.pos;
        }
        if (a.kind === 'MOVE_TO_TARGET') {
          const point = this.system.targets?.find(
            (t) => t.id === a.targetId,
          )?.point;
          if (point) target = xy(point.x, point.y);
        }
        if (a.kind === 'PRESS_PUCK_CARRIER') target = world.puck.pos;
        if (a.kind === 'HOLD_CENTER') target = xy(0.25, 0.5);
        if (a.kind === 'SUPPORT_PUCK')
          target = { x: world.puck.pos.x - 5 * direction, y: world.puck.pos.y };
        if (a.kind === 'WAIT_SUPPORT') target = { ...player.pos };
        if (a.kind === 'PROTECT_INSIDE') target = xy(0.13, 0.5);
        if (a.kind === 'OFFER_PASS') target = xy(0.23, 0.5);
        if (a.kind === 'SET_ROLE_PRIORITY') target = world.puck.pos;
        if (a.kind === 'COVER_LANE') {
          const partner = receiver?.pos ?? xy(0.25, 0.5);
          target = {
            x: (world.puck.pos.x + partner.x) / 2,
            y: (world.puck.pos.y + partner.y) / 2,
          };
        }

        if (a.kind === 'CARRY') target = xy(0.52, strong);
        if (a.kind === 'SET_PRESSURE_INTENSITY')
          target = {
            x: player.pos.x + (world.puck.pos.x - player.pos.x) * a.intensity,
            y: player.pos.y + (world.puck.pos.y - player.pos.y) * a.intensity,
          };
        break;
      }
      if (!holder && this.pendingReceiver === player.id) {
        target = {
          x: world.puck.pos.x + world.puck.vel.x * 0.15,
          y: world.puck.pos.y + world.puck.vel.y * 0.15,
        };
        action = 'OFFER_PASS';
        explanation =
          'Revenir vers la ligne de passe et présenter une solution de réception.';
      }
      target = clampToRink(target, world.rink, 0.7);
      player.objective = {
        kind:
          action === 'PRESS' ||
          action === 'PRESS_PUCK_CARRIER' ||
          action === 'RECOVER'
            ? 'pressure'
            : 'support',
        targetPoint: target,
      };
      player.role =
        this.system.template === 'FORECHECK_212'
          ? (role as 'F1' | 'F2' | 'F3' | 'D1' | 'D2')
          : null;
      decisions.push({
        tick,
        playerId: player.id,
        role,
        phase,
        ruleId,
        trigger: ruleId
          ? (rules.find((r) => r.id === ruleId)?.trigger ??
            legacy?.trigger ??
            'TEMPLATE')
          : (events[0] ?? 'TEMPLATE'),
        action,
        reasonCodes: reasons,
        candidateActions: rules
          .filter((r) => r.actions.some((a) => a.role === role))
          .map((r) => r.id + ':' + r.actions.find((a) => a.role === role)!.kind)
          .slice(0, 64),
        target,
        explanation,
      });
    }
    // Deterministic, physical opponents: pressure, passing lanes, and D-D escape.
    const ranked = [...opponents].sort(
      (a, b) =>
        distance(a.pos, world.puck.pos) - distance(b.pos, world.puck.pos) ||
        (a.id < b.id ? -1 : 1),
    );
    opponents.forEach((p) => {
      const target =
        p === ranked[0]
          ? world.puck.pos
          : {
              x: world.puck.pos.x + 5 * direction,
              y: p.nominalPosition === 'C' ? world.rink.width / 2 : p.pos.y,
            };
      p.objective = {
        kind: 'pressure',
        targetPoint: clampToRink(target, world.rink, 0.7),
      };
    });
    if (
      this.system.template === 'FORECHECK_212' &&
      holder &&
      holder.teamId !== this.teamId &&
      world.tick - this.lastPass >= this.system.reactionTicks
    ) {
      const receiver = opponents
        .filter((p) => p.id !== holder.id)
        .sort(
          (a, b) =>
            Math.abs(a.pos.y - holder.pos.y) -
              Math.abs(b.pos.y - holder.pos.y) || (a.id < b.id ? -1 : 1),
        )
        .find((p) => distance(holder.pos, p.pos) > 5);
      if (receiver) automaticPass = { from: holder, to: receiver };
    }
    const journal: TacticalInput[] = coachInputs.map((i) => ({
      ...copy(i),
      tick,
      sequence: this.inputSequence++,
    }));
    const inputs: InputEvent[] = journal.filter(
      (input): input is InputEvent => input.schemaVersion === 1,
    );
    if (
      automaticPass &&
      !inputs.some(
        (i) => i.kind === 'pass_requested' || i.kind === 'puck_repositioned',
      )
    ) {
      const flight =
        distance(automaticPass.from.pos, automaticPass.to.pos) / 12;
      const targetPoint = clampToRink(
        {
          x: automaticPass.to.pos.x + automaticPass.to.vel.x * flight * 0.5,
          y: automaticPass.to.pos.y + automaticPass.to.vel.y * flight * 0.5,
        },
        world.rink,
        0.7,
      );
      const input: InputEvent = {
        schemaVersion: 1,
        tick,
        sequence: this.inputSequence++,
        kind: 'pass_requested',
        fromPlayerId: automaticPass.from.id,
        targetPoint,
      };
      inputs.push(input);
      journal.push(input);
      this.pendingReceiver = automaticPass.to.id;
    }
    for (const input of inputs)
      if (input.kind === 'pass_requested') {
        this.lastPass = world.tick;
        const passer = world.players.find((p) => p.id === input.fromPlayerId);
        const receiver =
          automaticPass?.from.id === input.fromPlayerId
            ? automaticPass.to
            : world.players
                .filter(
                  (p) => p.teamId === passer?.teamId && p.id !== passer?.id,
                )
                .sort(
                  (a, b) =>
                    distance(a.pos, input.targetPoint) -
                      distance(b.pos, input.targetPoint) ||
                    (a.id < b.id ? -1 : 1),
                )[0];
        this.pendingReceiver = receiver?.id ?? null;
        if (
          passer?.teamId === this.teamId &&
          receiver &&
          [passer, receiver].every((p) =>
            ['LD', 'RD'].includes(p.nominalPosition),
          )
        )
          this.reversed = true;
      }
    this.opponentPassed = inputs.some(
      (i) =>
        i.kind === 'pass_requested' &&
        opponents.some((p) => p.id === i.fromPlayerId),
    );
    this.previousHolder = world.puck.holderId;
    this.previousSide = side;
    this.previousPhase = phase;
    this.previousZones = zones;
    this.engine = DeterministicSimulation.restore(snapshot);
    this.engine.step(inputs);
    this.inputs.push(...copy(journal));
    const frame = this.frame(decisions, this.phase(this.engine.snapshot.world));
    this.frames.push(frame);
    return copy(frame);
  }
  recording(
    name: string,
    systemId: string,
    systemVersion: number,
    annotations: SequenceV12['annotations'] = [],
  ): SequenceV12 {
    return {
      schemaVersion: 2,
      name,
      engineVersion: 'hockey-doo-tactics-1',
      rulesetVersion: 'tactics-1',
      seed: this.scenario.seed,
      systemId,
      systemVersion,
      systemSnapshot: copy(this.initialSystem),
      scenarioSnapshot: copy(this.scenario),
      controlledTeamId: this.teamId,
      frames: copy(this.frames),
      inputs: copy(this.inputs),
      annotations: copy(annotations),
    };
  }
}
