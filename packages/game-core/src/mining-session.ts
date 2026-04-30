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
  special?: "vein" | "chest";
  specialBehavior: "none" | "explosion" | "chest";
  veinTypeId?: string;
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
  lastFoundVein: MiningFoundVein | null;
  foundVeins: MiningFoundVein[];
  destroyedBlocks: number;
}

export interface MiningFoundVein {
  id: string;
  mineTemplateId: string;
  seed: string;
  row: number;
  col: number;
  veinTypeId: string;
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
  foundVeins?: MiningFoundVein[];
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

export interface ApplyPlatformAutoMiningInput {
  platformRow: number;
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

export interface ApplyPlatformAutoMiningResult extends ApplyAutoMiningResult {
  platformRow: number;
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
          mineDifficultyMultiplier: mineDifficultyMultiplier * (block.hpMultiplier ?? 1)
        });

        return {
          row: block.row,
          col: block.col,
          blockTypeId: block.blockTypeId,
          maxHp,
          hp: maxHp,
          destroyed: false,
          tags: blockType.tags ?? [],
          special: block.special,
          specialBehavior: blockType.specialBehavior ?? "none",
          veinTypeId: block.veinTypeId
        };
      })
    ),
    resources: {},
    lastRewards: {},
    lastFoundVein: null,
    foundVeins: [],
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
      lastRewards: {},
      lastFoundVein: null
    };
  }

  const nextHp = Math.max(0, target.hp - input.damage);
  const destroyed = nextHp === 0;
  const blockType = blockTypes.find((item) => item.id === target.blockTypeId);
  const rewards = destroyed && blockType ? rollRewards(blockType.rewardTable, input.random ?? Math.random) : {};
  const nextResources = { ...session.resources };
  const nextDestroyedBlocks = session.destroyedBlocks + (destroyed ? 1 : 0);
  const nextBlocks = session.blocks.map((row, rowIndex) =>
    row.map((block, colIndex) =>
      rowIndex === input.row && colIndex === input.col
        ? {
            ...block,
            hp: nextHp,
            destroyed
          }
        : block
    )
  );
  const nextSessionForDiscovery = {
    ...session,
    blocks: nextBlocks,
    destroyedBlocks: nextDestroyedBlocks
  };
  const foundVein = destroyed
    ? createFoundVein(session, target) ?? createMineCompletionFoundVeinIfNeeded(nextSessionForDiscovery, session.foundVeins)
    : null;

  for (const [resourceId, amount] of Object.entries(rewards)) {
    nextResources[resourceId] = (nextResources[resourceId] ?? 0) + amount;
  }

  return {
    ...session,
    blocks: nextBlocks,
    resources: nextResources,
    lastRewards: rewards,
    lastFoundVein: foundVein,
    foundVeins: foundVein ? addFoundVein(session.foundVeins, foundVein) : session.foundVeins,
    destroyedBlocks: nextDestroyedBlocks
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

export function applyPlatformAutoMining(
  session: MiningSession,
  blockTypes: MiningBlockType[],
  input: ApplyPlatformAutoMiningInput
): ApplyPlatformAutoMiningResult {
  const column = normalizeColumn(session, input.column) ?? 0;
  const platformRow = findPlatformRow(session, input.platformRow);

  if (!Number.isFinite(input.damage) || input.damage <= 0) {
    return {
      session,
      platformRow,
      nextTargetCell: { row: platformRow, col: column },
      report: {
        damageApplied: 0,
        destroyedBlocks: 0,
        rewards: {},
        pendingFinalHit: null
      }
    };
  }

  if (input.holdLastDestroy) {
    const simulation = applyPlatformAutoMiningInternal(session, blockTypes, {
      column: input.column,
      damage: input.damage,
      platformRow: input.platformRow,
      random: () => 0
    });

    const lastDestroyed = simulation.lastDestroyed;

    if (lastDestroyed) {
      const heldDamage = lastDestroyed.damageConsumedBefore + Math.max(0, lastDestroyed.hpBefore - 1);
      const heldResult = applyPlatformAutoMiningInternal(session, blockTypes, {
        column: input.column,
        damage: heldDamage,
        platformRow: input.platformRow,
        random: input.random ?? Math.random
      });

      return {
        session: heldResult.session,
        platformRow: heldResult.platformRow,
        nextTargetCell: lastDestroyed.cell,
        report: {
          ...heldResult.report,
          pendingFinalHit: lastDestroyed.cell
        }
      };
    }
  }

  const result = applyPlatformAutoMiningInternal(session, blockTypes, {
    column: input.column,
    damage: input.damage,
    platformRow: input.platformRow,
    random: input.random ?? Math.random
  });

  return {
    session: result.session,
    platformRow: result.platformRow,
    nextTargetCell: result.nextTargetCell,
    report: result.report
  };
}

export function findPlatformRow(session: MiningSession, preferredRow: number): number {
  const rowCount = session.blocks.length;

  if (rowCount === 0) {
    return 0;
  }

  const normalizedRow = normalizeRow(session, preferredRow) ?? 0;

  for (let row = normalizedRow; row < rowCount; row += 1) {
    if (!isMineRowCleared(session, row)) {
      return row;
    }
  }

  return Math.min(normalizedRow, rowCount - 1);
}

export function isMineRowCleared(session: MiningSession, row: number): boolean {
  const normalizedRow = normalizeRow(session, row);

  if (normalizedRow === null) {
    return true;
  }

  const rowBlocks = session.blocks[normalizedRow] ?? [];
  return rowBlocks.length === 0 || rowBlocks.every((block) => block.destroyed);
}

export function isMineFullyCleared(session: MiningSession): boolean {
  return session.blocks.every((row) => row.every((block) => block.destroyed));
}

export function createMineCompletionFoundVein(session: MiningSession): MiningFoundVein | null {
  const veinTypeId = session.mine.completionVeinTypeId;

  if (!veinTypeId || !isMineFullyCleared(session)) {
    return null;
  }

  return {
    id: `${session.mine.templateId}:${session.mine.seed}:completion:${veinTypeId}`,
    mineTemplateId: session.mine.templateId,
    seed: session.mine.seed,
    row: Math.max(0, session.mine.height - 1),
    col: Math.max(0, Math.floor(session.mine.width / 2)),
    veinTypeId
  };
}

export function exportMiningSessionSave(session: MiningSession): MiningSessionSave {
  return {
    mineTemplateId: session.mine.templateId,
    seed: session.mine.seed,
    resources: { ...session.resources },
    foundVeins: session.foundVeins.map((vein) => ({ ...vein })),
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

  const restoredSession = {
    ...session,
    blocks,
    resources: { ...save.resources },
    lastRewards: {},
    lastFoundVein: null,
    foundVeins: save.foundVeins?.map((vein) => ({ ...vein })) ?? deriveFoundVeinsFromBlocks(session, blocks),
    destroyedBlocks
  };
  const completionFoundVein = createMineCompletionFoundVeinIfNeeded(restoredSession, restoredSession.foundVeins);

  return {
    ...restoredSession,
    foundVeins: completionFoundVein ? addFoundVein(restoredSession.foundVeins, completionFoundVein) : restoredSession.foundVeins
  };
}

function createFoundVein(session: MiningSession, block: MiningBlockState): MiningFoundVein | null {
  if (block.special !== "vein" || !block.veinTypeId) {
    return null;
  }

  return {
    id: foundVeinId(session, block),
    mineTemplateId: session.mine.templateId,
    seed: session.mine.seed,
    row: block.row,
    col: block.col,
    veinTypeId: block.veinTypeId
  };
}

function addFoundVein(foundVeins: MiningFoundVein[], vein: MiningFoundVein): MiningFoundVein[] {
  if (foundVeins.some((item) => item.id === vein.id)) {
    return foundVeins;
  }

  return [...foundVeins, vein];
}

function createMineCompletionFoundVeinIfNeeded(
  session: MiningSession,
  foundVeins: readonly MiningFoundVein[]
): MiningFoundVein | null {
  const vein = createMineCompletionFoundVein(session);

  if (!vein || foundVeins.some((item) => item.id === vein.id)) {
    return null;
  }

  return vein;
}

function deriveFoundVeinsFromBlocks(session: MiningSession, blocks: MiningBlockState[][]): MiningFoundVein[] {
  return blocks
    .flat()
    .filter((block) => block.destroyed)
    .map((block) => createFoundVein(session, block))
    .filter((vein): vein is MiningFoundVein => Boolean(vein));
}

function foundVeinId(session: MiningSession, block: MiningBlockState): string {
  return `${session.mine.templateId}:${session.mine.seed}:${block.row}:${block.col}:${block.veinTypeId ?? "vein"}`;
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

interface ApplyPlatformAutoMiningInternalInput {
  platformRow: number;
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

interface ApplyPlatformAutoMiningInternalResult extends ApplyPlatformAutoMiningResult {
  lastDestroyed: LastDestroyedBlock | null;
}

function applyPlatformAutoMiningInternal(
  session: MiningSession,
  blockTypes: MiningBlockType[],
  input: ApplyPlatformAutoMiningInternalInput
): ApplyPlatformAutoMiningInternalResult {
  const normalizedColumn = normalizeColumn(session, input.column);
  let platformRow = findPlatformRow(session, input.platformRow);

  if (normalizedColumn === null) {
    return {
      session,
      platformRow,
      nextTargetCell: { row: platformRow, col: 0 },
      report: {
        damageApplied: 0,
        destroyedBlocks: 0,
        rewards: {},
        pendingFinalHit: null
      },
      lastDestroyed: null
    };
  }

  let nextSession = session;
  let remainingDamage = input.damage;
  let damageApplied = 0;
  let destroyedBlocks = 0;
  let lastDestroyed: LastDestroyedBlock | null = null;
  const rewards: Record<string, number> = {};

  while (remainingDamage > 0) {
    platformRow = findPlatformRow(nextSession, platformRow);
    const targetCell: MiningCell = { row: platformRow, col: normalizedColumn };

    const target = nextSession.blocks[targetCell.row]?.[targetCell.col];

    if (!target || target.destroyed) {
      if (!isMineRowCleared(nextSession, platformRow)) {
        break;
      }

      const nextPlatformRow = findPlatformRow(nextSession, platformRow + 1);

      if (nextPlatformRow === platformRow) {
        break;
      }

      platformRow = nextPlatformRow;
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

    if (!isMineRowCleared(nextSession, platformRow)) {
      break;
    }

    const nextPlatformRow = findPlatformRow(nextSession, platformRow + 1);

    if (nextPlatformRow === platformRow) {
      break;
    }

    platformRow = nextPlatformRow;
  }

  platformRow = findPlatformRow(nextSession, platformRow);

  return {
    session: nextSession,
    platformRow,
    nextTargetCell: { row: platformRow, col: normalizedColumn },
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

function normalizeRow(session: MiningSession, row: number): number | null {
  if (!Number.isFinite(row)) {
    return null;
  }

  const rowCount = session.blocks.length;

  if (rowCount <= 0) {
    return null;
  }

  return Math.min(Math.max(0, Math.trunc(row)), rowCount - 1);
}

function mergeRewards(target: Record<string, number>, source: Record<string, number>): void {
  for (const [resourceId, amount] of Object.entries(source)) {
    target[resourceId] = (target[resourceId] ?? 0) + amount;
  }
}
