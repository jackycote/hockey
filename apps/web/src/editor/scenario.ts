import { ScenarioSchema, type Scenario } from '@hockey-iq/contracts';
import { clampToRink, type Point } from './geometry';
export type Tool = 'move' | 'place' | 'target' | 'pan';
export type EntityKey = 'puck' | `player:${string}`;
export type Player = Scenario['players'][number];
export type EditorErrorCode =
  | 'invalidFile'
  | 'tooLarge'
  | 'version'
  | 'invalidValues'
  | 'storage'
  | 'noDraft'
  | 'unrecordedStep';
export class EditorError extends Error {
  constructor(public readonly code: EditorErrorCode) {
    super(code);
  }
}
export const MAX_SCENARIO_BYTES = 256 * 1024;
export const DRAFT_KEY = 'hockey-iq.scenario.v1';
export function createScenario(): Scenario {
  const positions = ['LW', 'C', 'RW', 'LD', 'RD'] as const;
  const home = [
    { x: 40, y: 6 },
    { x: 39, y: 13 },
    { x: 35, y: 20 },
    { x: 28, y: 8 },
    { x: 28, y: 18 },
  ];
  const away = [
    { x: 47, y: 19 },
    { x: 47, y: 12 },
    { x: 47, y: 4 },
    { x: 54, y: 8 },
    { x: 54, y: 18 },
  ];
  const tactics = {
    system: 'forecheck_212' as const,
    roleHoldTicks: 15,
    switchPenalty: 1,
    coverageWeight: 1,
    pressureWeight: 1,
    defensiveGapMetres: 6,
    offensiveRisk: 0.25,
  };
  return ScenarioSchema.parse({
    schemaVersion: 1,
    id: 'scenario-local',
    title: 'Échec avant · 2-1-2',
    seed: 42,
    initialPhase: 'neutral',
    rink: { length: 60.96, width: 25.9 },
    teams: [
      { id: 'home', label: 'Équipe A', attackDirection: 'positive_x' },
      { id: 'away', label: 'Équipe B', attackDirection: 'negative_x' },
    ],
    players: ['home', 'away'].flatMap((teamId, teamIndex) =>
      positions.map((nominalPosition, index) => ({
        id: `${teamId}-${index + 1}`,
        teamId,
        label: `${index + 1}`,
        nominalPosition,
        pos: (teamIndex === 0 ? home : away)[index],
        vel: { x: 0, y: 0 },
        heading: teamIndex === 0 ? 0 : Math.PI,
        role: null,
        objective: null,
      })),
    ),
    puck: { pos: { x: 54, y: 8 }, vel: { x: 0, y: 0 }, holderId: 'away-4' },
    tacticsByTeam: { home: { ...tactics }, away: { ...tactics } },
  });
}
export const cloneScenario = (scenario: Scenario): Scenario =>
  ScenarioSchema.parse(scenario);
export const playerKey = (id: string): EntityKey => `player:${id}`;
export function getPlayer(
  scenario: Scenario,
  key: EntityKey | null,
): Player | undefined {
  return key?.startsWith('player:')
    ? scenario.players.find((player) => player.id === key.slice(7))
    : undefined;
}
export function entityPosition(scenario: Scenario, key: EntityKey): Point {
  return key === 'puck'
    ? scenario.puck.pos
    : (getPlayer(scenario, key)?.pos ?? scenario.puck.pos);
}
export function moveEntity(scenario: Scenario, key: EntityKey, point: Point) {
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y))
    throw new EditorError('invalidValues');
  const pos = clampToRink(point, scenario.rink, key === 'puck' ? 0.3 : 0.7);
  if (key === 'puck') {
    scenario.puck.pos = pos;
    scenario.puck.holderId = null;
  } else {
    const player = getPlayer(scenario, key);
    if (!player) throw new EditorError('invalidValues');
    player.pos = pos;
    if (scenario.puck.holderId === player.id) scenario.puck.pos = { ...pos };
  }
}
/** Schema v1 permits rectangular edge coordinates; imported positions stay lossless.
 * Editor moves project into the rounded boards. Imported velocities/roles/targets are preserved. */
export function parseScenario(text: string): Scenario {
  if (new TextEncoder().encode(text).length > MAX_SCENARIO_BYTES)
    throw new EditorError('tooLarge');
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new EditorError('invalidFile');
  }
  if (
    typeof value === 'object' &&
    value !== null &&
    'schemaVersion' in value &&
    value.schemaVersion !== 1
  )
    throw new EditorError('version');
  const result = ScenarioSchema.safeParse(value);
  if (!result.success) throw new EditorError('invalidFile');
  return result.data;
}
export const serializeScenario = (scenario: Scenario) =>
  JSON.stringify(ScenarioSchema.parse(scenario), null, 2);
