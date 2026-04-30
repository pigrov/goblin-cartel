import { starterContentBundle, type ContentBundle } from "@goblin-cartel/content-schemas";

const runtimeTestMineRows = 12;
const runtimeMineMetersPerRow = 5;

export function createRuntimeContentBundle(content: ContentBundle): ContentBundle {
  const contentWithDefaults = withRewardChestDefaults(content);
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

function withRewardChestDefaults(content: ContentBundle): ContentBundle {
  const rewardChestTypes = [...(content.rewardChestTypes ?? [])];
  const rewardChestTypeIds = new Set(rewardChestTypes.map((chestType) => chestType.id));
  let changed = false;

  for (const starterRewardChestType of starterContentBundle.rewardChestTypes) {
    if (!rewardChestTypeIds.has(starterRewardChestType.id)) {
      rewardChestTypes.push(starterRewardChestType);
      changed = true;
    }
  }

  const mineTemplates = content.mineTemplates.map((mineTemplate) => {
    if (mineTemplate.completionRewardChestTypeId) {
      return mineTemplate;
    }

    const starterMineTemplate = findStarterMineTemplate(mineTemplate.id);

    if (!starterMineTemplate?.completionRewardChestTypeId) {
      return mineTemplate;
    }

    changed = true;
    return {
      ...mineTemplate,
      completionRewardChestTypeId: starterMineTemplate.completionRewardChestTypeId
    };
  });

  return changed
    ? {
        ...content,
        mineTemplates,
        rewardChestTypes
      }
    : content;
}

function findStarterMineTemplate(mineTemplateId: string): ContentBundle["mineTemplates"][number] | undefined {
  const baseMineTemplateId = mineTemplateId.replace(/_(?:debug|test)_\d+$/, "");
  return starterContentBundle.mineTemplates.find((mineTemplate) => mineTemplate.id === mineTemplateId || mineTemplate.id === baseMineTemplateId);
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
