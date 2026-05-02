import type { BlockTypeConfig, ContentBundle, GoblinConfig } from "@goblin-cartel/content-schemas";
import {
  findPlatformRow,
  hitMineBlock,
  type BossAttackResult,
  type GoblinRosterState,
  type MiningBlockState,
  type MiningFoundVein,
  type MiningSession
} from "@goblin-cartel/game-core";
import { type Dispatch, type SetStateAction, useEffect, useRef, useState } from "react";
import { assignGoblinWorkers, type GoblinPlacementMap } from "./useGoblinPlacement";

const autoMiningTickMs = 1000;
const offlineFinalHitDelayMs = 900;
const hitEffectLifetimeMs = 2400;
let hitEffectSequence = 0;

type HitEffectVariant = "boss" | "goblin" | "critical";

interface RewardDrop {
  amount: number;
  label: string;
  resourceId: string;
}

export interface HitEffect {
  damage: number;
  id: number;
  rewardDrops: RewardDrop[];
  row: number;
  col: number;
  variant: HitEffectVariant;
}

interface OfflineMiningSummary {
  seconds: number;
  destroyedBlocks: number;
  rewards: Record<string, number>;
  pendingFinalHit: boolean;
}

export interface PlatformDropEvent {
  id: number;
  fromRow: number;
  toRow: number;
  metersGained: number;
  depthMeters: number;
  totalDepthMeters: number;
  rewardDrops: RewardDrop[];
  rewards: Record<string, number>;
}

type SpawnHitEffect = (
  cell: { row: number; col: number },
  variant: HitEffectVariant,
  damage: number,
  rewards?: Record<string, number>
) => void;

let platformDropEventSequence = 0;

