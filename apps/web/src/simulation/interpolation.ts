import type { WorldState } from '@hockey-iq/contracts';
/** Display-only interpolation. Authoritative snapshots and their hashes are never interpolated. */
export function interpolateWorld(
  previous: WorldState,
  current: WorldState,
  progress: number,
): WorldState {
  const alpha = Math.max(0, Math.min(1, progress));
  if (alpha === 1 || current.tick !== previous.tick + 1) return current;
  const mix = (a: number, b: number) => a + (b - a) * alpha;
  const prior = new Map(previous.players.map((player) => [player.id, player]));
  return {
    ...current,
    players: current.players.map((player) => {
      const from = prior.get(player.id);
      if (!from) return player;
      const delta = Math.atan2(
        Math.sin(player.heading - from.heading),
        Math.cos(player.heading - from.heading),
      );
      return {
        ...player,
        pos: {
          x: mix(from.pos.x, player.pos.x),
          y: mix(from.pos.y, player.pos.y),
        },
        heading: Math.atan2(
          Math.sin(from.heading + delta * alpha),
          Math.cos(from.heading + delta * alpha),
        ),
      };
    }),
    puck: {
      ...current.puck,
      pos:
        current.puck.holderId === previous.puck.holderId
          ? {
              x: mix(previous.puck.pos.x, current.puck.pos.x),
              y: mix(previous.puck.pos.y, current.puck.pos.y),
            }
          : current.puck.pos,
    },
  };
}
