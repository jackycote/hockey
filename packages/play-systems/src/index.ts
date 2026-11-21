import {
  TacticalSystemSchema,
  type TacticalSystem,
  type TacticalTemplate,
  type ContextRole,
  type WorldState,
  type TacticalRule,
  type ContextPhase,
} from '@hockey-iq/contracts';
export const TEMPLATE_NAMES: Record<TacticalTemplate, string> = {
  FORECHECK_212: 'Échec avant 2-1-2',
  BOARDS_BREAKOUT: 'Sortie par la bande',
  D_TO_D_REVERSE: 'Renversement D à D',
  LOW_CENTER_SUPPORT: 'Soutien du centre bas',
  UNDER_PRESSURE_BREAKOUT: 'Sortie sous pression',
};
export const ROLE_NAMES: Record<ContextRole, string> = {
  F1: 'Premier poursuivant',
  F2: 'Deuxième poursuivant',
  F3: 'Couverture haute',
  D1: 'Défenseur côté fort',
  D2: 'Défenseur côté faible',
  PUCK_RETRIEVER: 'Récupérateur',
  D_SUPPORT: 'Défenseur en soutien',
  CENTER_LOW: 'Centre bas',
  STRONG_SIDE_WINGER: 'Ailier côté fort',
  WEAK_SIDE_WINGER: 'Ailier côté faible',
};
export function templateSystem(template: TacticalTemplate): TacticalSystem {
  const breakout = template !== 'FORECHECK_212';
  return TacticalSystemSchema.parse({
    schemaVersion: 2,
    name: TEMPLATE_NAMES[template],
    description:
      'Hypothèse pédagogique configurable; à valider avec votre entraîneur.',
    template,
    zones: [
      {
        id: 'center-low',
        name: 'Centre bas',
        geometry: {
          kind: 'rectangle',
          x: 0.08,
          y: 0.3,
          width: 0.18,
          height: 0.4,
        },
      },
      {
        id: 'strong-wing',
        name: 'Bande forte',
        geometry: {
          kind: 'rectangle',
          x: 0.18,
          y: 0.02,
          width: 0.18,
          height: 0.18,
        },
      },
    ],
    rules: breakout
      ? [
          {
            id: 'reverse-pressure',
            priority: 100,
            trigger: 'EVERY_TICK',
            match: 'all',
            conditions: [
              { kind: 'pressure', operator: 'lt', metres: 4 },
              { kind: 'possession', value: 'own' },
            ],
            actions: [
              {
                kind: 'REVERSE',
                role: 'PUCK_RETRIEVER',
                targetRole: 'D_SUPPORT',
                zoneId: null,
                intensity: 0.8,
              },
            ],
            explanation:
              'Sous pression, protéger l’intérieur et renverser vers le défenseur disponible.',
          },
        ]
      : [],
    roleHoldTicks: 15,
    reactionTicks: 18,
    pressureMetres: 5,
  });
}
export interface RuleContext {
  world: WorldState;
  teamId: string;
  phase: ContextPhase;
  roles: Record<string, ContextRole>;
  events: readonly string[];
  previousSide: string;
}
export function zoneContains(
  system: TacticalSystem,
  zoneId: string,
  point: { x: number; y: number },
  world: WorldState,
  teamId?: string,
) {
  const zone = system.zones.find((z) => z.id === zoneId);
  if (!zone) return false;
  const reverse =
    teamId &&
    world.teams.find((t) => t.id === teamId)?.attackDirection === 'negative_x';
  const p = {
      x: reverse
        ? 1 - point.x / world.rink.length
        : point.x / world.rink.length,
      y: point.y / world.rink.width,
    },
    g = zone.geometry;
  if (g.kind === 'rectangle')
    return (
      p.x >= g.x && p.x <= g.x + g.width && p.y >= g.y && p.y <= g.y + g.height
    );
  let inside = false;
  for (let i = 0, j = g.points.length - 1; i < g.points.length; j = i++) {
    const a = g.points[i]!,
      b = g.points[j]!;
    if (
      a.y > p.y !== b.y > p.y &&
      p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x
    )
      inside = !inside;
  }
  return inside;
}
export function matchingRules(system: TacticalSystem, context: RuleContext) {
  let budget = 0;
  const { world, roles, teamId, phase } = context;
  const holder = world.players.find((p) => p.id === world.puck.holderId);
  const rolePlayer = (role: ContextRole) =>
    world.players.find((p) => roles[p.id] === role);
  const pressure = Math.min(
    ...world.players
      .filter((p) => p.teamId !== teamId)
      .map((p) =>
        Math.hypot(p.pos.x - world.puck.pos.x, p.pos.y - world.puck.pos.y),
      ),
  );
  const matches = (condition: TacticalRule['conditions'][number]): boolean => {
    if (++budget > 8192) return false;
    switch (condition.kind) {
      case 'pressure':
        return condition.operator === 'lt'
          ? pressure < condition.metres
          : pressure > condition.metres;
      case 'intercept_time':
      case 'pressure_angle': {
        const p = rolePlayer(condition.role);
        if (!p) return false;
        const angle = Math.abs(
          Math.atan2(
            Math.sin(
              Math.atan2(
                world.puck.pos.y - p.pos.y,
                world.puck.pos.x - p.pos.x,
              ) - p.heading,
            ),
            Math.cos(
              Math.atan2(
                world.puck.pos.y - p.pos.y,
                world.puck.pos.x - p.pos.x,
              ) - p.heading,
            ),
          ),
        );
        // Bounded kinematic estimate, not a player-performance prediction.
        const value =
          condition.kind === 'pressure_angle'
            ? (angle * 180) / Math.PI
            : Math.hypot(
                p.pos.x - world.puck.pos.x,
                p.pos.y - world.puck.pos.y,
              ) /
                8 +
              angle / 6 +
              system.reactionTicks / 30;
        const threshold =
          condition.kind === 'pressure_angle'
            ? condition.degrees
            : condition.seconds;
        return condition.operator === 'lt'
          ? value < threshold
          : value > threshold;
      }
      case 'pass_lane': {
        const a = rolePlayer(condition.from),
          b = rolePlayer(condition.to);
        if (!a || !b) return false;
        const dx = b.pos.x - a.pos.x,
          dy = b.pos.y - a.pos.y,
          span = dx * dx + dy * dy;
        if (span < 0.01) return false;
        const clear = world.players
          .filter((p) => p.teamId !== teamId)
          .every((p) => {
            const t = Math.min(
              1,
              Math.max(
                0,
                ((p.pos.x - a.pos.x) * dx + (p.pos.y - a.pos.y) * dy) / span,
              ),
            );
            return (
              Math.hypot(
                p.pos.x - a.pos.x - t * dx,
                p.pos.y - a.pos.y - t * dy,
              ) > condition.clearanceMetres
            );
          });
        return clear === condition.open;
      }
      case 'puck_side':
        return condition.side === 'center'
          ? Math.abs(world.puck.pos.y - world.rink.width / 2) < 2
          : condition.side === 'strong'
            ? world.puck.pos.y <= world.rink.width / 2
            : world.puck.pos.y > world.rink.width / 2;
      case 'possession':
        return (
          condition.value ===
          (holder ? (holder.teamId === teamId ? 'own' : 'opponent') : 'none')
        );
      case 'phase':
        return phase === condition.value;
      case 'puck_zone':
        return zoneContains(
          system,
          condition.zoneId,
          world.puck.pos,
          world,
          teamId,
        );
      case 'role_available': {
        const p = rolePlayer(condition.role);
        return (
          !!p &&
          Math.hypot(p.pos.x - world.puck.pos.x, p.pos.y - world.puck.pos.y) <=
            25
        );
      }
      case 'coverage': {
        const p = rolePlayer(condition.role);
        return (
          !!p && zoneContains(system, condition.zoneId, p.pos, world, teamId)
        );
      }
      case 'distance': {
        const a = rolePlayer(condition.from),
          b = rolePlayer(condition.to);
        if (!a || !b) return false;
        const distance = Math.hypot(a.pos.x - b.pos.x, a.pos.y - b.pos.y);
        return condition.operator === 'lt'
          ? distance < condition.metres
          : distance > condition.metres;
      }
    }
  };
  return [...system.rules]
    .sort((a, b) => b.priority - a.priority || (a.id < b.id ? -1 : 1))
    .filter(
      (rule) =>
        (rule.trigger === 'EVERY_TICK' ||
          context.events.includes(rule.trigger)) &&
        (rule.match === 'all'
          ? rule.conditions.every(matches)
          : rule.conditions.some(matches)),
    );
}
export interface SystemIssue {
  code: string;
  ruleId: string | null;
  message: string;
  severity: 'error' | 'warning';
}
export function validateSystem(raw: unknown) {
  const parsed = TacticalSystemSchema.safeParse(raw);
  const issues: SystemIssue[] = [];
  if (!parsed.success)
    return {
      valid: false,
      issues: parsed.error.issues.map((x) => ({
        code: 'SCHEMA',
        ruleId: null,
        message: x.message,
        severity: 'error' as const,
      })),
    };
  const system = parsed.data;
  for (let i = 0; i < system.rules.length; i++) {
    const a = system.rules[i]!;
    for (const condition of a.conditions)
      if (
        condition.kind === 'phase' &&
        (system.template === 'FORECHECK_212') !==
          (condition.value === 'FORECHECK')
      )
        issues.push({
          code: 'UNREACHABLE_PHASE',
          ruleId: a.id,
          message: 'Cette phase ne peut pas être produite par ce modèle.',
          severity: 'error',
        });
    if (a.match === 'all')
      for (const x of a.conditions)
        for (const y of a.conditions)
          if (
            x !== y &&
            x.kind === 'possession' &&
            y.kind === 'possession' &&
            x.value !== y.value
          )
            issues.push({
              code: 'UNREACHABLE_CONDITION',
              ruleId: a.id,
              message:
                'Deux possessions incompatibles rendent la règle inatteignable.',
              severity: 'error',
            });
    for (const action of a.actions)
      if (
        ['PASS', 'REVERSE'].includes(action.kind) &&
        action.targetRole === action.role
      )
        issues.push({
          code: 'ACTION_CYCLE',
          ruleId: a.id,
          message: 'Une passe ne peut pas cibler le même rôle.',
          severity: 'error',
        });
    for (const b of system.rules.slice(i + 1)) {
      if (
        a.trigger !== b.trigger ||
        JSON.stringify(a.conditions) !== JSON.stringify(b.conditions)
      )
        continue;
      for (const x of a.actions)
        for (const y of b.actions)
          if (x.role === y.role && JSON.stringify(x) !== JSON.stringify(y))
            issues.push({
              code: a.priority === b.priority ? 'CONFLICT' : 'SHADOWED_RULE',
              ruleId: b.id,
              message:
                a.priority === b.priority
                  ? 'Deux décisions incompatibles de même priorité : choisir une priorité distincte.'
                  : `La règle ${a.id} de priorité supérieure gagne pour ce rôle.`,
              severity: a.priority === b.priority ? 'error' : 'warning',
            });
    }
  }
  if (system.legacy)
    for (let i = 0; i < system.legacy.rules.length; i++)
      for (const b of system.legacy.rules.slice(i + 1)) {
        const a = system.legacy.rules[i]!;
        if (
          a.priority === b.priority &&
          JSON.stringify(a.when) === JSON.stringify(b.when) &&
          a.then.some((x) =>
            b.then.some(
              (y) =>
                x.role === y.role && JSON.stringify(x) !== JSON.stringify(y),
            ),
          )
        )
          issues.push({
            code: 'CONFLICT',
            ruleId: b.id,
            message:
              'Deux règles v1.1 de même priorité proposent des décisions incompatibles.',
            severity: 'error',
          });
      }
  const conditionKey = (r: TacticalRule) =>
    JSON.stringify([
      r.trigger,
      r.match,
      [...r.conditions].sort((a, b) =>
        JSON.stringify(a).localeCompare(JSON.stringify(b)),
      ),
    ]);
  for (const key of new Set(system.rules.map(conditionKey))) {
    const group = system.rules
      .filter((r) => conditionKey(r) === key)
      .sort((a, b) => b.priority - a.priority || (a.id < b.id ? -1 : 1));
    const edges = new Map<ContextRole, ContextRole>();
    for (const rule of group)
      for (const action of rule.actions)
        if (
          ['PASS', 'REVERSE'].includes(action.kind) &&
          action.targetRole &&
          !edges.has(action.role)
        )
          edges.set(action.role, action.targetRole);
    for (const start of edges.keys()) {
      const seen = new Set<ContextRole>();
      let current: ContextRole | undefined = start;
      while (current && edges.has(current)) {
        if (seen.has(current)) {
          issues.push({
            code: 'ACTION_CYCLE',
            ruleId: group[0]!.id,
            message:
              'Les passes de ces règles forment un cycle sans condition de sortie.',
            severity: 'error',
          });
          break;
        }
        seen.add(current);
        current = edges.get(current);
      }
    }
  }
  for (const rule of system.rules) {
    if (rule.match === 'any' && !rule.conditions.length)
      issues.push({
        code: 'UNREACHABLE_CONDITION',
        ruleId: rule.id,
        message: 'Une condition OU vide ne peut jamais être satisfaite.',
        severity: 'error',
      });
    if (rule.match === 'all') {
      for (const kind of ['pressure', 'distance'] as const) {
        const tests = rule.conditions.filter((c) => c.kind === kind);
        for (const low of tests)
          for (const high of tests)
            if (
              low.kind === kind &&
              high.kind === kind &&
              low.operator === 'gt' &&
              high.operator === 'lt' &&
              low.metres >= high.metres &&
              (kind === 'pressure' ||
                JSON.stringify('from' in low ? [low.from, low.to] : []) ===
                  JSON.stringify('from' in high ? [high.from, high.to] : []))
            )
              issues.push({
                code: 'UNREACHABLE_CONDITION',
                ruleId: rule.id,
                message: 'Les bornes de distance se contredisent.',
                severity: 'error',
              });
      }
    }
    if (
      rule.actions.some(
        (a) =>
          ['F3', 'CENTER_LOW'].includes(a.role) &&
          ['CARRY', 'PASS', 'REVERSE', 'SET_PRESSURE_INTENSITY'].includes(
            a.kind,
          ),
      )
    )
      issues.push({
        code: 'COVERAGE_REQUIRED',
        ruleId: rule.id,
        message:
          'Vérifier la couverture de l’axe : cette consigne peut éloigner le rôle de couverture.',
        severity: 'warning',
      });
  }
  // Every supported template provides a complete five-role fallback; custom rules cannot remove it.
  if (!system.rules.length)
    issues.push({
      code: 'TEMPLATE_FALLBACK',
      ruleId: null,
      message: 'Les responsabilités et la couverture du modèle sont utilisées.',
      severity: 'warning',
    });
  return { valid: !issues.some((x) => x.severity === 'error'), issues };
}
export { legacyActions, legacyTarget } from './legacy.js';
