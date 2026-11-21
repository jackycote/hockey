import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue';
import {
  ScenarioSchema,
  SIMULATION_HZ,
  SimulationResponseSchema,
  type Scenario,
  type SimulationCommand,
  type SimulationResponse,
  type SimulationSnapshot,
  type TickTrace,
  type WorldState,
} from '@hockey-iq/contracts';
import { interpolateWorld } from './interpolation';
export function useSimulation(getScenario: () => Scenario) {
  const mode = ref<
    'editing' | 'loading' | 'paused' | 'running' | 'ended' | 'error'
  >('editing');
  const busy = ref(false),
    error = ref('');
  const snapshot = shallowRef<SimulationSnapshot | null>(null),
    renderWorld = shallowRef<WorldState | null>(null);
  const hash = ref(''),
    traces = shallowRef<TickTrace[]>([]),
    pendingPass = ref(false);
  const active = computed(() => !['editing', 'error'].includes(mode.value));
  const tick = computed(() => snapshot.value?.world.tick ?? 0);
  let worker: Worker | null = null,
    sessionId = 0,
    requestId = 0,
    disposed = false;
  let animation = 0,
    receivedAt = 0,
    previous: WorldState | null = null;
  let reducedMotion = false,
    media: MediaQueryList | undefined;
  const pending = new Map<
    number,
    {
      resolve: () => void;
      reject: (error: Error) => void;
      timer: ReturnType<typeof setTimeout>;
    }
  >();
  function stopAnimation() {
    cancelAnimationFrame(animation);
    animation = 0;
  }
  function animate(now: number) {
    animation = 0;
    if (mode.value !== 'running' || !snapshot.value || !previous) return;
    renderWorld.value = interpolateWorld(
      previous,
      snapshot.value.world,
      reducedMotion ? 1 : (now - receivedAt) / (1000 / SIMULATION_HZ),
    );
    animation = requestAnimationFrame(animate);
  }
  function terminate() {
    worker?.terminate();
    worker = null;
    sessionId++;
    stopAnimation();
    for (const request of pending.values()) {
      clearTimeout(request.timer);
      request.reject(new Error('DISPOSED'));
    }
    pending.clear();
  }
  function fail(code: string) {
    terminate();
    busy.value = false;
    error.value = code;
    mode.value = 'error';
    renderWorld.value = null;
    snapshot.value = null;
    hash.value = '';
    pendingPass.value = false;
    traces.value = [];
  }
  function receive(event: MessageEvent<unknown>) {
    const parsed = SimulationResponseSchema.safeParse(event.data);
    if (!parsed.success) {
      fail('INVALID_RESPONSE');
      return;
    }
    const response = parsed.data;
    if (response.sessionId !== sessionId) return;
    if (response.type === 'error') {
      const request = pending.get(response.requestId);
      if (request) {
        clearTimeout(request.timer);
        pending.delete(response.requestId);
        request.reject(new Error(response.code));
      }
      if (response.requestId === 0) fail(response.code);
      return;
    }
    snapshot.value = response.snapshot;
    hash.value = response.hash;
    mode.value = response.mode;
    pendingPass.value = response.pendingInputs.length > 0;
    previous = response.previousWorld;
    receivedAt = performance.now();
    if (response.trace) {
      const latest = traces.value.at(-1);
      if (!latest || response.trace.tick > latest.tick)
        traces.value = [...traces.value.slice(-119), response.trace];
    }
    if (response.mode === 'running') {
      renderWorld.value = interpolateWorld(
        previous,
        response.snapshot.world,
        reducedMotion ? 1 : 0,
      );
      if (!animation) animation = requestAnimationFrame(animate);
    } else {
      stopAnimation();
      renderWorld.value = response.snapshot.world;
    }
    const request = pending.get(response.requestId);
    if (request) {
      clearTimeout(request.timer);
      pending.delete(response.requestId);
      request.resolve();
    }
  }
  type Payload =
    | { type: 'initialize'; scenario: Scenario }
    | { type: 'play' | 'pause' | 'step' | 'reset' }
    | { type: 'pass'; toPlayerId: string };
  function send(payload: Payload): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!worker) {
        reject(new Error('NO_WORKER'));
        return;
      }
      const id = ++requestId;
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error('TIMEOUT'));
        fail('TIMEOUT');
      }, 10000);
      pending.set(id, { resolve, reject, timer });
      const command: SimulationCommand = {
        protocolVersion: 1,
        sessionId,
        requestId: id,
        ...payload,
      };
      worker.postMessage(command);
    });
  }
  async function initialize() {
    if (worker) return;
    const scenario = ScenarioSchema.parse(getScenario());
    sessionId++;
    mode.value = 'loading';
    error.value = '';
    traces.value = [];
    snapshot.value = null;
    hash.value = '';
    worker = new Worker(new URL('./simulation.worker.ts', import.meta.url), {
      type: 'module',
    });
    worker.onmessage = receive;
    worker.onerror = (event) => {
      event.preventDefault();
      fail('WORKER_FAILURE');
    };
    worker.onmessageerror = () => fail('INVALID_RESPONSE');
    await send({ type: 'initialize', scenario });
  }
  async function act(payload: Exclude<Payload, { type: 'initialize' }>) {
    if (busy.value || disposed) return;
    busy.value = true;
    error.value = '';
    try {
      await initialize();
      await send(payload);
    } catch (failure) {
      const code =
        failure instanceof Error ? failure.message : 'WORKER_FAILURE';
      if (code !== 'DISPOSED' && !disposed) {
        error.value = code;
        if (code !== 'INVALID_PASS') fail(code);
      }
    } finally {
      busy.value = false;
    }
  }
  function edit() {
    terminate();
    mode.value = 'editing';
    busy.value = false;
    snapshot.value = null;
    renderWorld.value = null;
    hash.value = '';
    traces.value = [];
    pendingPass.value = false;
    error.value = '';
  }
  async function reset() {
    await act({ type: 'reset' });
    if (mode.value !== 'error') traces.value = [];
  }
  const play = () => act({ type: 'play' });
  const pause = () => act({ type: 'pause' });
  const step = () => act({ type: 'step' });
  const pass = (toPlayerId: string) => act({ type: 'pass', toPlayerId });
  function visibility() {
    if (document.hidden && mode.value === 'running') void pause();
  }
  function motionPreference(event: MediaQueryListEvent) {
    reducedMotion = event.matches;
  }
  onMounted(() => {
    media = window.matchMedia('(prefers-reduced-motion: reduce)');
    reducedMotion = media.matches;
    media.addEventListener('change', motionPreference);
    document.addEventListener('visibilitychange', visibility);
  });
  onBeforeUnmount(() => {
    disposed = true;
    terminate();
    document.removeEventListener('visibilitychange', visibility);
    media?.removeEventListener('change', motionPreference);
  });
  return {
    mode,
    busy,
    error,
    snapshot,
    renderWorld,
    hash,
    traces,
    pendingPass,
    active,
    tick,
    play,
    pause,
    step,
    reset,
    edit,
    pass,
  };
}
export type SimulationSession = ReturnType<typeof useSimulation>;
export type SimulationFrameResponse = Extract<
  SimulationResponse,
  { type: 'frame' }
>;
