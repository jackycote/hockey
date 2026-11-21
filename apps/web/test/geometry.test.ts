import { describe, expect, it } from 'vitest';
import {
  clampToRink,
  constrainCamera,
  cornerRadius,
  fitScale,
  newCamera,
  screenToWorld,
  worldToScreen,
  zoomAt,
} from '../src/editor/geometry';
const rink = { length: 60.96, width: 25.9 };
describe('editor coordinate transforms', () => {
  for (const size of [
    { width: 1000, height: 500 },
    { width: 340, height: 270 },
  ]) {
    for (const flipped of [false, true]) {
      it(`round-trips world coordinates on ${size.width}px with flipped=${flipped}`, () => {
        const camera = { zoom: 2, pan: { x: 35, y: -10 }, flipped };
        for (const point of [
          { x: 0, y: 0 },
          { x: 30, y: 10 },
          { x: 60.96, y: 25.9 },
        ]) {
          const actual = screenToWorld(
            worldToScreen(point, size, rink, camera),
            size,
            rink,
            camera,
          );
          expect(actual.x).toBeCloseTo(point.x, 10);
          expect(actual.y).toBeCloseTo(point.y, 10);
        }
      });
    }
  }
  it('keeps the world point under the pointer during zoom', () => {
    const size = { width: 1000, height: 500 },
      camera = newCamera(),
      anchor = { x: 600, y: 240 };
    const before = screenToWorld(anchor, size, rink, camera);
    const after = screenToWorld(
      anchor,
      size,
      rink,
      zoomAt(camera, 2, anchor, size, rink),
    );
    expect(after.x).toBeCloseTo(before.x);
    expect(after.y).toBeCloseTo(before.y);
  });
  it('bounds camera zoom and panning so the rink cannot disappear', () => {
    const actual = constrainCamera(
      { zoom: 100, pan: { x: 1e6, y: -1e6 }, flipped: false },
      { width: 600, height: 300 },
      rink,
    );
    expect(actual.zoom).toBe(3);
    expect(Math.abs(actual.pan.x)).toBeLessThan(1000);
    expect(Math.abs(actual.pan.y)).toBeLessThan(1000);
    expect(
      zoomAt(
        newCamera(),
        0.1,
        { x: 0, y: 0 },
        { width: 600, height: 300 },
        rink,
      ).zoom,
    ).toBe(1);
  });
  it('fits the complete rink with padding', () => {
    const size = { width: 340, height: 270 },
      scale = fitScale(size, rink);
    expect(scale * rink.length).toBeLessThanOrEqual(size.width - 48);
    expect(scale * rink.width).toBeLessThanOrEqual(size.height - 48);
  });
});
describe('rounded rink bounds', () => {
  it('preserves valid central positions', () => {
    expect(clampToRink({ x: 30, y: 12 }, rink)).toEqual({ x: 30, y: 12 });
  });
  it('projects into the rounded boards with body clearance, for all corners and extreme drags', () => {
    const radius = cornerRadius(rink);
    for (const x of [-100, 0, 30, 60.96, 100])
      for (const y of [-100, 0, 12, 25.9, 100]) {
        const p = clampToRink({ x, y }, rink);
        expect(p.x).toBeGreaterThanOrEqual(0.7);
        expect(p.x).toBeLessThanOrEqual(rink.length - 0.7);
        expect(p.y).toBeGreaterThanOrEqual(0.7);
        expect(p.y).toBeLessThanOrEqual(rink.width - 0.7);
        const cx = Math.min(rink.length - radius, Math.max(radius, p.x)),
          cy = Math.min(rink.width - radius, Math.max(radius, p.y));
        expect(Math.hypot(p.x - cx, p.y - cy)).toBeLessThanOrEqual(
          radius - 0.7 + 1e-10,
        );
      }
  });
});
