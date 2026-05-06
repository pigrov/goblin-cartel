import { type ContentBundle, type GoblinConfig } from "@goblin-cartel/content-schemas";
import {
  assignBuiltMineCollector,
  buildMineFromVein,
  getGoblinLevel,
  upgradeBuiltMine,
  type BuiltMineState,
  type GoblinRosterState,
  type MiningFoundVein,
  type MiningSession
} from "@goblin-cartel/game-core";
import { type Dispatch, type SetStateAction, useEffect, useMemo, useRef } from "react";
import {
  collectAutomatedBuiltMineIncomeWithCollectors,
  collectBuiltMineIncomeWithCollector,
  createBuiltMineUpgradePreview,
  createConstructionSupportState,
  createVisibleBuiltMines,
  findUnbuiltFoundVeins,
  getGoblinAutoCollectSlots,
  hasCollectorSlotAvailable,
  hasBuiltMineForVein,
  isConstructionSupportGoblin
} from "./builtMineClientState";
import { createGoblinIdentity } from "./goblinHutClientState";

const builtMineAutoCollectionTickMs = 1000;

export function useBuiltMinesController(input: {
  builtMines: BuiltMineState[];
  clockNow: number;
  collectorPickerMineId: string | null;
  content: ContentBundle;
  goblinLevels: Record<string, number>;
  hiredGoblins: GoblinConfig[];
  labels: Record<string, string>;
  resources: Record<string, number>;
  roster: GoblinRosterState;
  session: MiningSession;
  sessionReady: boolean;
  setBuiltMineMessage: Dispatch<SetStateAction<string | null>>;
  setBuiltMines: Dispatch<SetStateAction<BuiltMineState[]>>;
  setFoundVeinNotice: Dispatch<SetStateAction<MiningFoundVein | null>>;
  setSession: Dispatch<SetStateAction<MiningSession>>;
  syncVisibleResourceAmounts: (resources: Record<string, number>) => void;
}) {
  const builtMinesRef = useRef(input.builtMines);
  const hiredCollectorGoblinsRef = useRef<GoblinConfig[]>([]);
  const rosterRef = useRef(input.roster);
  const sessionRef = useRef(input.session);

  const hiredCollectorGoblins = useMemo(
    () => input.hiredGoblins.filter((goblin) => getGoblinAutoCollectSlots(goblin, getGoblinLevel(input.roster, goblin.id)) > 0),
    [input.hiredGoblins, input.roster]
  );
  const constructionSupportGoblins = useMemo(() => input.hiredGoblins.filter(isConstructionSupportGoblin), [input.hiredGoblins]);
  const constructionSupport = useMemo(
    () => createConstructionSupportState(constructionSupportGoblins, input.goblinLevels),
    [constructionSupportGoblins, input.goblinLevels]
  );
  const visibleBuiltMines = useMemo(
    () => createVisibleBuiltMines(input.builtMines, input.clockNow, hiredCollectorGoblins, input.goblinLevels),
    [input.builtMines, input.clockNow, input.goblinLevels, hiredCollectorGoblins]
  );
  const builtMineUpgradePreviews = useMemo(() => {
    const progressedBuiltMines = createVisibleBuiltMines(input.builtMines, input.clockNow);
    const builtMineTypesById = new Map(input.content.builtMineTypes.map((builtMineType) => [builtMineType.id, builtMineType]));

    return new Map(
      progressedBuiltMines.map((builtMine) => [
        builtMine.id,
        createBuiltMineUpgradePreview(
          builtMine,
          input.resources,
          builtMineTypesById.get(builtMine.typeId)?.upgrade,
          constructionSupport.upgradeCostMultiplier
        )
      ])
    );
  }, [input.builtMines, input.clockNow, input.content.builtMineTypes, input.resources, constructionSupport.upgradeCostMultiplier]);
  const collectorPickerBuiltMine = useMemo(
    () => visibleBuiltMines.find((builtMine) => builtMine.id === input.collectorPickerMineId) ?? null,
    [input.collectorPickerMineId, visibleBuiltMines]
  );
  const unbuiltFoundVeins = useMemo(
    () => findUnbuiltFoundVeins(input.session.foundVeins, visibleBuiltMines),
    [input.session.foundVeins, visibleBuiltMines]
  );

  useEffect(() => {
    builtMinesRef.current = input.builtMines;
    hiredCollectorGoblinsRef.current = hiredCollectorGoblins;
    rosterRef.current = input.roster;
    sessionRef.current = input.session;
  });

  useEffect(() => {
    if (!input.sessionReady) {
      return;
    }

    const intervalId = window.setInterval(() => {
      if (!builtMinesRef.current.some((builtMine) => builtMine.assignedCollectorGoblinId)) {
        return;
      }

      const result = collectAutomatedBuiltMineIncomeWithCollectors({
        builtMines: builtMinesRef.current,
        collectors: hiredCollectorGoblinsRef.current,
        goblinLevels: {},
        now: Date.now(),
        resources: sessionRef.current.resources
      });

      input.setBuiltMines(result.builtMines);

      if (result.collectedAmount <= 0) {
        return;
      }

      input.setSession((current) => ({
        ...current,
        lastRewards: {},
        resources: mergeResourceMaps(current.resources, result.collectedResources)
      }));
      input.syncVisibleResourceAmounts(result.resources);
    }, builtMineAutoCollectionTickMs);

    return () => window.clearInterval(intervalId);
  }, [input.sessionReady, input.setBuiltMines, input.setSession, input.syncVisibleResourceAmounts]);

  function notifyFoundVein(vein: MiningFoundVein | null) {
    if (!vein || hasBuiltMineForVein(builtMinesRef.current, vein.id)) {
      return;
    }

    input.setFoundVeinNotice(vein);
    input.setBuiltMineMessage(`Рудник расчищен. ${veinNameById(vein.veinTypeId, input.content, input.labels)} найдена.`);
  }

  function handleBuildMineFromVein(vein: MiningFoundVein): boolean {
    if (hasBuiltMineForVein(input.builtMines, vein.id)) {
      input.setBuiltMineMessage("На этой жиле уже построена шахта.");
      return false;
    }

    const result = buildMineFromVein({
      buildCostMultiplier: constructionSupport.buildCostMultiplier,
      buildTimeMultiplier: constructionSupport.buildTimeMultiplier,
      builtMineTypes: input.content.builtMineTypes,
      now: Date.now(),
      resources: input.session.resources,
      vein
    });

    if (!result.ok) {
      input.setBuiltMineMessage(messageForBuildMineFailure(result.reason));
      return false;
    }

    input.setBuiltMines((current) => [...current, result.builtMine]);
    input.setSession((current) => ({
      ...current,
      lastRewards: {},
      resources: result.resources
    }));
    input.syncVisibleResourceAmounts(result.resources);
    input.setBuiltMineMessage(`${builtMineTypeName(result.builtMine.typeId, input.content, input.labels)} строится.`);
    return true;
  }

  function handleCollectBuiltMine(builtMineId: string) {
    const builtMine = input.builtMines.find((mine) => mine.id === builtMineId);

    if (!builtMine) {
      return;
    }

    const collector = builtMine.assignedCollectorGoblinId
      ? hiredCollectorGoblins.find((goblin) => goblin.id === builtMine.assignedCollectorGoblinId)
      : undefined;
    const result = collectBuiltMineIncomeWithCollector({
      builtMine,
      collector,
      collectorLevel: collector ? getGoblinLevel(input.roster, collector.id) : undefined,
      now: Date.now(),
      resources: input.session.resources
    });

    input.setBuiltMines((current) => current.map((mine) => (mine.id === builtMineId ? result.builtMine : mine)));

    if (result.collectedAmount <= 0) {
      input.setBuiltMineMessage("В хранилище шахты пока пусто.");
      return;
    }

    input.setSession((current) => ({
      ...current,
      lastRewards: {},
      resources: result.resources
    }));
    input.syncVisibleResourceAmounts(result.resources);
    input.setBuiltMineMessage(
      `Собрано ${formatInteger(result.collectedAmount)} ${resourceLabelById(result.builtMine.productionResourceId, input.labels, input.content)}.`
    );
  }

  function handleCollectAllBuiltMines() {
    const now = Date.now();
    const collectedResources: Record<string, number> = {};
    let nextResources = input.session.resources;
    let collectedTotal = 0;

    const nextBuiltMines = input.builtMines.map((builtMine) => {
      const collector = builtMine.assignedCollectorGoblinId
        ? hiredCollectorGoblins.find((goblin) => goblin.id === builtMine.assignedCollectorGoblinId)
        : undefined;
      const result = collectBuiltMineIncomeWithCollector({
        builtMine,
        collector,
        collectorLevel: collector ? getGoblinLevel(input.roster, collector.id) : undefined,
        now,
        resources: nextResources
      });

      nextResources = result.resources;

      if (result.collectedAmount > 0) {
        collectedTotal += result.collectedAmount;
        collectedResources[result.builtMine.productionResourceId] =
          (collectedResources[result.builtMine.productionResourceId] ?? 0) + result.collectedAmount;
      }

      return result.builtMine;
    });

    input.setBuiltMines(nextBuiltMines);

    if (collectedTotal <= 0) {
      input.setBuiltMineMessage("В шахтах пока нечего собрать.");
      return;
    }

    input.setSession((current) => ({
      ...current,
      lastRewards: {},
      resources: nextResources
    }));
    input.syncVisibleResourceAmounts(nextResources);
    input.setBuiltMineMessage(
      `Собрано ${resourceAmountSummaryLabel(rewardDropsFromMap(collectedResources, input.content, input.labels), input.labels, input.content)}.`
    );
  }

  function handleUpgradeBuiltMine(builtMineId: string) {
    const builtMine = builtMinesRef.current.find((mine) => mine.id === builtMineId);

    if (!builtMine) {
      return;
    }

    const result = upgradeBuiltMine({
      builtMine,
      costMultiplier: constructionSupport.upgradeCostMultiplier,
      now: Date.now(),
      resources: sessionRef.current.resources,
      upgrade: input.content.builtMineTypes.find((builtMineType) => builtMineType.id === builtMine.typeId)?.upgrade
    });

    if (!result.ok) {
      input.setBuiltMineMessage(messageForUpgradeBuiltMineFailure(result.reason));
      return;
    }

    input.setBuiltMines((current) => current.map((mine) => (mine.id === builtMineId ? result.builtMine : mine)));
    input.setSession((current) => ({
      ...current,
      lastRewards: {},
      resources: result.resources
    }));
    input.syncVisibleResourceAmounts(result.resources);
    input.setBuiltMineMessage(
      `${builtMineTypeName(result.builtMine.typeId, input.content, input.labels)} улучшена до уровня ${result.builtMine.level}.`
    );
  }

  function handleAssignBuiltMineCollector(builtMineId: string, goblinId: string | null) {
    const builtMine = input.builtMines.find((mine) => mine.id === builtMineId);

    if (!builtMine) {
      return;
    }

    if (!goblinId) {
      input.setBuiltMines((current) =>
        current.map((mine) => (mine.id === builtMineId ? { ...mine, assignedCollectorGoblinId: null } : mine))
      );
      input.setBuiltMineMessage(`Автосбор снят с ${builtMineTypeName(builtMine.typeId, input.content, input.labels)}.`);
      return;
    }

    const collector = hiredCollectorGoblins.find((goblin) => goblin.id === goblinId);

    if (!collector) {
      input.setBuiltMineMessage("Сначала найми гоблина-сборщика.");
      return;
    }

    if (!hasCollectorSlotAvailable(collector, input.builtMines, builtMineId, getGoblinLevel(input.roster, collector.id))) {
      input.setBuiltMineMessage(`${goblinName(collector, input.labels)} уже занят.`);
      return;
    }

    input.setBuiltMines((current) =>
      current.map((mine) => (mine.id === builtMineId ? assignBuiltMineCollector(mine, collector.id) : mine))
    );
    input.setBuiltMineMessage(
      `${goblinName(collector, input.labels)} назначен на ${builtMineTypeName(builtMine.typeId, input.content, input.labels)}.`
    );
  }

  return {
    builtMineUpgradePreviews,
    collectorPickerBuiltMine,
    constructionSupport,
    handleAssignBuiltMineCollector,
    handleBuildMineFromVein,
    handleCollectAllBuiltMines,
    handleCollectBuiltMine,
    handleUpgradeBuiltMine,
    hiredCollectorGoblins,
    notifyFoundVein,
    unbuiltFoundVeins,
    visibleBuiltMines
  };
}

