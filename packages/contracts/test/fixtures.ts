import type {
  Recording,
  Scenario,
  TacticsConfig,
  WorldState,
} from '../src/index.js';
export function scenarioFixture(): Scenario {
  const tactics: TacticsConfig = {
    system: 'forecheck_212',
    roleHoldTicks: 15,
    switchPenalty: 1,
    coverageWeight: 1,
    pressureWeight: 1,
    defensiveGapMetres: 6,
    offensiveRisk: 0.25,
  };
  return {
    schemaVersion: 1,
    id: 'scenario-1',
    title: 'Échec avant 2-1-2',
    seed: 42,
    rink: { length: 60.96, width: 25.9 },
    initialPhase: 'neutral',
    teams: [
      { id: 'a', label: 'Équipe A', attackDirection: 'positive_x' },
      { id: 'b', label: 'Équipe B', attackDirection: 'negative_x' },
    ],
    players: ['a', 'b'].flatMap((teamId) =>
      (['LW', 'C', 'RW', 'LD', 'RD'] as const).map((nominalPosition, i) => ({
        id: `${teamId}-${i}`,
        teamId,
        label: `${i + 1}`,
        nominalPosition,
        pos: { x: teamId === 'a' ? 20 : 40, y: 4 + 4 * i },
        vel: { x: 0, y: 0 },
        heading: 0,
        role: null,
        objective: null,
      })),
    ),
    puck: { pos: { x: 30, y: 12 }, vel: { x: 0, y: 0 }, holderId: null },
    tacticsByTeam: { a: { ...tactics }, b: { ...tactics } },
  };
}
export function worldFixture(): WorldState {
  const scenario = scenarioFixture();
  return {
    schemaVersion: 1,
    tick: 0,
    seed: scenario.seed,
    rngState: scenario.seed,
    phase: scenario.initialPhase,
    rink: scenario.rink,
    teams: scenario.teams,
    players: scenario.players,
    puck: scenario.puck,
    tacticsByTeam: scenario.tacticsByTeam,
  };
}
export function recordingFixture(): Recording {
  return {
    schemaVersion: 1,
    id: 'recording-1',
    engineVersion: 'fixture-only',
    rulesetVersion: 'unreviewed-fixture',
    tickRate: 30,
    seed: 42,
    scenarioSnapshot: scenarioFixture(),
    durationTicks: 1,
    inputEvents: [],
    keyframes: [
      { tick: 0, state: worldFixture() },
      { tick: 1, state: { ...worldFixture(), tick: 1 } },
    ],
    annotations: [],
    stateHashes: [0, 1].map((tick) => ({ tick, hash: '0'.repeat(64) })),
  };
}
