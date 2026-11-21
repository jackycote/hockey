<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  ContextPhaseSchema,
  ContextRoleSchema,
  RuleTriggerSchema,
  TacticalActionSchema,
  type TacticalSystem,
  type TacticalRule,
} from '@hockey-iq/contracts';
import { PHASE_NAMES } from './labels';
import { ROLE_NAMES, validateSystem } from '@hockey-iq/play-systems';
const system = defineModel<TacticalSystem>({ required: true });
const props = defineProps<{ disabled: boolean }>();
const selected = ref(0),
  issues = ref<ReturnType<typeof validateSystem> | null>(null);
const roles = computed(() =>
  ContextRoleSchema.options.filter((role) =>
    system.value.template === 'FORECHECK_212'
      ? ['F1', 'F2', 'F3', 'D1', 'D2'].includes(role)
      : !['F1', 'F2', 'F3', 'D1', 'D2'].includes(role),
  ),
);
const rule = computed(() => system.value.rules[selected.value]);
const triggerNames: Record<string, string> = {
  EVERY_TICK: 'À chaque pas',
  PUCK_ENTER_ZONE: 'Entrée dans une zone',
  PUCK_SWITCH_SIDE: 'Changement de côté',
  POSSESSION_GAINED: 'Possession gagnée',
  POSSESSION_LOST: 'Possession perdue',
  OPPONENT_PASS: 'Passe adverse',
  ROLE_UNAVAILABLE: 'Rôle indisponible',
  PHASE_CHANGED: 'Changement de phase',
};
const actionNames: Record<string, string> = {
  MOVE_TO_ZONE: 'Rejoindre une zone',
  MOVE_TO_TARGET: 'Rejoindre un point-cible',
  PRESS_PUCK_CARRIER: 'Presser le porteur',
  HOLD_CENTER: 'Garder le centre',
  SUPPORT_PUCK: 'Soutenir la rondelle',
  OFFER_PASS: 'Offrir une ligne de passe',
  PROTECT_INSIDE: 'Protéger l’intérieur',
  CARRY: 'Porter la rondelle',
  PASS: 'Passer',
  REVERSE: 'Renverser D à D',
  WAIT_SUPPORT: 'Attendre du soutien',
  RETREAT: 'Se replier',
  SET_ROLE_PRIORITY: 'Prioriser le rôle',
  SET_PRESSURE_INTENSITY: 'Intensité de pression',
  COVER_LANE: 'Couvrir une ligne',
};
const conditionNames: Record<string, string> = {
  pressure: 'Distance de pression',
  intercept_time: 'Temps estimé d’interception',
  pressure_angle: 'Angle vers la rondelle',
  pass_lane: 'Ligne de passe',
  puck_side: 'Côté de la rondelle',
  possession: 'Possession',
  phase: 'Phase',
  puck_zone: 'Rondelle dans une zone',
  role_available: 'Rôle disponible',
  coverage: 'Couverture de zone',
  distance: 'Distance entre rôles',
};
function addRule() {
  if (system.value.rules.length >= 64) return;
  system.value.rules.push({
    id: crypto.randomUUID(),
    priority: 100,
    trigger: 'EVERY_TICK',
    match: 'all',
    conditions: [{ kind: 'possession', value: 'own' }],
    actions: [
      {
        kind: 'WAIT_SUPPORT',
        role: roles.value[0]!,
        targetRole: null,
        zoneId: null,
        intensity: 0.7,
      },
    ],
    explanation: 'Décrivez pourquoi cette décision aide l’équipe.',
  });
  selected.value = system.value.rules.length - 1;
  issues.value = null;
}
function condition(kind: string): TacticalRule['conditions'][number] {
  const role = roles.value[0]!,
    zoneId = system.value.zones[0]?.id ?? 'zone-required';
  switch (kind) {
    case 'pressure':
      return { kind, operator: 'lt', metres: 4 };
    case 'intercept_time':
      return { kind, role, operator: 'lt', seconds: 3 };
    case 'pressure_angle':
      return { kind, role, operator: 'lt', degrees: 60 };
    case 'pass_lane':
      return {
        kind,
        from: role,
        to: roles.value[1]!,
        clearanceMetres: 1.3,
        open: true,
      };
    case 'puck_side':
      return { kind, side: 'strong' };
    case 'phase':
      return {
        kind,
        value:
          system.value.template === 'FORECHECK_212'
            ? 'FORECHECK'
            : 'BREAKOUT_EXECUTION',
      };
    case 'puck_zone':
      return { kind, zoneId };
    case 'role_available':
      return { kind, role };
    case 'coverage':
      return { kind, role, zoneId };
    case 'distance':
      return {
        kind,
        from: role,
        to: roles.value[1]!,
        operator: 'lt',
        metres: 8,
      };
    default:
      return { kind: 'possession', value: 'own' };
  }
}
function replaceCondition(index: number, event: Event) {
  if (rule.value)
    rule.value.conditions[index] = condition(
      (event.target as HTMLSelectElement).value,
    );
}
function removeRule() {
  system.value.rules.splice(selected.value, 1);
  selected.value = Math.max(0, selected.value - 1);
  issues.value = null;
}
</script>
<template>
  <section class="system-rules" aria-label="Règles du système">
    <div class="platform-row">
      <h3>Règles SI / ALORS</h3>
      <button
        :disabled="disabled || system.rules.length >= 64"
        @click="addRule"
      >
        Ajouter une règle</button
      ><button :disabled="disabled" @click="issues = validateSystem(system)">
        Vérifier les règles
      </button>
    </div>
    <p class="platform-help">
      La priorité la plus élevée gagne pour un rôle. Les modèles assurent les
      responsabilités et la couverture de repli.
    </p>
    <label v-if="system.rules.length"
      >Règle<select v-model="selected">
        <option v-for="(r, i) in system.rules" :key="r.id" :value="i">
          {{ r.priority }} · {{ r.explanation.slice(0, 55) }}
        </option>
      </select></label
    >
    <fieldset v-if="rule" :disabled="props.disabled">
      <div class="platform-fields">
        <label
          >Priorité<input
            v-model.number="rule.priority"
            type="number"
            min="0"
            max="1000" /></label
        ><label
          >SI événement<select v-model="rule.trigger">
            <option
              v-for="trigger in RuleTriggerSchema.options"
              :key="trigger"
              :value="trigger"
            >
              {{ triggerNames[trigger] }}
            </option>
          </select></label
        ><label
          >Conditions<select v-model="rule.match">
            <option value="all">Toutes (ET)</option>
            <option value="any">Au moins une (OU)</option>
          </select></label
        >
      </div>
      <div
        v-for="(c, i) in rule.conditions"
        :key="i"
        class="platform-condition"
      >
        <select
          :value="c.kind"
          :aria-label="`Condition ${i + 1}`"
          @change="replaceCondition(i, $event)"
        >
          <option
            v-for="(name, kind) in conditionNames"
            :key="kind"
            :value="kind"
          >
            {{ name }}
          </option>
        </select>
        <template v-if="'operator' in c"
          ><select v-model="c.operator" aria-label="Comparaison">
            <option value="lt">Moins de</option>
            <option value="gt">Plus de</option></select
          ><label v-if="'metres' in c"
            >Mètres<input
              v-if="'metres' in c"
              v-model.number="c.metres"
              type="number"
              min="0"
              max="80"
              step="0.5" /></label
        ></template>
        <template v-if="c.kind === 'distance' || c.kind === 'pass_lane'"
          ><select v-model="c.from" aria-label="Rôle de départ">
            <option v-for="role in roles" :key="role" :value="role">
              {{ ROLE_NAMES[role] }}
            </option></select
          ><select v-model="c.to" aria-label="Rôle d’arrivée">
            <option v-for="role in roles" :key="role" :value="role">
              {{ ROLE_NAMES[role] }}
            </option>
          </select></template
        >
        <label v-if="c.kind === 'intercept_time'"
          >Secondes<input
            v-model.number="c.seconds"
            type="number"
            min="0"
            max="15"
            step=".1"
        /></label>
        <label v-if="c.kind === 'pressure_angle'"
          >Degrés<input
            v-model.number="c.degrees"
            type="number"
            min="0"
            max="180"
        /></label>
        <template v-if="c.kind === 'pass_lane'"
          ><label
            >Espace libre (m)<input
              v-model.number="c.clearanceMetres"
              type="number"
              min=".1"
              max="5"
              step=".1" /></label
          ><label
            >État de la ligne<select v-model="c.open">
              <option :value="true">Libre</option>
              <option :value="false">Fermée</option>
            </select></label
          ></template
        >
        <select
          v-if="c.kind === 'possession'"
          v-model="c.value"
          aria-label="Équipe en possession"
        >
          <option value="own">Notre équipe</option>
          <option value="opponent">Adversaire</option>
          <option value="none">Rondelle libre</option>
        </select>
        <select
          v-if="c.kind === 'phase'"
          v-model="c.value"
          aria-label="Phase requise"
        >
          <option
            v-for="phase in ContextPhaseSchema.options"
            :key="phase"
            :value="phase"
          >
            {{ PHASE_NAMES[phase] }}
          </option>
        </select>
        <select
          v-if="c.kind === 'puck_side'"
          v-model="c.side"
          aria-label="Côté"
        >
          <option value="strong">Côté fort</option>
          <option value="weak">Côté faible</option>
          <option value="center">Centre</option>
        </select>
        <select
          v-if="'zoneId' in c"
          v-model="c.zoneId"
          aria-label="Zone de condition"
        >
          <option v-for="zone in system.zones" :key="zone.id" :value="zone.id">
            {{ zone.name }}
          </option>
        </select>
        <select
          v-if="'role' in c"
          v-model="c.role"
          aria-label="Rôle de condition"
        >
          <option v-for="role in roles" :key="role" :value="role">
            {{ ROLE_NAMES[role] }}
          </option>
        </select>
        <button @click="rule.conditions.splice(i, 1)">
          Retirer la condition
        </button>
      </div>
      <button
        :disabled="rule.conditions.length >= 8"
        @click="rule.conditions.push(condition('possession'))"
      >
        Ajouter une condition
      </button>
      <div
        v-for="(action, i) in rule.actions"
        :key="i"
        class="platform-condition"
      >
        <label
          >ALORS<select v-model="action.kind">
            <option
              v-for="kind in TacticalActionSchema.shape.kind.options"
              :key="kind"
              :value="kind"
            >
              {{ actionNames[kind] }}
            </option>
          </select></label
        >
        <label
          >Rôle<select v-model="action.role">
            <option v-for="role in roles" :key="role" :value="role">
              {{ ROLE_NAMES[role] }}
            </option>
          </select></label
        >
        <label v-if="['PASS', 'REVERSE', 'COVER_LANE'].includes(action.kind)"
          >Destinataire<select v-model="action.targetRole">
            <option :value="null">Choisir</option>
            <option v-for="role in roles" :key="role" :value="role">
              {{ ROLE_NAMES[role] }}
            </option>
          </select></label
        >
        <label v-if="action.kind === 'MOVE_TO_TARGET'"
          >Point-cible<select v-model="action.targetId">
            <option
              v-for="target in system.targets ?? []"
              :key="target.id"
              :value="target.id"
            >
              {{ target.name }}
            </option>
          </select></label
        >
        <label v-if="['MOVE_TO_ZONE', 'RETREAT'].includes(action.kind)"
          >Zone<select v-model="action.zoneId">
            <option :value="null">Choisir une zone</option>
            <option
              v-for="zone in system.zones"
              :key="zone.id"
              :value="zone.id"
            >
              {{ zone.name }}
            </option>
          </select></label
        >
        <label v-if="action.kind === 'SET_PRESSURE_INTENSITY'"
          >Intensité<input
            v-model.number="action.intensity"
            type="number"
            min="0"
            max="1"
            step="0.1"
        /></label>
        <button
          :disabled="rule.actions.length <= 1"
          @click="rule.actions.splice(i, 1)"
        >
          Retirer l’action
        </button>
      </div>
      <button
        :disabled="rule.actions.length >= 8"
        @click="
          rule.actions.push({
            kind: 'WAIT_SUPPORT',
            role: roles[0]!,
            targetRole: null,
            zoneId: null,
            intensity: 0.7,
          })
        "
      >
        Ajouter une action
      </button>
      <label
        >Explication de la décision<textarea
          v-model="rule.explanation"
          maxlength="500"
        />
      </label>
      <button class="platform-danger" @click="removeRule">
        Supprimer la règle
      </button>
    </fieldset>
    <div v-if="issues" role="status" class="platform-validation">
      <strong>{{
        issues.valid ? 'Système valide' : 'Corrections requises'
      }}</strong>
      <ul>
        <li v-for="(issue, i) in issues.issues" :key="i">
          {{ issue.message }}
        </li>
      </ul>
    </div>
  </section>
</template>
