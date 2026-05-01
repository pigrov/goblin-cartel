import { starterContentBundle, type ContentBundle } from "@goblin-cartel/content-schemas";

type RewardChestType = ContentBundle["rewardChestTypes"][number];
type RewardEntry = RewardChestType["rewardTable"][number];

const legacyRewardChestRewardSignatures: Record<string, Record<string, string>> = {
  iron_completion_chest: {
    boss_card_crit_chance: "1:2:0.75",
    boss_card_crit_multiplier: "1:1:0.45",
    boss_card_hit_damage: "1:3:1",
    boss_card_max_energy: "1:2:0.65",
    elixir: "8:16:1"
  },
  steel_completion_chest: {
    boss_card_crit_chance: "1:3:0.9",
    boss_card_crit_multiplier: "1:2:0.65",
    boss_card_hit_damage: "2:4:1",
    boss_card_max_energy: "2:4:0.9",
    elixir: "16:28:1"
  },
  wooden_completion_chest: {
    boss_card_crit_chance: "1:1:0.45",
    boss_card_hit_damage: "1:2:0.8",
    boss_card_max_energy: "1:1:0.35",
    elixir: "4:8:1"
  }
};

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
  const starterBossCardById = new Map(starterContentBundle.bossCards.map((card) => [card.id, card]));
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
    const migratedChestType = migrateKnownRewardChestBalance(chestType, starterChest);

    if (missingBossCardRewards.length === 0 && !migratedChestType.changed) {
      return chestType;
    }

    changed = true;
    return {
      ...migratedChestType.chestType,
      rewardTable: [...migratedChestType.chestType.rewardTable, ...missingBossCardRewards]
    };
  });
  let bossCards = contentBossCards.length > 0 ? contentBossCards : starterContentBundle.bossCards;

  if (contentBossCards.length > 0) {
    bossCards = contentBossCards.map((card) => {
      const assetId = (card as { assetId?: string }).assetId;

      if (assetId) {
        return card;
      }

      changed = true;
      return {
        ...card,
        assetId: starterBossCardById.get(card.id)?.assetId ?? "boss_card_generic_v1"
      };
    });
  } else {
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

function migrateKnownRewardChestBalance(
  chestType: RewardChestType,
  starterChest: RewardChestType | undefined
): { changed: boolean; chestType: RewardChestType } {
  const legacySignatures = legacyRewardChestRewardSignatures[chestType.id];

  if (!starterChest || !legacySignatures) {
    return { changed: false, chestType };
  }

  const starterRewardById = new Map(starterChest.rewardTable.map((reward) => [reward.resourceId, reward]));
  let changed = false;
  const rewardTable = chestType.rewardTable.map((reward) => {
    const starterReward = starterRewardById.get(reward.resourceId);

    if (!starterReward || legacySignatures[reward.resourceId] !== rewardSignature(reward)) {
      return reward;
    }

    if (rewardSignature(starterReward) === rewardSignature(reward)) {
      return reward;
    }

    changed = true;
    return starterReward;
  });

  return changed
    ? {
        changed,
        chestType: {
          ...chestType,
          rewardTable
        }
      }
    : { changed, chestType };
}

function rewardSignature(reward: RewardEntry): string {
  return `${reward.min}:${reward.max}:${reward.chance}`;
}
