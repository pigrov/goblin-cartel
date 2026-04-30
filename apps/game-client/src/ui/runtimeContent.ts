import { starterContentBundle, type ContentBundle, type GoblinConfig } from "@goblin-cartel/content-schemas";

const runtimeTestMineRows = 10;
const runtimeMineMetersPerRow = 1;

export function createRuntimeContentBundle(content: ContentBundle): ContentBundle {
  const contentWithDefaults = withStarterRuntimeDefaults(content);
  const debugRows = readDebugMineRows();
  const targetRows = debugRows ?? runtimeTestMineRows;
  const targetDepthMeters = targetRows * runtimeMineMetersPerRow;
  const mineTemplate = contentWithDefaults.mineTemplates[0];

  if (!mineTemplate) {
    return contentWithDefaults;
  }

  const currentDepthMeters = mineTemplate.depthMeters ?? mineTemplate.height;
  const shouldUseRuntimeMine =
    Boolean(debugRows) || mineTemplate.height !== targetRows || currentDepthMeters !== targetDepthMeters;

  if (!shouldUseRuntimeMine) {
    return contentWithDefaults;
  }

  const cellMap = resizeCellMap(mineTemplate.cellMap ?? [], mineTemplate.width, targetRows);

  if (cellMap.length === 0) {
    return contentWithDefaults;
  }

  return {
    ...contentWithDefaults,
    mineTemplates: [
      {
        ...mineTemplate,
        depthMeters: targetDepthMeters,
        height: targetRows,
        id: `${mineTemplate.id}_${debugRows ? "debug" : "test"}_${targetRows}`,
        cellMap
      },
      ...contentWithDefaults.mineTemplates.slice(1)
    ]
  };
}

export function contentVersionWithRuntimeSuffix(version: string, content: ContentBundle): string {
  const debugRows = readDebugMineRows();
  const mineTemplate = content.mineTemplates[0];
  const targetDepthMeters = runtimeTestMineRows * runtimeMineMetersPerRow;

  if (debugRows) {
    return `${version}:debug-${debugRows}`;
  }

  if (mineTemplate?.id.endsWith(`_test_${runtimeTestMineRows}`)) {
    return `${version}:test-${runtimeTestMineRows}`;
  }

  return mineTemplate?.height === runtimeTestMineRows && mineTemplate.depthMeters === targetDepthMeters
    ? `${version}:mine-${runtimeTestMineRows}`
    : version;
}

function readDebugMineRows(): number | null {
  if (!import.meta.env.DEV || typeof window === "undefined") {
    return null;
  }

  const raw = new URLSearchParams(window.location.search).get("debugMineRows");
  const rows = raw ? Number(raw) : 0;

  if (!Number.isInteger(rows) || rows < runtimeTestMineRows || rows > 200) {
    return null;
  }

  return rows;
}

