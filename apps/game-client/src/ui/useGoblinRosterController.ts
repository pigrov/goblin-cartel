import type { ContentBundle, GoblinConfig } from "@goblin-cartel/content-schemas";
import {
  getGoblinLevel,
  getGoblinStars,
  hireGoblin,
  mergeGoblins,
  upgradeGoblin,
  upgradeGoblinHut,
  type GoblinRosterState,
  type MiningSession
} from "@goblin-cartel/game-core";
import { type Dispatch, type SetStateAction, useMemo, useState } from "react";
import { createGoblinHutProgressionState, createGoblinIdentity, isMiningGoblin } from "./goblinHutClientState";
import { placeGoblinInFirstFreeColumn, useGoblinPlacement } from "./useGoblinPlacement";
import { createAvailableGoblins } from "./goblinContent";
import { createRuntimeGoblinConfigs, type RuntimeGoblinConfig } from "./goblinRuntimeUnits";

export function useGoblinRosterController(input: {
  completedMineTemplateIds: string[];
  content: ContentBundle;
  currentPlatformRow: number;
  labels: Record<string, string>;
  onActiveCellChange: Dispatch<SetStateAction<{ row: number; col: number }>>;
  platformSlots: number;
  resources: Record<string, number>;
  roster: GoblinRosterState;
  session: MiningSession;
  setRoster: Dispatch<SetStateAction<GoblinRosterState>>;
  setSession: Dispatch<SetStateAction<MiningSession>>;
  syncVisibleResourceAmounts: (resources: Record<string, number>) => void;
  visibleBuiltMinesCount: number;
}) {
  const [rosterMessage, setRosterMessage] = useState<string | null>(null);
  const availableGoblins = useMemo(() => createAvailableGoblins(input.content), [input.content]);
  const runtimeGoblins = useMemo(() => createRuntimeGoblinConfigs(availableGoblins, input.roster), [availableGoblins, input.roster]);
  const hiredGoblins = runtimeGoblins;
  const goblinLevels = useMemo(
    () => Object.fromEntries((input.roster.instances ?? []).map((instance) => [instance.id, instance.level])),
    [input.roster.instances]
  );
  const miningGoblins = useMemo(() => runtimeGoblins.filter(isMiningGoblin), [runtimeGoblins]);
  const goblinHutProgression = useMemo(
    () =>
      createGoblinHutProgressionState({
        builtMinesCount: input.visibleBuiltMinesCount,
        completedMineTemplateIds: input.completedMineTemplateIds,
        content: input.content,
        resources: input.resources,
        roster: input.roster
      }),
    [input.completedMineTemplateIds, input.content, input.resources, input.roster, input.visibleBuiltMinesCount]
  );
  const {
    columnTacticHints,
    goblinPlacements,
    handlePlaceGoblin,
    pixiGoblins,
    platformCellKeys,
    setGoblinPlacements
  } = useGoblinPlacement({
    currentPlatformRow: input.currentPlatformRow,
    labels: input.labels,
    miningGoblins,
    onActiveCellChange: input.onActiveCellChange,
    platformSlots: input.platformSlots,
    roster: input.roster,
    session: input.session
  });

  function handleUpgradeGoblin(goblin: GoblinConfig) {
    const result = upgradeGoblin({
      goblinId: goblin.id,
      goblinHut: input.content.goblinHut,
      goblins: availableGoblins,
      resources: input.resources,
      roster: input.roster
    });

    if (!result.ok) {
      setRosterMessage(messageForGoblinUpgradeFailure(result.reason));
      return;
    }

    input.setRoster(result.roster);
    input.syncVisibleResourceAmounts(result.resources);
    input.setSession((current) => ({
      ...current,
      resources: result.resources,
      lastRewards: {}
    }));
    setRosterMessage(
      `${goblinName(goblin, input.labels)}: ${getGoblinLevel(result.roster, result.instance.id)} ур., ${getGoblinStars(result.roster, result.instance.id)} зв.`
    );
  }

  function handleMergeGoblins(sourceGoblinId: string, targetGoblinId: string) {
    const result = mergeGoblins({
      goblins: availableGoblins,
      roster: input.roster,
      sourceGoblinId,
      targetGoblinId
    });

    if (!result.ok) {
      setRosterMessage(messageForGoblinMergeFailure(result.reason));
      return;
    }

    input.setRoster(result.roster);
    setGoblinPlacements((current) => {
      const next = { ...current };
      delete next[result.consumedInstanceId];
      return next;
    });
    const mergedGoblin = availableGoblins.find((goblin) => goblin.id === result.instance.goblinId);
    setRosterMessage(
      `${mergedGoblin ? goblinName(mergedGoblin, input.labels) : "Гоблин"}: ${result.instance.level} ур., ${result.instance.stars} зв.`
    );
  }

  function handleUpgradeGoblinHut() {
    const result = upgradeGoblinHut({
      builtMinesCount: input.visibleBuiltMinesCount,
      completedMineTemplateIds: input.completedMineTemplateIds,
      goblinHut: input.content.goblinHut,
      goblins: availableGoblins,
      resources: input.resources,
      roster: input.roster
    });

    if (!result.ok) {
      setRosterMessage(messageForGoblinHutUpgradeFailure(result.reason));
      return;
    }

    input.setRoster(result.roster);
    input.syncVisibleResourceAmounts(result.resources);
    input.setSession((current) => ({
      ...current,
      resources: result.resources,
      lastRewards: {}
    }));
    setRosterMessage(`Хижина: ${result.roster.hutLevel ?? 1} уровень.`);
  }

  function handleHireGoblin(goblinId: string) {
    const result = hireGoblin({
      builtMinesCount: input.visibleBuiltMinesCount,
      completedMineTemplateIds: input.completedMineTemplateIds,
      goblinId,
      goblinHut: input.content.goblinHut,
      goblins: availableGoblins,
      resources: input.resources,
      roster: input.roster
    });

    if (!result.ok) {
      setRosterMessage(messageForHireFailure(result.reason));
      return;
    }

    input.setRoster(result.roster);
    input.syncVisibleResourceAmounts(result.resources);
    input.setSession((current) => ({
      ...current,
      resources: result.resources,
      lastRewards: {}
    }));

    const hiredGoblin = availableGoblins.find((goblin) => goblin.id === result.instance.goblinId);
    if (hiredGoblin && isMiningGoblin(hiredGoblin)) {
      setGoblinPlacements((current) =>
        placeGoblinInFirstFreeColumn(input.session, current, result.instance.id, input.currentPlatformRow, {
          maxPlacements: input.platformSlots
        })
      );
    }

    setRosterMessage(`${hiredGoblin ? goblinName(hiredGoblin, input.labels) : "Гоблин"} нанят.`);
  }

  return {
    availableGoblins,
    columnTacticHints,
    goblinHutProgression,
    goblinLevels,
    goblinPlacements,
    handleHireGoblin,
    handleMergeGoblins,
    handlePlaceGoblin,
    handleUpgradeGoblin,
    handleUpgradeGoblinHut,
    hiredGoblins,
    miningGoblins,
    pixiGoblins,
    platformCellKeys,
    rosterMessage,
    setGoblinPlacements
  };
}

