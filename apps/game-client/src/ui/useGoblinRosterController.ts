import type { ContentBundle, GoblinConfig } from "@goblin-cartel/content-schemas";
import {
  getGoblinLevel,
  hireRandomGoblin,
  isGoblinHired,
  upgradeGoblin,
  upgradeGoblinHut,
  type GoblinRosterInstance,
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
import { createAvailableGoblins } from "./goblinContent";
import { createInstanceBackedGoblinConfig, createRuntimeGoblinConfigs, type RuntimeGoblinConfig } from "./goblinRuntimeUnits";

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
  const [randomGoblinReveal, setRandomGoblinReveal] = useState<RandomGoblinReveal | null>(null);
  const availableGoblins = useMemo(() => createAvailableGoblins(input.content), [input.content]);
  const hiredGoblins = useMemo(
    () => availableGoblins.filter((goblin) => isGoblinHired(input.roster, goblin.id)),
    [availableGoblins, input.roster]
  );
  const goblinLevels = input.roster.goblinLevels ?? {};
  const runtimeGoblins = useMemo(() => createRuntimeGoblinConfigs(availableGoblins, input.roster), [availableGoblins, input.roster]);
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

  function handleHireRandomGoblin(archetypeId: string) {
    const generation = input.content.goblinGeneration;

    if (!generation) {
      setRosterMessage("Контракты гоблинов еще не настроены.");
      return;
    }

    const result = hireRandomGoblin({
      archetypeId,
      archetypes: generation.archetypes,
      goblinHut: input.content.goblinHut,
      goblins: availableGoblins,
      namePool: generation.namePool,
      resources: input.resources,
      roster: input.roster,
      seed: input.session.mine.seed
    });

    if (!result.ok) {
      setRosterMessage(messageForRandomHireFailure(result.reason));
      return;
    }

    input.setRoster(result.roster);
    input.syncVisibleResourceAmounts(result.resources);
    input.setSession((current) => ({
      ...current,
      resources: result.resources,
      lastRewards: {}
    }));
    const archetypeGoblin = availableGoblins.find((goblin) => goblin.id === result.instance.archetypeId) ?? null;

    if (!archetypeGoblin) {
      setRosterMessage("Найм прошел, но контракт гоблина не найден.");
      return;
    }

    const revealGoblin = createInstanceBackedGoblinConfig(archetypeGoblin, result.instance);

    setRandomGoblinReveal({
      archetypeId,
      goblin: revealGoblin,
      instance: result.instance
    });
    if (isMiningGoblin(revealGoblin)) {
      setGoblinPlacements((current) =>
        placeGoblinInFirstFreeColumn(input.session, current, result.instance.id, input.currentPlatformRow, {
          maxPlacements: input.platformSlots
        })
      );
    }
    setRosterMessage(`${randomGoblinName(result.instance, revealGoblin, input.labels)} нанят.`);
  }

  return {
    availableGoblins,
    columnTacticHints,
    goblinHutProgression,
    goblinLevels,
    goblinPlacements,
    handleHireRandomGoblin,
    handlePlaceGoblin,
    handleUpgradeGoblin,
    handleUpgradeGoblinHut,
    hiredGoblins,
    miningGoblins,
    pixiGoblins,
    platformCellKeys,
    randomGoblinReveal,
    rosterMessage,
    setRandomGoblinReveal,
    setGoblinPlacements
  };
}

export interface RandomGoblinReveal {
  archetypeId: string;
  goblin: GoblinConfig;
  instance: GoblinRosterInstance;
}

function goblinName(goblin: GoblinConfig | RuntimeGoblinConfig, labels: Record<string, string>): string {
  const identity = createGoblinIdentity(goblin, labels);
  const name = "instanceName" in goblin ? goblin.instanceName?.trim() || identity.name : identity.name;
  const nickname = "instanceNickname" in goblin ? goblin.instanceNickname?.trim() || identity.nickname : identity.nickname;
  return nickname ? `${name} ${nickname}` : name;
}

function randomGoblinName(instance: GoblinRosterInstance, goblin: GoblinConfig, labels: Record<string, string>): string {
  const identity = createGoblinIdentity(goblin, labels);
  const name = instance.name?.trim() || identity.name;
  const nickname = instance.nickname?.trim() || identity.nickname;

  return nickname ? `${name} ${nickname}` : name;
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

function messageForRandomHireFailure(reason: string): string {
  switch (reason) {
    case "hut_limit":
      return "Лимит Хижины заполнен. Улучши Хижину, чтобы нанять больше.";
    case "missing_archetype":
      return "Контракт найма настроен некорректно.";
    case "not_enough_resources":
      return "Не хватает ресурсов для контракта.";
    case "role_locked":
      return "Эта роль еще не открыта уровнем Хижины.";
    default:
      return "Найм не прошел.";
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