function withStarterRuntimeDefaults(content: ContentBundle): ContentBundle {
  const resources = mergeStarterItems(content.resources ?? [], starterContentBundle.resources);
  const blockTypes = mergeStarterItems(content.blockTypes ?? [], starterContentBundle.blockTypes);
  const veinTypes = mergeStarterItems(content.veinTypes ?? [], starterContentBundle.veinTypes);
  const builtMineTypes = mergeStarterItems(content.builtMineTypes ?? [], starterContentBundle.builtMineTypes);
  const rewardChestTypes = mergeStarterItems(content.rewardChestTypes ?? [], starterContentBundle.rewardChestTypes);
  const goblins = mergeStarterGoblins(content.goblins ?? [], starterContentBundle.goblins);
  const localization = mergeStarterLocalization(content.localization, starterContentBundle.localization);
  let changed = false;

  if (
    resources !== content.resources ||
    blockTypes !== content.blockTypes ||
    veinTypes !== content.veinTypes ||
    builtMineTypes !== content.builtMineTypes ||
    rewardChestTypes !== content.rewardChestTypes ||
    goblins !== content.goblins ||
    localization !== content.localization
  ) {
    changed = true;
  }

  const mineTemplates = sortMineTemplates(content.mineTemplates).map((mineTemplate) => {
    const starterMineTemplate = findStarterMineTemplate(mineTemplate.id);
    let nextMineTemplate = mineTemplate;

    if ((nextMineTemplate.cellMap ?? []).length === 0 && starterMineTemplate?.cellMap.length) {
      nextMineTemplate = {
        ...nextMineTemplate,
        cellMap: resizeCellMap(starterMineTemplate.cellMap, nextMineTemplate.width, nextMineTemplate.height),
        difficultyEnd: nextMineTemplate.difficultyEnd ?? starterMineTemplate.difficultyEnd,
        difficultyStart: nextMineTemplate.difficultyStart ?? starterMineTemplate.difficultyStart
      };
      changed = true;
    }

    if (!nextMineTemplate.completionVeinTypeId && starterMineTemplate?.completionVeinTypeId) {
      nextMineTemplate = {
        ...nextMineTemplate,
        completionVeinTypeId: starterMineTemplate.completionVeinTypeId
      };
      changed = true;
    }

    if (!nextMineTemplate.completionRewardChestTypeId && starterMineTemplate?.completionRewardChestTypeId) {
      nextMineTemplate = {
        ...nextMineTemplate,
        completionRewardChestTypeId: starterMineTemplate.completionRewardChestTypeId
      };
      changed = true;
    }

    if (!nextMineTemplate.sortOrder && starterMineTemplate?.sortOrder) {
      nextMineTemplate = {
        ...nextMineTemplate,
        sortOrder: starterMineTemplate.sortOrder
      };
      changed = true;
    }

    if (nextMineTemplate.completionVeinTypeId && (nextMineTemplate.guaranteedObjects ?? []).some((object) => object.type === "vein")) {
      nextMineTemplate = {
        ...nextMineTemplate,
        guaranteedObjects: (nextMineTemplate.guaranteedObjects ?? []).filter((object) => object.type !== "vein")
      };
      changed = true;
    }

    return nextMineTemplate;
  });

  return changed
    ? {
        ...content,
        blockTypes,
        builtMineTypes,
        goblins,
        localization,
        mineTemplates,
        rewardChestTypes,
        resources,
        veinTypes
      }
    : content;
}

function mergeStarterItems<T extends { id: string }>(items: T[], starterItems: readonly T[]): T[] {
  const itemIds = new Set(items.map((item) => item.id));
  const missingStarterItems = starterItems.filter((starterItem) => !itemIds.has(starterItem.id));
  return missingStarterItems.length > 0 ? [...items, ...missingStarterItems] : items;
}

function mergeStarterLocalization(
  localization: ContentBundle["localization"],
  starterLocalization: ContentBundle["localization"]
): ContentBundle["localization"] {
  const starterRu = starterLocalization.ru ?? {};
  const currentRu = localization.ru ?? {};
  const forcedRu: Record<string, string> = {
    "block.chest_wooden.name": starterRu["block.chest_wooden.name"] ?? "Золото",
    "block.copper_ore.name": starterRu["block.copper_ore.name"] ?? "Медь",
    "resource.copper_ore.name": starterRu["resource.copper_ore.name"] ?? "Медь"
  };
  const nextRu = {
    ...starterRu,
    ...currentRu,
    ...forcedRu
  };

  if (shallowRecordEqual(currentRu, nextRu)) {
    return localization;
  }

  return {
    ...localization,
    ru: nextRu
  };
}

function shallowRecordEqual(left: Record<string, string>, right: Record<string, string>): boolean {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);

  if (leftKeys.length !== rightKeys.length) {
    return false;
  }

  return leftKeys.every((key) => left[key] === right[key]);
}

