<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount } from 'vue';
import { useRoute } from 'vue-router';
import Brand from '../Brand.vue';
import Icon from '../editor/Icon.vue';
import { playerLabel, TEMPLATE_ENGLISH_NAMES } from './labels';
import TeamRink from './TeamRink.vue';
import RuleEditor from './RuleEditor.vue';
import LessonPlayer from './LessonPlayer.vue';
import CatalogTest from './CatalogTest.vue';
import {
  api,
  apiList,
  identity,
  session,
  demoLogin,
  logout,
  clone,
  type Team,
  type Project,
  type Resource,
  type Entitlements,
} from './client';
import {
  TemplateSchema,
  ScenarioSchema,
  type TacticalTemplate,
  type TacticalSystem,
  type PlatformScenario,
  type SequenceV12,
  type FrozenFrame,
  type LessonDraft,
  type AnnotationV12Schema,
  type SystemZoneSchema,
} from '@hockey-iq/contracts';
import type { z } from 'zod';
import {
  templateSystem,
  TEMPLATE_NAMES,
  ROLE_NAMES,
  validateSystem,
} from '@hockey-iq/play-systems';
import { templateScenario } from '@hockey-iq/scenario-schema';
import { entityPosition, moveEntity } from '../editor/scenario';
import './platform.css';
const route = useRoute();
const lessonDraftResource = ref<Resource<LessonDraft> | null>(null);
const catalogTest = ref<SequenceV12 | null>(null);
const methods = ref({ demo: false, oidc: false }),
  busy = ref(false),
  loading = ref(true),
  error = ref(''),
  notice = ref('');
const teams = ref<Team[]>([]),
  teamId = ref(''),
  projects = ref<Project[]>([]),
  project = ref<Project | null>(null),
  entitlements = ref<Entitlements | null>(null);
const section = ref<'projects' | 'catalog' | 'lessons' | 'team'>('projects'),
  tab = ref<'scenario' | 'system' | 'test' | 'lessons'>('scenario');
const team = computed(() => teams.value.find((t) => t.id === teamId.value)),
  coach = computed(() => team.value && team.value.role !== 'PLAYER'),
  admin = computed(() => team.value?.role === 'TEAM_ADMIN');
const editable = computed(
  () =>
    !!coach.value &&
    !!project.value &&
    project.value.status !== 'ARCHIVED' &&
    !busy.value,
);
const members = ref<
    { user_id: string; display_name: string; role: string; active: boolean }[]
  >([]),
  completions = ref<
    {
      assignment_id: string;
      user_id: string;
      display_name: string;
      status: string;
    }[]
  >([]);
const catalog = ref<
    { id: string; name: string; template: TacticalTemplate; category: string }[]
  >([]),
  assignments = ref<
    {
      id: string;
      name: string;
      team_id: string;
      team_name: string;
      status: string;
    }[]
  >([]);
const lesson = ref<{
    name: string;
    description: string;
    sequences: SequenceV12[];
  } | null>(null),
  assignmentId = ref(''),
  lessonComplete = ref(false);
const projectName = ref(''),
  projectScope = ref<'forecheck' | 'breakout'>('breakout'),
  newTeamName = ref(''),
  newTeamAge = ref('M13'),
  inviteCode = ref(''),
  createdInvite = ref(''),
  inviteRole = ref('PLAYER'),
  keepProject = ref('');
const template = ref<TacticalTemplate>('LOW_CENTER_SUPPORT'),
  system = ref<TacticalSystem>(templateSystem('LOW_CENTER_SUPPORT')),
  systemResource = ref<Resource<TacticalSystem> | null>(null);
const scene = ref(templateScenario('LOW_CENTER_SUPPORT')),
  scenarioResource = ref<Resource<PlatformScenario> | null>(null),
  scenarioName = ref('Centre bas'),
  scenarioSystemId = ref(''),
  scenarioSystemVersion = ref(1),
  controlledTeam = ref('home'),
  selected = ref('home-1');
const zoneTool = ref<'select' | 'rectangle' | 'polygon' | 'target'>('select'),
  vertices = ref<{ x: number; y: number }[]>([]);
const systemResources = computed(
  () =>
    (project.value?.resources.filter(
      (r) => r.kind === 'system',
    ) as Resource<TacticalSystem>[]) ?? [],
);
const scenarioResources = computed(
  () =>
    (project.value?.resources.filter(
      (r) => r.kind === 'scenario',
    ) as Resource<PlatformScenario>[]) ?? [],
);
const sequenceResources = computed(
  () =>
    (project.value?.resources.filter(
      (r) => r.kind === 'sequence',
    ) as Resource<SequenceV12>[]) ?? [],
);
const lessonResources = computed(
  () =>
    (project.value?.resources.filter(
      (r) => r.kind === 'lesson',
    ) as Resource<LessonDraft>[]) ?? [],
);
const sceneVersions = computed(
  () =>
    project.value?.versions
      .filter((v) => v.resource_id === scenarioSystemId.value)
      .sort((a, b) => b.version - a.version) ?? [],
);
const phaseNames: Record<string, string> = {
  FORECHECK: 'Échec avant',
  DEFENSIVE_ZONE_RECOVERY: 'Récupération en zone défensive',
  BREAKOUT_SETUP: 'Mise en place de la sortie',
  BREAKOUT_EXECUTION: 'Sortie de zone',
  NEUTRAL_ZONE_TRANSITION: 'Transition en zone neutre',
  TURNOVER_DEFENSE: 'Repli après perte de possession',
};
const instructionPressure = ref(5),
  instructionReaction = ref(18);
let runSystem: TacticalSystem | null = null;
let initialRunSystem: TacticalSystem | null = null;
let queuedInstruction = false;
const frame = ref<FrozenFrame | null>(null),
  running = ref(false),
  initialized = ref(false),
  pending = ref<Record<string, { x: number; y: number }>>({}),
  recordName = ref('Nouvelle démonstration'),
  annotations = ref<z.infer<typeof AnnotationV12Schema>[]>([]),
  annotationText = ref(''),
  annotationKind = ref<'text' | 'pause' | 'arrow' | 'focus'>('text'),
  annotationAt = ref(0),
  arrowX = ref(20),
  arrowY = ref(13),
  lessonName = ref('Nouvelle leçon'),
  lessonDescription = ref(''),
  lessonSequences = ref<string[]>([]),
  targets = ref<string[]>([]),
  dueDate = ref('');
let worker: Worker | undefined,
  runRef: { id: string; version: number } | null = null,
  generation = 0;
