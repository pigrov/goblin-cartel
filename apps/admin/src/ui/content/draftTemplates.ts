import type { ContentBundle, ContentRecord } from "../../api/adminApi";
import type { ContentEntityApiKind, ContentEntityKind } from "./entityRegistry";
import { createDefaultMineCellMap } from "./editors/mineTemplatesEditor";
import {
  addRuLocalization,
  cloneRecord,
  findResourceId,
  nextSortOrder,
  recordField,
  stringField,
  uniqueContentId
} from "./formState";

export interface DraftContentToolResult {
  content: ContentBundle;
  entity: ContentRecord;
  entityId?: string;
  entityKind?: ContentEntityKind;
  entityType: ContentEntityApiKind;
  localization: Record<string, string>;
  message: string;
}

export function addDraftBlockTypeTemplate(content: ContentBundle): DraftContentToolResult {
  const id = uniqueContentId("draft_block", content.blockTypes);
  const nameKey = `block.${id}.name`;
  const resourceId = findResourceId(content, "stone");
  const entity: ContentRecord = {
    id,
    nameKey,
    baseHp: 80,
    tags: ["draft"],
    visualStateAssets: {
      intact: `block_${id}_intact_v1`,
      cracked: `block_${id}_cracked_v1`,
      breaking: `block_${id}_breaking_v1`
    },
    rewardTable: [{ resourceId, min: 1, max: 3, chance: 1 }],
    specialBehavior: "none"
  };
  const localization = {
    [nameKey]: "\u041d\u043e\u0432\u044b\u0439 \u0431\u043b\u043e\u043a"
  };

  return {
    content: {
      ...content,
      blockTypes: [...content.blockTypes, entity],
      localization: addRuLocalization(content.localization, localization)
    },
    entity,
    entityId: id,
    entityKind: "blockTypes",
    entityType: "blockType",
    localization,
    message: `Добавлен шаблон блока ${id}. Проверь HP, ассеты и награды, затем сохрани draft.`
  };
}

export function addDraftMineTemplate(content: ContentBundle): DraftContentToolResult {
  const source = content.mineTemplates[content.mineTemplates.length - 1];

  if (!source) {
    throw new Error("Нужен хотя бы один существующий рудник, чтобы создать шаблон.");
  }

  const id = uniqueContentId("draft_mine", content.mineTemplates);
  const displayNameKey = `mine.${id}.name`;
  const width = 7;
  const height = 10;
  const sourceDepthProgressReward = recordField(source, "depthProgressReward");
  const entity: ContentRecord = {
    completionRewardChestTypeId: stringField(source, "completionRewardChestTypeId") || undefined,
    completionVeinTypeId: stringField(source, "completionVeinTypeId") || undefined,
    depthMeters: 10,
    difficultyEnd: 1.8,
    difficultyStart: 1,
    id,
    cellMap: createDefaultMineCellMap(content, width, height),
    displayNameKey,
    height,
    sortOrder: nextSortOrder(content.mineTemplates),
    width
  };

  if (stringField(sourceDepthProgressReward, "resourceId")) {
    entity.depthProgressReward = sourceDepthProgressReward;
  }

  const localization = {
    [displayNameKey]: "\u041d\u043e\u0432\u044b\u0439 \u0440\u0443\u0434\u043d\u0438\u043a"
  };

  return {
    content: {
      ...content,
      mineTemplates: [...content.mineTemplates, entity],
      localization: addRuLocalization(content.localization, localization)
    },
    entity,
    entityId: id,
    entityKind: "mineTemplates",
    entityType: "mineTemplate",
    localization,
    message: `Добавлен шаблон рудника ${id}. Проверь размер, жилу, сундук и карту клеток перед публикацией.`
  };
}

