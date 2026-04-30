export const nearBreakHpThreshold = 0.22;

export function normalizeBlockHpPercent(hp: number, maxHp: number): number {
  if (!Number.isFinite(maxHp) || maxHp <= 0) {
    return 1;
  }

  if (!Number.isFinite(hp)) {
    return 0;
  }

  return Math.max(0, Math.min(1, hp / maxHp));
}

export function isNearBreakHpPercent(hpPercent: number): boolean {
  return normalizeRatio(hpPercent) <= nearBreakHpThreshold;
}

export function nearBreakIntensity(hpPercent: number): number {
  return 1 - Math.max(0, Math.min(1, normalizeRatio(hpPercent) / nearBreakHpThreshold));
}

function normalizeRatio(value: number): number {
  if (!Number.isFinite(value)) {
    return 1;
  }

  return Math.max(0, Math.min(1, value));
}
