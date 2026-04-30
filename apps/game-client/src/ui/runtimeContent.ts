import type { ContentBundle } from "@goblin-cartel/content-schemas";

const runtimeTestMineRows = 10;
const runtimeMineMetersPerRow = 1;

export function createRuntimeContentBundle(content: ContentBundle): ContentBundle {
  const sortedMineTemplates = sortMineTemplates(content.mineTemplates);
  const sortedContent = sortedMineTemplates === content.mineTemplates ? content : { ...content, mineTemplates: sortedMineTemplates };
  const debugRows = readDebugMineRows();
  const targetRows = debugRows ?? runtimeTestMineRows;
  const targetDepthMeters = targetRows * runtimeMineMetersPerRow;
  const mineTemplate = sortedContent.mineTemplates[0];

  if (!mineTemplate) {
    return sortedContent;
  }

  const currentDepthMeters = mineTemplate.depthMeters ?? mineTemplate.height;
  const shouldUseRuntimeMine =
    Boolean(debugRows) || mineTemplate.height !== targetRows || currentDepthMeters !== targetDepthMeters;

  if (!shouldUseRuntimeMine) {
    return sortedContent;
  }

  const cellMap = resizeCellMap(mineTemplate.cellMap, mineTemplate.width, targetRows);

  if (cellMap.length === 0) {
    return sortedContent;
  }

  return {
    ...sortedContent,
    mineTemplates: [
      {
        ...mineTemplate,
        depthMeters: targetDepthMeters,
        height: targetRows,
        id: `${mineTemplate.id}_${debugRows ? "debug" : "test"}_${targetRows}`,
        cellMap
      },
      ...sortedContent.mineTemplates.slice(1)
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

function sortMineTemplates(mineTemplates: ContentBundle["mineTemplates"]): ContentBundle["mineTemplates"] {
  const sorted = [...mineTemplates].sort((left, right) => {
    const leftSortOrder = left.sortOrder || Number.POSITIVE_INFINITY;
    const rightSortOrder = right.sortOrder || Number.POSITIVE_INFINITY;

    if (leftSortOrder !== rightSortOrder) {
      return leftSortOrder - rightSortOrder;
    }

    return left.id.localeCompare(right.id);
  });

  return sorted.every((mineTemplate, index) => mineTemplate === mineTemplates[index]) ? mineTemplates : sorted;
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