export function addDraftBuiltMineTypeTemplate(content: ContentBundle): DraftContentToolResult {
  const builtMineTypes = content.builtMineTypes ?? [];
  const source = builtMineTypes[builtMineTypes.length - 1];

  if (!source) {
    throw new Error("Нужен хотя бы один тип шахты, чтобы создать шаблон.");
  }

  const id = uniqueContentId("draft_built_mine", builtMineTypes);
  const nameKey = `built_mine.${id}.name`;
  const entity: ContentRecord = {
    ...cloneRecord(source),
    id,
    nameKey,
    assetId: `built_mine_${id}_v1`
  };
  const localization = {
    [nameKey]: "\u041d\u043e\u0432\u0430\u044f \u043f\u043e\u0441\u0442\u043e\u044f\u043d\u043d\u0430\u044f \u0448\u0430\u0445\u0442\u0430"
  };

  return {
    content: {
      ...content,
      builtMineTypes: [...builtMineTypes, entity],
      localization: addRuLocalization(content.localization, localization)
    },
    entity,
    entityId: id,
    entityKind: "builtMineTypes",
    entityType: "builtMineType",
    localization,
    message: `Добавлен шаблон типа шахты ${id}. Проверь ресурс добычи, жилу и стоимость.`
  };
}

export function addDraftRewardChestTypeTemplate(content: ContentBundle): DraftContentToolResult {
  const rewardChestTypes = content.rewardChestTypes ?? [];
  const id = uniqueContentId("draft_reward_chest", rewardChestTypes);
  const nameKey = `reward_chest.${id}.name`;
  const goldResourceId = findResourceId(content, "gold");
  const stoneResourceId = findResourceId(content, "stone");
  const entity: ContentRecord = {
    id,
    nameKey,
    tier: "wooden",
    rewardTable: [
      { resourceId: goldResourceId, min: 25, max: 60, chance: 1 },
      { resourceId: stoneResourceId, min: 10, max: 25, chance: 0.75 }
    ],
    assetId: `reward_chest_${id}_v1`
  };
  const localization = {
    [nameKey]: "\u041d\u043e\u0432\u044b\u0439 \u0441\u0443\u043d\u0434\u0443\u043a"
  };

  return {
    content: {
      ...content,
      rewardChestTypes: [...rewardChestTypes, entity],
      localization: addRuLocalization(content.localization, localization)
    },
    entity,
    entityId: id,
    entityKind: "rewardChestTypes",
    entityType: "rewardChestType",
    localization,
    message: `Добавлен шаблон сундука ${id}. Проверь tier, ассет и таблицу наград, затем сохрани draft.`
  };
}

export function addDraftBossCardTemplate(content: ContentBundle): DraftContentToolResult {
  const bossCards = content.bossCards ?? [];
  const id = uniqueContentId("draft_boss_card", bossCards);
  const nameKey = `boss_card.${id}.name`;
  const descriptionKey = `boss_card.${id}.description`;
  const entity: ContentRecord = {
    id,
    nameKey,
    descriptionKey,
    rarity: "common",
    assetId: `boss_card_${id}_v1`,
    cardResourceId: findResourceId(content, "boss_card_hit_damage"),
    effectType: "damagePerTap",
    valuePerLevel: 1,
    maxLevel: 8,
    upgradeCardAmounts: [2, 5, 10, 20, 50, 100, 180, 300],
    elixirResourceId: findResourceId(content, "elixir"),
    elixirCostMultiplier: 4,
    sortOrder: nextSortOrder(bossCards)
  };
  const localization = {
    [nameKey]: "\u041d\u043e\u0432\u0430\u044f \u043a\u0430\u0440\u0442\u0430 \u0431\u043e\u0441\u0441\u0430",
    [descriptionKey]: "\u0427\u0435\u0440\u043d\u043e\u0432\u0430\u044f \u043a\u0430\u0440\u0442\u0430 \u0434\u043b\u044f \u043d\u0430\u0441\u0442\u0440\u043e\u0439\u043a\u0438 \u0431\u043e\u043d\u0443\u0441\u0430 \u0431\u043e\u0441\u0441\u0430."
  };

  return {
    content: {
      ...content,
      bossCards: [...bossCards, entity],
      localization: addRuLocalization(content.localization, localization)
    },
    entity,
    entityId: id,
    entityKind: "bossCards",
    entityType: "bossCard",
    localization,
    message: `Добавлена карта босса ${id}. Проверь ресурс, эффект, стоимость и сохрани draft.`
  };
}
