<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { SIMULATION_HZ, type Scenario } from '@hockey-iq/contracts';
import Icon from '../editor/Icon.vue';
import type { SimulationSession } from './useSimulation';
const props = defineProps<{ session: SimulationSession; scenario: Scenario }>();
const emit = defineEmits<{ target: [] }>();
const { t } = useI18n();
const receiver = ref('');
const teamLabel = computed(
  () =>
    props.scenario.teams.find((team) => team.id === holder.value?.teamId)
      ?.label ?? '',
);
const holder = computed(() =>
  props.scenario.players.find(
    (player) => player.id === props.scenario.puck.holderId,
  ),
);
const recipients = computed(() =>
  props.scenario.players.filter(
    (player) =>
      holder.value &&
      player.teamId === holder.value.teamId &&
      player.id !== holder.value.id,
  ),
);
watch(
  recipients,
  (candidates) => {
    if (!candidates.some((player) => player.id === receiver.value))
      receiver.value = candidates[0]?.id ?? '';
  },
  { immediate: true },
);
const time = computed(() => {
  const seconds = Math.floor(props.session.tick.value / SIMULATION_HZ);
  return `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
});
const events = computed(() =>
  props.session.traces.value
    .flatMap((trace) => [
      ...trace.events.map((event) => ({
        tick: trace.tick,
        key: `${trace.tick}:${event.sequence}`,
        text:
          event.kind === 'pass_requested'
            ? 'passEvent'
            : event.kind === 'possession_changed'
              ? 'possessionEvent'
              : 'inputEvent',
      })),
      ...trace.rejectedInputs.map((input) => ({
        tick: trace.tick,
        key: `${trace.tick}:rejected:${input.sequence}`,
        text: 'rejected',
      })),
    ])
    .slice(-6)
    .reverse(),
);
</script>
<template>
  <section class="simulation-controls" :aria-label="t('simulation.title')">
    <div class="sim-primary-row">
      <button
        v-if="session.mode.value === 'running'"
        class="sim-play"
        :disabled="session.busy.value"
        @click="session.pause"
      >
        <Icon name="pause" />{{ t('simulation.pause') }}
      </button>
      <button
        v-else
        class="sim-play"
        :disabled="session.busy.value || session.mode.value === 'ended'"
        @click="session.play"
      >
        <Icon name="play" />{{
          t(session.active.value ? 'simulation.resume' : 'simulation.play')
        }}
      </button>
      <button
        class="icon-button"
        :aria-label="t('simulation.step')"
        :data-tooltip="t('simulation.step')"
        :disabled="
          session.busy.value ||
          session.mode.value === 'running' ||
          session.mode.value === 'ended'
        "
        @click="session.step"
      >
        <Icon name="step" />
      </button>
      <button
        class="icon-button"
        :aria-label="t('simulation.reset')"
        :data-tooltip="t('simulation.reset')"
        :disabled="session.busy.value || !session.active.value"
        @click="session.reset"
      >
        <Icon name="reset" />
      </button>
      <div class="sim-clock">
        <span
          :aria-label="t('simulation.time')"
          data-testid="simulation-time"
          >{{ time }}</span><small
          >{{ t('simulation.tick') }}
          <b data-testid="simulation-tick">{{ session.tick.value }}</b></small
        >
      </div>
      <span
        class="sim-state"
        :data-mode="session.mode.value"
        data-testid="simulation-mode"
        ><i></i>{{ t(`simulation.${session.mode.value}`) }}</span
      >
    </div>
    <p v-if="session.error.value" class="sim-error" role="alert">
      {{
        t(
          session.error.value === 'INVALID_PASS'
            ? 'simulation.passError'
            : 'simulation.workerError',
        )
      }}
    </p>
    <p class="sim-hint">
      {{
        t(
          session.active.value
            ? 'simulation.activeHint'
            : 'simulation.setupHint',
        )
      }}
      <button
        v-if="!session.active.value"
        class="text-button"
        @click="emit('target')"
      >
        {{ t('simulation.chooseTarget') }}</button><button
        v-else
        class="text-button"
        :disabled="session.busy.value"
        @click="session.edit"
      >
        <Icon name="edit" />{{ t('simulation.edit') }}
      </button>
    </p>
    <div class="sim-pass-row">
      <label
        ><span>{{ t('simulation.receiver') }}</span
        ><select
          v-model="receiver"
          :disabled="
            !holder ||
            session.busy.value ||
            session.pendingPass.value ||
            session.mode.value === 'ended'
          "
          :aria-label="t('simulation.receiver')"
        >
          <option v-if="!holder" value="">{{ t('editor.freePuck') }}</option>
          <option
            v-for="player in recipients"
            :key="player.id"
            :value="player.id"
          >
            {{ teamLabel }} ·
            {{ t(`editor.positions.${player.nominalPosition}`) }} ·
            {{ player.label }}
          </option>
        </select></label
      ><button
        class="secondary"
        :disabled="
          !holder ||
          !receiver ||
          session.busy.value ||
          session.pendingPass.value ||
          session.mode.value === 'ended'
        "
        @click="session.pass(receiver)"
      >
        <Icon name="puck" />{{ t('simulation.pass') }}
      </button>
    </div>
    <p v-if="session.pendingPass.value" class="sim-pending" role="status">
      {{ t('simulation.pending') }}
    </p>
    <p v-else class="sim-pass-hint">
      <span v-if="holder"
        >{{
          t('simulation.passer', {
            team: teamLabel,
            position: t(`editor.positions.${holder.nominalPosition}`),
            number: holder.label,
          })
        }}. </span
      >{{ t(holder ? 'simulation.passHint' : 'simulation.noHolder') }}
    </p>
    <p v-if="session.mode.value === 'ended'" class="sim-hint">
      {{ t('simulation.limit') }}
    </p>
    <details v-if="session.snapshot.value" class="sim-diagnostics">
      <summary>
        {{ t('simulation.diagnostics')
        }}<code>{{ session.hash.value.slice(0, 10) }}</code>
      </summary>
      <dl>
        <dt>{{ t('simulation.version') }}</dt>
        <dd>
          {{ session.snapshot.value.engineVersion }} /
          {{ session.snapshot.value.physicsVersion }}
        </dd>
        <dt>{{ t('simulation.seed') }}</dt>
        <dd>{{ session.snapshot.value.world.seed }}</dd>
        <dt>{{ t('simulation.hash') }}</dt>
        <dd>
          <code data-testid="simulation-hash" :data-hash="session.hash.value">{{
            session.hash.value
          }}</code>
        </dd>
      </dl>
      <ol
        v-if="events.length"
        class="sim-events"
        :aria-label="t('simulation.trace')"
      >
        <li v-for="event in events" :key="event.key">
          <span>{{ event.tick }}</span>{{ t(`simulation.${event.text}`) }}
        </li>
      </ol>
      <p>{{ t('simulation.traceNote') }}</p>
    </details>
  </section>
</template>