const displayed = computed(() => {
  if (tab.value !== 'test' || !frame.value) return scene.value;
  const value = ScenarioSchema.parse({
    ...scene.value,
    players: frame.value.world.players,
    puck: frame.value.world.puck,
  });
  for (const [id, pos] of Object.entries(pending.value))
    moveEntity(value, id === 'puck' ? 'puck' : `player:${id}`, pos);
  return value;
});
const selectedPosition = computed(() =>
  entityPosition(
    displayed.value,
    selected.value === 'puck' ? 'puck' : `player:${selected.value}`,
  ),
);
const selectedPlayer = computed(() =>
  displayed.value.players.find((p) => p.id === selected.value),
);
const zoneDirection = computed(() =>
  scene.value.teams.find((t) => t.id === controlledTeam.value)
    ?.attackDirection === 'negative_x'
    ? -1
    : 1,
);
function stopSimulation() {
  worker?.terminate();
  worker = undefined;
  running.value = false;
  initialized.value = false;
  frame.value = null;
  pending.value = {};
  runRef = null;
}
async function action(work: () => Promise<void>) {
  busy.value = true;
  error.value = '';
  notice.value = '';
  try {
    await work();
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Une erreur est survenue.';
  } finally {
    busy.value = false;
  }
}
async function refreshIdentity() {
  await session();
  if (!identity.value) return;
  teams.value = await apiList<Team>('/me/teams');
  assignments.value =
    await apiList<(typeof assignments.value)[number]>('/me/lessons');
  catalog.value = await apiList<(typeof catalog.value)[number]>('/catalog');
  if (!teamId.value || !teams.value.some((t) => t.id === teamId.value))
    teamId.value = teams.value[0]?.id ?? '';
  if (teamId.value) await switchTeam(teamId.value);
  else section.value = 'catalog';
}
async function login(id: string) {
  await action(async () => {
    await demoLogin(id);
    await refreshIdentity();
  });
}
async function signout() {
  await action(async () => {
    stopSimulation();
    await logout();
    generation++;
    teamId.value = '';
    teams.value = [];
    projects.value = [];
    project.value = null;
    lesson.value = null;
    assignments.value = [];
    members.value = [];
    completions.value = [];
  });
}
async function switchTeam(id: string) {
  const current = ++generation;
  stopSimulation();
  catalogTest.value = null;
  teamId.value = id;
  project.value = null;
  projects.value = [];
  members.value = [];
  completions.value = [];
  lesson.value = null;
  createdInvite.value = '';
  systemResource.value = null;
  scenarioResource.value = null;
  const chosen = teams.value.find((t) => t.id === id);
  if (!chosen) return;
  const [rights, allLessons] = await Promise.all([
    api<Entitlements>(`/teams/${id}/entitlements`),
    apiList<(typeof assignments.value)[number]>('/me/lessons'),
  ]);
  if (current !== generation) return;
  entitlements.value = rights;
  assignments.value = allLessons;
  if (chosen.role === 'PLAYER') {
    section.value = 'lessons';
    return;
  }
  const [list, people, progress] = await Promise.all([
    apiList<Project>(`/teams/${id}/projects`),
    apiList<(typeof members.value)[number]>(`/teams/${id}/members`),
    apiList<(typeof completions.value)[number]>(`/teams/${id}/completions`),
  ]);
  if (current !== generation) return;
  projects.value = list;
  members.value = people;
  completions.value = progress;
  section.value = 'projects';
}
async function refreshTeam() {
  if (teamId.value) {
    projects.value = await apiList<Project>(`/teams/${teamId.value}/projects`);
    entitlements.value = await api(`/teams/${teamId.value}/entitlements`);
    assignments.value =
      await apiList<(typeof assignments.value)[number]>('/me/lessons');
  }
}
async function openProject(id: string, defaults = true) {
  stopSimulation();
  lesson.value = null;
  if (defaults) {
    lessonDraftResource.value = null;
    lessonSequences.value = [];
  }
  project.value = await api<Project>(`/teams/${teamId.value}/projects/${id}`);
  if (defaults) {
    const s = systemResources.value[0];
    if (s) loadSystem(s.id);
    const sc = scenarioResources.value[0];
    if (sc) loadScenario(sc.id);
    else newScenario();
    tab.value = 'scenario';
  }
}
function loadSystem(id: string) {
  const value = systemResources.value.find((r) => r.id === id);
  if (!value) return;
  systemResource.value = value;
  system.value = clone(value.payload);
  template.value = value.payload.template;
  vertices.value = [];
  zoneTool.value = 'select';
}
function newSystem() {
  systemResource.value = null;
  system.value = templateSystem(template.value);
  vertices.value = [];
  zoneTool.value = 'select';
}
function loadScenario(id: string) {
  stopSimulation();
  const value = scenarioResources.value.find((r) => r.id === id);
  if (!value) return;
  scenarioResource.value = value;
  scenarioName.value = value.name;
  scene.value = clone(value.payload.scenario);
  scenarioSystemId.value = value.payload.systemId;
  scenarioSystemVersion.value = value.payload.systemVersion;
  controlledTeam.value = value.payload.controlledTeamId;
  selected.value = scene.value.players[0]!.id;
}
function newScenario() {
  stopSimulation();
  scenarioResource.value = null;
  scenarioName.value = 'Nouveau scénario';
  scene.value = templateScenario(system.value.template);
  scenarioSystemId.value =
    systemResource.value?.id ?? systemResources.value[0]?.id ?? '';
  scenarioSystemVersion.value =
    systemResource.value?.revision ?? systemResources.value[0]?.revision ?? 1;
  controlledTeam.value = 'home';
  selected.value = 'home-1';
}
function move(id: string, pos: { x: number; y: number }) {
  if (!editable.value || running.value) return;
  if (tab.value === 'test' && frame.value) {
    pending.value = { ...pending.value, [id]: pos };
    return;
  }
  const value = clone(scene.value);
  moveEntity(value, id === 'puck' ? 'puck' : `player:${id}`, pos);
  scene.value = value;
}
function coordinate(axis: 'x' | 'y', event: Event) {
  const value = Number((event.target as HTMLInputElement).value);
  if (Number.isFinite(value))
    move(selected.value, { ...selectedPosition.value, [axis]: value });
}
function possession(event: Event) {
  const value = clone(scene.value);
  value.puck.holderId = (event.target as HTMLSelectElement).value || null;
  const p = value.players.find((p) => p.id === value.puck.holderId);
  if (p) value.puck.pos = { ...p.pos };
  scene.value = value;
}
function addZone(geometry: z.infer<typeof SystemZoneSchema>['geometry']) {
  if (!editable.value) return;
  system.value.zones.push({
    id: crypto.randomUUID(),
    name: `Zone ${system.value.zones.length + 1}`,
    geometry,
  });
  zoneTool.value = 'select';
  vertices.value = [];
}
function addTarget(point: { x: number; y: number }) {
  if (!editable.value) return;
  system.value.targets ??= [];
  system.value.targets.push({
    id: crypto.randomUUID(),
    name: `Cible ${system.value.targets.length + 1}`,
    point,
  });
  zoneTool.value = 'select';
}
function finishPolygon() {
  if (vertices.value.length >= 3)
    addZone({ kind: 'polygon', points: clone(vertices.value) });
}
function systemChanged() {
  scenarioSystemVersion.value =
    systemResources.value.find((r) => r.id === scenarioSystemId.value)
      ?.revision ?? 1;
}
async function saveSystem() {
  await action(async () => {
    if (!project.value) return;
    const validation = validateSystem(system.value);
    if (!validation.valid)
      throw new Error(validation.issues.map((i) => i.message).join(' '));
    const base = `/teams/${teamId.value}/projects/${project.value.id}/systems`;
    const row = await api<Resource<TacticalSystem>>(
      systemResource.value ? `${base}/${systemResource.value.id}` : base,
      {
        method: systemResource.value ? 'PATCH' : 'POST',
        body: systemResource.value
          ? { revision: systemResource.value.revision, payload: system.value }
          : system.value,
      },
    );
    await openProject(project.value.id, false);
    systemResource.value = row;
    scenarioSystemId.value = row.id;
    scenarioSystemVersion.value = row.revision;
    notice.value = `Système enregistré · révision ${row.revision}.`;
  });
}
async function saveScenario() {
  await action(async () => {
    if (!project.value || !scenarioSystemId.value)
      throw new Error('Enregistrez un système et choisissez sa version.');
    const payload: PlatformScenario = {
      schemaVersion: 2,
      name: scenarioName.value,
      systemId: scenarioSystemId.value,
      systemVersion: scenarioSystemVersion.value,
      controlledTeamId: controlledTeam.value,
      scenario: scene.value,
    };
    const base = `/teams/${teamId.value}/projects/${project.value.id}/scenarios`;
    const row = await api<Resource<PlatformScenario>>(
      scenarioResource.value ? `${base}/${scenarioResource.value.id}` : base,
      {
        method: scenarioResource.value ? 'PATCH' : 'POST',
        body: scenarioResource.value
          ? { revision: scenarioResource.value.revision, payload }
          : payload,
      },
    );
    await openProject(project.value.id, false);
    scenarioResource.value = row;
    notice.value = 'Scénario enregistré dans ce projet.';
  });
}
async function startSimulation() {
  await action(async () => {
    if (!scenarioSystemId.value)
      throw new Error('Choisissez un système enregistré.');
    stopSimulation();
    const version = await api<{ payload: TacticalSystem }>(
      `/teams/${teamId.value}/systems/${scenarioSystemId.value}/versions/${scenarioSystemVersion.value}`,
    );
    runRef = {
      id: scenarioSystemId.value,
      version: scenarioSystemVersion.value,
    };
    runSystem = clone(version.payload);
    initialRunSystem = clone(version.payload);
    instructionPressure.value = version.payload.pressureMetres;
    instructionReaction.value = version.payload.reactionTicks;
    worker = new Worker(new URL('./tactics.worker.ts', import.meta.url), {
      type: 'module',
    });
    worker.onmessage = (event) => {
      const message = event.data as {
        type: string;
        frame?: FrozenFrame;
        running?: boolean;
        message?: string;
        recording?: SequenceV12;
      };
      if (message.type === 'frame' && message.frame) {
        frame.value = message.frame;
        running.value = !!message.running;
        initialized.value = true;
        pending.value = {};
        queuedInstruction = false;
        annotationAt.value = Math.round((message.frame.tick / 30) * 10) / 10;
      } else if (message.type === 'running') running.value = true;
      else if (message.type === 'paused') running.value = false;
      else if (message.type === 'error') {
        running.value = false;
        error.value = 'La simulation a été arrêtée : ' + message.message;
      } else if (message.type === 'recording' && message.recording) {
        running.value = false;
        void saveRecording(message.recording);
      }
    };
    worker.onerror = () => {
      running.value = false;
      error.value = 'La simulation n’a pas pu démarrer.';
    };
    worker.postMessage({
      type: 'initialize',
      scenario: clone(scene.value),
      system: clone(version.payload),
      teamId: controlledTeam.value,
    });
    annotations.value = [];
    tab.value = 'test';
  });
}
function command(type: 'play' | 'pause' | 'step' | 'reset' | 'record') {
  if (!worker) return;
  if (type === 'reset' && initialRunSystem) {
    runSystem = clone(initialRunSystem);
    instructionPressure.value = runSystem.pressureMetres;
    instructionReaction.value = runSystem.reactionTicks;
    queuedInstruction = false;
  }
  if (['play', 'step', 'record'].includes(type)) {
    for (const [id, pos] of Object.entries(pending.value)) {
      worker.postMessage({
        type: 'input',
        input:
          id === 'puck'
            ? {
                schemaVersion: 1,
                kind: 'puck_repositioned',
                tick: (frame.value?.tick ?? 0) + 1,
                sequence: 0,
                pos: clone(pos),
                holderId: null,
              }
            : {
                schemaVersion: 1,
                kind: 'player_repositioned',
                tick: (frame.value?.tick ?? 0) + 1,
                sequence: 0,
                playerId: id,
                pos: clone(pos),
              },
      });
    }
    if (
      type === 'record' &&
      (Object.keys(pending.value).length || queuedInstruction)
    )
      worker.postMessage({ type: 'step' });
  }
  worker.postMessage({ type });
}
function applyInstruction() {
  if (!worker || !runSystem || running.value) return;
  runSystem = {
    ...clone(runSystem),
    pressureMetres: instructionPressure.value,
    reactionTicks: instructionReaction.value,
  };
  worker.postMessage({
    type: 'input',
    input: {
      schemaVersion: 2,
      kind: 'instruction_changed',
      tick: (frame.value?.tick ?? 0) + 1,
      sequence: 0,
      system: runSystem,
    },
  });
  queuedInstruction = true;
  notice.value = 'Consigne prête : avancer ou reprendre pour l’appliquer.';
}
async function saveRecording(value: SequenceV12) {
  await action(async () => {
    if (!runRef || !project.value)
      throw new Error('La version du système est introuvable.');
    const payload: SequenceV12 = {
      ...value,
      name: recordName.value,
      systemId: runRef.id,
      systemVersion: runRef.version,
      annotations: clone(annotations.value),
    };
    await api(`/teams/${teamId.value}/projects/${project.value.id}/sequences`, {
      method: 'POST',
      body: payload,
    });
    await openProject(project.value.id, false);
    tab.value = 'lessons';
    notice.value = 'Séquence figée enregistrée, prête à intégrer une leçon.';
  });
}
function addAnnotation() {
  if (!frame.value) return;
  annotations.value.push({
    id: crypto.randomUUID(),
    atTick: Math.max(
      0,
      Math.min(frame.value.tick, Math.round(annotationAt.value * 30)),
    ),
    kind: annotationKind.value,
    text: annotationText.value,
    playerId: selected.value === 'puck' ? null : selected.value,
    point:
      annotationKind.value === 'arrow'
        ? { x: arrowX.value, y: arrowY.value }
        : null,
  });
  annotationText.value = '';
}
async function createProject() {
  await action(async () => {
    const row = await api<Project>(`/teams/${teamId.value}/projects`, {
      method: 'POST',
      body: { name: projectName.value, scope: projectScope.value },
    });
    await refreshTeam();
    await openProject(row.id);
    projectName.value = '';
    tab.value = 'system';
    template.value =
      projectScope.value === 'forecheck'
        ? 'FORECHECK_212'
        : 'LOW_CENTER_SUPPORT';
    newSystem();
  });
}
async function projectState(id: string, state: 'archive' | 'activate') {
  await action(async () => {
    await api(`/teams/${teamId.value}/projects/${id}/${state}`, {
      method: 'POST',
      body: {},
    });
    await refreshTeam();
    if (project.value?.id === id) await openProject(id);
  });
}
async function retainProject() {
  await action(async () => {
    await api(`/teams/${teamId.value}/subscription/retain-project`, {
      method: 'POST',
      body: { keepProjectId: keepProject.value },
    });
    await refreshTeam();
    project.value = null;
    notice.value =
      'Projet actif conservé; les autres restent archivés sans perte de contenu.';
  });
}
async function plan(value: 'FREE' | 'TEAM_PRO') {
  await action(async () => {
    await api(`/teams/${teamId.value}/subscription/simulate`, {
      method: 'POST',
      body: {
        plan: value,
        keepProjectId: keepProject.value || null,
        seasonId: team.value?.season_id ?? '2026-2027',
      },
    });
    await refreshTeam();
    project.value = null;
    notice.value =
      'Plan de démonstration mis à jour; les contenus sont conservés.';
  });
}
function editLesson(row: Resource<LessonDraft>) {
  lessonDraftResource.value = row;
  lessonName.value = row.name;
  lessonDescription.value = row.payload.description;
  lessonSequences.value = [...row.payload.sequenceIds];
}
function newLesson() {
  lessonDraftResource.value = null;
  lessonName.value = 'Nouvelle leçon';
  lessonDescription.value = '';
  lessonSequences.value = [];
}
function moveLessonSequence(index: number, direction: number) {
  const next = index + direction;
  if (next < 0 || next >= lessonSequences.value.length) return;
  const copy = [...lessonSequences.value];
  [copy[index], copy[next]] = [copy[next]!, copy[index]!];
  lessonSequences.value = copy;
}
async function createLesson() {
  await action(async () => {
    if (!project.value) return;
    const base = `/teams/${teamId.value}/projects/${project.value.id}/lessons`;
    const payload = {
      name: lessonName.value,
      description: lessonDescription.value,
      sequenceIds: lessonSequences.value,
    };
    const current = lessonDraftResource.value;
    const row = await api<Resource<LessonDraft>>(
      current ? base + '/' + current.id : base,
      {
        method: current ? 'PATCH' : 'POST',
        body: current ? { revision: current.revision, payload } : payload,
      },
    );
    await openProject(project.value.id, false);
    lessonDraftResource.value = row;
    notice.value = 'Brouillon de leçon enregistré.';
  });
}
async function publish(row: Resource<LessonDraft>) {
  await action(async () => {
    await api(`/teams/${teamId.value}/lessons/${row.id}/publish`, {
      method: 'POST',
      body: { revision: row.revision },
    });
    await openProject(project.value!.id, false);
    notice.value = 'Version immuable publiée.';
  });
}
function assignmentBody() {
  return {
    targetUserIds: targets.value,
    dueAt: dueDate.value
      ? new Date(dueDate.value + 'T23:59:00').toISOString()
      : null,
  };
}
async function assignPrivate(row: Resource<LessonDraft>) {
  await action(async () => {
    const version = project.value?.versions
      .filter((v) => v.resource_id === row.id && v.kind === 'lesson')
      .at(-1);
    if (!version) throw new Error('Publiez la leçon avant de l’affecter.');
    await api(`/teams/${teamId.value}/lessons/${row.id}/assign`, {
      method: 'POST',
      body: { ...assignmentBody(), versionId: version.id },
    });
    assignments.value =
      await apiList<(typeof assignments.value)[number]>('/me/lessons');
    notice.value = 'Leçon affectée aux joueurs autorisés.';
  });
}
async function assignCatalog(id: string) {
  await action(async () => {
    await api(`/teams/${teamId.value}/catalog/${id}/assign`, {
      method: 'POST',
      body: assignmentBody(),
    });
    await refreshTeam();
    notice.value = 'Leçon du catalogue affectée; aucun projet ajouté.';
  });
}
async function copyCatalog(id: string) {
  await action(async () => {
    const source = catalog.value.find((c) => c.id === id)!;
    const row = await api<Project>(`/teams/${teamId.value}/projects`, {
      method: 'POST',
      body: {
        name: source.name + ' · mon équipe',
        scope: source.category,
        catalogId: id,
      },
    });
    await refreshTeam();
    await openProject(row.id);
    section.value = 'projects';
    notice.value = 'Modèle copié dans un nouveau projet privé.';
  });
}
async function testCatalog(id: string) {
  await action(async () => {
    catalogTest.value = null;
    const source = await api<{ payload: { sequences: SequenceV12[] } }>(
      `/catalog/${id}`,
    );
    catalogTest.value = source.payload.sequences[0]!;
  });
}
async function showCatalog(id: string) {
  await action(async () => {
    lesson.value = null;
    assignmentId.value = '';
    const row = await api<{
      payload: { name: string; description: string; sequences: SequenceV12[] };
    }>(`/catalog/${id}`);
    lesson.value = row.payload;
  });
}
async function showAssignment(id: string) {
  await action(async () => {
    lesson.value = null;
    assignmentId.value = '';
    const row = await api<{
      payload: { name: string; description: string; sequences: SequenceV12[] };
    }>(`/me/lessons/${id}`);
    lesson.value = row.payload;
    assignmentId.value = id;
    lessonComplete.value =
      assignments.value.find((a) => a.id === id)?.status === 'COMPLETED';
  });
}
async function progress(ticks: number) {
  if (!assignmentId.value) return;
  try {
    await api(`/me/lesson-progress/${assignmentId.value}`, {
      method: 'PATCH',
      body: {
        status: lessonComplete.value ? 'COMPLETED' : 'IN_PROGRESS',
        watchedTicks: ticks,
      },
    });
  } catch (e) {
    error.value =
      e instanceof Error ? e.message : 'Progression non enregistrée.';
  }
}
async function complete() {
  if (!assignmentId.value) return;
  await action(async () => {
    await api(`/me/lesson-progress/${assignmentId.value}`, {
      method: 'PATCH',
      body: { status: 'COMPLETED', watchedTicks: 0 },
    });
    lessonComplete.value = true;
    assignments.value =
      await apiList<(typeof assignments.value)[number]>('/me/lessons');
    notice.value = 'Leçon marquée comme terminée.';
  });
}
async function invite() {
  await action(async () => {
    const row = await api<{ token: string }>(
      `/teams/${teamId.value}/invitations`,
      { method: 'POST', body: { role: inviteRole.value } },
    );
    createdInvite.value = row.token;
  });
}
async function acceptInvite() {
  await action(async () => {
    await api('/invitations/accept', {
      method: 'POST',
      body: { token: inviteCode.value },
    });
    inviteCode.value = '';
    await refreshIdentity();
    notice.value = 'Invitation acceptée.';
  });
}
async function createTeam() {
  await action(async () => {
    const row = await api<{ id: string }>('/teams', {
      method: 'POST',
      body: {
        name: newTeamName.value,
        ageDivision: newTeamAge.value,
        seasonId: '2026-2027',
      },
    });
    await refreshIdentity();
    await switchTeam(row.id);
    newTeamName.value = '';
  });
}
async function membership(userId: string, role: string, active: boolean) {
  await action(async () => {
    await api(`/teams/${teamId.value}/members/${userId}`, {
      method: 'PATCH',
      body: { role, active },
    });
    members.value = await apiList<(typeof members.value)[number]>(
      `/teams/${teamId.value}/members`,
    );
  });
}
async function publishCatalog(id: string) {
  await action(async () => {
    const old = await api<{
      payload: { name: string; description: string; sequences: SequenceV12[] };
      category: string;
      template: string;
    }>(`/catalog/${id}`);
    await api('/catalog', {
      method: 'POST',
      body: {
        name: old.payload.name + ' · nouvelle édition',
        category: old.category,
        template: old.template,
        payload: old.payload,
        sourceId: id,
      },
    });
    catalog.value = await apiList<(typeof catalog.value)[number]>('/catalog');
    notice.value =
      'Nouvelle édition du catalogue publiée; l’ancienne est conservée.';
  });
}
onMounted(async () => {
  try {
    methods.value = await api('/auth/methods');
    await refreshIdentity();
    if (route.query.invitation)
      inviteCode.value = String(route.query.invitation);
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Connexion indisponible.';
  } finally {
    loading.value = false;
  }
});
onBeforeUnmount(() => {
  generation++;
  stopSimulation();
});
</script>
<template>
  <div class="platform-app">
    <header class="platform-header">
      <Brand />
      <nav aria-label="Navigation principale">
        <RouterLink to="/">Atelier libre</RouterLink
        ><RouterLink to="/equipes" aria-current="page"
          >Espace équipe</RouterLink
        >
      </nav>
      <div v-if="identity" class="platform-row">
        <span>{{ identity.displayName }}</span><button
          :disabled="busy"
          @click="signout"
        >
          Déconnexion
        </button>
      </div>
    </header>
    <main class="platform-main">
      <p v-if="loading" role="status">Ouverture de votre espace…</p>
      <p v-if="error" class="platform-error" role="alert">{{ error }}</p>
      <p v-if="notice" class="platform-notice" role="status">{{ notice }}</p>
      <section
        v-if="!loading && !identity"
        class="platform-card platform-login"
      >
        <p class="eyebrow">HOCKEY DOO · ESPACE PRIVÉ</p>
        <h1>Préparer ensemble. Comprendre le jeu.</h1>
        <p>
          Connectez-vous pour retrouver les projets et les leçons de votre
          équipe.
        </p>
        <a
          v-if="methods.oidc"
          class="platform-link-button"
          href="/api/v1/auth/start"
          >Se connecter</a
        ><template v-if="methods.demo"
          ><h2>Essayer avec des comptes fictifs</h2>
          <div class="platform-row">
            <button
              class="platform-primary"
              :disabled="busy"
              @click="login('demo-coach')"
            >
              Coach Démo</button
            ><button :disabled="busy" @click="login('demo-player-m11')">
              Joueur M11</button
            ><button :disabled="busy" @click="login('demo-player-m13')">
              Joueur M13</button
            ><button :disabled="busy" @click="login('demo-admin')">
              Administration catalogue
            </button>
          </div>
          <p class="platform-help">
            Données de démonstration uniquement.
          </p></template
        >
        <p v-if="!methods.oidc && !methods.demo">
          La connexion n’est pas disponible pour le moment.
        </p>
      </section>
      <template v-if="identity">
        <div class="platform-context">
          <label v-if="teams.length"
            >Équipe active<select
              :value="teamId"
              :disabled="busy"
              @change="
                action(() =>
                  switchTeam(($event.target as HTMLSelectElement).value),
                )
              "
            >
              <option v-for="t in teams" :key="t.id" :value="t.id">
                {{ t.name }} ·
                {{ t.role === 'PLAYER' ? 'Joueur' : 'Entraîneur' }}
              </option>
            </select></label
          >
          <div v-if="entitlements && coach">
            <strong>{{
              entitlements.plan === 'FREE' ? 'Free' : 'Équipe Pro'
            }}</strong><span>
              · {{ entitlements.used }} projet{{
                entitlements.used > 1 ? 's' : ''
              }}{{ entitlements.quota ? ' / ' + entitlements.quota : '' }}</span
            >
          </div>
        </div>
        <nav class="platform-sections" aria-label="Sections de l’espace">
          <button
            v-if="coach"
            :disabled="busy || loading"
            :aria-current="section === 'projects' ? 'page' : undefined"
            @click="
              section = 'projects';
              lesson = null;
            "
          >
            Mes projets</button
          ><button
            :disabled="busy || loading"
            :aria-current="section === 'catalog' ? 'page' : undefined"
            @click="
              section = 'catalog';
              lesson = null;
            "
          >
            Catalogue</button
          ><button
            :disabled="busy || loading"
            :aria-current="section === 'lessons' ? 'page' : undefined"
            @click="
              section = 'lessons';
              lesson = null;
            "
          >
            Mes leçons</button
          ><button
            :disabled="busy || loading"
            :aria-current="section === 'team' ? 'page' : undefined"
            @click="
              section = 'team';
              lesson = null;
            "
          >
            Mon équipe
          </button>
        </nav>
        <section
          v-if="section === 'projects' && coach"
          aria-label="Projets tactiques"
        >
          <div class="platform-row">
            <h1>Mes projets tactiques</h1>
            <p v-if="entitlements?.plan === 'FREE'" class="platform-help">
              Un projet complet, plusieurs scénarios et leçons. Le catalogue est
              illimité.
            </p>
          </div>
          <form
            class="platform-card platform-fields"
            @submit.prevent="createProject"
          >
            <label
              >Nom du nouveau projet<input
                v-model="projectName"
                required
                maxlength="120" /></label
            ><label
              >Périmètre tactique<select v-model="projectScope">
                <option value="breakout">Sorties de zone</option>
                <option value="forecheck">Échec avant 2-1-2</option>
              </select></label
            ><button
              class="platform-primary"
              :disabled="busy || !entitlements?.canCreate"
            >
              Créer un projet
            </button>
          </form>
          <div class="platform-project-list">
            <article v-for="p in projects" :key="p.id" class="platform-card">
              <div>
                <h2>{{ p.name }}</h2>
                <p>
                  {{
                    p.scope === 'breakout' ? 'Sorties de zone' : 'Échec avant'
                  }}
                  ·
                  {{
                    p.status === 'ARCHIVED'
                      ? 'Archivé · lecture seule'
                      : 'Projet actif'
                  }}
                </p>
              </div>
              <button :disabled="busy" @click="action(() => openProject(p.id))">
                Ouvrir le projet</button
              ><button
                :disabled="busy"
                @click="
                  projectState(
                    p.id,
                    p.status === 'ARCHIVED' ? 'activate' : 'archive',
                  )
                "
              >
                {{ p.status === 'ARCHIVED' ? 'Réactiver' : 'Archiver' }}
              </button>
            </article>
          </div>
          <section
            v-if="project"
            class="platform-card project-workbench"
            aria-label="Atelier du projet"
          >
            <h2>{{ project.name }}</h2>
            <p v-if="project.status === 'ARCHIVED'" class="platform-help">
              Projet archivé : les contenus restent consultables.
            </p>
            <nav class="platform-sections" aria-label="Atelier du projet">
              <button
                :aria-current="tab === 'scenario' ? 'page' : undefined"
                @click="tab = 'scenario'"
              >
                Scénarios</button
              ><button
                :aria-current="tab === 'system' ? 'page' : undefined"
                @click="tab = 'system'"
              >
                Systèmes</button
              ><button
                :aria-current="tab === 'test' ? 'page' : undefined"
                @click="tab = 'test'"
              >
                Tester</button
              ><button
                :aria-current="tab === 'lessons' ? 'page' : undefined"
                @click="tab = 'lessons'"
              >
                Leçons du projet
              </button>
            </nav>
            <template v-if="tab !== 'lessons'">
              <div class="platform-workbench-grid">
                <div>
                  <TeamRink
                    :scenario="displayed"
                    :selected="selected"
                    :editable="editable && !running"
                    :zones="tab === 'system' ? system.zones : []"
                    :targets="tab === 'system' ? (system.targets ?? []) : []"
                    :tool="tab === 'system' ? zoneTool : 'select'"
                    :attack-direction="zoneDirection"
                    @select="selected = $event"
                    @move="move"
                    @rectangle="addZone"
                    @target="addTarget"
                    @vertex="vertices.push($event)"
                  />
                  <div v-if="tab === 'test'" class="platform-transport">
                    <button :disabled="!editable" @click="startSimulation">
                      Initialiser le test</button
                    ><button
                      :disabled="!initialized || busy"
                      :aria-label="running ? 'Pause du test' : 'Lire le test'"
                      @click="command(running ? 'pause' : 'play')"
                    >
                      <Icon :name="running ? 'pause' : 'play'" /></button
                    ><button
                      :disabled="!initialized || running || busy"
                      aria-label="Avancer le test d’un pas"
                      @click="command('step')"
                    >
                      <Icon name="stepNext" /></button
                    ><button
                      :disabled="!initialized || busy"
                      aria-label="Recommencer le test"
                      @click="command('reset')"
                    >
                      <Icon name="reset" /></button
                    ><output
                      >{{ ((frame?.tick ?? 0) / 30).toFixed(1) }} s</output
                    ><span>{{ frame ? phaseNames[frame.phase] : '' }}</span>
                  </div>
                  <div
                    v-if="tab === 'test' && frame"
                    class="platform-decisions"
                  >
                    <h3>Responsabilités et décisions</h3>
                    <ul>
                      <li v-for="d in frame.decisions" :key="d.playerId">
                        <strong
                          >{{ playerLabel(displayed, d.playerId) }} ·
                          {{ ROLE_NAMES[d.role] }}</strong
                        ><span>{{ d.explanation }}</span>
                      </li>
                    </ul>
                  </div>
                </div>
                <aside>
                  <template v-if="tab === 'scenario'"
                    ><h3>Scénarios du projet</h3>
                    <label
                      >Scénario enregistré<select
                        :value="scenarioResource?.id ?? ''"
                        @change="
                          loadScenario(
                            ($event.target as HTMLSelectElement).value,
                          )
                        "
                      >
                        <option value="">Nouveau scénario</option>
                        <option
                          v-for="s in scenarioResources"
                          :key="s.id"
                          :value="s.id"
                        >
                          {{ s.name }}
                        </option>
                      </select></label
                    ><button :disabled="!editable" @click="newScenario">
                      Nouveau scénario</button
                    ><label
                      >Nom du scénario<input
                        v-model="scenarioName"
                        :disabled="!editable"
                        maxlength="120" /></label
                    ><label
                      >Système<select
                        v-model="scenarioSystemId"
                        :disabled="!editable"
                        @change="systemChanged"
                      >
                        <option value="">Choisir un système</option>
                        <option
                          v-for="s in systemResources"
                          :key="s.id"
                          :value="s.id"
                        >
                          {{ s.name }}
                        </option>
                      </select></label
                    ><label
                      >Version du système<select
                        v-model="scenarioSystemVersion"
                        :disabled="!editable"
                      >
                        <option
                          v-for="v in sceneVersions"
                          :key="v.id"
                          :value="v.version"
                        >
                          Révision {{ v.version }}
                        </option>
                      </select></label
                    ><label
                      >Équipe simulée<select
                        v-model="controlledTeam"
                        :disabled="!editable"
                      >
                        <option
                          v-for="t in scene.teams"
                          :key="t.id"
                          :value="t.id"
                        >
                          {{ t.label }}
                        </option>
                      </select></label
                    ><label
                      >Porteur de la rondelle<select
                        :value="scene.puck.holderId ?? ''"
                        :disabled="!editable"
                        @change="possession"
                      >
                        <option value="">Rondelle libre</option>
                        <option
                          v-for="p in scene.players"
                          :key="p.id"
                          :value="p.id"
                        >
                          {{ playerLabel(scene, p.id) }}
                        </option>
                      </select></label
                    ><label
                      >Graine de simulation<input
                        v-model.number="scene.seed"
                        :disabled="!editable"
                        type="number"
                        min="0"
                        max="4294967295" /></label
                    ><button
                      class="platform-primary"
                      :disabled="!editable || !scenarioSystemId"
                      @click="saveScenario"
                    >
                      Enregistrer le scénario</button
                    ><button
                      :disabled="!editable || !scenarioSystemId"
                      @click="startSimulation"
                    >
                      Tester ce scénario
                    </button></template
                  >
                  <template v-if="tab === 'system'"
                    ><h3>Mes systèmes</h3>
                    <label
                      >Système enregistré<select
                        :value="systemResource?.id ?? ''"
                        @change="
                          loadSystem(($event.target as HTMLSelectElement).value)
                        "
                      >
                        <option value="">Nouveau système</option>
                        <option
                          v-for="s in systemResources"
                          :key="s.id"
                          :value="s.id"
                        >
                          {{ s.name }} · révision {{ s.revision }}
                        </option>
                      </select></label
                    ><label
                      >Modèle<select v-model="template" :disabled="!editable">
                        <option
                          v-for="t in TemplateSchema.options.filter((t) =>
                            project?.scope === 'forecheck'
                              ? t === 'FORECHECK_212'
                              : t !== 'FORECHECK_212',
                          )"
                          :key="t"
                          :value="t"
                        >
                          {{ TEMPLATE_NAMES[t] }}
                        </option>
                      </select></label
                    ><button :disabled="!editable" @click="newSystem">
                      Créer depuis ce modèle</button
                    ><button
                      :disabled="!editable || !systemResource"
                      @click="
                        systemResource = null;
                        system.name += ' · copie';
                      "
                    >
                      Dupliquer dans ce projet</button
                    ><label
                      >Nom du système<input
                        v-model="system.name"
                        :disabled="!editable"
                        maxlength="120" /></label
                    ><label
                      >Description<textarea
                        v-model="system.description"
                        :disabled="!editable"
                        maxlength="4000"
                      /></label
                    ><label
                      >Maintien des rôles (pas)<input
                        v-model.number="system.roleHoldTicks"
                        :disabled="!editable"
                        type="number"
                        min="1"
                        max="300" /></label
                    ><label
                      >Temps de réaction (pas)<input
                        v-model.number="system.reactionTicks"
                        :disabled="!editable"
                        type="number"
                        min="3"
                        max="180" /></label
                    ><label
                      >Pression adverse (m)<input
                        v-model.number="system.pressureMetres"
                        :disabled="!editable"
                        type="number"
                        min="1"
                        max="15"
                        step="0.5" /></label
                    ><button
                      class="platform-primary"
                      :disabled="!editable"
                      @click="saveSystem"
                    >
                      Enregistrer le système
                    </button></template
                  >
                  <h3>
                    {{
                      selected === 'puck'
                        ? 'Rondelle'
                        : selectedPlayer?.label +
                          ' · ' +
                          selectedPlayer?.nominalPosition
                    }}
                  </h3>
                  <div class="platform-fields">
                    <label
                      >X (m)<input
                        type="number"
                        :disabled="!editable || running"
                        :value="Number(selectedPosition.x.toFixed(2))"
                        step="0.1"
                        @change="coordinate('x', $event)" /></label
                    ><label
                      >Y (m)<input
                        type="number"
                        :disabled="!editable || running"
                        :value="Number(selectedPosition.y.toFixed(2))"
                        step="0.1"
                        @change="coordinate('y', $event)"
                    /></label>
                  </div>
                  <p class="platform-help">
                    Glisser pour déplacer; flèches clavier par pas de 0,5 m.
                  </p>
                  <p
                    v-if="tab === 'test' && Object.keys(pending).length"
                    role="status"
                  >
                    Intervention prête; avancer ou reprendre pour l’appliquer.
                  </p>
                </aside>
              </div>
              <template v-if="tab === 'system'"
                ><div class="platform-row">
                  <h3>Zones</h3>
                  <button
                    :disabled="!editable || system.zones.length >= 32"
                    @click="zoneTool = 'rectangle'"
                  >
                    Tracer un rectangle</button
                  ><button
                    :disabled="!editable || system.zones.length >= 32"
                    @click="
                      zoneTool = 'polygon';
                      vertices = [];
                    "
                  >
                    Tracer un polygone</button
                  ><button
                    v-if="zoneTool === 'polygon'"
                    :disabled="vertices.length < 3"
                    @click="finishPolygon"
                  >
                    Terminer le polygone ({{ vertices.length }} points)</button
                  ><button
                    v-if="zoneTool !== 'select'"
                    @click="
                      zoneTool = 'select';
                      vertices = [];
                    "
                  >
                    Annuler le tracé
                  </button>
                </div>
                <ul class="platform-zones">
                  <li v-for="zone in system.zones" :key="zone.id">
                    <input
                      v-model="zone.name"
                      :disabled="!editable"
                      aria-label="Nom de la zone"
                    /><button
                      :disabled="!editable"
                      @click="
                        system.zones = system.zones.filter(
                          (z) => z.id !== zone.id,
                        )
                      "
                    >
                      Supprimer la zone
                    </button>
                  </li>
                </ul>
                <div class="platform-row">
                  <h3>Points-cibles</h3>
                  <button
                    :disabled="!editable || (system.targets?.length ?? 0) >= 64"
                    @click="zoneTool = 'target'"
                  >
                    Ajouter un point-cible sur la glace
                  </button>
                </div>
                <ul>
                  <li v-for="target in system.targets ?? []" :key="target.id">
                    <input
                      v-model="target.name"
                      :disabled="!editable"
                      aria-label="Nom du point-cible"
                    /><button
                      :disabled="!editable"
                      @click="
                        system.targets = system.targets?.filter(
                          (t) => t.id !== target.id,
                        )
                      "
                    >
                      Retirer la cible
                    </button>
                  </li>
                </ul>
                <RuleEditor v-model="system" :disabled="!editable"
              /></template>
              <section
                v-if="tab === 'test' && frame"
                aria-label="Enregistrer la démonstration"
              >
                <h3>Adapter une consigne en pause</h3>
                <div class="platform-fields">
                  <label
                    >Seuil de pression (m)<input
                      v-model.number="instructionPressure"
                      type="number"
                      min="1"
                      max="15"
                      step=".5"
                      :disabled="running" /></label
                  ><label
                    >Réaction (pas)<input
                      v-model.number="instructionReaction"
                      type="number"
                      min="3"
                      max="180"
                      :disabled="running" /></label
                  ><button
                    :disabled="running || !initialized || busy"
                    @click="applyInstruction"
                  >
                    Appliquer la consigne
                  </button>
                </div>
                <h3>Annotations pédagogiques</h3>
                <div class="platform-fields">
                  <label
                    >À (secondes)<input
                      v-model.number="annotationAt"
                      type="number"
                      min="0"
                      :max="frame.tick / 30"
                      step="0.1" /></label
                  ><label
                    >Type d’annotation<select v-model="annotationKind">
                      <option value="text">Texte</option>
                      <option value="pause">Pause pédagogique</option>
                      <option value="arrow">Flèche</option>
                      <option value="focus">Focus joueur</option>
                    </select></label
                  ><label
                    >Consigne<textarea
                      v-model="annotationText"
                      maxlength="1000"
                    /></label
                  ><label v-if="annotationKind === 'arrow'"
                    >Cible X<input
                      v-model.number="arrowX"
                      type="number"
                      min="0"
                      :max="scene.rink.length" /></label
                  ><label v-if="annotationKind === 'arrow'"
                    >Cible Y<input
                      v-model.number="arrowY"
                      type="number"
                      min="0"
                      :max="scene.rink.width" /></label
                  ><button
                    :disabled="running || !annotationText.trim()"
                    @click="addAnnotation"
                  >
                    Ajouter l’annotation
                  </button>
                </div>
                <ul>
                  <li v-for="a in annotations" :key="a.id">
                    {{ (a.atTick / 30).toFixed(1) }} s · {{ a.text }}
                    <button
                      @click="
                        annotations = annotations.filter((x) => x.id !== a.id)
                      "
                    >
                      Retirer
                    </button>
                  </li>
                </ul>
                <div class="platform-fields">
                  <label
                    >Nom de la séquence<input
                      v-model="recordName"
                      maxlength="120" /></label
                  ><button
                    class="platform-primary"
                    :disabled="!editable || running || frame.tick === 0"
                    @click="command('record')"
                  >
                    Enregistrer la séquence
                  </button>
                </div>
              </section>
            </template>
            <section v-if="tab === 'lessons'" aria-label="Préparer une leçon">
              <h3>Séquences enregistrées</h3>
              <ul>
                <li v-for="s in sequenceResources" :key="s.id">
                  {{ s.name }} ·
                  {{ ((s.payload.frames.length - 1) / 30).toFixed(1) }} s
                </li>
              </ul>
              <button :disabled="!editable" @click="newLesson">
                Nouvelle leçon
              </button>
              <form @submit.prevent="createLesson">
                <div class="platform-fields">
                  <label
                    >Nom de la leçon<input
                      v-model="lessonName"
                      required
                      maxlength="120"
                      :disabled="!editable" /></label
                  ><label
                    >Description de la leçon<textarea
                      v-model="lessonDescription"
                      maxlength="4000"
                      :disabled="!editable"
                    />
                  </label>
                </div>
                <fieldset :disabled="!editable">
                  <legend>Séquences de la leçon</legend>
                  <label
                    v-for="s in sequenceResources"
                    :key="s.id"
                    class="platform-check"
                    ><input
                      v-model="lessonSequences"
                      type="checkbox"
                      :value="s.id"
                    />{{ s.name }}</label
                  >
                </fieldset>
                <ol>
                  <li v-for="(id, index) in lessonSequences" :key="id">
                    {{ sequenceResources.find((s) => s.id === id)?.name }}
                    <button
                      type="button"
                      :disabled="!editable || index === 0"
                      aria-label="Monter la séquence"
                      @click="moveLessonSequence(index, -1)"
                    >
                      ↑</button
                    ><button
                      type="button"
                      :disabled="
                        !editable || index === lessonSequences.length - 1
                      "
                      aria-label="Descendre la séquence"
                      @click="moveLessonSequence(index, 1)"
                    >
                      ↓
                    </button>
                  </li>
                </ol>
                <button :disabled="!editable || !lessonSequences.length">
                  Enregistrer la leçon
                </button>
              </form>
              <div class="platform-fields">
                <label
                  >Échéance facultative<input v-model="dueDate" type="date"
                /></label>
                <fieldset>
                  <legend>Affecter à</legend>
                  <p class="platform-help">
                    Aucune sélection : tous les joueurs de l’équipe.
                  </p>
                  <label
                    v-for="m in members.filter(
                      (m) => m.active && m.role === 'PLAYER',
                    )"
                    :key="m.user_id"
                    class="platform-check"
                    ><input
                      v-model="targets"
                      type="checkbox"
                      :value="m.user_id"
                    />{{ m.display_name }}</label
                  >
                </fieldset>
              </div>
              <article
                v-for="l in lessonResources"
                :key="l.id"
                class="platform-resource-row"
              >
                <strong>{{ l.name }}</strong><button
                  :disabled="!editable"
                  @click="editLesson(l)"
                >
                  Modifier le brouillon de leçon</button
                ><span>{{
                  project.versions.some(
                    (v) => v.resource_id === l.id && v.version === l.revision,
                  )
                    ? 'Publiée'
                    : 'Brouillon'
                }}</span
                ><button
                  :disabled="
                    !editable ||
                    project.versions.some(
                      (v) => v.resource_id === l.id && v.version === l.revision,
                    )
                  "
                  @click="publish(l)"
                >
                  Publier la leçon</button
                ><button
                  :disabled="
                    busy ||
                    !project.versions.some((v) => v.resource_id === l.id)
                  "
                  @click="assignPrivate(l)"
                >
                  Affecter la leçon
                </button>
              </article>
            </section>
          </section>
        </section>
        <section v-if="section === 'catalog'" aria-label="Catalogue global">
          <h1>Catalogue de démonstrations</h1>
          <p>
            Des modèles génériques pour toutes les équipes. Consultation,
            simulation et affectation ne consomment aucun projet.
          </p>
          <div class="platform-project-list">
            <article v-for="c in catalog" :key="c.id" class="platform-card">
              <h2>{{ c.name }}</h2>
              <p class="demonstration-english-name" lang="en">
                {{ TEMPLATE_ENGLISH_NAMES[c.template] }}
              </p>
              <div class="platform-row">
                <button :disabled="busy" @click="showCatalog(c.id)">
                  Voir la démonstration</button
                ><button
                  v-if="coach"
                  :disabled="busy"
                  @click="assignCatalog(c.id)"
                >
                  Affecter à l’équipe</button
                ><button
                  v-if="coach"
                  :disabled="busy || !entitlements?.canCreate"
                  @click="copyCatalog(c.id)"
                >
                  Créer un projet depuis ce modèle</button
                ><button :disabled="busy" @click="testCatalog(c.id)">
                  Essayer le modèle</button
                ><button
                  v-if="identity.platformAdmin"
                  :disabled="busy"
                  @click="publishCatalog(c.id)"
                >
                  Publier une nouvelle édition
                </button>
              </div>
            </article>
          </div>
          <CatalogTest
            v-if="catalogTest"
            :key="catalogTest.systemId"
            :source="catalogTest"
          />
        </section>
        <section v-if="section === 'lessons'" aria-label="Leçons affectées">
          <h1>Mes leçons</h1>
          <article
            v-for="a in assignments.filter(
              (a) => !teamId || a.team_id === teamId,
            )"
            :key="a.id"
            class="platform-card platform-resource-row"
          >
            <div>
              <h2>{{ a.name }}</h2>
              <p>
                {{ a.team_name }} ·
                {{
                  a.status === 'COMPLETED'
                    ? 'Terminée'
                    : a.status === 'IN_PROGRESS'
                      ? 'En cours'
                      : 'À regarder'
                }}
              </p>
            </div>
            <button :disabled="busy" @click="showAssignment(a.id)">
              Ouvrir la leçon
            </button>
          </article>
          <p v-if="!assignments.some((a) => a.team_id === teamId)">
            Aucune leçon affectée pour le moment.
          </p>
        </section>
        <section v-if="section === 'team'" aria-label="Gestion de l’équipe">
          <h1>Mon équipe</h1>
          <form
            class="platform-card platform-fields"
            @submit.prevent="acceptInvite"
          >
            <label
              >Code d’invitation<input
                v-model="inviteCode"
                required
                autocomplete="off" /></label
            ><button :disabled="busy">Rejoindre l’équipe</button>
          </form>
          <template v-if="coach"
            ><article class="platform-card">
              <h2>Membres</h2>
              <div
                v-for="m in members"
                :key="m.user_id"
                class="platform-resource-row"
              >
                <span
                  >{{ m.display_name }} ·
                  {{ m.active ? 'Actif' : 'Suspendu' }}</span
                ><select
                  :value="m.role"
                  :aria-label="`Rôle de ${m.display_name}`"
                  :disabled="!admin || busy"
                  @change="
                    membership(
                      m.user_id,
                      ($event.target as HTMLSelectElement).value,
                      m.active,
                    )
                  "
                >
                  <option value="TEAM_ADMIN">Administrateur d’équipe</option>
                  <option value="COACH">Entraîneur</option>
                  <option value="PLAYER">Joueur</option></select
                ><button
                  v-if="admin"
                  :disabled="busy"
                  @click="membership(m.user_id, m.role, !m.active)"
                >
                  {{ m.active ? 'Suspendre' : 'Réactiver' }}
                </button>
              </div>
              <form
                v-if="admin"
                class="platform-fields"
                @submit.prevent="invite"
              >
                <label
                  >Rôle de l’invitation<select v-model="inviteRole">
                    <option value="PLAYER">Joueur</option>
                    <option value="COACH">Entraîneur</option>
                    <option value="TEAM_ADMIN">Administrateur d’équipe</option>
                  </select></label
                ><button :disabled="busy">Créer une invitation</button>
              </form>
              <p v-if="createdInvite" class="platform-invitation">
                Code à transmettre au membre :
                <code>{{ createdInvite }}</code> · valide 48 h, usage unique.
              </p>
            </article>
            <article class="platform-card">
              <h2>Progression de l’équipe</h2>
              <p v-for="c in completions" :key="c.assignment_id + c.user_id">
                {{ c.display_name }} ·
                {{ c.status === 'COMPLETED' ? 'Terminée' : 'En cours' }}
              </p>
              <p v-if="!completions.length">Aucune progression enregistrée.</p>
            </article></template
          >
          <article v-if="admin && entitlements" class="platform-card">
            <h2>Plan de l’équipe</h2>
            <p>Free : un projet non archivé. Pro : projets illimités.</p>
            <p>
              Prix proposé :
              {{ entitlements.proposedSeasonPriceCAD }} CAD/saison, non
              finalisé. Aucun paiement réel dans cette démonstration.
            </p>
            <label
              >Projet à conserver actif<select v-model="keepProject">
                <option value="">Choisir avant rétrogradation</option>
                <option
                  v-for="p in projects.filter((p) => p.status !== 'ARCHIVED')"
                  :key="p.id"
                  :value="p.id"
                >
                  {{ p.name }}
                </option>
              </select></label
            >
            <button
              v-if="entitlements.plan === 'FREE' && entitlements.used > 1"
              :disabled="busy || !keepProject"
              @click="retainProject"
            >
              Conserver ce projet avec Free
            </button>
            <div v-if="methods.demo" class="platform-row">
              <button :disabled="busy" @click="plan('TEAM_PRO')">
                Activer Pro (démo)</button
              ><button
                :disabled="
                  busy ||
                  (projects.filter((p) => p.status !== 'ARCHIVED').length > 1 &&
                    !keepProject)
                "
                @click="plan('FREE')"
              >
                Passer à Free (démo)
              </button>
            </div>
          </article>
          <form
            class="platform-card platform-fields"
            @submit.prevent="createTeam"
          >
            <h2>Créer une équipe</h2>
            <label
              >Nom de l’équipe<input
                v-model="newTeamName"
                required
                maxlength="120" /></label
            ><label
              >Catégorie<select v-model="newTeamAge">
                <option>M11</option>
                <option>M13</option>
                <option>M15</option>
                <option>M18</option>
              </select></label
            ><button :disabled="busy">Créer l’équipe</button>
          </form>
        </section>
        <LessonPlayer
          v-if="lesson"
          :lesson="lesson"
          :completed="lessonComplete"
          :allow-completion="!!assignmentId"
          @progress="progress"
          @complete="complete"
        />
      </template>
    </main>
    <footer class="platform-footer">
      Hockey Doo · Comprendre le jeu, ensemble.
      <span>Espaces privés · Aucun profil joueur public</span>
    </footer>
  </div>
</template>
