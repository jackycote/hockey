import {
  SIMULATION_HZ,
  SimulationCommandSchema,
  type SimulationResponse,
} from '@hockey-iq/contracts';
import { SimulationRuntime } from './runtime';
const scope = globalThis as unknown as {
  postMessage(message: SimulationResponse): void;
  onmessage: ((event: MessageEvent<unknown>) => void) | null;
};
const runtime = new SimulationRuntime();
let timer: ReturnType<typeof setTimeout> | undefined;
let lastTime = 0,
  accumulator = 0;
function stop() {
  if (timer !== undefined) clearTimeout(timer);
  timer = undefined;
  accumulator = 0;
}
function error(
  requestId: number,
  code: Extract<SimulationResponse, { type: 'error' }>['code'],
  sessionId = runtime.currentSessionId,
) {
  scope.postMessage({
    protocolVersion: 1,
    type: 'error',
    sessionId,
    requestId,
    code,
  });
}
function pump() {
  timer = undefined;
  if (runtime.mode !== 'running') return;
  // Monotonic browser time paces fixed ticks; the core never reads clocks or elapsed time.
  const now = performance.now();
  accumulator += Math.max(0, Math.min(250, now - lastTime));
  lastTime = now;
  const stepMs = 1000 / SIMULATION_HZ,
    count = Math.min(5, Math.floor(accumulator / stepMs));
  accumulator -= count * stepMs;
  if (accumulator > stepMs * 5) accumulator %= stepMs;
  try {
    for (let i = 0; i < count && runtime.mode === 'running'; i++)
      scope.postMessage(runtime.advance());
  } catch {
    stop();
    runtime.mode = 'paused';
    error(0, 'WORKER_FAILURE');
    return;
  }
  if (runtime.mode === 'running') timer = setTimeout(pump, 1000 / 60);
}
scope.onmessage = (event) => {
  const result = SimulationCommandSchema.safeParse(event.data);
  if (!result.success) {
    error(0, 'INVALID_COMMAND');
    return;
  }
  const command = result.data;
  try {
    if (['initialize', 'reset', 'pause', 'step'].includes(command.type)) stop();
    scope.postMessage(runtime.handle(command));
    if (runtime.mode === 'running' && timer === undefined) {
      lastTime = performance.now();
      accumulator = 0;
      timer = setTimeout(pump, 1000 / 60);
    }
  } catch (failure) {
    const message = failure instanceof Error ? failure.message : '';
    const code =
      message === 'NO_SESSION' ||
      message === 'INVALID_PASS' ||
      message === 'INVALID_COMMAND'
        ? message
        : 'INVALID_INPUT';
    error(command.requestId, code, command.sessionId);
  }
};
