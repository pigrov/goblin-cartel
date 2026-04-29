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

export interface MiningCell {
  row: number;
  col: number;
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

export interface ApplyAutoMiningInput {
  startCell: MiningCell;
  damage: number;
  holdLastDestroy?: boolean;
  random?: () => number;
}

export interface ApplyColumnAutoMiningInput {
  column: number;
  damage: number;
  holdLastDestroy?: boolean;
  random?: () => number;
}

export interface AutoMiningReport {
  damageApplied: number;
  destroyedBlocks: number;
  rewards: Record<string, number>;
  pendingFinalHit: MiningCell | null;
}

export interface ApplyAutoMiningResult {
  session: MiningSession;
  nextTargetCell: MiningCell;
  report: AutoMiningReport;
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

export function applyAutoMining(
  session: MiningSession,
  blockTypes: MiningBlockType[],
  input: ApplyAutoMiningInput
): ApplyAutoMiningResult {
  if (!Number.isFinite(input.damage) || input.damage <= 0) {
    return {
      session,
      nextTargetCell: findPlayableCell(session, input.startCell),
      report: {
        damageApplied: 0,
        destroyedBlocks: 0,
        rewards: {},
        pendingFinalHit: null
      }
    };
  }

  if (input.holdLastDestroy) {
    const simulation = applyAutoMiningInternal(session, blockTypes, {
      damage: input.damage,
      random: () => 0,
      startCell: input.startCell
    });

    const lastDestroyed = simulation.lastDestroyed;

    if (lastDestroyed) {
      const heldDamage = lastDestroyed.damageConsumedBefore + Math.max(0, lastDestroyed.hpBefore - 1);
      const heldResult = applyAutoMiningInternal(session, blockTypes, {
        damage: heldDamage,
        random: input.random ?? Math.random,
        startCell: input.startCell
      });

      return {
        session: heldResult.session,
        nextTargetCell: lastDestroyed.cell,
        report: {
          ...heldResult.report,
          pendingFinalHit: lastDestroyed.cell
        }
      };
    }
  }

  const result = applyAutoMiningInternal(session, blockTypes, {
    damage: input.damage,
    random: input.random ?? Math.random,
    startCell: input.startCell
  });

  return {
    session: result.session,
    nextTargetCell: result.nextTargetCell,
    report: result.report
  };
}

export function applyColumnAutoMining(
  session: MiningSession,
  blockTypes: MiningBlockType[],
  input: ApplyColumnAutoMiningInput
): ApplyAutoMiningResult {
  if (!Number.isFinite(input.damage) || input.damage <= 0) {
    return {
      session,
      nextTargetCell: findColumnPlayableCell(session, input.column) ?? { row: 0, col: normalizeColumn(session, input.column) ?? 0 },
      report: {
        damageApplied: 0,
        destroyedBlocks: 0,
        rewards: {},
        pendingFinalHit: null
      }
    };
  }

  if (input.holdLastDestroy) {
    const simulation = applyColumnAutoMiningInternal(session, blockTypes, {
      column: input.column,
      damage: input.damage,
      random: () => 0
    });

    const lastDestroyed = simulation.lastDestroyed;

    if (lastDestroyed) {
      const heldDamage = lastDestroyed.damageConsumedBefore + Math.max(0, lastDestroyed.hpBefore - 1);
      const heldResult = applyColumnAutoMiningInternal(session, blockTypes, {
        column: input.column,
        damage: heldDamage,
        random: input.random ?? Math.random
      });

      return {
        session: heldResult.session,
        nextTargetCell: lastDestroyed.cell,
        report: {
          ...heldResult.report,
          pendingFinalHit: lastDestroyed.cell
        }
      };
    }
  }

  const result = applyColumnAutoMiningInternal(session, blockTypes, {
    column: input.column,
    damage: input.damage,
    random: input.random ?? Math.random
  });

  return {
    session: result.session,
    nextTargetCell: result.nextTargetCell,
    report: result.report
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

interface ApplyAutoMiningInternalInput {
  startCell: MiningCell;
  damage: number;
  random: () => number;
}

interface LastDestroyedBlock {
  cell: MiningCell;
  damageConsumedBefore: number;
  hpBefore: number;
}

interface ApplyAutoMiningInternalResult extends ApplyAutoMiningResult {
  lastDestroyed: LastDestroyedBlock | null;
}

function applyAutoMiningInternal(
  session: MiningSession,
  blockTypes: MiningBlockType[],
  input: ApplyAutoMiningInternalInput
): ApplyAutoMiningInternalResult {
  let nextSession = session;
  let remainingDamage = input.damage;
  let damageApplied = 0;
  let destroyedBlocks = 0;
  let targetCell = findPlayableCell(nextSession, input.startCell);
  let lastDestroyed: LastDestroyedBlock | null = null;
  const rewards: Record<string, number> = {};

  while (remainingDamage > 0) {
    const target = nextSession.blocks[targetCell.row]?.[targetCell.col];

    if (!target || target.destroyed) {
      const nextTargetCell = findFirstPlayableCell(nextSession);

      if (!nextTargetCell) {
        break;
      }

      targetCell = nextTargetCell;
      continue;
    }

    const damageToApply = Math.min(remainingDamage, target.hp);
    const willDestroy = damageToApply >= target.hp;
    const damageConsumedBefore = damageApplied;
    const hpBefore = target.hp;

    nextSession = hitMineBlock(nextSession, blockTypes, {
      row: target.row,
      col: target.col,
      damage: damageToApply,
      random: input.random
    });

    damageApplied += damageToApply;
    remainingDamage -= damageToApply;

    if (!willDestroy) {
      break;
    }

    destroyedBlocks += 1;
    lastDestroyed = {
      cell: {
        row: target.row,
        col: target.col
      },
      damageConsumedBefore,
      hpBefore
    };
    mergeRewards(rewards, nextSession.lastRewards);

    const nextTargetCell = findFirstPlayableCell(nextSession);

    if (!nextTargetCell) {
      break;
    }

    targetCell = nextTargetCell;
  }

  return {
    session: nextSession,
    nextTargetCell: findPlayableCell(nextSession, targetCell),
    report: {
      damageApplied,
      destroyedBlocks,
      rewards,
      pendingFinalHit: null
    },
    lastDestroyed
  };
}

interface ApplyColumnAutoMiningInternalInput {
  column: number;
  damage: number;
  random: () => number;
}

function applyColumnAutoMiningInternal(
  session: MiningSession,
  blockTypes: MiningBlockType[],
  input: ApplyColumnAutoMiningInternalInput
): ApplyAutoMiningInternalResult {
  let nextSession = session;
  let remainingDamage = input.damage;
  let damageApplied = 0;
  let destroyedBlocks = 0;
  let targetCell = findColumnPlayableCell(nextSession, input.column);
  let lastDestroyed: LastDestroyedBlock | null = null;
  const rewards: Record<string, number> = {};

  if (!targetCell) {
    return {
      session,
      nextTargetCell: { row: 0, col: normalizeColumn(session, input.column) ?? 0 },
      report: {
        damageApplied: 0,
        destroyedBlocks: 0,
        rewards: {},
        pendingFinalHit: null
      },
      lastDestroyed: null
    };
  }

  while (remainingDamage > 0) {
    const target = nextSession.blocks[targetCell.row]?.[targetCell.col];

    if (!target || target.destroyed) {
      const nextTargetCell = findColumnPlayableCell(nextSession, input.column);

      if (!nextTargetCell) {
        break;
      }

      targetCell = nextTargetCell;
      continue;
    }

    const damageToApply = Math.min(remainingDamage, target.hp);
    const willDestroy = damageToApply >= target.hp;
    const damageConsumedBefore = damageApplied;
    const hpBefore = target.hp;

    nextSession = hitMineBlock(nextSession, blockTypes, {
      row: target.row,
      col: target.col,
      damage: damageToApply,
      random: input.random
    });

    damageApplied += damageToApply;
    remainingDamage -= damageToApply;

    if (!willDestroy) {
      break;
    }

    destroyedBlocks += 1;
    lastDestroyed = {
      cell: {
        row: target.row,
        col: target.col
      },
      damageConsumedBefore,
      hpBefore
    };
    mergeRewards(rewards, nextSession.lastRewards);

    const nextTargetCell = findColumnPlayableCell(nextSession, input.column);

    if (!nextTargetCell) {
      break;
    }

    targetCell = nextTargetCell;
  }

  return {
    session: nextSession,
    nextTargetCell: findColumnPlayableCell(nextSession, input.column) ?? targetCell,
    report: {
      damageApplied,
      destroyedBlocks,
      rewards,
      pendingFinalHit: null
    },
    lastDestroyed
  };
}

function findPlayableCell(session: MiningSession, preferredCell: MiningCell): MiningCell {
  const preferred = session.blocks[preferredCell.row]?.[preferredCell.col];

  if (preferred && !preferred.destroyed) {
    return {
      row: preferred.row,
      col: preferred.col
    };
  }

  return findFirstPlayableCell(session) ?? { row: 0, col: 0 };
}

function findFirstPlayableCell(session: MiningSession): MiningCell | null {
  const block = session.blocks.flat().find((item) => !item.destroyed);
  return block ? { row: block.row, col: block.col } : null;
}

function findColumnPlayableCell(session: MiningSession, column: number): MiningCell | null {
  const normalizedColumn = normalizeColumn(session, column);

  if (normalizedColumn === null) {
    return null;
  }

  const block = session.blocks
    .map((row) => row[normalizedColumn])
    .find((item): item is MiningBlockState => Boolean(item && !item.destroyed));

  return block ? { row: block.row, col: block.col } : null;
}

function normalizeColumn(session: MiningSession, column: number): number | null {
  if (!Number.isFinite(column)) {
    return null;
  }

  const normalizedColumn = Math.trunc(column);

  if (normalizedColumn < 0 || normalizedColumn >= session.mine.width) {
    return null;
  }

  return normalizedColumn;
}

function mergeRewards(target: Record<string, number>, source: Record<string, number>): void {
  for (const [resourceId, amount] of Object.entries(source)) {
    target[resourceId] = (target[resourceId] ?? 0) + amount;
  }
}
