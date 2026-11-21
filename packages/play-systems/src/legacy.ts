import type {
  PlaySystemContent,
  SystemAction,
  ContextRole,
  WorldState,
} from '@hockey-iq/contracts';
import type { RuleContext } from './index.js';

type Point = { x: number; y: number };
type Subject = {
  kind: 'puck' | 'role' | 'target';
  role?: string;
  targetId?: string;
};
type Condition = {
  operator?: string;
  conditions?: Condition[];
  condition?: Condition | string;
  zoneId?: string;
  side?: string;
  team?: string;
  phase?: string;
  from?: Subject;
  to?: Subject;
  metres?: number;
  role?: string;
  byRole?: string | null;
};
function contains(
  system: PlaySystemContent,
  id: string,
  p: Point,
  world: WorldState,
) {
  const g = system.zones.find((z) => z.id === id)?.geometry;
  if (!g) return false;
  const x = p.x / world.rink.length,
    y = p.y / world.rink.width;
  if (g.kind === 'rectangle')
    return x >= g.x && x <= g.x + g.width && y >= g.y && y <= g.y + g.height;
  let inside = false;
  for (let i = 0, j = g.points.length - 1; i < g.points.length; j = i++) {
    const a = g.points[i]!,
      b = g.points[j]!;
    if (
      a.y > y !== b.y > y &&
      x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x
    )
      inside = !inside;
  }
  return inside;
}
/** v1.1 JSON interpreter. Input was bounded and type-checked by PlaySystemContentSchema. */
export function legacyActions(system: PlaySystemContent, context: RuleContext) {
  const { world, roles, teamId } = context;
  let budget = 0;
  const own = world.players.filter((p) => p.teamId === teamId);
  const point = (s: Subject): Point | undefined =>
    s.kind === 'puck'
      ? world.puck.pos
      : s.kind === 'role'
        ? own.find((p) => roles[p.id] === s.role)?.pos
        : (() => {
            const p = system.targets.find((t) => t.id === s.targetId)?.point;
            return p
              ? { x: p.x * world.rink.length, y: p.y * world.rink.width }
              : undefined;
          })();
  const condition = (c: Condition, role: ContextRole, depth = 0): boolean => {
    if (++budget > 8192 || depth > 3) return false;
    if (c.operator === 'not') {
      const matched = condition(c.condition as Condition, role, depth + 1);
      return budget <= 8192 && !matched;
    }
    if (c.conditions)
      return c.operator === 'all'
        ? c.conditions.every((x) => condition(x, role, depth + 1))
        : c.conditions.some((x) => condition(x, role, depth + 1));
    switch (c.condition) {
      case 'PUCK_IN_ZONE':
        return contains(system, c.zoneId!, world.puck.pos, world);
      case 'PUCK_SIDE':
        return c.side === 'center'
          ? Math.abs(world.puck.pos.y - world.rink.width / 2) < 2
          : c.side === 'left'
            ? world.puck.pos.y < world.rink.width / 2
            : world.puck.pos.y > world.rink.width / 2;
      case 'POSSESSION': {
        const h = world.players.find((p) => p.id === world.puck.holderId);
        return (
          c.team === (h ? (h.teamId === teamId ? 'own' : 'opponent') : 'none')
        );
      }
      case 'PHASE':
        return c.phase === world.phase;
      case 'CURRENT_ROLE':
        return c.role === role;
      case 'ZONE_COVERED':
        return own.some(
          (p) =>
            (!c.byRole || roles[p.id] === c.byRole) &&
            contains(system, c.zoneId!, p.pos, world),
        );
      case 'DISTANCE': {
        const a = point(c.from!),
          b = point(c.to!);
        if (!a || !b) return false;
        const d = Math.hypot(a.x - b.x, a.y - b.y),
          m = c.metres!;
        return c.operator === 'lt'
          ? d < m
          : c.operator === 'lte'
            ? d <= m
            : c.operator === 'gt'
              ? d > m
              : d >= m;
      }
      default:
        return false;
    }
  };
  const result: Record<
    string,
    {
      action: SystemAction;
      ruleId: string | null;
      trigger: string;
      explanation: string;
    }
  > = {};
  for (const role of ['F1', 'F2', 'F3', 'D1', 'D2'] as const) {
    const match = [...system.rules]
      .sort((a, b) => b.priority - a.priority || (a.id < b.id ? -1 : 1))
      .find(
        (r) =>
          context.events.includes(r.when.event) &&
          (!r.when.phase || r.when.phase === world.phase) &&
          (!r.when.zoneId ||
            contains(system, r.when.zoneId, world.puck.pos, world)) &&
          (!r.when.role || r.when.role === role) &&
          (!r.when.conditions ||
            condition(r.when.conditions as Condition, role)) &&
          r.then.some((a) => a.role === role),
      );
    result[role] = match
      ? {
          action: match.then.find((a) => a.role === role)!,
          ruleId: match.id,
          trigger: match.when.event,
          explanation: match.explanation,
        }
      : {
          action: system.roleSettings[role].defaultObjective,
          ruleId: null,
          trigger: 'TEMPLATE',
          explanation: 'Consigne de rôle du système personnalisé.',
        };
  }
  return budget > 8192 ? {} : result;
}
export function legacyTarget(
  system: PlaySystemContent,
  action: SystemAction,
  world: WorldState,
  playerPoint: Point,
  direction: number,
): Point {
  const puck = world.puck.pos,
    center = { x: puck.x - 10 * direction, y: world.rink.width / 2 };
  switch (action.action) {
    case 'SET_ROLE_PRIORITY':
      return legacyTarget(
        system,
        action.value === 'SET_TARGET_ZONE' || action.value === 'RETREAT_TO_ZONE'
          ? { action: 'HOLD_CENTER', role: action.role }
          : action.value === 'COVER_LANE'
            ? { action: 'HOLD_CENTER', role: action.role }
            : action.value === 'SUPPORT_PUCK'
              ? { action: 'SUPPORT_PUCK', role: action.role, distanceMetres: 5 }
              : { action: action.value, role: action.role },
        world,
        playerPoint,
        direction,
      );
    case 'PRESS_PUCK_CARRIER':
      return puck;
    case 'HOLD_CENTER':
      return center;
    case 'SUPPORT_PUCK':
      return { x: puck.x - action.distanceMetres * direction, y: puck.y };
    case 'SET_TARGET_ZONE':
    case 'RETREAT_TO_ZONE': {
      const g = system.zones.find((z) => z.id === action.zoneId)!.geometry;
      const p =
        g.kind === 'rectangle'
          ? { x: g.x + g.width / 2, y: g.y + g.height / 2 }
          : {
              x: g.points.reduce((s, p) => s + p.x, 0) / g.points.length,
              y: g.points.reduce((s, p) => s + p.y, 0) / g.points.length,
            };
      return { x: p.x * world.rink.length, y: p.y * world.rink.width };
    }
    case 'COVER_LANE': {
      const a = system.targets.find((t) => t.id === action.fromTargetId)!.point,
        b = system.targets.find((t) => t.id === action.toTargetId)!.point;
      return {
        x: ((a.x + b.x) * world.rink.length) / 2,
        y: ((a.y + b.y) * world.rink.width) / 2,
      };
    }
    case 'SET_PRESSURE_INTENSITY':
      return {
        x: playerPoint.x + (puck.x - playerPoint.x) * action.value,
        y: playerPoint.y + (puck.y - playerPoint.y) * action.value,
      };
  }
}
