import type { ContentBundle, ContentRecord } from "../../../api/adminApi";
import { ContentSelectField, ContentTextAreaField, ContentTextField } from "../formFields";
import {
  contentEntityTitle,
  findResourceId,
  formValue,
  localizationValue,
  numberField,
  numberString,
  parsePositiveIntegerList,
  stringField,
  toInteger,
  toNumber,
  type EntityFormState
} from "../formState";

const bossCardRarityOptions = [
  { value: "common", label: "Обычная" },
  { value: "rare", label: "Редкая" },
  { value: "golden", label: "Золотая" }
];

const bossCardEffectOptions = [
  { value: "damagePerTap", label: "Урон за тап" },
  { value: "critChance", label: "Шанс крита" },
  { value: "critMultiplier", label: "Сила крита" },
  { value: "maxEnergy", label: "Запас энергии" }
];

export function ContentBossCardFields(props: {
  content: ContentBundle;
  formState: EntityFormState;
  updateField: (field: string, value: string) => void;
}) {
  return (
    <>
      <ContentTextField disabled label="ID" name="id" onChange={props.updateField} value={props.formState.id} />
      <ContentTextField label="Название RU" name="title" onChange={props.updateField} value={props.formState.title} />
      <ContentTextAreaField label="Описание RU" name="description" onChange={props.updateField} value={props.formState.description} />
      <div className="content-form-grid">
        <ContentSelectField label="Редкость" name="rarity" onChange={props.updateField} options={bossCardRarityOptions} value={props.formState.rarity} />
        <ContentSelectField label="Эффект" name="effectType" onChange={props.updateField} options={bossCardEffectOptions} value={props.formState.effectType} />
        <ContentTextField label="Asset ID" name="assetId" onChange={props.updateField} value={props.formState.assetId} />
        <ContentSelectField
          label="Ресурс-карта"
          name="cardResourceId"
          onChange={props.updateField}
          options={resourceSelectOptions(props.content)}
          value={props.formState.cardResourceId}
        />
        <ContentSelectField
          label="Эликсир"
          name="elixirResourceId"
          onChange={props.updateField}
          options={resourceSelectOptions(props.content)}
          value={props.formState.elixirResourceId}
        />
        <ContentTextField label="Бонус за уровень" name="valuePerLevel" onChange={props.updateField} type="number" value={props.formState.valuePerLevel} />
        <ContentTextField label="Max level" name="maxLevel" onChange={props.updateField} type="number" value={props.formState.maxLevel} />
        <ContentTextField label="Множитель эликсира" name="elixirCostMultiplier" onChange={props.updateField} type="number" value={props.formState.elixirCostMultiplier} />
        <ContentTextField label="Sort order" name="sortOrder" onChange={props.updateField} type="number" value={props.formState.sortOrder} />
      </div>
      <ContentTextField
        label="Копии карт по уровням"
        name="upgradeCardAmounts"
        onChange={props.updateField}
        placeholder="2, 5, 10, 20"
        value={props.formState.upgradeCardAmounts}
      />
    </>
  );
}

export function createBossCardFormState(entity: ContentRecord, content: ContentBundle): EntityFormState {
  const upgradeCardAmounts = entity.upgradeCardAmounts;

  return {
    assetId: stringField(entity, "assetId") || "boss_card_generic_v1",
    cardResourceId: stringField(entity, "cardResourceId") || findResourceId(content, "boss_card_hit_damage"),
    description: localizationValue(content, stringField(entity, "descriptionKey")),
    effectType: stringField(entity, "effectType") || "damagePerTap",
    elixirCostMultiplier: numberString(numberField(entity, "elixirCostMultiplier", 4)),
    elixirResourceId: stringField(entity, "elixirResourceId") || findResourceId(content, "elixir"),
    id: stringField(entity, "id"),
    maxLevel: numberString(numberField(entity, "maxLevel", 8)),
    rarity: stringField(entity, "rarity") || "common",
    sortOrder: numberString(numberField(entity, "sortOrder", 0)),
    title: localizationValue(content, stringField(entity, "nameKey")),
    upgradeCardAmounts: Array.isArray(upgradeCardAmounts)
      ? upgradeCardAmounts.filter((item): item is number => typeof item === "number").join(", ")
      : "2, 5, 10, 20, 50, 100, 180, 300",
    valuePerLevel: numberString(numberField(entity, "valuePerLevel", 1))
  };
}

