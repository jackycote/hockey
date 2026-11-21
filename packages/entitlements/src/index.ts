export type Plan = 'FREE' | 'TEAM_PRO';
export interface Entitlement {
  planCode: Plan;
  subscriptionStatus: 'FREE' | 'ACTIVE' | 'EXPIRED';
  effectiveFrom: string | null;
  effectiveTo: string | null;
  seasonId: string;
}
export function effectivePlan(value: Entitlement, now: Date): Plan {
  return value.planCode === 'TEAM_PRO' &&
    value.subscriptionStatus === 'ACTIVE' &&
    (!value.effectiveFrom || new Date(value.effectiveFrom) <= now) &&
    (!value.effectiveTo || new Date(value.effectiveTo) > now)
    ? 'TEAM_PRO'
    : 'FREE';
}
export function projectCapacity(plan: Plan, used: number) {
  return {
    plan,
    quota: plan === 'FREE' ? 1 : null,
    used,
    remaining: plan === 'FREE' ? Math.max(0, 1 - used) : null,
    canCreate: plan === 'TEAM_PRO' || used < 1,
  };
}
