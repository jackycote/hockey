import {
  ScenarioSchema,
  type Scenario,
  type TacticalTemplate,
} from '@hockey-iq/contracts';
export function templateScenario(template: TacticalTemplate): Scenario {
  const positions = ['LW', 'C', 'RW', 'LD', 'RD'] as const;
  const breakout = template !== 'FORECHECK_212';
  const home = breakout
    ? [
        [13, 3],
        [10, 13],
        [13, 23],
        [4, 8],
        [7, 19],
      ]
    : [
        [40, 6],
        [39, 13],
        [35, 20],
        [28, 8],
        [28, 18],
      ];
  const away = breakout
    ? [
        [16, 5],
        [18, 13],
        [17, 23],
        [31, 9],
        [31, 18],
      ]
    : [
        [47, 19],
        [47, 12],
        [47, 4],
        [54, 8],
        [54, 18],
      ];
  if (template === 'D_TO_D_REVERSE' || template === 'UNDER_PRESSURE_BREAKOUT')
    away[0] = [7, 7];
  const tactics = {
    system: 'forecheck_212',
    roleHoldTicks: 15,
    switchPenalty: 1,
    coverageWeight: 1,
    pressureWeight: 1,
    defensiveGapMetres: 6,
    offensiveRisk: 0.25,
  };
  return ScenarioSchema.parse({
    schemaVersion: 1,
    id: 'scenario-' + template.toLowerCase(),
    title: template,
    seed: 42,
    initialPhase: 'neutral',
    rink: { length: 60.96, width: 25.9 },
    teams: [
      { id: 'home', label: 'Équipe A', attackDirection: 'positive_x' },
      { id: 'away', label: 'Équipe B', attackDirection: 'negative_x' },
    ],
    players: ['home', 'away'].flatMap((teamId, teamIndex) =>
      positions.map((nominalPosition, i) => ({
        id: `${teamId}-${i + 1}`,
        teamId,
        label: String(i + 1),
        nominalPosition,
        pos: {
          x: (teamIndex ? away : home)[i]![0],
          y: (teamIndex ? away : home)[i]![1],
        },
        vel: { x: 0, y: 0 },
        heading: teamIndex ? Math.PI : 0,
        role: null,
        objective: null,
      })),
    ),
    puck: {
      pos: breakout ? { x: 4, y: 8 } : { x: 54, y: 8 },
      vel: { x: 0, y: 0 },
      holderId: breakout ? 'home-4' : 'away-4',
    },
    tacticsByTeam: { home: { ...tactics }, away: { ...tactics } },
  });
}