export function useMiningLoop(input: {
  activeCell: { row: number; col: number };
  applyBossTap: (random: () => number) => BossAttackResult;
  blockTypes: BlockTypeConfig[];
  content: ContentBundle;
  currentPlatformRow: number;
  exposedCellKeys: ReadonlySet<string>;
  goblinPlacements: GoblinPlacementMap;
  labels: Record<string, string>;
  miningGoblins: GoblinConfig[];
  onFoundVein: (vein: MiningFoundVein | null) => void;
  onRewardChestBlock: (block: MiningBlockState | undefined, session: MiningSession) => void;
  pendingOfflineFinalHit: { row: number; col: number } | null;
  platformDropDurationMs: number;
  platformRow: number;
  roster: GoblinRosterState;
  scheduleResourceRewardDisplay: (rewards: Record<string, number>) => void;
  session: MiningSession;
  sessionReady: boolean;
  setActiveCell: Dispatch<SetStateAction<{ row: number; col: number }>>;
  setOfflineSummary: Dispatch<SetStateAction<OfflineMiningSummary | null>>;
  setPendingOfflineFinalHit: Dispatch<SetStateAction<{ row: number; col: number } | null>>;
  setPlatformRow: Dispatch<SetStateAction<number>>;
  setSession: Dispatch<SetStateAction<MiningSession>>;
}) {
  const [hitEffects, setHitEffects] = useState<HitEffect[]>([]);
  const [platformDropEvent, setPlatformDropEvent] = useState<PlatformDropEvent | null>(null);
  const [platformDropAnimating, setPlatformDropAnimating] = useState(false);
  const activeCellRef = useRef(input.activeCell);
  const blockTypesRef = useRef(input.blockTypes);
  const goblinPlacementsRef = useRef(input.goblinPlacements);
  const miningGoblinsRef = useRef(input.miningGoblins);
  const onFoundVeinRef = useRef(input.onFoundVein);
  const onRewardChestBlockRef = useRef(input.onRewardChestBlock);
  const pendingOfflineFinalHitRef = useRef(input.pendingOfflineFinalHit);
  const platformRowRef = useRef(input.platformRow);
  const previousPlatformRowRef = useRef(0);
  const rosterRef = useRef(input.roster);
  const sessionRef = useRef(input.session);
  const spawnHitEffectRef = useRef<SpawnHitEffect>(() => undefined);

  function spawnHitEffect(
    cell: { row: number; col: number },
    variant: HitEffectVariant,
    damage: number,
    rewards: Record<string, number> = {}
  ) {
    const id = ++hitEffectSequence;
    const rewardDrops = rewardDropsFromMap(rewards, input.content, input.labels);

    setHitEffects((current) => [...current.slice(-16), { damage, id, rewardDrops, row: cell.row, col: cell.col, variant }]);
    input.scheduleResourceRewardDisplay(rewards);
    window.setTimeout(() => {
      setHitEffects((current) => current.filter((effect) => effect.id !== id));
    }, hitEffectLifetimeMs);
  }

  useEffect(() => {
    activeCellRef.current = input.activeCell;
    blockTypesRef.current = input.blockTypes;
    goblinPlacementsRef.current = input.goblinPlacements;
    miningGoblinsRef.current = input.miningGoblins;
    onFoundVeinRef.current = input.onFoundVein;
    onRewardChestBlockRef.current = input.onRewardChestBlock;
    pendingOfflineFinalHitRef.current = input.pendingOfflineFinalHit;
    platformRowRef.current = input.platformRow;
    rosterRef.current = input.roster;
    sessionRef.current = input.session;
    spawnHitEffectRef.current = spawnHitEffect;
  });

  useEffect(() => {
    if (!input.sessionReady) {
      previousPlatformRowRef.current = input.currentPlatformRow;
      return;
    }

    if (input.currentPlatformRow <= previousPlatformRowRef.current) {
      previousPlatformRowRef.current = input.currentPlatformRow;
      return;
    }

    const previousPlatformRow = previousPlatformRowRef.current;
    previousPlatformRowRef.current = input.currentPlatformRow;
    const baseEvent = createPlatformDropEvent(sessionRef.current, previousPlatformRow, input.currentPlatformRow);
    const rewards = createDepthProgressRewards(input.content, sessionRef.current.mine.templateId, baseEvent.metersGained);
    const rewardDrops = rewardDropsFromMap(rewards, input.content, input.labels);
    const event = {
      ...baseEvent,
      rewardDrops,
      rewards
    };
    setPlatformDropEvent(event);

    if (Object.keys(rewards).length > 0) {
      input.setSession((current) => ({
        ...current,
        lastRewards: rewards,
        resources: mergeResourceMaps(current.resources, rewards)
      }));
      input.scheduleResourceRewardDisplay(rewards);
    }

    setPlatformDropAnimating(true);

    const dropDurationMs = normalizePlatformDropDurationMs(input.platformDropDurationMs);
    const animationTimeoutId = window.setTimeout(() => setPlatformDropAnimating(false), dropDurationMs);
    const eventTimeoutId = window.setTimeout(() => setPlatformDropEvent(null), dropDurationMs + 850);

    return () => {
      window.clearTimeout(animationTimeoutId);
      window.clearTimeout(eventTimeoutId);
    };
  }, [
    input.content,
    input.currentPlatformRow,
    input.labels,
    input.platformDropDurationMs,
    input.scheduleResourceRewardDisplay,
    input.sessionReady,
    input.setSession
  ]);

  useEffect(() => {
    if (!input.sessionReady) {
      return;
    }

    const intervalId = window.setInterval(() => {
      input.setSession((current) => {
        if (pendingOfflineFinalHitRef.current) {
          return current;
        }

        const currentSelectedCell = findExposedCellForPreferred(current, activeCellRef.current);
        const nextPlatformStartRow = findPlatformRow(current, platformRowRef.current);
        const currentWorkers = assignGoblinWorkers(
          current,
          miningGoblinsRef.current,
          goblinPlacementsRef.current,
          nextPlatformStartRow,
          rosterRef.current
        );

        if (currentWorkers.length === 0) {
          return current;
        }

        let nextSession = current;
        let nextActiveCell = currentSelectedCell;
        let nextPlatformRow = nextPlatformStartRow;

        for (const worker of currentWorkers) {
          const target = nextSession.blocks[worker.targetCell.row]?.[worker.targetCell.col];

          if (!target || target.destroyed || worker.damagePerSecond <= 0 || worker.targetCell.row !== nextPlatformRow) {
            continue;
          }

          const next = hitMineBlock(nextSession, blockTypesRef.current, {
            row: target.row,
            col: target.col,
            damage: worker.damagePerSecond
          });
          const targetDestroyed = Boolean(next.blocks[target.row]?.[target.col]?.destroyed);
          const destroyedBlock = targetDestroyed ? next.blocks[target.row]?.[target.col] : undefined;

          spawnHitEffectRef.current(worker.targetCell, "goblin", worker.damagePerSecond, targetDestroyed ? next.lastRewards : undefined);
          onFoundVeinRef.current(next.lastFoundVein);
          onRewardChestBlockRef.current(destroyedBlock, next);

          if (targetDestroyed && cellKey(worker.targetCell) === cellKey(currentSelectedCell)) {
            nextActiveCell = findExposedCellForPreferred(next, worker.targetCell);
          }

          nextSession = next;
          nextPlatformRow = findPlatformRow(nextSession, nextPlatformRow);
        }

        input.setActiveCell(nextActiveCell);
        input.setPlatformRow(nextPlatformRow);
        return nextSession;
      });
    }, autoMiningTickMs);

    return () => window.clearInterval(intervalId);
  }, [input.sessionReady, input.setActiveCell, input.setPlatformRow, input.setSession]);

  useEffect(() => {
    if (!input.sessionReady || !input.pendingOfflineFinalHit) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      input.setSession((current) => {
        const target = current.blocks[input.pendingOfflineFinalHit?.row ?? -1]?.[input.pendingOfflineFinalHit?.col ?? -1];

        if (!target || target.destroyed || !input.pendingOfflineFinalHit) {
          return current;
        }

        const next = hitMineBlock(current, input.blockTypes, {
          row: target.row,
          col: target.col,
          damage: Math.max(1, target.hp)
        });

        spawnHitEffect(input.pendingOfflineFinalHit, "boss", Math.max(1, target.hp), next.lastRewards);
        input.onFoundVein(next.lastFoundVein);
        input.onRewardChestBlock(next.blocks[target.row]?.[target.col], next);

        input.setActiveCell(findExposedCellForPreferred(next, input.pendingOfflineFinalHit));
        input.setOfflineSummary((currentSummary) =>
          currentSummary
            ? {
                ...currentSummary,
                destroyedBlocks: currentSummary.destroyedBlocks + 1,
                rewards: mergeResourceMaps(currentSummary.rewards, next.lastRewards),
                pendingFinalHit: false
              }
            : null
        );
        input.setPendingOfflineFinalHit(null);
        input.setPlatformRow(findPlatformRow(next, input.pendingOfflineFinalHit.row));
        return next;
      });
    }, offlineFinalHitDelayMs);

    return () => window.clearTimeout(timeoutId);
  }, [
    input.blockTypes,
    input.content,
    input.labels,
    input.onFoundVein,
    input.onRewardChestBlock,
    input.pendingOfflineFinalHit,
    input.scheduleResourceRewardDisplay,
    input.sessionReady,
    input.setActiveCell,
    input.setOfflineSummary,
    input.setPendingOfflineFinalHit,
    input.setPlatformRow,
    input.setSession
  ]);

  function handleBlockHit(block: MiningBlockState) {
    const targetCell = { row: block.row, col: block.col };

    if (block.destroyed || !input.exposedCellKeys.has(cellKey(targetCell))) {
      return;
    }

    const attack = input.applyBossTap(Math.random);

    if (!attack.ok) {
      return;
    }

    input.setSession((current) => {
      const next = hitMineBlock(current, input.blockTypes, {
        row: block.row,
        col: block.col,
        damage: attack.damage
      });
      const targetDestroyed = next.blocks[block.row]?.[block.col]?.destroyed;
      const destroyedBlock = targetDestroyed ? next.blocks[block.row]?.[block.col] : undefined;
      spawnHitEffect(targetCell, attack.critical ? "critical" : "boss", attack.damage, targetDestroyed ? next.lastRewards : undefined);
      input.onFoundVein(next.lastFoundVein);
      input.onRewardChestBlock(destroyedBlock, next);
      input.setActiveCell(targetDestroyed ? findNextExposedCell(next, targetCell) : targetCell);
      input.setPlatformRow((currentPlatformRow) => findPlatformRow(next, currentPlatformRow));
      return next;
    });
  }

  return {
    handleBlockHit,
    hitEffects,
    platformDropAnimating,
    platformDropEvent
  };
}

