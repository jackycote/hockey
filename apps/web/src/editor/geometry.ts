/** Browser-independent editor geometry. World units are metres, viewport units CSS pixels. */
import type { Point, Rink } from '@hockey-iq/simulation-core';
export { clampToRink, cornerRadius } from '@hockey-iq/simulation-core';
export type { Point, Rink } from '@hockey-iq/simulation-core';
export interface Size {
  width: number;
  height: number;
}
export interface Camera {
  zoom: number;
  pan: Point;
  flipped: boolean;
}
export const newCamera = (): Camera => ({
  zoom: 1,
  pan: { x: 0, y: 0 },
  flipped: false,
});
export const fitScale = (size: Size, rink: Rink) =>
  Math.max(
    0.01,
    Math.min((size.width - 48) / rink.length, (size.height - 48) / rink.width),
  );
export function worldToScreen(
  point: Point,
  size: Size,
  rink: Rink,
  camera: Camera,
): Point {
  const scale = fitScale(size, rink) * camera.zoom * (camera.flipped ? -1 : 1);
  return {
    x: size.width / 2 + camera.pan.x + (point.x - rink.length / 2) * scale,
    y: size.height / 2 + camera.pan.y + (point.y - rink.width / 2) * scale,
  };
}
export function screenToWorld(
  point: Point,
  size: Size,
  rink: Rink,
  camera: Camera,
): Point {
  const scale = fitScale(size, rink) * camera.zoom * (camera.flipped ? -1 : 1);
  return {
    x: rink.length / 2 + (point.x - size.width / 2 - camera.pan.x) / scale,
    y: rink.width / 2 + (point.y - size.height / 2 - camera.pan.y) / scale,
  };
}
export function constrainCamera(
  camera: Camera,
  size: Size,
  rink: Rink,
): Camera {
  const zoom = Math.min(3, Math.max(1, camera.zoom));
  const scale = fitScale(size, rink) * zoom;
  const maxX = Math.max(
    0,
    (rink.length * scale - size.width) / 2 + size.width * 0.35,
  );
  const maxY = Math.max(
    0,
    (rink.width * scale - size.height) / 2 + size.height * 0.35,
  );
  return {
    ...camera,
    zoom,
    pan: {
      x: Math.max(-maxX, Math.min(maxX, camera.pan.x)),
      y: Math.max(-maxY, Math.min(maxY, camera.pan.y)),
    },
  };
}
export function zoomAt(
  camera: Camera,
  zoom: number,
  anchor: Point,
  size: Size,
  rink: Rink,
): Camera {
  const world = screenToWorld(anchor, size, rink, camera);
  const next = {
    ...camera,
    zoom: Math.max(1, Math.min(3, zoom)),
    pan: { ...camera.pan },
  };
  const screen = worldToScreen(world, size, rink, next);
  next.pan.x += anchor.x - screen.x;
  next.pan.y += anchor.y - screen.y;
  return constrainCamera(next, size, rink);
}
