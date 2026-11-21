import type {
  PlaySystem,
  PlaySystemContent,
  PlaySystemVersion,
  PlaySystemVersionRef,
  RecordingV2,
  ScenarioV2,
} from '../src/index.js';
import { recordingFixture, scenarioFixture } from './fixtures.js';

export function systemContentFixture(): PlaySystemVersion['content'] {
  const roleSettings = Object.fromEntries(
    (['F1', 'F2', 'F3', 'D1', 'D2'] as const).map((role) => [
      role,
      {
        defaultObjective: { action: 'HOLD_CENTER', role },
        coverageZoneId: 'center',
        priority: 50,
      },
    ]),
  ) as PlaySystemContent['roleSettings'];
  return {
    schemaVersion: 1,
    name: 'Notre 2-1-2',
    description: 'F3 garde le centre pendant le changement de côté.',
    category: 'forecheck',
    baseTemplate: 'forecheck-212',
    coordinateSpace: 'rink-normalized',
    supportedPhases: ['neutral', 'defensive_possession', 'loose_puck'],
    zones: [
      {
        id: 'center',
        name: 'Centre',
        geometry: {
          kind: 'rectangle',
          x: 0.35,
          y: 0.1,
          width: 0.3,
          height: 0.8,
        },
      },
    ],
    targets: [
      { id: 'left', name: 'Gauche', point: { x: 0.3, y: 0.2 } },
      { id: 'right', name: 'Droite', point: { x: 0.3, y: 0.8 } },
    ],
    roleSettings,
    rules: [
      {
        id: 'rule-switch',
        priority: 100,
        when: {
          event: 'PUCK_SWITCH_SIDE',
          phase: 'defensive_possession',
          conditions: {
            operator: 'all',
            conditions: [
              { condition: 'POSSESSION', team: 'opponent' },
              { condition: 'ZONE_COVERED', zoneId: 'center', byRole: 'F3' },
            ],
          },
        },
        then: [
          {
            action: 'SET_ROLE_PRIORITY',
            role: 'F2',
            value: 'PRESS_PUCK_CARRIER',
            weight: 80,
          },
        ],
        explanation: 'F2 prend la pression si F3 couvre le centre.',
      },
    ],
    fallbackStrategy: 'forecheck-212-default',
    antiOscillation: { roleHoldTicks: 15, switchPenalty: 1 },
  };
}
export function systemRefFixture(): PlaySystemVersionRef {
  return {
    schemaVersion: 1,
    systemId: 'system-1',
    systemVersionId: 'system-version-1',
    teamId: 'private-team-1',
    version: 1,
    rulesetVersion: 'coach-rules-1',
    checksum: 'a'.repeat(64),
  };
}
export function systemVersionFixture(): PlaySystemVersion {
  return {
    schemaVersion: 1,
    id: 'system-version-1',
    systemId: 'system-1',
    teamId: 'private-team-1',
    version: 1,
    status: 'published',
    rulesetVersion: 'coach-rules-1',
    checksum: 'a'.repeat(64),
    content: systemContentFixture(),
    publishedBy: 'coach-1',
    publishedAt: '2026-11-20T12:00:00Z',
  };
}
export function systemDraftFixture(): PlaySystem {
  return {
    ...systemContentFixture(),
    id: 'system-1',
    teamId: 'private-team-1',
    ownerId: 'coach-1',
    status: 'draft',
    revision: 1,
    derivedFrom: null,
    createdAt: '2026-11-20T12:00:00Z',
    updatedAt: '2026-11-20T12:00:00Z',
    archivedAt: null,
  };
}
export function scenarioV2Fixture(): ScenarioV2 {
  return {
    ...scenarioFixture(),
    schemaVersion: 2,
    teamId: 'private-team-1',
    systemRefs: [{ sideTeamId: 'a', version: systemRefFixture() }],
  };
}
export function recordingV2Fixture(): RecordingV2 {
  return {
    ...recordingFixture(),
    schemaVersion: 2,
    teamId: 'private-team-1',
    scenarioSnapshot: scenarioV2Fixture(),
    playSystemSnapshots: [{ sideTeamId: 'a', version: systemVersionFixture() }],
  };
}
