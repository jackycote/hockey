<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount, watch, useId } from 'vue';
import type {
  Scenario,
  SystemZoneSchema,
  AnnotationV12Schema,
} from '@hockey-iq/contracts';
import type { z } from 'zod';
import { RinkRenderer } from '../editor/renderer';
import {
  newCamera,
  worldToScreen,
  screenToWorld,
  clampToRink,
  zoomAt,
} from '../editor/geometry';
import Icon from '../editor/Icon.vue';
const props = withDefaults(
  defineProps<{
    scenario: Scenario;
    editable?: boolean;
    selected?: string;
    zones?: z.infer<typeof SystemZoneSchema>[];
    tool?: 'select' | 'rectangle' | 'polygon' | 'target';
    focusPlayer?: string;
    attackDirection?: number;
    targets?: { id: string; name: string; point: { x: number; y: number } }[];
    annotations?: z.infer<typeof AnnotationV12Schema>[];
  }>(),
  {
    editable: false,
    selected: 'home-1',
    zones: () => [],
    tool: 'select',
    focusPlayer: '',
    attackDirection: 1,
    annotations: () => [],
    targets: () => [],
  },
);
const arrowId = useId().replace(/[^a-z0-9]/gi, '') + '-arrow';
const emit = defineEmits<{
  select: [id: string];
  move: [id: string, point: { x: number; y: number }];
  rectangle: [
    geometry: {
      kind: 'rectangle';
      x: number;
      y: number;
      width: number;
      height: number;
    },
  ];
  target: [point: { x: number; y: number }];
  vertex: [point: { x: number; y: number }];
}>();
const host = ref<HTMLElement>(),
  ready = ref(false),
  failed = ref(false),
  size = ref({ width: 1, height: 1 }),
  camera = ref(newCamera());
let renderer: RinkRenderer | undefined,
  observer: ResizeObserver | undefined,
  disposed = false;
