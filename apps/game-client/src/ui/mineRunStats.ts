import type { ContentBundle } from "@goblin-cartel/content-schemas";
import type { MiningSession } from "@goblin-cartel/game-core";

export interface MineRunStats {
  mineTemplateId: string;
  destroyedBlocks: number;
  blockRewards: Record<string, number>;
  depthRewards: Record<string, number>;
}

export interface MineRunRewardSummary {
  amount: number;
  label: string;
  resourceId: string;
}

export interface MineRunCompletionStatsView {
  blockRewards: MineRunRewardSummary[];
  depthMeters: number;
  depthRewards: MineRunRewardSummary[];
  destroyedBlocks: number;
  totalBlocks: number;
  totalRewards: MineRunRewardSummary[];
}

export interface MineRunProgressStatsView extends MineRunCompletionStatsView {
  completionVeinName: string | null;
  currentDepthMeters: number;
  depthRewardLabel: string | null;
  progressPercent: number;
}

export function createMineRunStats(mineTemplateId: string, destroyedBlocks = 0): MineRunStats {
  return {
    mineTemplateId,
    destroyedBlocks: normalizeCount(destroyedBlocks),
    blockRewards: {},
    depthRewards: {}
  };
}

export function restoreMineRunStats(
  value: unknown,
  mineTemplateId: string,
  destroyedBlocks = 0
): MineRunStats {
  if (!isRecord(value) || value.mineTemplateId !== mineTemplateId) {
    return createMineRunStats(mineTemplateId, destroyedBlocks);
  }

  return {
    mineTemplateId,
    destroyedBlocks: Math.max(normalizeCount(value.destroyedBlocks), normalizeCount(destroyedBlocks)),
    blockRewards: normalizeResourceMap(value.blockRewards),
    depthRewards: normalizeResourceMap(value.depthRewards)
  };
}

export function addMineRunBlockRewards(
  stats: MineRunStats,
  mineTemplateId: string,
  rewards: Record<string, number>,
  destroyedBlockCount = 1
): MineRunStats {
  const base = ensureMineRunStats(stats, mineTemplateId);

  return {
    ...base,
    destroyedBlocks: base.destroyedBlocks + normalizeCount(destroyedBlockCount),
    blockRewards: mergeResourceMaps(base.blockRewards, rewards)
  };
}

export function addMineRunDepthRewards(
  stats: MineRunStats,
  mineTemplateId: string,
  rewards: Record<string, number>
): MineRunStats {
  const base = ensureMineRunStats(stats, mineTemplateId);

  return {
    ...base,
    depthRewards: mergeResourceMaps(base.depthRewards, rewards)
  };
}

export function createMineRunCompletionStatsView(
  stats: MineRunStats,
  session: MiningSession,
  content: ContentBundle,
  labels: Record<string, string>
): MineRunCompletionStatsView {
  const normalizedStats = restoreMineRunStats(stats, session.mine.templateId, session.destroyedBlocks);
  const blockRewards = toRewardSummaries(normalizedStats.blockRewards, content, labels);
  const depthRewards = toRewardSummaries(normalizedStats.depthRewards, content, labels);

  return {
    blockRewards,
    depthMeters: Math.max(1, Math.round(session.mine.depthMeters ?? session.mine.height)),
    depthRewards,
    destroyedBlocks: Math.max(normalizeCount(normalizedStats.destroyedBlocks), normalizeCount(session.destroyedBlocks)),
    totalBlocks: session.blocks.flat().length,
    totalRewards: toRewardSummaries(mergeResourceMaps(normalizedStats.blockRewards, normalizedStats.depthRewards), content, labels)
  };
}