function goblinName(goblin: GoblinConfig | RuntimeGoblinConfig, labels: Record<string, string>): string {
  return createGoblinIdentity(goblin, labels).fullName;
}

function messageForGoblinHutUpgradeFailure(reason: string): string {
  switch (reason) {
    case "locked":
      return "Условия улучшения Хижины еще не выполнены.";
    case "not_enough_resources":
      return "Не хватает ресурсов для улучшения Хижины.";
    case "max_level":
      return "Хижина уже на максимальном уровне.";
    default:
      return "Хижина не улучшена.";
  }
}

function messageForHireFailure(reason: string): string {
  switch (reason) {
    case "hut_limit":
      return "Лимит Хижины заполнен. Улучши Хижину, чтобы нанять больше.";
    case "missing_goblin":
      return "Гоблин настроен некорректно.";
    case "not_enough_resources":
      return "Не хватает золота для найма.";
    case "role_locked":
      return "Эта роль еще не открыта уровнем Хижины.";
    case "locked":
      return "Условия найма еще не выполнены.";
    default:
      return "Найм не прошел.";
  }
}

function messageForGoblinUpgradeFailure(reason: string): string {
  switch (reason) {
    case "max_level":
      return "Гоблин уже на максимальном уровне.";
    case "needs_stars":
      return "Сначала объедини одинаковых гоблинов до 5 звезд.";
    case "not_enough_resources":
      return "Не хватает золота для прокачки.";
    case "not_hired":
      return "Сначала найми этого гоблина.";
    default:
      return "Прокачка не прошла.";
  }
}

function messageForGoblinMergeFailure(reason: string): string {
  switch (reason) {
    case "max_stars":
      return "Пятизвездочного гоблина можно только улучшить.";
    case "mismatch":
      return "Для объединения нужны одинаковые гоблины с тем же уровнем и звездами.";
    case "same_instance":
      return "Выбери второго такого же гоблина.";
    case "missing_goblin":
    case "not_hired":
      return "Гоблин для объединения не найден.";
    default:
      return "Объединение не прошло.";
  }
}