export function createPlatformDropEvent(
  session: MiningSession,
  fromRow: number,
  toRow: number,
  rewards: Record<string, number> = {},
  rewardDrops: RewardDrop[] = []
): PlatformDropEvent {
  const normalizedFromRow = clampInteger(fromRow, 0, Math.max(0, session.mine.height - 1));
  const normalizedToRow = clampInteger(toRow, normalizedFromRow, Math.max(normalizedFromRow, session.mine.height - 1));
  const fromDepthMeters = depthMetersForRow(session, normalizedFromRow);
  const depthMeters = depthMetersForRow(session, normalizedToRow);

  return {
    id: ++platformDropEventSequence,
    fromRow: normalizedFromRow,
    toRow: normalizedToRow,
    metersGained: Math.max(1, depthMeters - fromDepthMeters),
    depthMeters,
    totalDepthMeters: Math.max(1, Math.round(session.mine.depthMeters ?? session.mine.height)),
    rewardDrops,
    rewards
  };
}

export function createDepthProgressRewards(
  content: ContentBundle,
  mineTemplateId: string,
  metersGained: number
): Record<string, number> {
  const reward = content.mineTemplates.find((template) => template.id === mineTemplateId)?.depthProgressReward;

  if (!reward || !Number.isFinite(metersGained) || metersGained <= 0) {
    return {};
  }

  const rawAmount = Math.floor(metersGained * reward.amountPerMeter * reward.multiplier);
  const cappedAmount = reward.maxAmount ? Math.min(rawAmount, reward.maxAmount) : rawAmount;
  const amount = Math.max(0, cappedAmount);

  return amount > 0 ? { [reward.resourceId]: amount } : {};
}

