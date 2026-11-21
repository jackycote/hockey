import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils.js';
import type { SimulationSnapshot } from '@hockey-iq/contracts';
export const compareIds = (a: string, b: string) =>
  a < b ? -1 : a > b ? 1 : 0;
/** Sorted keys, finite numbers and normalized negative zero. Entity order is canonicalized separately. */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value === 'boolean' || typeof value === 'string')
    return JSON.stringify(value);
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('NONFINITE_STATE');
    return JSON.stringify(value === 0 ? 0 : value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .filter((key) => record[key] !== undefined)
      .sort(compareIds)
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
      .join(',')}}`;
  }
  throw new Error('UNSERIALIZABLE_STATE');
}
export function canonicalSnapshot(snapshot: SimulationSnapshot): string {
  return canonicalJson({
    ...snapshot,
    world: {
      ...snapshot.world,
      players: [...snapshot.world.players].sort((a, b) =>
        compareIds(a.id, b.id),
      ),
      teams: [...snapshot.world.teams].sort((a, b) => compareIds(a.id, b.id)),
    },
  });
}
export const hashSnapshot = (snapshot: SimulationSnapshot) =>
  bytesToHex(sha256(utf8ToBytes(canonicalSnapshot(snapshot))));
