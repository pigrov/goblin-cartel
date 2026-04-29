import { calculateBlockHp } from "./mining";
import type { GeneratedMine } from "./mine-generator";

export interface MiningRewardEntry {
  resourceId: string;
  min: number;
  max: number;
  chance: number;
}

export interface MiningBlockType {
  id: string;
  baseHp: number;
  tags?: string[];
  rewardTable: MiningRewardEntry[];
  specialBehavior?: "none" | "explosion" | "chest";
}

export interface MiningBlockState {
  row: number;
  col: number;
  blockTypeId: string;
  maxHp: number;
  hp: number;
  destroyed: boolean;
  tags: string[];
  specialBehavior: "none" | "explosion" | "chest";
}

export interface MiningSession {
  mine: GeneratedMine;
  blocks: MiningBlockState[][];
  resources: Record<string, number>;
  lastRewards: Record<string, number>;
  destroyedBlocks: number;
}

export interface MiningBlockSave {
  row: number;
  col: number;
  hp: number;
  destroyed: boolean;
}

export interface MiningSessionSave {
  mineTemplateId: string;
  seed: string;
  resources: Record<string, number>;
  blocks: MiningBlockSave[];
}

export interface CreateMiningSessionInput {
  mine: GeneratedMine;
  blockTypes: MiningBlockType[];
  mineDifficultyMultiplier?: number;
}

export interface HitMineBlockInput {
  row: number;
  col: number;
  damage: number;
  random?: () => number;
}

export function createMiningSession(input: CreateMiningSessionInput): MiningSession {
  const blockTypeById = new Map(input.blockTypes.map((blockType) => [blockType.id, blockType]));
  const mineDifficultyMultiplier = input.mineDifficultyMultiplier ?? 1;

  return {
    mine: input.mine,
    blocks: input.mine.blocks.map((row) =>
      row.map((block) => {
        const blockType = blockTypeById.get(block.blockTypeId);

        if (!blockType) {
          throw new Error(`Missing block type ${block.blockTypeId}`);
        }

        const maxHp = calculateBlockHp({
          baseHp: blockType.baseHp,
          rowIndex: block.row,
          mineDifficultyMultiplier
        });

        return {
          row: block.row,
          col: block.col,
          blockTypeId: block.blockTypeId,
          maxHp,
          hp: maxHp,
          destroyed: false,
          tags: blockType.tags ?? [],
          specialBehavior: blockType.specialBehavior ?? "none"
        };
      })
    ),
    resources: {},
    lastRewards: {},
    destroyedBlocks: 0
  };
}

export function hitMineBlock(
  session: MiningSession,
  blockTypes: MiningBlockType[],
  input: HitMineBlockInput
): MiningSession {
  if (input.damage <= 0 || !Number.isFinite(input.damage)) {
    throw new Error("damage must be positive");
  }

  const target = session.blocks[input.row]?.[input.col];

  if (!target || target.destroyed) {
    return {
      ...session,
      lastRewards: {}
    };
  }

  const nextHp = Math.max(0, target.hp - input.damage);
  const destroyed = nextHp === 0;
  const blockType = blockTypes.find((item) => item.id === target.blockTypeId);
  const rewards = destroyed && blockType ? rollRewards(blockType.rewardTable, input.random ?? Math.random) : {};
  const nextResources = { ...session.resources };

  for (const [resourceId, amount] of Object.entries(rewards)) {
    nextResources[resourceId] = (nextResources[resourceId] ?? 0) + amount;
  }

  return {
    ...session,
    blocks: session.blocks.map((row, rowIndex) =>
      row.map((block, colIndex) =>
        rowIndex === input.row && colIndex === input.col
          ? {
              ...block,
              hp: nextHp,
              destroyed
            }
          : block
      )
    ),
    resources: nextResources,
    lastRewards: rewards,
    destroyedBlocks: session.destroyedBlocks + (destroyed ? 1 : 0)
  };
}

export function exportMiningSessionSave(session: MiningSession): MiningSessionSave {
  return {
    mineTemplateId: session.mine.templateId,
    seed: session.mine.seed,
    resources: { ...session.resources },
    blocks: session.blocks
      .flat()
      .filter((block) => block.destroyed || block.hp < block.maxHp)
      .map((block) => ({
        row: block.row,
        col: block.col,
        hp: block.hp,
        destroyed: block.destroyed
      }))
  };
}

export function restoreMiningSession(session: MiningSession, save: MiningSessionSave): MiningSession {
  if (save.mineTemplateId !== session.mine.templateId || save.seed !== session.mine.seed) {
    throw new Error("Mining save does not match current mine");
  }

  const savedBlocks = new Map(save.blocks.map((block) => [`${block.row}:${block.col}`, block]));
  let destroyedBlocks = 0;
  const blocks = session.blocks.map((row) =>
    row.map((block) => {
      const savedBlock = savedBlocks.get(`${block.row}:${block.col}`);

      if (!savedBlock) {
        return block;
      }

      const hp = Math.max(0, Math.min(block.maxHp, savedBlock.hp));
      const destroyed = savedBlock.destroyed || hp === 0;

      if (destroyed) {
        destroyedBlocks += 1;
      }

      return {
        ...block,
        hp: destroyed ? 0 : hp,
        destroyed
      };
    })
  );

  return {
    ...session,
    blocks,
    resources: { ...save.resources },
    lastRewards: {},
    destroyedBlocks
  };
}

function rollRewards(rewardTable: MiningRewardEntry[], random: () => number): Record<string, number> {
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
