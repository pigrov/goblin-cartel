import { starterContentBundle, type ContentBundle } from "@goblin-cartel/content-schemas";

export function createRuntimeContentBundle(content: ContentBundle): ContentBundle {
  const sortedMineTemplates = sortMineTemplates(content.mineTemplates);
  const contentWithBossCards = ensureBossCardRuntimeContent(content);
  return sortedMineTemplates === contentWithBossCards.mineTemplates && contentWithBossCards === content
    ? content
    : { ...contentWithBossCards, mineTemplates: sortedMineTemplates };
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

function ensureBossCardRuntimeContent(content: ContentBundle): ContentBundle {
  const bossCardResourceIds = new Set(["elixir", "boss_card_hit_damage", "boss_card_crit_chance", "boss_card_crit_multiplier", "boss_card_max_energy"]);
  const starterResourceById = new Map(starterContentBundle.resources.map((resource) => [resource.id, resource]));
  const starterBlockById = new Map(starterContentBundle.blockTypes.map((blockType) => [blockType.id, blockType]));
  const starterChestById = new Map(starterContentBundle.rewardChestTypes.map((chestType) => [chestType.id, chestType]));
  const starterRu = starterContentBundle.localization.ru ?? {};
  const contentBossCards = "bossCards" in content && Array.isArray(content.bossCards) ? content.bossCards : [];
  let changed = false;
  const resourceIds = new Set(content.resources.map((resource) => resource.id));
  const resources = [...content.resources];

  for (const resourceId of bossCardResourceIds) {
    const resource = starterResourceById.get(resourceId);

    if (resource && !resourceIds.has(resourceId)) {
      resources.push(resource);
      resourceIds.add(resourceId);
      changed = true;
    }
  }

  const blockTypes = content.blockTypes.map((blockType) => {
    const starterBlock = starterBlockById.get(blockType.id);
    const starterElixirReward = starterBlock?.rewardTable.find((reward) => reward.resourceId === "elixir");

    if (!starterElixirReward || blockType.rewardTable.some((reward) => reward.resourceId === "elixir")) {
      return blockType;
    }

    changed = true;
    return {
      ...blockType,
      rewardTable: [...blockType.rewardTable, starterElixirReward]
    };
  });

  const rewardChestTypes = content.rewardChestTypes.map((chestType) => {
    const starterChest = starterChestById.get(chestType.id);
    const missingBossCardRewards =
      starterChest?.rewardTable.filter(
        (reward) => bossCardResourceIds.has(reward.resourceId) && !chestType.rewardTable.some((item) => item.resourceId === reward.resourceId)
      ) ?? [];

    if (missingBossCardRewards.length === 0) {
      return chestType;
    }

    changed = true;
    return {
      ...chestType,
      rewardTable: [...chestType.rewardTable, ...missingBossCardRewards]
    };
  });
  const bossCards = contentBossCards.length > 0 ? contentBossCards : starterContentBundle.bossCards;

  if (bossCards !== contentBossCards) {
    changed = true;
  }
  const ruLocalization = { ...(content.localization?.ru ?? {}) };

  for (const key of [
    "resource.elixir.name",
    "resource.boss_card_hit_damage.name",
    "resource.boss_card_crit_chance.name",
    "resource.boss_card_crit_multiplier.name",
    "resource.boss_card_max_energy.name",
    "boss_card.hit_damage.name",
    "boss_card.hit_damage.description",
    "boss_card.crit_chance.name",
    "boss_card.crit_chance.description",
    "boss_card.crit_multiplier.name",
    "boss_card.crit_multiplier.description",
    "boss_card.max_energy.name",
    "boss_card.max_energy.description"
  ]) {
    if (starterRu[key] && !ruLocalization[key]) {
      ruLocalization[key] = starterRu[key];
      changed = true;
    }
  }

  if (!changed) {
    return content;
  }

  return {
    ...content,
    blockTypes,
    localization: {
      ...content.localization,
      ru: ruLocalization
    },
    bossCards,
    resources: resources.sort((left, right) => left.sortOrder - right.sortOrder),
    rewardChestTypes
  };
}
