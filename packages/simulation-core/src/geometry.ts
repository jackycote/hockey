export interface Point {
  x: number;
  y: number;
}
export interface Rink {
  length: number;
  width: number;
}
export const cornerRadius = (rink: Rink) => Math.min(8.5, rink.width / 3);
export function clampToRink(point: Point, rink: Rink, clearance = 0.7): Point {
  const radius = cornerRadius(rink);
  const x = Math.min(rink.length - clearance, Math.max(clearance, point.x));
  const y = Math.min(rink.width - clearance, Math.max(clearance, point.y));
  const cx = Math.min(rink.length - radius, Math.max(radius, x));
  const cy = Math.min(rink.width - radius, Math.max(radius, y));
  const dx = x - cx,
    dy = y - cy;
  const distance = Math.hypot(dx, dy),
    allowed = radius - clearance;
  if (distance > allowed)
    return {
      x: cx + (dx / distance) * allowed,
      y: cy + (dy / distance) * allowed,
    };
  return { x, y };
}
export function limitVector(point: Point, max: number): Point {
  const length = Math.hypot(point.x, point.y);
  return length > max
    ? { x: (point.x / length) * max, y: (point.y / length) * max }
    : { ...point };
}
export function constrainMotion(
  point: Point,
  velocity: Point,
  rink: Rink,
  clearance: number,
  restitution: number,
): { pos: Point; vel: Point } {
  const pos = clampToRink(point, rink, clearance),
    dx = point.x - pos.x,
    dy = point.y - pos.y;
  const distance = Math.hypot(dx, dy);
  if (distance < 1e-10) return { pos, vel: { ...velocity } };
  const nx = dx / distance,
    ny = dy / distance,
    outward = velocity.x * nx + velocity.y * ny;
  return {
    pos,
    vel:
      outward > 0
        ? {
            x: velocity.x - (1 + restitution) * outward * nx,
            y: velocity.y - (1 + restitution) * outward * ny,
          }
        : { ...velocity },
  };
}
export function closestPointOnSegment(point: Point, a: Point, b: Point): Point {
  const dx = b.x - a.x,
    dy = b.y - a.y,
    denominator = dx * dx + dy * dy;
  const t =
    denominator === 0
      ? 0
      : Math.min(
          1,
          Math.max(
            0,
            ((point.x - a.x) * dx + (point.y - a.y) * dy) / denominator,
          ),
        );
  return { x: a.x + dx * t, y: a.y + dy * t };
}
export const quantize = (value: number) => Math.round(value * 1e6) / 1e6 || 0;
export const quantizePoint = (point: Point): Point => ({
  x: quantize(point.x),
  y: quantize(point.y),
});
export function wrapAngle(angle: number): number {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}
export const quantizeAngle = (angle: number) =>
  Math.min(Math.PI, Math.max(-Math.PI, quantize(angle)));
