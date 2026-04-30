export interface RewardChestEntry {
  resourceId: string;
  min: number;
  max: number;
  chance: number;
}

export interface RewardChestType {
  id: string;
  rewardTable: RewardChestEntry[];
}

export interface OpenRewardChestInput {
  chestType: RewardChestType;
  random?: () => number;
}

export interface OpenedRewardChest {
  chestTypeId: string;
  rewards: Record<string, number>;
}

export function openRewardChest(input: OpenRewardChestInput): OpenedRewardChest {
  return {
    chestTypeId: input.chestType.id,
    rewards: rollRewardTable(input.chestType.rewardTable, input.random ?? Math.random)
  };
}

function rollRewardTable(rewardTable: RewardChestEntry[], random: () => number): Record<string, number> {
  const rewards: Record<string, number> = {};

  for (const reward of rewardTable) {
    if (random() > reward.chance) {
      continue;
    }

    const spread = reward.max - reward.min;
    const amount = reward.min + (spread > 0 ? Math.floor(random() * (spread + 1)) : 0);
    rewards[reward.resourceId] = (rewards[reward.resourceId] ?? 0) + amount;
  }

  return rewards;
}