function mergeStarterGoblins(goblins: GoblinConfig[], starterGoblins: readonly GoblinConfig[]): GoblinConfig[] {
  const starterById = new Map(starterGoblins.map((goblin) => [goblin.id, goblin]));
  const goblinIds = new Set(goblins.map((goblin) => goblin.id));
  let changed = false;

  const mergedGoblins = goblins.map((goblin) => {
    const starterGoblin = starterById.get(goblin.id);

    if (!starterGoblin) {
      return goblin;
    }

    let nextGoblin = goblin;

    if (!nextGoblin.specialization && starterGoblin.specialization) {
      nextGoblin = {
        ...nextGoblin,
        specialization: starterGoblin.specialization
      };
      changed = true;
    }

    const mergedEffects = mergeStarterGoblinEffects(nextGoblin.ability.effects, starterGoblin.ability.effects);

    if (mergedEffects !== nextGoblin.ability.effects) {
      nextGoblin = {
        ...nextGoblin,
        ability: {
          ...nextGoblin.ability,
          effects: mergedEffects
        }
      };
      changed = true;
    }

    return nextGoblin;
  });
  const missingStarterGoblins = starterGoblins.filter((starterGoblin) => !goblinIds.has(starterGoblin.id));

  return changed || missingStarterGoblins.length > 0 ? [...mergedGoblins, ...missingStarterGoblins] : goblins;
}

function mergeStarterGoblinEffects(
  effects: GoblinConfig["ability"]["effects"],
  starterEffects: GoblinConfig["ability"]["effects"]
): GoblinConfig["ability"]["effects"] {
  const effectKeys = new Set(effects.map(goblinEffectKey));
  const missingEffects = starterEffects.filter((effect) => !effectKeys.has(goblinEffectKey(effect)));

  return missingEffects.length > 0 ? [...effects, ...missingEffects] : effects;
}

function goblinEffectKey(effect: GoblinConfig["ability"]["effects"][number]): string {
  switch (effect.type) {
    case "damage_bonus_by_tag":
      return `${effect.type}:${effect.tag}`;
    case "mine_production_multiplier":
      return `${effect.type}:${effect.resourceId ?? "*"}`;
    default:
      return effect.type;
  }
}

function findStarterMineTemplate(mineTemplateId: string): ContentBundle["mineTemplates"][number] | undefined {
  const baseMineTemplateId = mineTemplateId.replace(/_(?:debug|test)_\d+$/, "");
  return starterContentBundle.mineTemplates.find((mineTemplate) => mineTemplate.id === mineTemplateId || mineTemplate.id === baseMineTemplateId);
}

function sortMineTemplates(mineTemplates: ContentBundle["mineTemplates"]): ContentBundle["mineTemplates"] {
  const starterOrder = new Map(starterContentBundle.mineTemplates.map((mineTemplate, index) => [mineTemplate.id, index]));

  return [...mineTemplates].sort((left, right) => {
    const leftSortOrder = left.sortOrder || Number.POSITIVE_INFINITY;
    const rightSortOrder = right.sortOrder || Number.POSITIVE_INFINITY;

    if (leftSortOrder !== rightSortOrder) {
      return leftSortOrder - rightSortOrder;
    }

    const leftOrder = starterOrder.get(left.id) ?? Number.POSITIVE_INFINITY;
    const rightOrder = starterOrder.get(right.id) ?? Number.POSITIVE_INFINITY;

    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }

    return left.id.localeCompare(right.id);
  });
}

function resizeCellMap(
  cellMap: ContentBundle["mineTemplates"][number]["cellMap"],
  width: number,
  targetRows: number
): ContentBundle["mineTemplates"][number]["cellMap"] {
  if (cellMap.length === 0) {
    return [];
  }

  const sourceHeight = Math.max(...cellMap.map((cell) => cell.row)) + 1;
  const sourceByKey = new Map(cellMap.map((cell) => [`${cell.row}:${cell.col}`, cell]));
  const fallbackCell = cellMap[0];

  if (!fallbackCell) {
    return [];
  }

  return Array.from({ length: targetRows }, (_, row) => {
    const sourceRow = Math.min(row, sourceHeight - 1);

    return Array.from({ length: width }, (_, col) => {
      const sourceCell = sourceByKey.get(`${sourceRow}:${col}`) ?? fallbackCell;
      return {
        ...sourceCell,
        col,
        row
      };
    });
  }).flat();
}
