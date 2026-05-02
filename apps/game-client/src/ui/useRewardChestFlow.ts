import type { ContentBundle, RewardChestTypeConfig } from "@goblin-cartel/content-schemas";
import {
  openRewardChest as openRewardChestRewards,
  type MiningBlockState,
  type MiningSession
} from "@goblin-cartel/game-core";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const rewardChestOpeningMs = 2300;
let chestRewardSequence = 0;

export type RewardChestStage = "closed" | "opening" | "summary";

interface RewardDrop {
  amount: number;
  label: string;
  resourceId: string;
}

export interface PendingRewardChest {
  chestTypeId: string;
  id: string;
  mineTemplateId: string;
  rewards: Record<string, number> | null;
  source: "mine_completion" | "cell";
}

export interface ChestRewardFlyout extends RewardDrop {
  delayMs: number;
  distance: number;
  id: number;
  x: number;
}

export function useRewardChestFlow(input: {
  content: ContentBundle;
  labels: Record<string, string>;
  mineCompletionNoticeSeenIds: string[];
  onMineCompletionSeenIdsChange: (seenIds: string[]) => void;
  onMineCompletionChestContinued: () => void;
  onRewardsCollected: (rewards: Record<string, number>) => void;
}) {
  const [pendingRewardChest, setPendingRewardChest] = useState<PendingRewardChest | null>(null);
  const [rewardChestStage, setRewardChestStage] = useState<RewardChestStage>("closed");
  const [chestRewardFlyouts, setChestRewardFlyouts] = useState<ChestRewardFlyout[]>([]);
  const pendingRewardChestRef = useRef(pendingRewardChest);
  const rewardChestSummaryTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    pendingRewardChestRef.current = pendingRewardChest;
  }, [pendingRewardChest]);

  useEffect(() => {
    return () => clearRewardChestSummaryTimer(rewardChestSummaryTimeoutRef);
  }, []);

  const pendingRewardChestType = useMemo(
    () => (pendingRewardChest ? findRewardChestType(input.content, pendingRewardChest.chestTypeId) : null),
    [input.content, pendingRewardChest]
  );

  const resetRewardChest = useCallback(() => {
    clearRewardChestSummaryTimer(rewardChestSummaryTimeoutRef);
    pendingRewardChestRef.current = null;
    setPendingRewardChest(null);
    setRewardChestStage("closed");
    setChestRewardFlyouts([]);
  }, []);

  const queueRewardChest = useCallback((rewardChest: PendingRewardChest) => {
    clearRewardChestSummaryTimer(rewardChestSummaryTimeoutRef);
    pendingRewardChestRef.current = rewardChest;
    setPendingRewardChest(rewardChest);
    setRewardChestStage("closed");
    setChestRewardFlyouts([]);
  }, []);

  const queueMineCompletionRewardChest = useCallback(
    (mineTemplateId: string): boolean => {
      if (input.mineCompletionNoticeSeenIds.includes(mineTemplateId)) {
        return false;
      }

      const rewardChest = createMineCompletionRewardChest(input.content, mineTemplateId);

      if (!rewardChest) {
        return false;
      }

      queueRewardChest(rewardChest);
      return true;
    },
    [input.content, input.mineCompletionNoticeSeenIds, queueRewardChest]
  );

  const queueCellRewardChest = useCallback(
    (block: MiningBlockState | undefined, session: MiningSession): boolean => {
      if (!block || block.special !== "reward_chest" || !block.rewardChestTypeId || pendingRewardChestRef.current) {
        return false;
      }

      if (!findRewardChestType(input.content, block.rewardChestTypeId)) {
        return false;
      }

      queueRewardChest({
        chestTypeId: block.rewardChestTypeId,
        id: `${session.mine.templateId}:${session.mine.seed}:${block.row}:${block.col}:${block.rewardChestTypeId}`,
        mineTemplateId: session.mine.templateId,
        rewards: null,
        source: "cell"
      });
      return true;
    },
    [input.content, queueRewardChest]
  );

  const openPendingRewardChest = useCallback(() => {
    if (!pendingRewardChest || rewardChestStage !== "closed") {
      return;
    }

    const chestType = findRewardChestType(input.content, pendingRewardChest.chestTypeId);

    if (!chestType) {
      resetRewardChest();
      return;
    }

    const openedChest = openRewardChestRewards({
      chestType,
      random: Math.random
    });
    const rewards = openedChest.rewards;
    const nextSeenNoticeIds =
      pendingRewardChest.source === "mine_completion"
        ? markMineCompletionNoticeSeen(input.mineCompletionNoticeSeenIds, pendingRewardChest.mineTemplateId)
        : input.mineCompletionNoticeSeenIds;

    clearRewardChestSummaryTimer(rewardChestSummaryTimeoutRef);
    setPendingRewardChest({ ...pendingRewardChest, rewards });
    setRewardChestStage("opening");
    setChestRewardFlyouts(createChestRewardFlyouts(rewards, input.content, input.labels));
    if (pendingRewardChest.source === "mine_completion") {
      input.onMineCompletionSeenIdsChange(nextSeenNoticeIds);
    }
    input.onRewardsCollected(rewards);
    rewardChestSummaryTimeoutRef.current = window.setTimeout(() => {
      rewardChestSummaryTimeoutRef.current = null;
      setRewardChestStage("summary");
    }, rewardChestOpeningMs);
  }, [input, pendingRewardChest, resetRewardChest, rewardChestStage]);

  const continueRewardChest = useCallback(() => {
    const completedChest = pendingRewardChest;

    if (rewardChestStage !== "summary" || !completedChest) {
      return;
    }

    resetRewardChest();
    if (completedChest.source === "mine_completion") {
      input.onMineCompletionChestContinued();
    }
  }, [input, pendingRewardChest, resetRewardChest, rewardChestStage]);

  return {
    chestRewardFlyouts,
    continueRewardChest,
    openPendingRewardChest,
    pendingRewardChest,
    pendingRewardChestType,
    queueCellRewardChest,
    queueMineCompletionRewardChest,
    resetRewardChest,
    rewardChestStage
  };
}

