import type { ContextPhase, SequenceV12 } from '@hockey-iq/contracts';
import { playerLabel, PHASE_NAMES } from './labels';

export interface DemonstrationStep {
  tick: number;
  title: string;
  description: string;
  explicitPause: boolean;
}
type Candidate = DemonstrationStep & {
  priority: number;
  descriptions: Set<string>;
};
/** Presentation metadata only: never changes a recording, its events, or its hashes. */
export function demonstrationSteps(sequence: SequenceV12): DemonstrationStep[] {
  const frames = sequence.frames,
    end = frames.length - 1;
  if (!frames.length) return [];
  const candidates = new Map<number, Candidate>();
  function add(
    tick: number,
    title: string,
    description: string,
    priority = 0,
    pause = false,
  ) {
    if (!Number.isInteger(tick) || tick < 0 || tick > end) return;
    const old = candidates.get(tick);
    if (old) {
      if (priority > old.priority) {
        old.title = title;
        old.priority = priority;
      }
      if (description.trim()) old.descriptions.add(description.trim());
      old.explicitPause ||= pause;
    } else
      candidates.set(tick, {
        tick,
        title,
        description,
        priority,
        explicitPause: pause,
        descriptions: new Set(description.trim() ? [description.trim()] : []),
      });
  }
  const own = sequence.controlledTeamId;
  const name = (id: string) => playerLabel(sequence.scenarioSnapshot, id);
  const first = frames[0]!;
  add(
    0,
    'Situation initiale',
    first.world.puck.holderId
      ? `${name(first.world.puck.holderId)} possède la rondelle. Repérez la pression adverse et les solutions de soutien.`
      : 'La rondelle est libre. Repérez le joueur qui peut la récupérer et ses solutions de soutien.',
    100,
  );
  const inputs = new Map<number, SequenceV12['inputs']>();
  for (const input of sequence.inputs) {
    const list = inputs.get(input.tick) ?? [];
    list.push(input);
    inputs.set(input.tick, list);
  }
  // Next physical holder permits accurate D-to-D labels without treating an intention as a pass.
  const nextHolder: (string | null)[] = new Array(frames.length).fill(null);
  let next: string | null = null;
  for (let i = end; i >= 0; i--) {
    nextHolder[i] = next;
    if (frames[i]!.world.puck.holderId) next = frames[i]!.world.puck.holderId;
  }
  let pendingPass: { from: string; teamId: string } | null = null;
  let lastReading = -30;
  let previousReading = '';
  const phaseTitles: Partial<Record<ContextPhase, string>> = {
    NEUTRAL_ZONE_TRANSITION: 'Sortie de zone',
    TURNOVER_DEFENSE: 'Repli défensif',
  };
  for (let i = 1; i < frames.length; i++) {
    const previous = frames[i - 1]!,
      frame = frames[i]!;
    const before = previous.world.puck.holderId,
      after = frame.world.puck.holderId;
    const interventions = inputs.get(i) ?? [];
    const pass = interventions.find(
      (e) => e.kind === 'pass_requested' && e.fromPlayerId === before,
    );
    const reposition = interventions.some(
      (e) => e.kind === 'puck_repositioned',
    );
    if (before !== after) {
      if (before && !after) {
        const passer = previous.world.players.find((p) => p.id === before)!;
        if (pass && !reposition) {
          const receiver = frame.world.players.find(
            (p) => p.id === nextHolder[i],
          );
          const reverse =
            receiver?.teamId === passer.teamId &&
            [passer, receiver].every(
              (p) => p.nominalPosition === 'LD' || p.nominalPosition === 'RD',
            );
          add(
            i,
            reverse ? 'Renversement D à D' : 'Passe',
            reverse
              ? `${name(before)} renverse vers l’autre défenseur. Observez la ligne de passe et la disponibilité du soutien.`
              : `${name(before)} fait une passe. Suivez la rondelle et observez la ligne de réception.`,
            60,
          );
          pendingPass = { from: before, teamId: passer.teamId };
        } else {
          add(
            i,
            'Rondelle libre',
            'La possession est interrompue. Repérez la rondelle et le joueur le mieux placé pour la récupérer.',
            30,
          );
          pendingPass = null;
        }
      } else if (after) {
        const holder = frame.world.players.find((p) => p.id === after)!;
        if (
          pendingPass &&
          !reposition &&
          holder.teamId !== pendingPass.teamId
        ) {
          add(
            i,
            'Passe interceptée',
            `${name(after)} intercepte la passe. Observez le changement de possession et le repli de l’équipe qui perd la rondelle.`,
            80,
          );
        } else if (pendingPass && !reposition) {
          add(
            i,
            'Réception',
            `${name(after)} reçoit la rondelle. Repérez sa prochaine option et les joueurs qui lui offrent du soutien.`,
            60,
          );
        } else if (!before && !reposition) {
          add(
            i,
            'Récupération',
            `${name(after)} récupère la rondelle. Observez la pression et la première solution de passe.`,
            50,
          );
        } else
          add(
            i,
            'Changement de possession',
            `${name(after)} possède maintenant la rondelle. Réévaluez les options et la couverture défensive.`,
            50,
          );
        pendingPass = null;
      }
    }
    if (frame.phase !== previous.phase && phaseTitles[frame.phase]) {
      add(
        i,
        phaseTitles[frame.phase]!,
        frame.phase === 'NEUTRAL_ZONE_TRANSITION'
          ? 'La rondelle franchit la ligne bleue avec possession. Observez le soutien autour du porteur et la couverture derrière lui.'
          : 'L’adversaire possède la rondelle. Observez le repli et la protection du centre.',
        40,
      );
    }
    const holder = frame.world.players.find((p) => p.id === after);
    const reading =
      holder?.teamId === own
        ? frame.decisions.find(
            (d) => d.playerId === holder.id && d.action === 'WAIT_SUPPORT',
          )
        : undefined;
    const key = reading?.explanation ?? '';
    if (reading && key !== previousReading && i - lastReading >= 30) {
      add(
        i,
        'Lire la pression',
        `${reading.explanation} Regardez le porteur, les adversaires proches et les solutions de soutien.`,
        20,
      );
      lastReading = i;
    }
    previousReading = key;
  }
  for (const annotation of sequence.annotations) {
    const titles = {
      text: 'Consigne',
      pause: 'Pause pédagogique',
      arrow: 'Ligne à observer',
      focus: 'Joueur à observer',
    };
    const text =
      annotation.text.trim() ||
      (annotation.playerId
        ? `Observez ${name(annotation.playerId)}.`
        : 'Observez cette situation avant de poursuivre.');
    add(
      annotation.atTick,
      titles[annotation.kind],
      text,
      annotation.kind === 'pause' ? 95 : 90,
      annotation.kind === 'pause',
    );
  }
  if (end > 0)
    add(
      end,
      'Fin de la démonstration',
      `Le déroulement se termine : ${PHASE_NAMES[frames[end]!.phase].toLocaleLowerCase('fr')}. Revenez à une étape pour revoir les choix et les informations à observer.`,
      10,
    );
  return [...candidates.values()]
    .sort((a, b) => a.tick - b.tick)
    .map((s) => ({
      tick: s.tick,
      title: s.title,
      description: [...s.descriptions].join(' '),
      explicitPause: s.explicitPause,
    }));
}
export function stepIndexAt(steps: readonly DemonstrationStep[], tick: number) {
  for (let i = steps.length - 1; i >= 0; i--)
    if (steps[i]!.tick <= tick) return i;
  return 0;
}
export function nextStepTick(
  steps: readonly DemonstrationStep[],
  tick: number,
): number | null {
  return steps.find((s) => s.tick > tick)?.tick ?? null;
}
/** Stops exactly at the first requested/pedagogical boundary, including a large animation delta. */
export function advanceDemonstration(
  current: number,
  delta: number,
  end: number,
  pauseTicks: readonly number[],
  target: number | null,
) {
  const proposed = Math.min(
    end,
    current + Math.max(0, Number.isFinite(delta) ? delta : 0),
  );
  const pause = pauseTicks
    .filter((t) => t > current && t <= proposed)
    .sort((a, b) => a - b)[0];
  const limit =
    target !== null && target > current && target <= proposed ? target : null;
  const tick = Math.min(proposed, pause ?? Infinity, limit ?? Infinity);
  return { tick, stopped: tick >= end || tick === pause || tick === limit };
}