export function validateBossCardForm(state: EntityFormState, content: ContentBundle, errors: string[]) {
  if (!formValue(state, "description").trim()) {
    errors.push("Описание RU обязательно.");
  }

  if (!formValue(state, "assetId").trim()) {
    errors.push("Asset ID обязателен.");
  }

  if (!bossCardRarityOptions.some((option) => option.value === formValue(state, "rarity"))) {
    errors.push("Выбери корректную редкость карты.");
  }

  if (!bossCardEffectOptions.some((option) => option.value === formValue(state, "effectType"))) {
    errors.push("Выбери корректный эффект карты.");
  }

  const resourceIds = resourceIdSet(content);

  if (!resourceIds.has(formValue(state, "cardResourceId"))) {
    errors.push("Ресурс-карта не найден.");
  }

  if (!resourceIds.has(formValue(state, "elixirResourceId"))) {
    errors.push("Ресурс эликсира не найден.");
  }

  validateNumberField(state, "valuePerLevel", "Бонус за уровень", errors, { min: 0.000001 });
  validateIntegerField(state, "maxLevel", "Max level", errors, { min: 1 });
  validateNumberField(state, "elixirCostMultiplier", "Множитель эликсира", errors, { min: 0.000001 });
  validateIntegerField(state, "sortOrder", "Sort order", errors);

  const upgradeCardAmounts = parsePositiveIntegerList(formValue(state, "upgradeCardAmounts"));

  if (upgradeCardAmounts.length === 0) {
    errors.push("Копии карт по уровням должны содержать хотя бы одно число.");
  }
}

export function applyBossCardForm(
  content: ContentBundle,
  selectedId: string,
  state: EntityFormState
): {
  entity: ContentRecord;
  entityId: string;
  entityType: "bossCard";
  localization: Record<string, string>;
  message: string;
} {
  const bossCards = content.bossCards ?? [];
  const current = bossCards.find((item) => stringField(item, "id") === selectedId);

  if (!current) {
    throw new Error("Карта босса не найдена.");
  }

  const id = formValue(state, "id");
  const nameKey = stringField(current, "nameKey") || `boss_card.${id}.name`;
  const descriptionKey = stringField(current, "descriptionKey") || `boss_card.${id}.description`;
  const nextBossCard: ContentRecord = {
    ...current,
    assetId: formValue(state, "assetId").trim(),
    cardResourceId: formValue(state, "cardResourceId"),
    descriptionKey,
    effectType: formValue(state, "effectType"),
    elixirCostMultiplier: toNumber(state.elixirCostMultiplier),
    elixirResourceId: formValue(state, "elixirResourceId"),
    id,
    maxLevel: toInteger(state.maxLevel),
    nameKey,
    rarity: formValue(state, "rarity"),
    sortOrder: toInteger(state.sortOrder),
    upgradeCardAmounts: parsePositiveIntegerList(formValue(state, "upgradeCardAmounts")),
    valuePerLevel: toNumber(state.valuePerLevel)
  };

  return {
    entity: nextBossCard,
    entityId: selectedId,
    entityType: "bossCard",
    localization: {
      [descriptionKey]: formValue(state, "description").trim(),
      [nameKey]: formValue(state, "title").trim()
    },
    message: `Карта босса ${id} сохранена как draft.`
  };
}

function resourceSelectOptions(content: ContentBundle): Array<{ label: string; value: string }> {
  return content.resources.map((resource) => ({
    label: contentEntityTitle(resource, content.localization?.ru ?? {}),
    value: stringField(resource, "id")
  }));
}

function resourceIdSet(content: ContentBundle): Set<string> {
  return new Set(content.resources.map((resource) => stringField(resource, "id")));
}

function validateIntegerField(
  state: EntityFormState,
  field: string,
  label: string,
  errors: string[],
  options: { max?: number; min?: number } = {}
) {
  const value = toNumber(state[field]);
  if (!Number.isInteger(value)) {
    errors.push(`${label}: нужно целое число.`);
    return;
  }
  if (options.min !== undefined && value < options.min) {
    errors.push(`${label}: минимум ${options.min}.`);
  }
  if (options.max !== undefined && value > options.max) {
    errors.push(`${label}: максимум ${options.max}.`);
  }
}

function validateNumberField(
  state: EntityFormState,
  field: string,
  label: string,
  errors: string[],
  options: { min?: number } = {}
) {
  const value = toNumber(state[field]);
  if (!Number.isFinite(value)) {
    errors.push(`${label}: нужно число.`);
    return;
  }
  if (options.min !== undefined && value < options.min) {
    errors.push(`${label}: минимум ${options.min}.`);
  }
}