function createMineCompletionRewardChest(content: ContentBundle, mineTemplateId: string): PendingRewardChest | null {
  const mineTemplate = content.mineTemplates.find((template) => template.id === mineTemplateId);
  const chestTypeId = mineTemplate?.completionRewardChestTypeId;

  if (!chestTypeId || !findRewardChestType(content, chestTypeId)) {
    return null;
  }

  return {
    chestTypeId,
    id: `${mineTemplateId}:${chestTypeId}`,
    mineTemplateId,
    rewards: null,
    source: "mine_completion"
  };
}

function findRewardChestType(content: ContentBundle, chestTypeId: string): RewardChestTypeConfig | null {
  return (content.rewardChestTypes ?? []).find((chestType) => chestType.id === chestTypeId) ?? null;
}

function createChestRewardFlyouts(
  rewards: Record<string, number>,
  content: ContentBundle,
  labels: Record<string, string>
): ChestRewardFlyout[] {
  return rewardDropsFromMap(rewards, content, labels).map((reward, index) => {
    const direction = index % 2 === 0 ? -1 : 1;
    const distance = 122 + index * 18;

    return {
      ...reward,
      delayMs: index * 170,
      distance,
      id: ++chestRewardSequence,
      x: direction * (28 + index * 20)
    };
  });
}

function clearRewardChestSummaryTimer(timeoutRef: { current: number | null }): void {
  if (timeoutRef.current === null) {
    return;
  }

  window.clearTimeout(timeoutRef.current);
  timeoutRef.current = null;
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

function markMineCompletionNoticeSeen(seenIds: string[], mineTemplateId: string): string[] {
  return seenIds.includes(mineTemplateId) ? seenIds : [...seenIds, mineTemplateId];
}