export function findExposedCellForPreferred(
  session: MiningSession,
  preferredCell: { row: number; col: number }
): { row: number; col: number } {
  const exposedCells = findExposedCells(session);

  if (exposedCells.some((cell) => cell.row === preferredCell.row && cell.col === preferredCell.col)) {
    return preferredCell;
  }

  return findNextExposedCell(session, preferredCell);
}

function findNextExposedCell(session: MiningSession, fromCell: { row: number; col: number }): { row: number; col: number } {
  const exposedCells = findExposedCells(session);

  if (exposedCells.length === 0) {
    return { row: 0, col: 0 };
  }

  const byColumn = [...exposedCells].sort((left, right) => left.col - right.col || left.row - right.row);
  const nextByColumn = byColumn.find((cell) => cell.col > fromCell.col);

  return nextByColumn ?? byColumn[0] ?? { row: 0, col: 0 };
}

export function findExposedCells(session: MiningSession): Array<{ row: number; col: number }> {
  return Array.from({ length: session.mine.width }, (_, col) => {
    const block = session.blocks.map((row) => row[col]).find((item): item is MiningBlockState => Boolean(item && !item.destroyed));
    return block ? { row: block.row, col: block.col } : null;
  }).filter((cell): cell is { row: number; col: number } => Boolean(cell));
}

function cellKey(cell: { row: number; col: number }): string {
  return `${cell.row}:${cell.col}`;
}

function rewardDropsFromMap(rewards: Record<string, number>, content: ContentBundle, labels: Record<string, string>): RewardDrop[] {
  return Object.entries(rewards)
    .filter(([, amount]) => amount > 0)
    .sort(([leftResourceId], [rightResourceId]) => leftResourceId.localeCompare(rightResourceId))
    .map(([resourceId, amount]) => ({
      amount,
      label: resourceLabelById(resourceId, labels, content),
      resourceId
    }));
}

function resourceLabelById(resourceId: string, labels: Record<string, string>, content: ContentBundle): string {
  const resource = content.resources.find((item) => item.id === resourceId);
  return resource ? labelFromNameKey(resource.nameKey, resource.id, labels) : resourceId;
}

function labelFromNameKey(nameKey: string, fallback: string, labels: Record<string, string>): string {
  return labels[nameKey] ?? fallback;
}

function mergeResourceMaps(left: Record<string, number>, right: Record<string, number>): Record<string, number> {
  const result = { ...left };

  for (const [resourceId, amount] of Object.entries(right)) {
    result[resourceId] = (result[resourceId] ?? 0) + amount;
  }

  return result;
}

function normalizePlatformDropDurationMs(value: number): number {
  if (!Number.isFinite(value)) {
    return 1450;
  }

  return Math.max(500, Math.min(2500, Math.floor(value)));
}

function depthMetersForRow(session: MiningSession, row: number): number {
  const rowCount = Math.max(1, session.mine.height);
  const depthMeters = Math.max(1, session.mine.depthMeters ?? rowCount);

  return Math.max(1, Math.round(((row + 1) * depthMeters) / rowCount));
}

function clampInteger(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.max(min, Math.min(max, Math.trunc(value)));
}
