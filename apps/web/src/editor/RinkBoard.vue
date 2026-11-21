<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import type { Scenario } from '@hockey-iq/contracts';
import { useEditorStore } from './store';
import {
  constrainCamera,
  newCamera,
  screenToWorld,
  worldToScreen,
  zoomAt,
  type Camera,
  type Point,
} from './geometry';
import {
  entityPosition,
  playerKey,
  type EntityKey,
  type Tool,
} from './scenario';
import type { RinkRenderer } from './renderer';
const props = defineProps<{
  scenario: Scenario;
  editable: boolean;
  tool: Tool;
  roles: boolean;
  paths: boolean;
  grid: boolean;
  directions?: Record<string, Point>;
  observation?: { playerId: string; point: Point; prompt: string } | null;
}>();
const { t } = useI18n();
const store = useEditorStore();
const host = ref<HTMLElement>();
const size = ref({ width: 800, height: 440 });
const camera = ref<Camera>(newCamera());
const zoomPercent = computed(() => Math.round(camera.value.zoom * 100));
const ready = ref(false),
  failed = ref(false);
let renderer: RinkRenderer | undefined,
  observer: ResizeObserver | undefined,
  animation = 0,
  disposed = false;
const tokens = computed(() => {
  const scenario = props.scenario;
  const players = scenario.players.map((player) => ({
    key: playerKey(player.id),
    label: t('editor.playerName', {
      team: scenario.teams.find((team) => team.id === player.teamId)?.label,
      number: player.label,
      position: t(`editor.positions.${player.nominalPosition}`),
    }),
    point: worldToScreen(player.pos, size.value, scenario.rink, camera.value),
    text: player.label,
    team: scenario.teams.findIndex((team) => team.id === player.teamId),
  }));
  const puck = worldToScreen(
    scenario.puck.pos,
    size.value,
    scenario.rink,
    camera.value,
  );
  return [
    ...players,
    {
      key: 'puck' as const,
      label: t('editor.puck'),
      point: scenario.puck.holderId ? { x: puck.x + 17, y: puck.y + 15 } : puck,
      text: '●',
      team: -1,
    },
  ];
});
const chevrons = computed(() =>
  props.scenario.players.flatMap((player) => {
    const direction = props.directions?.[player.id];
    if (!direction) return [];
    const angle =
      Math.atan2(direction.y, direction.x) +
      (camera.value.flipped ? Math.PI : 0);
    const point = worldToScreen(
      player.pos,
      size.value,
      props.scenario.rink,
      camera.value,
    );
    return [
      {
        id: player.id,
        x: point.x + Math.cos(angle) * 25,
        y: point.y + Math.sin(angle) * 25,
        angle,
      },
    ];
  }),
);
const gaze = computed(() => {
  const player = props.scenario.players.find(
    (p) => p.id === props.observation?.playerId,
  );
  if (!player || !props.observation) return null;
  return {
    from: worldToScreen(
      player.pos,
      size.value,
      props.scenario.rink,
      camera.value,
    ),
    to: worldToScreen(
      props.observation.point,
      size.value,
      props.scenario.rink,
      camera.value,
    ),
  };
});
function schedule() {
  if (animation || disposed) return;
  animation = requestAnimationFrame(() => {
    animation = 0;
    renderer?.draw({
      scenario: props.scenario,
      selected: store.selected,
      camera: camera.value,
      size: size.value,
      roles: props.roles,
      paths: props.paths,
      grid: props.grid,
    });
  });
}
watch(
  () => [
    props.scenario,
    store.selected,
    camera.value,
    size.value,
    props.roles,
    props.paths,
    props.grid,
  ],
  schedule,
  { deep: true },
);
onMounted(async () => {
  const element = host.value;
  if (!element) return;
  const measure = () => {
    size.value = {
      width: Math.max(1, element.clientWidth),
      height: Math.max(1, element.clientHeight),
    };
    camera.value = constrainCamera(
      camera.value,
      size.value,
      props.scenario.rink,
    );
    schedule();
  };
  measure();
  observer = new ResizeObserver(measure);
  observer.observe(element);
  try {
    const { RinkRenderer: Renderer } = await import('./renderer');
    if (disposed) return;
    const instance = new Renderer();
    await instance.initialize(element, size.value);
    if (disposed) {
      instance.destroy();
      return;
    }
    renderer = instance;
    ready.value = true;
    schedule();
  } catch {
    failed.value = true;
  }
});
onBeforeUnmount(() => {
  disposed = true;
  observer?.disconnect();
  cancelAnimationFrame(animation);
  store.cancelGesture();
  renderer?.destroy();
});
function zoom(
  factor: number,
  anchor = { x: size.value.width / 2, y: size.value.height / 2 },
) {
  camera.value = zoomAt(
    camera.value,
    camera.value.zoom * factor,
    anchor,
    size.value,
    props.scenario.rink,
  );
}
function setZoom(percent: number) {
  camera.value = zoomAt(
    camera.value,
    percent / 100,
    { x: size.value.width / 2, y: size.value.height / 2 },
    size.value,
    props.scenario.rink,
  );
}
function fit() {
  camera.value = { ...newCamera(), flipped: camera.value.flipped };
}
function flip() {
  camera.value = {
    ...camera.value,
    flipped: !camera.value.flipped,
    pan: { x: 0, y: 0 },
  };
}
defineExpose({ zoom, setZoom, fit, flip, zoomPercent });
function local(event: PointerEvent | WheelEvent): Point {
  const rect = host.value!.getBoundingClientRect();
  return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}
