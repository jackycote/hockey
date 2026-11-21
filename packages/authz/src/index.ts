import type { TeamRole } from '@hockey-iq/contracts';
export type Capability =
  'read' | 'edit' | 'publish' | 'assign' | 'members' | 'plan' | 'catalogue';
const permissions: Record<TeamRole, readonly Capability[]> = {
  PLATFORM_ADMIN: ['catalogue'],
  TEAM_ADMIN: ['read', 'edit', 'publish', 'assign', 'members', 'plan'],
  COACH: ['read', 'edit', 'publish', 'assign'],
  PLAYER: [],
};
export function permitted(role: TeamRole, capability: Capability) {
  return permissions[role].includes(capability);
}
export function canReadAssignment(userId: string, targetId: string | null) {
  return targetId === null || targetId === userId;
}