let gesture: {
  id: string;
  start: { x: number; y: number };
  point: { x: number; y: number };
} | null = null;
const tokens = computed(() => [
  ...props.scenario.players.map((p) => ({
    id: p.id,
    label: `${props.scenario.teams.find((t) => t.id === p.teamId)?.label} · ${p.label} · ${p.nominalPosition}`,
    point: worldToScreen(p.pos, size.value, props.scenario.rink, camera.value),
  })),
  {
    id: 'puck',
    label: 'Rondelle',
    point: worldToScreen(
      props.scenario.puck.pos,
      size.value,
      props.scenario.rink,
      camera.value,
    ),
  },
]);
let renderRequest = 0;
function render() {
  if (!renderRequest && !disposed)
    renderRequest = requestAnimationFrame(() => {
      renderRequest = 0;
      draw();
    });
}
function draw() {
  if (!renderer || !ready.value) return;
  renderer.draw({
    scenario: props.scenario,
    camera: camera.value,
    size: size.value,
    selected: props.selected === 'puck' ? 'puck' : `player:${props.selected}`,
    roles: false,
    paths: false,
    grid: false,
  });
}
const arrows = computed(() =>
  props.annotations
    .filter((a) => a.kind === 'arrow' && a.point)
    .map((a) => ({
      id: a.id,
      text: a.text,
      from: worldToScreen(
        props.scenario.players.find((p) => p.id === a.playerId)?.pos ??
          props.scenario.puck.pos,
        size.value,
        props.scenario.rink,
        camera.value,
      ),
      to: worldToScreen(
        a.point!,
        size.value,
        props.scenario.rink,
        camera.value,
      ),
    })),
);
function zoom(factor: number) {
  camera.value = zoomAt(
    camera.value,
    camera.value.zoom * factor,
    { x: size.value.width / 2, y: size.value.height / 2 },
    size.value,
    props.scenario.rink,
  );
}
function point(event: PointerEvent) {
  const box = host.value!.getBoundingClientRect();
  return clampToRink(
    screenToWorld(
      { x: event.clientX - box.left, y: event.clientY - box.top },
      size.value,
      props.scenario.rink,
      camera.value,
    ),
    props.scenario.rink,
    0.7,
  );
}
function normalized(p: { x: number; y: number }) {
  const x = p.x / props.scenario.rink.length;
  return {
    x: props.attackDirection < 0 ? 1 - x : x,
    y: p.y / props.scenario.rink.width,
  };
}
function down(event: PointerEvent) {
  if (event.button !== 0 || !props.editable) return;
  const id =
    (event.target as HTMLElement).closest<HTMLElement>('[data-player]')?.dataset
      .player ?? props.selected;
  const p = point(event);
  gesture = { id, start: p, point: p };
  emit('select', id);
  host.value?.setPointerCapture(event.pointerId);
}
function move(event: PointerEvent) {
  if (!gesture) return;
  gesture.point = point(event);
  if (props.tool === 'select') emit('move', gesture.id, gesture.point);
}
function up() {
  if (!gesture) return;
  const g = gesture;
  gesture = null;
  if (props.tool === 'rectangle') {
    const a = normalized(g.start),
      b = normalized(g.point);
    if (Math.abs(a.x - b.x) > 0.01 && Math.abs(a.y - b.y) > 0.01)
      emit('rectangle', {
        kind: 'rectangle',
        x: Math.min(a.x, b.x),
        y: Math.min(a.y, b.y),
        width: Math.abs(a.x - b.x),
        height: Math.abs(a.y - b.y),
      });
  } else if (props.tool === 'target') emit('target', normalized(g.point));
  else if (props.tool === 'polygon') emit('vertex', normalized(g.point));
}
function zonePoints(zone: z.infer<typeof SystemZoneSchema>) {
  const g = zone.geometry;
  const points =
    g.kind === 'rectangle'
      ? [
          { x: g.x, y: g.y },
          { x: g.x + g.width, y: g.y },
          { x: g.x + g.width, y: g.y + g.height },
          { x: g.x, y: g.y + g.height },
        ]
      : g.points;
  return points
    .map((p) => {
      const q = worldToScreen(
        {
          x:
            (props.attackDirection < 0 ? 1 - p.x : p.x) *
            props.scenario.rink.length,
          y: p.y * props.scenario.rink.width,
        },
        size.value,
        props.scenario.rink,
        camera.value,
      );
      return `${q.x},${q.y}`;
    })
    .join(' ');
}
function key(event: KeyboardEvent, id: string) {
  if (!props.editable || props.tool !== 'select') return;
  const delta: Record<string, { x: number; y: number }> = {
    ArrowLeft: { x: -0.5, y: 0 },
    ArrowRight: { x: 0.5, y: 0 },
    ArrowUp: { x: 0, y: -0.5 },
    ArrowDown: { x: 0, y: 0.5 },
  };
  const d = delta[event.key];
  if (!d) return;
  event.preventDefault();
  const p =
    id === 'puck'
      ? props.scenario.puck.pos
      : props.scenario.players.find((p) => p.id === id)!.pos;
  emit(
    'move',
    id,
    clampToRink({ x: p.x + d.x, y: p.y + d.y }, props.scenario.rink, 0.7),
  );
}
watch(
  () => [props.scenario, camera.value, size.value, props.selected],
  render,
  { deep: true },
);
watch(
  () => [props.scenario.rink.length, props.scenario.rink.width],
  () => {
    camera.value = newCamera();
  },
);
watch(
  () =>
    [
      props.focusPlayer,
      props.scenario.players,
      size.value,
      camera.value.flipped,
    ] as const,
  () => {
    const player = props.scenario.players.find(
      (p) => p.id === props.focusPlayer,
    );
    if (!player) return;
    const base = {
      ...camera.value,
      zoom: Math.max(1.7, camera.value.zoom),
      pan: { x: 0, y: 0 },
    };
    const p = worldToScreen(player.pos, size.value, props.scenario.rink, base);
    const pan = {
      x: size.value.width / 2 - p.x,
      y: size.value.height / 2 - p.y,
    };
    // This watcher reads the camera flip: only publish a new camera when values change,
    // otherwise its own reactive assignment would retrigger an endless focus loop.
    if (
      Math.abs(camera.value.pan.x - pan.x) > 1e-6 ||
      Math.abs(camera.value.pan.y - pan.y) > 1e-6 ||
      camera.value.zoom !== base.zoom
    )
      camera.value = { ...base, pan };
  },
  { deep: true },
);
watch(
  () => props.focusPlayer,
  (id) => {
    if (id) emit('select', id);
    else camera.value = newCamera();
  },
);
onMounted(async () => {
  const element = host.value!;
  size.value = { width: element.clientWidth, height: element.clientHeight };
  observer = new ResizeObserver(() => {
    size.value = { width: element.clientWidth, height: element.clientHeight };
  });
  observer.observe(element);
  try {
    const r = new RinkRenderer();
    renderer = r;
    await r.initialize(element, size.value, {
      resolution: 1,
      antialias: false,
    });
    if (disposed) {
      r.destroy();
      return;
    }
    ready.value = true;
    render();
  } catch {
    failed.value = true;
  }
});
onBeforeUnmount(() => {
  disposed = true;
  cancelAnimationFrame(renderRequest);
  observer?.disconnect();
  renderer?.destroy();
});
</script>
<template>
  <div class="team-rink-wrap">
    <div
      class="team-rink-actions"
      role="group"
      aria-label="Vue de la patinoire"
    >
      <button
        type="button"
        aria-label="Réduire la patinoire"
        @click="zoom(1 / 1.2)"
      >
        <Icon name="minus" />
      </button>
      <output aria-label="Zoom de la vue"
        >{{ Math.round(camera.zoom * 100) }} %</output
      >
      <button
        type="button"
        aria-label="Agrandir la patinoire"
        @click="zoom(1.2)"
      >
        <Icon name="plus" />
      </button>
      <button
        type="button"
        aria-label="Cadrer la patinoire"
        @click="camera = { ...newCamera(), flipped: camera.flipped }"
      >
        <Icon name="fit" />
      </button>
      <button
        type="button"
        aria-label="Inverser la patinoire"
        @click="camera = { ...camera, flipped: !camera.flipped }"
      >
        <Icon name="flip" />
      </button>
    </div>
    <div
      class="team-rink-stage"
      :class="{ 'team-rink-stage--narrated': !!$slots.description }"
    >
      <div v-if="$slots.description" class="team-rink-description">
        <slot name="description" />
      </div>
      <div
        ref="host"
        class="team-rink"
        role="group"
        aria-label="Patinoire du projet"
        :data-ready="ready"
        @pointerdown="down"
        @pointermove="move"
        @pointerup="up"
        @pointercancel="gesture = null"
      >
        <p v-if="!ready && !failed">Chargement de la patinoire…</p>
        <svg
          class="team-zone-overlay"
          :viewBox="`0 0 ${size.width} ${size.height}`"
          aria-hidden="true"
        >
          <defs>
            <marker
              :id="arrowId"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M0 0 10 5 0 10Z" fill="#e7792b" />
            </marker>
          </defs>
          <g v-for="target in targets" :key="target.id">
            <circle
              :cx="
                worldToScreen(
                  {
                    x:
                      (attackDirection < 0
                        ? 1 - target.point.x
                        : target.point.x) * scenario.rink.length,
                    y: target.point.y * scenario.rink.width,
                  },
                  size,
                  scenario.rink,
                  camera,
                ).x
              "
              :cy="
                worldToScreen(
                  {
                    x:
                      (attackDirection < 0
                        ? 1 - target.point.x
                        : target.point.x) * scenario.rink.length,
                    y: target.point.y * scenario.rink.width,
                  },
                  size,
                  scenario.rink,
                  camera,
                ).y
              "
              r="5"
              fill="#e7792b"
            />
            <title>{{ target.name }}</title>
          </g>
          <g v-for="target in targets" :key="target.id">
            <circle
              :cx="
                worldToScreen(
                  {
                    x:
                      (attackDirection < 0
                        ? 1 - target.point.x
                        : target.point.x) * scenario.rink.length,
                    y: target.point.y * scenario.rink.width,
                  },
                  size,
                  scenario.rink,
                  camera,
                ).x
              "
              :cy="
                worldToScreen(
                  {
                    x:
                      (attackDirection < 0
                        ? 1 - target.point.x
                        : target.point.x) * scenario.rink.length,
                    y: target.point.y * scenario.rink.width,
                  },
                  size,
                  scenario.rink,
                  camera,
                ).y
              "
              r="5"
              fill="#e7792b"
            />
            <title>{{ target.name }}</title>
          </g>
          <line
            v-for="arrow in arrows"
            :key="arrow.id"
            :x1="arrow.from.x"
            :y1="arrow.from.y"
            :x2="arrow.to.x"
            :y2="arrow.to.y"
            stroke="#e7792b"
            stroke-width="3"
            :marker-end="`url(#${arrowId})`"
          >
            <title>{{ arrow.text }}</title>
          </line>
          <polygon
            v-for="zone in zones"
            :key="zone.id"
            :points="zonePoints(zone)"
          />
          <text
            v-for="zone in zones"
            :key="zone.id + '-label'"
            :x="zonePoints(zone).split(' ')[0]?.split(',')[0]"
            :y="Number(zonePoints(zone).split(' ')[0]?.split(',')[1]) + 14"
          >
            {{ zone.name }}
          </text>
        </svg>
        <button
          v-for="token in tokens"
          :key="token.id"
          class="team-token-hit"
          :class="{
            'team-token-selected':
              selected === token.id || focusPlayer === token.id,
            'team-token-fallback': failed,
          }"
          :data-player="token.id"
          :aria-label="token.label"
          :aria-pressed="selected === token.id"
          :style="{ left: `${token.point.x}px`, top: `${token.point.y}px` }"
          @click="emit('select', token.id)"
          @keydown="key($event, token.id)"
        >
          <span>{{ token.label }}</span>
        </button>
      </div>
    </div>
  </div>
</template>
