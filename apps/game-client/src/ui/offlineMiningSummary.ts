export interface OfflineMiningSummary {
  seconds: number;
  destroyedBlocks: number;
  relocationMoves: number;
  rewards: Record<string, number>;
  pendingFinalHit: boolean;
}

export function createOfflineMiningSummary(input: {
  seconds: number;
  destroyedBlocks: number;
  relocationMoves: number;
  rewards: Record<string, number>;
  pendingFinalHit: boolean;
}): OfflineMiningSummary | null {
  const seconds = normalizeCount(input.seconds);
  const destroyedBlocks = normalizeCount(input.destroyedBlocks);
  const relocationMoves = normalizeCount(input.relocationMoves);
  const rewards = normalizeRewards(input.rewards);
  const pendingFinalHit = Boolean(input.pendingFinalHit);

  if (destroyedBlocks <= 0 && relocationMoves <= 0 && !pendingFinalHit) {
    return null;
  }

  return {
    seconds,
    destroyedBlocks,
    relocationMoves,
    rewards,
    pendingFinalHit
  };
}

export function formatOfflineDuration(seconds: number): string {
  const totalSeconds = normalizeCount(seconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const restSeconds = totalSeconds % 60;

  if (hours > 0) {
    return minutes > 0 ? `${hours}ч ${minutes}м` : `${hours}ч`;
  }

  if (minutes > 0) {
    return restSeconds > 0 ? `${minutes}м ${restSeconds}с` : `${minutes}м`;
  }

  return `${restSeconds}с`;
}

function normalizeRewards(rewards: Record<string, number>): Record<string, number> {
  return Object.fromEntries(
    Object.entries(rewards)
      .map(([resourceId, amount]) => [resourceId, normalizeCount(amount)] as const)
      .filter(([, amount]) => amount > 0)
  );
}

function normalizeCount(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}