export function createMineRunProgressStatsView(
  stats: MineRunStats,
  session: MiningSession,
  content: ContentBundle,
  labels: Record<string, string>,
  platformRow: number
): MineRunProgressStatsView {
  const completionStats = createMineRunCompletionStatsView(stats, session, content, labels);
  const currentDepthMeters = depthMetersForRow(session, platformRow);
  const completionVeinName = completionVeinLabel(session.mine.completionVeinTypeId, content, labels);
  const depthRewardLabel = depthRewardText(session.mine.templateId, content, labels);

  return {
    ...completionStats,
    completionVeinName,
    currentDepthMeters,
    depthRewardLabel,
    progressPercent: completionStats.totalBlocks > 0
      ? Math.max(0, Math.min(100, Math.round((completionStats.destroyedBlocks / completionStats.totalBlocks) * 100)))
      : 0
  };
}

function ensureMineRunStats(stats: MineRunStats, mineTemplateId: string): MineRunStats {
  return stats.mineTemplateId === mineTemplateId ? stats : createMineRunStats(mineTemplateId);
}

function toRewardSummaries(
  rewards: Record<string, number>,
  content: ContentBundle,
  labels: Record<string, string>
): MineRunRewardSummary[] {
  const resourceById = new Map(content.resources.map((resource) => [resource.id, resource]));

  return Object.entries(rewards)
    .filter(([, amount]) => amount > 0)
    .sort(([leftId], [rightId]) => {
      const leftOrder = resourceById.get(leftId)?.sortOrder ?? Number.MAX_SAFE_INTEGER;
      const rightOrder = resourceById.get(rightId)?.sortOrder ?? Number.MAX_SAFE_INTEGER;
      return leftOrder - rightOrder || leftId.localeCompare(rightId);
    })
    .map(([resourceId, amount]) => {
      const resource = resourceById.get(resourceId);

      return {
        amount,
        label: resource ? labels[resource.nameKey] ?? resource.id : resourceId,
        resourceId
      };
    });
}

function depthMetersForRow(session: MiningSession, row: number): number {
  const rowCount = Math.max(1, session.mine.height);
  const normalizedRow = Math.max(0, Math.min(rowCount - 1, Math.trunc(row)));
  return Math.max(1, Math.round(((normalizedRow + 1) * session.mine.depthMeters) / rowCount));
}

function completionVeinLabel(
  veinTypeId: string | undefined,
  content: ContentBundle,
  labels: Record<string, string>
): string | null {
  const veinType = veinTypeId ? content.veinTypes.find((item) => item.id === veinTypeId) : undefined;
  return veinType ? labels[veinType.nameKey] ?? veinType.id : null;
}

function depthRewardText(
  mineTemplateId: string,
  content: ContentBundle,
  labels: Record<string, string>
): string | null {
  const reward = content.mineTemplates.find((template) => template.id === mineTemplateId)?.depthProgressReward;

  if (!reward) {
    return null;
  }

  const resource = content.resources.find((item) => item.id === reward.resourceId);
  const resourceLabel = resource ? labels[resource.nameKey] ?? resource.id : reward.resourceId;
  const amountPerMeter = reward.amountPerMeter * reward.multiplier;
  const formattedAmount = formatNumber(amountPerMeter);
  const cap = reward.maxAmount ? `, максимум ${formatNumber(reward.maxAmount)}` : "";

  return `+${formattedAmount} ${resourceLabel}/м${cap}`;
}

function mergeResourceMaps(left: Record<string, number>, right: Record<string, number>): Record<string, number> {
  const result = { ...left };

  for (const [resourceId, amount] of Object.entries(right)) {
    if (!Number.isFinite(amount) || amount <= 0) {
      continue;
    }

    result[resourceId] = (result[resourceId] ?? 0) + amount;
  }

  return result;
}

function normalizeResourceMap(value: unknown): Record<string, number> {
  if (!isRecord(value)) {
    return {};
  }

  const result: Record<string, number> = {};

  for (const [resourceId, amount] of Object.entries(value)) {
    if (typeof amount === "number" && Number.isFinite(amount) && amount > 0) {
      result[resourceId] = amount;
    }
  }

  return result;
}

function normalizeCount(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.?0+$/u, "");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
