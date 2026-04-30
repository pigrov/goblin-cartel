import type { ContentBundle } from "@goblin-cartel/content-schemas";

export function createRuntimeContentBundle(content: ContentBundle): ContentBundle {
  const sortedMineTemplates = sortMineTemplates(content.mineTemplates);
  return sortedMineTemplates === content.mineTemplates ? content : { ...content, mineTemplates: sortedMineTemplates };
}

export function contentVersionWithRuntimeSuffix(version: string): string {
  return version;
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
