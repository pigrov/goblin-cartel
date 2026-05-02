import type { ContentBundle, GoblinConfig } from "@goblin-cartel/content-schemas";
import {
  getGoblinLevel,
  hireGoblin,
  isGoblinHired,
  upgradeGoblin,
  upgradeGoblinHut,
  type GoblinRosterState,
  type MiningSession
} from "@goblin-cartel/game-core";
import { type Dispatch, type SetStateAction, useMemo, useState } from "react";
import {
  createGoblinHutProgressionState,
  createGoblinIdentity,
  isMiningGoblin
} from "./goblinHutClientState";
import {
  placeGoblinInFirstFreeColumn,
  useGoblinPlacement
} from "./useGoblinPlacement";

export function useGoblinRosterController(input: {
  completedMineTemplateIds: string[];
  content: ContentBundle;
  currentPlatformRow: number;
  labels: Record<string, string>;
  onActiveCellChange: Dispatch<SetStateAction<{ row: number; col: number }>>;
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
  const hiredGoblins = useMemo(
    () => availableGoblins.filter((goblin) => isGoblinHired(input.roster, goblin.id)),
    [availableGoblins, input.roster]
  );
  const goblinLevels = input.roster.goblinLevels ?? {};
  const miningGoblins = useMemo(() => hiredGoblins.filter(isMiningGoblin), [hiredGoblins]);
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
    roster: input.roster,
    session: input.session
  });

  function handleHireGoblin(goblin: GoblinConfig) {
    const result = hireGoblin({
      builtMinesCount: input.visibleBuiltMinesCount,
      completedMineTemplateIds: input.completedMineTemplateIds,
      goblinId: goblin.id,
      goblinHut: input.content.goblinHut,
      goblins: availableGoblins,
      roster: input.roster,
      resources: input.resources
    });

    if (!result.ok) {
      setRosterMessage(messageForHireFailure(result.reason));
      return;
    }

    input.setRoster(result.roster);
    if (isMiningGoblin(goblin)) {
      setGoblinPlacements((current) => placeGoblinInFirstFreeColumn(input.session, current, goblin.id, input.currentPlatformRow));
    }
    input.syncVisibleResourceAmounts(result.resources);
    input.setSession((current) => ({
      ...current,
      resources: result.resources,
      lastRewards: {}
    }));
    setRosterMessage(`${goblinName(goblin, input.labels)} нанят.`);
  }

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
    setRosterMessage(`${goblinName(goblin, input.labels)} уровень ${getGoblinLevel(result.roster, goblin.id)}.`);
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
    setRosterMessage(`Хижина уровень ${result.roster.hutLevel ?? 1}.`);
  }

  return {
    availableGoblins,
    goblinHutProgression,
    goblinLevels,
    goblinPlacements,
    handleHireGoblin,
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

function createAvailableGoblins(content: ContentBundle): GoblinConfig[] {
  return [...content.goblins].sort((left, right) => left.sortOrder - right.sortOrder);
}

function goblinName(goblin: GoblinConfig, labels: Record<string, string>): string {
  return createGoblinIdentity(goblin, labels).fullName;
}

function messageForHireFailure(reason: string): string {
  switch (reason) {
    case "already_hired":
      return "Этот гоблин уже в бригаде.";
    case "hut_limit":
      return "Лимит Хижины заполнен. Улучши Хижину, чтобы нанять больше.";
    case "locked":
      return "Условия найма еще не выполнены.";
    case "not_enough_resources":
      return "Не хватает ресурсов для найма.";
    case "role_locked":
      return "Эта роль еще не открыта уровнем Хижины.";
    default:
      return "Найм не прошел.";
  }
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

function messageForGoblinUpgradeFailure(reason: string): string {
  switch (reason) {
    case "max_level":
      return "Гоблин уже на максимальном уровне.";
    case "not_enough_resources":
      return "Не хватает ресурсов для прокачки.";
    case "not_hired":
      return "Сначала найми этого гоблина.";
    default:
      return "Прокачка не прошла.";
  }
}
