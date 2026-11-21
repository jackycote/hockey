import { z } from 'zod';
import {
  ScenarioSchema,
  TacticalSystemSchema,
  TacticalInputSchema,
} from '@hockey-iq/contracts';
import { TacticalSimulation } from '@hockey-iq/tactical-engine';
const Command = z.discriminatedUnion('type', [
  z.strictObject({
    type: z.literal('prepare'),
    scenario: ScenarioSchema,
    system: TacticalSystemSchema,
    teamId: z.string(),
    ticks: z.number().int().min(1).max(900),
  }),
  z.strictObject({
    type: z.literal('initialize'),
    scenario: ScenarioSchema,
    system: TacticalSystemSchema,
    teamId: z.string(),
  }),
  z.strictObject({
    type: z.enum(['play', 'pause', 'step', 'reset', 'record']),
  }),
  z.strictObject({ type: z.literal('input'), input: TacticalInputSchema }),
]);
const scope = self as unknown as {
  postMessage: (value: unknown) => void;
  onmessage: ((event: MessageEvent<unknown>) => void) | null;
};
let simulation: TacticalSimulation | undefined,
  timer: ReturnType<typeof setInterval> | undefined;
let pending: z.infer<typeof TacticalInputSchema>[] = [];
function stop() {
  if (timer) clearInterval(timer);
  timer = undefined;
}
function frame() {
  if (!simulation) throw new Error('NO_SESSION');
  const value = simulation.step(pending);
  pending = [];
  scope.postMessage({ type: 'frame', frame: value, running: !!timer });
  if (value.tick >= 9000) {
    stop();
    scope.postMessage({ type: 'paused' });
  }
}
let preparation = 0;
async function prepare(
  command: Extract<z.infer<typeof Command>, { type: 'prepare' }>,
  generation: number,
) {
  try {
    const preview = new TacticalSimulation(
      command.scenario,
      command.system,
      command.teamId,
    );
    for (let i = 0; i < command.ticks; i++) {
      if (generation !== preparation) return;
      preview.step();
      if ((i + 1) % 30 === 0) {
        scope.postMessage({
          type: 'preparing',
          ticks: i + 1,
          total: command.ticks,
        });
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
      }
    }
    if (generation === preparation)
      scope.postMessage({
        type: 'prepared',
        recording: preview.recording(
          'Démonstration du modèle',
          'preview-system',
          1,
        ),
      });
  } catch (e) {
    if (generation === preparation)
      scope.postMessage({
        type: 'error',
        message: e instanceof Error ? e.message : 'PREPARATION_ERROR',
      });
  }
}
scope.onmessage = (event) => {
  try {
    const command = Command.parse(event.data);
    const generation = ++preparation;
    switch (command.type) {
      case 'prepare':
        stop();
        void prepare(command, generation);
        break;
      case 'initialize':
        stop();
        simulation = new TacticalSimulation(
          command.scenario,
          command.system,
          command.teamId,
        );
        pending = [];
        scope.postMessage({
          type: 'frame',
          frame: simulation.frames[0],
          running: false,
        });
        break;
      case 'play':
        if (!simulation) throw new Error('NO_SESSION');
        if (!timer)
          timer = setInterval(() => {
            try {
              frame();
            } catch (e) {
              stop();
              scope.postMessage({
                type: 'error',
                message: e instanceof Error ? e.message : 'SIMULATION_ERROR',
              });
            }
          }, 1000 / 30);
        scope.postMessage({ type: 'running' });
        break;
      case 'pause':
        stop();
        scope.postMessage({ type: 'paused' });
        break;
      case 'step':
        stop();
        frame();
        break;
      case 'input':
        if (timer) throw new Error('PAUSE_BEFORE_INTERVENTION');
        pending.push(command.input);
        scope.postMessage({ type: 'inputQueued' });
        break;
      case 'reset':
        stop();
        if (simulation) {
          simulation = new TacticalSimulation(
            simulation.scenario,
            simulation.initialSystem,
            simulation.teamId,
          );
          pending = [];
          scope.postMessage({
            type: 'frame',
            frame: simulation.frames[0],
            running: false,
          });
        }
        break;
      case 'record':
        stop();
        if (!simulation) throw new Error('NO_SESSION');
        scope.postMessage({
          type: 'recording',
          recording: simulation.recording(
            'Séquence enregistrée',
            'pending-system',
            1,
          ),
        });
        break;
    }
  } catch (e) {
    stop();
    scope.postMessage({
      type: 'error',
      message: e instanceof Error ? e.message : 'INVALID_COMMAND',
    });
  }
};