const pointers = new Map<number, Point>();
type Gesture =
  | {
      kind: 'drag';
      key: EntityKey;
      offset: Point;
      start: Point;
      moved: boolean;
    }
  | { kind: 'pan'; start: Point; camera: Camera }
  | { kind: 'place'; start: Point }
  | { kind: 'pinch'; camera: Camera; distance: number; midpoint: Point };
let gesture: Gesture | null = null;
const midpoint = (a: Point, b: Point) => ({
  x: (a.x + b.x) / 2,
  y: (a.y + b.y) / 2,
});
function down(event: PointerEvent) {
  if (event.button !== 0 && event.pointerType !== 'touch') return;
  // Commit any active inspector field before changing selection.
  host.value?.focus({ preventScroll: true });
  const point = local(event);
  pointers.set(event.pointerId, point);
  host.value?.setPointerCapture(event.pointerId);
  if (pointers.size === 2) {
    store.cancelGesture();
    const [a, b] = [...pointers.values()];
    if (a && b)
      gesture = {
        kind: 'pinch',
        camera: { ...camera.value, pan: { ...camera.value.pan } },
        distance: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)),
        midpoint: midpoint(a, b),
      };
    return;
  }
  if (pointers.size > 2) return;
  const nearest = tokens.value
    .map((token) => ({
      key: token.key,
      distance: Math.hypot(token.point.x - point.x, token.point.y - point.y),
    }))
    .sort((a, b) => a.distance - b.distance)[0];
  const key = nearest && nearest.distance <= 22 ? nearest.key : undefined;
  if (props.editable && (props.tool === 'target' || props.tool === 'place'))
    gesture = { kind: 'place', start: point };
  else if (key && props.tool !== 'pan') {
    store.select(key);
    if (props.tool === 'move' && props.editable) {
      const position = entityPosition(props.scenario, key),
        world = screenToWorld(
          point,
          size.value,
          props.scenario.rink,
          camera.value,
        );
      store.beginGesture(key);
      gesture = {
        kind: 'drag',
        key,
        offset: { x: position.x - world.x, y: position.y - world.y },
        start: point,
        moved: false,
      };
    }
  } else
    gesture = {
      kind: 'pan',
      start: point,
      camera: { ...camera.value, pan: { ...camera.value.pan } },
    };
}
function move(event: PointerEvent) {
  if (!pointers.has(event.pointerId)) return;
  const point = local(event);
  pointers.set(event.pointerId, point);
  if (!gesture) return;
  if (gesture.kind === 'pinch') {
    const [a, b] = [...pointers.values()];
    if (!a || !b) return;
    const center = midpoint(a, b),
      distance = Math.hypot(a.x - b.x, a.y - b.y);
    const next = zoomAt(
      gesture.camera,
      (gesture.camera.zoom * distance) / gesture.distance,
      gesture.midpoint,
      size.value,
      props.scenario.rink,
    );
    next.pan.x += center.x - gesture.midpoint.x;
    next.pan.y += center.y - gesture.midpoint.y;
    camera.value = constrainCamera(next, size.value, props.scenario.rink);
  } else if (gesture.kind === 'drag') {
    if (
      !gesture.moved &&
      Math.hypot(point.x - gesture.start.x, point.y - gesture.start.y) < 4
    )
      return;
    gesture.moved = true;
    const world = screenToWorld(
      point,
      size.value,
      props.scenario.rink,
      camera.value,
    );
    store.previewMove(gesture.key, {
      x: world.x + gesture.offset.x,
      y: world.y + gesture.offset.y,
    });
  } else if (gesture.kind === 'pan') {
    camera.value = constrainCamera(
      {
        ...gesture.camera,
        pan: {
          x: gesture.camera.pan.x + point.x - gesture.start.x,
          y: gesture.camera.pan.y + point.y - gesture.start.y,
        },
      },
      size.value,
      props.scenario.rink,
    );
  }
}
function up(event: PointerEvent) {
  if (!pointers.has(event.pointerId)) return;
  if (gesture?.kind === 'drag' && props.editable) store.finishGesture();
  if (
    props.editable &&
    gesture?.kind === 'place' &&
    Math.hypot(
      local(event).x - gesture.start.x,
      local(event).y - gesture.start.y,
    ) < 10
  ) {
    const world = screenToWorld(
      local(event),
      size.value,
      props.scenario.rink,
      camera.value,
    );
    if (props.tool === 'target' && store.selectedPlayer) store.setTarget(world);
    else if (props.tool === 'place') store.move(store.selected, world);
  }
  pointers.delete(event.pointerId);
  gesture = null;
  if (host.value?.hasPointerCapture(event.pointerId))
    host.value.releasePointerCapture(event.pointerId);
  // After a pinch, require a new contact so the remaining finger cannot move a player.
}
function cancel(event?: PointerEvent) {
  store.cancelGesture();
  gesture = null;
  if (event) pointers.delete(event.pointerId);
  else pointers.clear();
}
function wheel(event: WheelEvent) {
  event.preventDefault();
  zoom(Math.exp(-event.deltaY * 0.0015), local(event));
}
function keyboard(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    cancel();
    return;
  }
  const directions: Record<string, Point> = {
    ArrowLeft: { x: -1, y: 0 },
    ArrowRight: { x: 1, y: 0 },
    ArrowUp: { x: 0, y: -1 },
    ArrowDown: { x: 0, y: 1 },
  };
  const direction = directions[event.key];
  if (direction && props.editable) {
    event.preventDefault();
    const pos = entityPosition(props.scenario, store.selected),
      step = (event.shiftKey ? 2 : 0.5) * (camera.value.flipped ? -1 : 1);
    store.move(store.selected, {
      x: pos.x + direction.x * step,
      y: pos.y + direction.y * step,
    });
  }
  if (event.key === '+' || event.key === '=') {
    event.preventDefault();
    zoom(1.2);
  }
  if (event.key === '-') {
    event.preventDefault();
    zoom(1 / 1.2);
  }
  if (event.key === '0') {
    event.preventDefault();
    fit();
  }
}
watch([() => props.scenario.rink.length, () => props.scenario.rink.width], fit);
</script>
<template>
  <div
    ref="host"
    class="rink-board"
    :class="[`tool-${tool}`, { 'renderer-failed': failed }]"
    tabindex="0"
    role="group"
    :aria-label="t('editor.rinkLabel')"
    aria-describedby="rink-help"
    :data-ready="ready"
    :data-zoom="zoomPercent"
    :data-flipped="camera.flipped"
    @pointerdown="down"
    @pointermove="move"
    @pointerup="up"
    @pointercancel="cancel"
    @lostpointercapture="cancel"
    @wheel="wheel"
    @keydown="keyboard"
  >
    <p v-if="!ready && !failed" class="renderer-message">
      {{ t('editor.loadingRink') }}
    </p>
    <p v-if="failed" class="renderer-message" role="alert">
      {{ t('editor.rendererFailed') }}
    </p>
    <svg v-if="gaze" class="rink-observation" aria-hidden="true">
      <line
        :x1="gaze.from.x"
        :y1="gaze.from.y"
        :x2="gaze.to.x"
        :y2="gaze.to.y"
        stroke="#c18b35"
        stroke-width="2"
        stroke-dasharray="5 5"
      />
      <circle
        :cx="gaze.from.x"
        :cy="gaze.from.y"
        r="25"
        fill="none"
        stroke="#c18b35"
        stroke-width="2"
      />
      <circle
        :cx="gaze.to.x"
        :cy="gaze.to.y"
        r="13"
        fill="#dbac4433"
        stroke="#c18b35"
        stroke-width="2"
      />
    </svg>
    <span
      v-for="chevron in chevrons"
      :key="chevron.id"
      class="rink-motion-chevron"
      aria-hidden="true"
      :style="{
        left: `${chevron.x}px`,
        top: `${chevron.y}px`,
        transform: `translate(-50%, -50%) rotate(${chevron.angle}rad)`,
      }"
      >›</span
    >
    <button
      v-for="token in tokens"
      :key="token.key"
      class="entity-hit"
      :class="{
        'token-away': token.team === 1,
        'token-puck': token.team === -1,
      }"
      :data-entity="token.key"
      :aria-label="token.label"
      :aria-pressed="store.selected === token.key"
      :style="{ left: `${token.point.x}px`, top: `${token.point.y}px` }"
      :data-tooltip="token.label"
      @click.stop="$event.detail === 0 && store.select(token.key)"
    >
      <span>{{ token.text }}</span>
    </button>
  </div>
</template>
