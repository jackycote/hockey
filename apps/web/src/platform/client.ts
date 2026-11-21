import { ref } from 'vue';
import type {
  TacticalSystem,
  PlatformScenario,
  SequenceV12,
  LessonDraft,
} from '@hockey-iq/contracts';
export interface Team {
  id: string;
  name: string;
  age_division: string;
  season_id: string;
  role: 'TEAM_ADMIN' | 'COACH' | 'PLAYER';
}
export interface Resource<
  T = TacticalSystem | PlatformScenario | SequenceV12 | LessonDraft,
> {
  id: string;
  name: string;
  kind: 'system' | 'scenario' | 'sequence' | 'lesson';
  payload: T;
  revision: number;
  project_id: string;
  team_id: string;
}
export interface Project {
  id: string;
  name: string;
  scope: 'forecheck' | 'breakout';
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  revision: number;
  resources: Resource[];
  versions: {
    id: string;
    resource_id: string;
    version: number;
    kind: string;
    checksum: string;
  }[];
}
export interface Entitlements {
  plan: 'FREE' | 'TEAM_PRO';
  quota: number | null;
  used: number;
  remaining: number | null;
  canCreate: boolean;
  season: string;
  proposedSeasonPriceCAD: number;
  priceFinalized: false;
}
export interface Identity {
  id: string;
  displayName: string;
  platformAdmin: boolean;
}
export const identity = ref<Identity | null>(null);
let csrf = '';
export class ApiError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}
const friendly: Record<string, string> = {
  AUTH_REQUIRED: 'Connectez-vous pour ouvrir votre espace privé.',
  FORBIDDEN: 'Votre rôle ne permet pas cette action.',
  NOT_FOUND: 'Cette ressource est introuvable ou inaccessible.',
  PROJECT_QUOTA_EXCEEDED:
    'Le plan Free autorise un projet. Archivez le projet existant ou choisissez Pro.',
  PROJECT_ARCHIVED: 'Ce projet archivé est en lecture seule.',
  REVISION_CONFLICT:
    'Une autre modification a été enregistrée. Rechargez le projet avant de poursuivre.',
  DOWNGRADE_SELECTION_REQUIRED:
    'Choisissez le projet à conserver actif avant de passer à Free.',
  SYSTEM_CONFLICT: 'Corrigez les conflits du système avant de l’enregistrer.',
  INVALID_PAYLOAD: 'Vérifiez les champs et les références.',
  SYSTEM_SNAPSHOT_MISMATCH:
    'Cette simulation ne correspond pas à la version de système choisie.',
  CSRF_REQUIRED: 'Votre session a changé. Reconnectez-vous.',
};
export async function api<T>(
  path: string,
  options: { method?: string; body?: unknown; key?: string } = {},
): Promise<T> {
  const method = options.method ?? 'GET';
  const response = await fetch('/api/v1' + path, {
    method,
    credentials: 'same-origin',
    headers: {
      ...(options.body !== undefined
        ? { 'Content-Type': 'application/json' }
        : {}),
      ...(method !== 'GET'
        ? {
            'X-CSRF-Token': csrf,
            'Idempotency-Key': options.key ?? crypto.randomUUID(),
          }
        : {}),
    },
    ...(options.body === undefined
      ? {}
      : { body: JSON.stringify(options.body) }),
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as {
      error?: { code?: string; message?: string };
    };
    const code = payload.error?.code ?? 'NETWORK_ERROR';
    throw new ApiError(
      code,
      response.status,
      friendly[code] ?? payload.error?.message ?? 'La requête a échoué.',
    );
  }
  return response.json() as Promise<T>;
}
export async function session() {
  try {
    const result = await api<{ user: Identity; csrf: string }>('/me');
    identity.value = result.user;
    csrf = result.csrf;
    return result.user;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      identity.value = null;
      csrf = '';
      return null;
    }
    throw error;
  }
}
export async function demoLogin(userId: string) {
  await api('/auth/dev', { method: 'POST', body: { userId } });
  return session();
}
export async function logout() {
  await api('/auth/logout', { method: 'POST' });
  identity.value = null;
  csrf = '';
}

export const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

/** Lists are bounded on the server; load each page explicitly so limits never hide teams or assignments. */
export async function apiList<T>(path: string): Promise<T[]> {
  const rows: T[] = [];
  for (let offset = 0; offset <= 100000; offset += 100) {
    const page = await api<T[]>(
      path + (path.includes('?') ? '&' : '?') + 'limit=100&offset=' + offset,
    );
    rows.push(...page);
    if (page.length < 100) return rows;
  }
  throw new Error('Liste trop volumineuse; précisez votre recherche.');
}
