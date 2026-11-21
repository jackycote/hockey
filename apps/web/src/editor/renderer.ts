import { Application, Container, Graphics, Text } from 'pixi.js';
import type { Scenario } from '@hockey-iq/contracts';
import {
  clampToRink,
  cornerRadius,
  fitScale,
  worldToScreen,
  type Camera,
  type Point,
  type Size,
} from './geometry';
import { playerKey, type EntityKey } from './scenario';
export interface RenderOptions {
  scenario: Scenario;
  camera: Camera;
  size: Size;
  selected: EntityKey;
  roles: boolean;
  paths: boolean;
  grid: boolean;
}
interface Token {
  container: Container;
  body: Graphics;
  label: Text;
  caption: Text;
}
const colors = [0x087cbd, 0xd44442];
const positions: Record<string, string> = {
  LW: 'AG',
  C: 'C',
  RW: 'AD',
  LD: 'DG',
  RD: 'DD',
};
export class RinkRenderer {
  private app = new Application();
  private world = new Container();
  private ice = new Graphics();
  private markings = new Graphics();
  private clip = new Graphics();
  private vectors = new Graphics();
  private tokens = new Map<EntityKey, Token>();
  private rinkSignature = '';
  private size = { width: 0, height: 0 };
  async initialize(
    host: HTMLElement,
    size: Size,
    options: { resolution?: number; antialias?: boolean } = {},
  ) {
    await this.app.init({
      width: size.width,
      height: size.height,
      backgroundAlpha: 0,
      antialias: options.antialias ?? true,
      autoDensity: true,
      resolution:
        options.resolution ?? Math.min(window.devicePixelRatio || 1, 2),
      preference: 'webgl',
      autoStart: false,
    });
    this.app.stage.eventMode = 'none';
    this.app.canvas.setAttribute('aria-hidden', 'true');
    this.app.canvas.className = 'pixi-rink';
    host.prepend(this.app.canvas);
    this.world.addChild(this.ice, this.markings, this.clip, this.vectors);
    this.markings.mask = this.clip;
    this.app.stage.addChild(this.world);
  }
  private rink(scenario: Scenario, grid: boolean) {
    const { length: l, width: w } = scenario.rink,
      radius = cornerRadius(scenario.rink);
    const g = this.markings.clear();
    this.ice
      .clear()
      .roundRect(-0.35, -0.35, l + 0.7, w + 0.7, radius + 0.35)
      .fill(0xcfdfec)
      .roundRect(0, 0, l, w, radius)
      .fill(0xf8fcfd)
      .stroke({ color: 0xb8ccdd, width: 0.12 });
    this.clip
      .clear()
      .roundRect(0.12, 0.12, l - 0.24, w - 0.24, radius - 0.12)
      .fill(0xffffff);
    if (grid) {
      for (let x = 5; x < l; x += 5)
        g.moveTo(x, 0).lineTo(x, w).stroke({ color: 0xdbe6e6, width: 0.05 });
      for (let y = 5; y < w; y += 5)
        g.moveTo(0, y).lineTo(l, y).stroke({ color: 0xdbe6e6, width: 0.05 });
    }
    const line = (x: number, color: number, width: number) =>
      g.moveTo(x, 0).lineTo(x, w).stroke({ color, width, alpha: 0.65 });
    line(l / 2 - l / 8, 0x5e9bc8, 0.26);
    line(l / 2 + l / 8, 0x5e9bc8, 0.26);
    line(l / 2, 0xd88487, 0.15);
    g.circle(l / 2, w / 2, Math.min(4.57, w / 5))
      .stroke({ color: 0x5e9bc8, width: 0.12, alpha: 0.65 })
      .circle(l / 2, w / 2, 0.18)
      .fill(0x5e9bc8);
    const goalX = l * 0.055,
      faceX = l * 0.155;
    for (const side of [-1, 1]) {
      const x = side === -1 ? goalX : l - goalX;
      line(x, 0xd88487, 0.1);
      g.circle(x, w / 2, 1.83)
        .fill({ color: 0xcee4f2, alpha: 0.6 })
        .stroke({ color: 0xd88487, width: 0.09 });
      const goalLeft = side === -1 ? x - 1.1 : x;
      g.roundRect(goalLeft, w / 2 - 0.92, 1.1, 1.84, 0.16)
        .fill(0xe7f2fa)
        .stroke({ color: 0xc06462, width: 0.15 });
      for (const y of [w * 0.24, w * 0.76]) {
        const face = side === -1 ? faceX : l - faceX;
        g.circle(face, y, Math.min(4.57, w * 0.175))
          .stroke({ color: 0xd88487, width: 0.1, alpha: 0.65 })
          .circle(face, y, 0.2)
          .fill(0xc98083);
        const dot = l / 2 + side * l * 0.08;
        g.circle(dot, y, 0.17).fill(0xc98083);
        for (const offset of [-0.45, 0.45])
          g.moveTo(face - 0.45, y + offset)
            .lineTo(face + 0.45, y + offset)
            .stroke({ color: 0xd88487, width: 0.07 });
      }
    }
  }
  private token(key: EntityKey): Token {
    const existing = this.tokens.get(key);
    if (existing) return existing;
    const token = {
      container: new Container(),
      body: new Graphics(),
      label: new Text({
        text: '',
        style: {
          fontFamily: 'Arial, sans-serif',
          fontSize: 13,
          fontWeight: '700',
          fill: 0xffffff,
        },
      }),
      caption: new Text({
        text: '',
        style: {
          fontFamily: 'Arial, sans-serif',
          fontSize: 10,
          fontWeight: '600',
          fill: 0x294560,
        },
      }),
    };
    token.label.anchor.set(0.5);
    token.caption.anchor.set(0.5, 0);
    token.container.addChild(token.body, token.label, token.caption);
    this.app.stage.addChild(token.container);
    this.tokens.set(key, token);
    return token;
  }
  draw(options: RenderOptions) {
    const { scenario, camera, size, selected, roles, paths, grid } = options;
    if (size.width !== this.size.width || size.height !== this.size.height) {
      this.app.renderer.resize(size.width, size.height);
      this.size = { ...size };
    }
    const signature = `${scenario.rink.length}:${scenario.rink.width}:${grid}`;
    if (signature !== this.rinkSignature) {
      this.rink(scenario, grid);
      this.rinkSignature = signature;
    }
    const origin = worldToScreen({ x: 0, y: 0 }, size, scenario.rink, camera);
    const scale = fitScale(size, scenario.rink) * camera.zoom;
    this.world.position.set(origin.x, origin.y);
    this.world.scale.set(scale * (camera.flipped ? -1 : 1));
    this.vectors.clear();
    const arrow = (from: Point, to: Point, color: number) => {
      if (Math.hypot(to.x - from.x, to.y - from.y) < 0.2) return;
      const angle = Math.atan2(to.y - from.y, to.x - from.x),
        head = 0.8;
      this.vectors
        .moveTo(from.x, from.y)
        .lineTo(to.x, to.y)
        .stroke({ color, width: 0.13, alpha: 0.7 });
      this.vectors
        .moveTo(
          to.x - head * Math.cos(angle - 0.45),
          to.y - head * Math.sin(angle - 0.45),
        )
        .lineTo(to.x, to.y)
        .lineTo(
          to.x - head * Math.cos(angle + 0.45),
          to.y - head * Math.sin(angle + 0.45),
        )
        .stroke({ color, width: 0.16, alpha: 0.85 });
    };
    const keys = new Set<EntityKey>(['puck']);
    for (const player of scenario.players) {
      const key = playerKey(player.id);
      keys.add(key);
      const token = this.token(key),
        point = worldToScreen(player.pos, size, scenario.rink, camera);
      token.container.position.set(point.x, point.y);
      const color =
        colors[scenario.teams.findIndex((team) => team.id === player.teamId)] ??
        colors[0]!;
      const radius = Math.min(18, Math.max(12, scale * 0.85));
      const heading = player.heading + (camera.flipped ? Math.PI : 0);
      const body = token.body.clear();
      if (selected === key)
        body
          .circle(0, 0, radius + 5)
          .fill({ color, alpha: 0.12 })
          .stroke({ color, width: 1.6 });
      body
        .circle(0, 1.5, radius + 1)
        .fill({ color: 0x102b4e, alpha: 0.12 })
        .circle(0, 0, radius)
        .fill(color)
        .stroke({ color: 0xffffff, width: 2 });
      body
        .moveTo(
          Math.cos(heading) * (radius + 2),
          Math.sin(heading) * (radius + 2),
        )
        .lineTo(
          Math.cos(heading) * (radius + 7),
          Math.sin(heading) * (radius + 7),
        )
        .stroke({ color, width: 2.5 });
      token.label.text = roles
        ? (player.role ?? '—')
        : player.label.length > 3
          ? player.label.slice(0, 3)
          : player.label;
      token.label.style.fontSize = roles || player.label.length > 2 ? 11 : 13;
      token.caption.text = roles
        ? ''
        : (positions[player.nominalPosition] ?? player.nominalPosition);
      token.caption.position.set(0, radius + 5);
      if (paths) {
        if (player.objective)
          arrow(player.pos, player.objective.targetPoint, color);
        if (Math.hypot(player.vel.x, player.vel.y) > 0)
          arrow(
            player.pos,
            clampToRink(
              {
                x: player.pos.x + player.vel.x * 2,
                y: player.pos.y + player.vel.y * 2,
              },
              scenario.rink,
            ),
            0x688d9c,
          );
      }
    }
    const puck = this.token('puck'),
      puckPoint = puckScreenPoint(scenario, size, camera);
    puck.container.position.set(puckPoint.x, puckPoint.y);
    puck.body.clear();
    if (selected === 'puck')
      puck.body
        .circle(0, 0, 13)
        .fill({ color: 0x294560, alpha: 0.15 })
        .stroke({ color: 0x294560, width: 1.5 });
    puck.body
      .circle(0, 1.5, 7)
      .fill({ color: 0x102b4e, alpha: 0.15 })
      .circle(0, 0, 6)
      .fill(0x102b4e)
      .stroke({ color: 0xffffff, width: 1.5 });
    if (paths && Math.hypot(scenario.puck.vel.x, scenario.puck.vel.y) > 0)
      arrow(
        scenario.puck.pos,
        clampToRink(
          {
            x: scenario.puck.pos.x + scenario.puck.vel.x * 2,
            y: scenario.puck.pos.y + scenario.puck.vel.y * 2,
          },
          scenario.rink,
        ),
        0x284e5b,
      );
    for (const [key, token] of this.tokens)
      if (!keys.has(key)) {
        token.container.destroy({ children: true });
        this.tokens.delete(key);
      }
    // A held puck remains visible above the holder.
    this.app.stage.setChildIndex(
      puck.container,
      this.app.stage.children.length - 1,
    );
    this.app.render();
  }
  destroy() {
    this.app.destroy(
      { removeView: true },
      { children: true, texture: true, textureSource: true },
    );
  }
}
export function puckScreenPoint(
  scenario: Scenario,
  size: Size,
  camera: Camera,
): Point {
  const point = worldToScreen(scenario.puck.pos, size, scenario.rink, camera);
  return scenario.puck.holderId ? { x: point.x + 17, y: point.y + 15 } : point;
}
