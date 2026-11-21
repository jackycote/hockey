export { RecordingSchema } from '@hockey-iq/contracts';
export type { Recording } from '@hockey-iq/contracts';
import {
  SequenceV12Schema,
  type SequenceV12,
  type FrozenFrame,
} from '@hockey-iq/contracts';
import { hashFrame } from '@hockey-iq/tactical-engine';
export function validateFrozenSequence(raw: unknown): SequenceV12 {
  const value = SequenceV12Schema.parse(raw);
  for (const frame of value.frames) {
    const { hash, ...body } = frame;
    if (hashFrame(body) !== hash) throw new Error('REPLAY_CHECKSUM_MISMATCH');
  }
  return value;
}
export function frozenSeek(sequence: SequenceV12, tick: number): FrozenFrame {
  const at = Math.max(
    0,
    Math.min(sequence.frames.length - 1, Number.isFinite(tick) ? tick : 0),
  );
  const a = sequence.frames[Math.floor(at)]!,
    b =
      sequence.frames[
        Math.min(sequence.frames.length - 1, Math.floor(at) + 1)
      ]!;
  const frame = JSON.parse(JSON.stringify(a)) as FrozenFrame;
  const alpha = at - Math.floor(at);
  for (const p of frame.world.players) {
    const next = b.world.players.find((n) => n.id === p.id)!;
    p.pos.x += (next.pos.x - p.pos.x) * alpha;
    p.pos.y += (next.pos.y - p.pos.y) * alpha;
    const angle = Math.atan2(
      Math.sin(next.heading - p.heading),
      Math.cos(next.heading - p.heading),
    );
    p.heading = Math.atan2(
      Math.sin(p.heading + angle * alpha),
      Math.cos(p.heading + angle * alpha),
    );
  }
  frame.world.puck.pos.x +=
    (b.world.puck.pos.x - frame.world.puck.pos.x) * alpha;
  frame.world.puck.pos.y +=
    (b.world.puck.pos.y - frame.world.puck.pos.y) * alpha;
  return frame;
}
