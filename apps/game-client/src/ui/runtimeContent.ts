import type { ContentBundle } from "@goblin-cartel/content-schemas";

const runtimeTestMineRows = 40;
const runtimeMineMetersPerRow = 5;

export function createRuntimeContentBundle(content: ContentBundle): ContentBundle {
  const debugRows = readDebugMineRows();
  const targetRows = debugRows ?? runtimeTestMineRows;
  const targetDepthMeters = targetRows * runtimeMineMetersPerRow;
  const mineTemplate = content.mineTemplates[0];

  if (!mineTemplate) {
    return content;
  }

  const currentDepthMeters = mineTemplate.depthMeters ?? mineTemplate.height;
  const shouldUseRuntimeMine =
    Boolean(debugRows) || mineTemplate.height < targetRows || currentDepthMeters < targetDepthMeters;

  if (!shouldUseRuntimeMine) {
    return content;
  }

  const lastStratum = mineTemplate.strata.at(-1);

  if (!lastStratum) {
    return content;
  }

  return {
    ...content,
    mineTemplates: [
      {
        ...mineTemplate,
        depthMeters: Math.max(currentDepthMeters, targetDepthMeters),
        height: targetRows,
        id: `${mineTemplate.id}_${debugRows ? "debug" : "test"}_${targetRows}`,
        strata: [
          ...mineTemplate.strata.slice(0, -1),
          {
            ...lastStratum,
            toRow: targetRows - 1
          }
        ]
      },
      ...content.mineTemplates.slice(1)
    ]
  };
}

export function contentVersionWithRuntimeSuffix(version: string, content: ContentBundle): string {
  const debugRows = readDebugMineRows();
  const mineTemplate = content.mineTemplates[0];

  if (debugRows) {
    return `${version}:debug-${debugRows}`;
  }

  return mineTemplate?.id.endsWith(`_test_${runtimeTestMineRows}`) ? `${version}:test-${runtimeTestMineRows}` : version;
}

function readDebugMineRows(): number | null {
  if (!import.meta.env.DEV || typeof window === "undefined") {
    return null;
  }

  const raw = new URLSearchParams(window.location.search).get("debugMineRows");
  const rows = raw ? Number(raw) : 0;

  if (!Number.isInteger(rows) || rows < 50 || rows > 200) {
    return null;
  }

  return rows;
}