interface RewardDrop {
  amount: number;
  label: string;
  resourceId: string;
}

function veinNameById(veinTypeId: string, content: ContentBundle, labels: Record<string, string>): string {
  const veinType = content.veinTypes.find((item) => item.id === veinTypeId);
  return veinType ? labelFromNameKey(veinType.nameKey, veinType.id, labels) : veinTypeId;
}

function builtMineTypeName(typeId: string, content: ContentBundle, labels: Record<string, string>): string {
  const builtMineType = content.builtMineTypes.find((item) => item.id === typeId);
  return builtMineType ? labelFromNameKey(builtMineType.nameKey, builtMineType.id, labels) : typeId;
}

function goblinName(goblin: GoblinConfig, labels: Record<string, string>): string {
  return createGoblinIdentity(goblin, labels).fullName;
}

function resourceLabelById(resourceId: string, labels: Record<string, string>, content: ContentBundle): string {
  const resource = content.resources.find((item) => item.id === resourceId);
  return resource ? labelFromNameKey(resource.nameKey, resource.id, labels) : resourceId;
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

function resourceAmountSummaryLabel(
  resources: Array<{ amount: number; label?: string; resourceId: string }>,
  labels: Record<string, string>,
  content: ContentBundle
): string {
  if (resources.length === 0) {
    return "0";
  }

  return resources
    .map((resource) => `${formatInteger(resource.amount)} ${resource.label ?? resourceLabelById(resource.resourceId, labels, content)}`)
    .join(" · ");
}

function labelFromNameKey(nameKey: string, fallback: string, labels: Record<string, string>): string {
  return labels[nameKey] ?? fallback;
}

function formatInteger(value: number): string {
  return Number.isFinite(value) ? String(Math.max(0, Math.floor(value))) : "0";
}

function mergeResourceMaps(left: Record<string, number>, right: Record<string, number>): Record<string, number> {
  const result = { ...left };

  for (const [resourceId, amount] of Object.entries(right)) {
    result[resourceId] = (result[resourceId] ?? 0) + amount;
  }

  return result;
}

function messageForBuildMineFailure(reason: string): string {
  switch (reason) {
    case "missing_built_mine_type":
      return "Для этой жилы пока нет проекта шахты.";
    case "not_enough_resources":
      return "Не хватает ресурсов для строительства шахты.";
    default:
      return "Шахта не построена.";
  }
}

function messageForUpgradeBuiltMineFailure(reason: string): string {
  switch (reason) {
    case "max_level":
      return "Шахта уже на максимальном уровне.";
    case "mine_not_active":
      return "Сначала дождись завершения строительства шахты.";
    case "not_enough_resources":
      return "Не хватает ресурсов для улучшения шахты.";
    default:
      return "Шахта не улучшена.";
  }
}
