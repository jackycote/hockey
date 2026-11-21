import type { Scenario, ContextPhase } from '@hockey-iq/contracts';
export const POSITION_NAMES: Record<string, string> = {
  LW: 'Ailier gauche',
  C: 'Centre',
  RW: 'Ailier droit',
  LD: 'Défenseur gauche',
  RD: 'Défenseur droit',
};
export const PHASE_NAMES: Record<ContextPhase, string> = {
  FORECHECK: 'Échec avant',
  DEFENSIVE_ZONE_RECOVERY: 'Récupération en zone défensive',
  BREAKOUT_SETUP: 'Mise en place de la sortie',
  BREAKOUT_EXECUTION: 'Sortie de zone',
  NEUTRAL_ZONE_TRANSITION: 'Transition en zone neutre',
  TURNOVER_DEFENSE: 'Repli après perte de possession',
};
export function playerLabel(scenario: Scenario, id: string) {
  const p = scenario.players.find((p) => p.id === id);
  return p
    ? `${scenario.teams.find((t) => t.id === p.teamId)?.label ?? ''} · ${POSITION_NAMES[p.nominalPosition]} · ${p.label}`
    : 'Rondelle';
}
