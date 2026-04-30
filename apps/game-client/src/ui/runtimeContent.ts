import { starterContentBundle, type ContentBundle } from "@goblin-cartel/content-schemas";

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

  const strata = resizeStrata(mineTemplate.strata, targetRows);

  if (strata.length === 0) {
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
        strata
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
  const veinTypes = mergeStarterItems(content.veinTypes ?? [], starterContentBundle.veinTypes);
  const builtMineTypes = mergeStarterItems(content.builtMineTypes ?? [], starterContentBundle.builtMineTypes);
  const rewardChestTypes = mergeStarterItems(content.rewardChestTypes ?? [], starterContentBundle.rewardChestTypes);
  let changed = false;

  if (veinTypes !== content.veinTypes || builtMineTypes !== content.builtMineTypes || rewardChestTypes !== content.rewardChestTypes) {
    changed = true;
  }

  const mineTemplates = sortMineTemplates(content.mineTemplates).map((mineTemplate) => {
    const starterMineTemplate = findStarterMineTemplate(mineTemplate.id);
    let nextMineTemplate = mineTemplate;

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
        builtMineTypes,
        mineTemplates,
        rewardChestTypes,
        veinTypes
      }
    : content;
}

function mergeStarterItems<T extends { id: string }>(items: T[], starterItems: readonly T[]): T[] {
  const itemIds = new Set(items.map((item) => item.id));
  const missingStarterItems = starterItems.filter((starterItem) => !itemIds.has(starterItem.id));
  return missingStarterItems.length > 0 ? [...items, ...missingStarterItems] : items;
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

function resizeStrata(strata: ContentBundle["mineTemplates"][number]["strata"], targetRows: number) {
  return strata
    .map((stratum, index) => {
      const fromRow = Math.floor((index * targetRows) / strata.length);
      const nextFromRow = Math.floor(((index + 1) * targetRows) / strata.length);
      const toRow = index === strata.length - 1 ? targetRows - 1 : nextFromRow - 1;

      return {
        ...stratum,
        fromRow,
        toRow: Math.max(fromRow, toRow)
      };
    })
    .filter((stratum) => stratum.fromRow < targetRows && stratum.fromRow <= stratum.toRow);
}
