import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useEditorStore } from '../editor/store';
import { EditorError } from '../editor/scenario';
import {
  durationOf,
  insertionIndex,
  sequenceFrame,
  advanceSequence,
} from './sequence';
export function useTimeline() {
  const store = useEditorStore();
  const time = ref(0),
    playing = ref(false),
    previewing = ref(false),
    speed = ref(1);
  let animation = 0,
    last = 0;
  const duration = computed(() =>
    store.sequence ? durationOf(store.sequence) : 0,
  );
  const frame = computed(() =>
    store.sequence ? sequenceFrame(store.sequence, time.value) : null,
  );
  const preview = computed(() =>
    previewing.value ? (frame.value?.scenario ?? null) : null,
  );
  const canInsert = computed(
    () =>
      !!store.sequence &&
      !store.sequencePending &&
      insertionIndex(store.sequence, time.value) > 0 &&
      store.sequence.steps.length < 120,
  );
  const directions = computed(() => {
    if (previewing.value) return frame.value?.directions ?? {};
    const steps = store.sequence?.steps;
    const index = steps?.findIndex((s) => s.id === store.stepId) ?? -1;
    const target = steps?.[index + 1] ?? steps?.[index - 1];
    if (!target) return {};
    return Object.fromEntries(
      store.scenario.players.flatMap((player) => {
        const other = target.pose.players.find((p) => p.id === player.id)!;
        const sign = steps?.[index + 1] ? 1 : -1;
        const vector = {
          x: (other.pos.x - player.pos.x) * sign,
          y: (other.pos.y - player.pos.y) * sign,
        };
        return Math.hypot(vector.x, vector.y) > 0.001
          ? [[player.id, vector]]
          : [];
      }),
    );
  });
  const observation = computed(() => {
    const metadata = (previewing.value ? frame.value?.step : store.currentStep)
      ?.observation;
    if (!metadata) return null;
    const scenario = preview.value ?? store.scenario;
    const target = metadata.lookAt;
    const point =
      target.kind === 'puck'
        ? scenario.puck.pos
        : target.kind === 'point'
          ? target.point
          : scenario.players.find((p) => p.id === target.playerId)!.pos;
    return { ...metadata, point };
  });
  function setSpeed(value: number) {
    if ([0.25, 0.5, 1, 2].includes(value)) speed.value = value;
  }
  function pause() {
    playing.value = false;
    cancelAnimationFrame(animation);
    animation = 0;
    last = 0;
  }
  function guard() {
    store.cancelGesture();
    if (store.sequencePending) throw new EditorError('unrecordedStep');
  }
  function seek(value: number) {
    if (!Number.isFinite(value)) throw new EditorError('invalidValues');
    guard();
    pause();
    time.value = Math.round(Math.max(0, Math.min(duration.value, value)));
    previewing.value = true;
  }
  function animate(timestamp: number) {
    animation = 0;
    if (!playing.value) return;
    // Cap stalls; tab visibility pauses explicitly instead of skipping coaching moments.
    const delta = last ? Math.min(100, timestamp - last) * speed.value : 0;
    last = timestamp;
    const next = advanceSequence(store.sequence!, time.value, delta);
    time.value = next.time;
    if (next.paused) {
      pause();
      return;
    }
    animation = requestAnimationFrame(animate);
  }
  function play() {
    guard();
    if (!duration.value || playing.value) return;
    if (time.value >= duration.value) time.value = 0;
    previewing.value = true;
    playing.value = true;
    last = 0;
    animation = requestAnimationFrame(animate);
  }
  function select(id: string) {
    guard();
    pause();
    store.selectStep(id);
    previewing.value = false;
    time.value = store.currentStep?.atMs ?? 0;
  }
  function rewind() {
    const first = store.sequence?.steps[0];
    if (first) select(first.id);
  }
  function jump(direction: number) {
    const steps = store.sequence?.steps ?? [];
    const candidates = steps.filter((step) =>
      direction < 0
        ? step.atMs < time.value - 0.001
        : step.atMs > time.value + 0.001,
    );
    const step = direction < 0 ? candidates.at(-1) : candidates[0];
    if (step) select(step.id);
  }
  function insert() {
    guard();
    pause();
    store.insertStep(time.value);
  }
  watch(
    () => [store.sequence, store.stepId],
    () => {
      pause();
      previewing.value = false;
      time.value = store.currentStep?.atMs ?? 0;
    },
    { flush: 'sync' },
  );
  function visibility() {
    if (document.hidden) pause();
  }
  onMounted(() => document.addEventListener('visibilitychange', visibility));
  onBeforeUnmount(() => {
    pause();
    document.removeEventListener('visibilitychange', visibility);
  });
  return {
    time,
    playing,
    previewing,
    preview,
    duration,
    speed,
    setSpeed,
    directions,
    observation,
    canInsert,
    seek,
    play,
    pause,
    select,
    jump,
    rewind,
    insert,
  };
}
export type TimelineSession = ReturnType<typeof useTimeline>;
