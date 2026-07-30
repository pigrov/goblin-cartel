import type { ContentBundle, ContentRecord } from "../../../api/adminApi";
import { ContentNestedSection, ContentSelectField, ContentTextField } from "../formFields";
import {
  arrayField,
  arrayStringField,
  contentEntityTitle,
  formCount,
  formValue,
  localizationValue,
  multiplierReductionToPercent,
  numberField,
  numberString,
  percentToReductionMultiplier,
  recordAt,
  removeIndexedFormRow,
  resourceAmountField,
  stringField,
  toInteger,
  toNumber,
  type EntityFormState
} from "../formState";
import { goblinRoleOptions } from "./goblinsEditor";

type AdminGoblinRole = (typeof goblinRoleOptions)[number]["value"];

export function ContentGoblinHutFields(props: {
  content: ContentBundle;
  formState: EntityFormState;
  updateField: (field: string, value: string) => void;
  updateFields: (values: EntityFormState) => void;
}) {
  return (
    <>
      <ContentTextField disabled label="ID" name="id" onChange={props.updateField} value={props.formState.id} />
      <ContentTextField label="Название RU" name="title" onChange={props.updateField} value={props.formState.title} />
      <ContentGoblinHutLevelRows
        content={props.content}
        formState={props.formState}
        updateField={props.updateField}
        updateFields={props.updateFields}
      />
    </>
  );
}

export function ContentElevatorFields(props: {
  formState: EntityFormState;
  updateField: (field: string, value: string) => void;
  updateFields: (values: EntityFormState) => void;
}) {
  return (
    <>
      <ContentTextField disabled label="ID" name="id" onChange={props.updateField} value={props.formState.id} />
      <ContentTextField label="Название RU" name="title" onChange={props.updateField} value={props.formState.title} />
      <ContentElevatorLevelRows formState={props.formState} updateField={props.updateField} updateFields={props.updateFields} />
    </>
  );
}

function ContentGoblinHutLevelRows(props: {
  content: ContentBundle;
  formState: EntityFormState;
  updateField: (name: string, value: string) => void;
  updateFields: (values: EntityFormState) => void;
}) {
  const count = formCount(props.formState, "levelCount", 1);

  return (
    <ContentNestedSection
      addLabel="Добавить уровень"
      onAdd={() =>
        props.updateFields({
          [`levelRoles_${count}`]: "miner, collector, foreman",
          [`levelCostCopper_${count}`]: "0",
          [`levelCostGold_${count}`]: "0",
          [`levelCostIron_${count}`]: "0",
          [`levelCostStone_${count}`]: "0",
          levelCount: String(count + 1),
          [`levelHireDiscountPercent_${count}`]: "0",
          [`levelLevel_${count}`]: String(count + 1),
          [`levelMaxHired_${count}`]: String((toInteger(props.formState[`levelMaxHired_${count - 1}`]) || count + 1) + 1),
          [`levelRequiredBuiltMines_${count}`]: "0",
          [`levelRequiredMineTemplateId_${count}`]: "",
          [`levelTitle_${count}`]: "",
          [`levelUpgradeDiscountPercent_${count}`]: "0"
        })
      }
      title="Уровни Хижины"
    >
      {Array.from({ length: count }, (_, index) => (
        <div className="content-list-row content-list-row-wide" key={`hut-level-${index}`}>
          <ContentTextField label="Ур." name={`levelLevel_${index}`} onChange={props.updateField} type="number" value={props.formState[`levelLevel_${index}`]} />
          <ContentTextField label="Название RU" name={`levelTitle_${index}`} onChange={props.updateField} value={props.formState[`levelTitle_${index}`]} />
          <ContentTextField label="Лимит" name={`levelMaxHired_${index}`} onChange={props.updateField} type="number" value={props.formState[`levelMaxHired_${index}`]} />
          <ContentTextField label="Роли" name={`levelRoles_${index}`} onChange={props.updateField} value={props.formState[`levelRoles_${index}`]} />
          <ContentTextField label="Скидка найма %" name={`levelHireDiscountPercent_${index}`} onChange={props.updateField} type="number" value={props.formState[`levelHireDiscountPercent_${index}`]} />
          <ContentTextField label="Скидка прокачки %" name={`levelUpgradeDiscountPercent_${index}`} onChange={props.updateField} type="number" value={props.formState[`levelUpgradeDiscountPercent_${index}`]} />
          <ContentTextField label="Золото" name={`levelCostGold_${index}`} onChange={props.updateField} type="number" value={props.formState[`levelCostGold_${index}`]} />
          <ContentTextField label="Камень" name={`levelCostStone_${index}`} onChange={props.updateField} type="number" value={props.formState[`levelCostStone_${index}`]} />
          <ContentTextField label="Медь" name={`levelCostCopper_${index}`} onChange={props.updateField} type="number" value={props.formState[`levelCostCopper_${index}`]} />
          <ContentTextField label="Железо" name={`levelCostIron_${index}`} onChange={props.updateField} type="number" value={props.formState[`levelCostIron_${index}`]} />
          <ContentTextField label="Нужно шахт" name={`levelRequiredBuiltMines_${index}`} onChange={props.updateField} type="number" value={props.formState[`levelRequiredBuiltMines_${index}`]} />
          <ContentSelectField
            label="Нужен рудник"
            name={`levelRequiredMineTemplateId_${index}`}
            onChange={props.updateField}
            options={[{ value: "", label: "Не задан" }, ...mineTemplateSelectOptions(props.content)]}
            value={props.formState[`levelRequiredMineTemplateId_${index}`]}
          />
          <button
            disabled={count <= 1}
            onClick={() =>
              props.updateFields(
                removeIndexedFormRow(
                  props.formState,
                  "level",
                  index,
                  [
                    "Level",
                    "Title",
                    "MaxHired",
                    "Roles",
                    "HireDiscountPercent",
                    "UpgradeDiscountPercent",
                    "CostGold",
                    "CostStone",
                    "CostCopper",
                    "CostIron",
                    "RequiredBuiltMines",
                    "RequiredMineTemplateId"
                  ],
                  count
                )
              )
            }
            type="button"
          >
            Убрать
          </button>
        </div>
      ))}
    </ContentNestedSection>
  );
}

function ContentElevatorLevelRows(props: {
  formState: EntityFormState;
  updateField: (name: string, value: string) => void;
  updateFields: (values: EntityFormState) => void;
}) {
  const count = formCount(props.formState, "levelCount", 1);

  return (
    <ContentNestedSection
      addLabel="Добавить уровень"
      onAdd={() =>
        props.updateFields({
          [`levelCostCopper_${count}`]: "0",
          [`levelCostElixir_${count}`]: "0",
          [`levelCostGold_${count}`]: "0",
          [`levelCostIron_${count}`]: "0",
          [`levelCostStone_${count}`]: "0",
          [`levelDropDurationMs_${count}`]: String(Math.max(500, (toInteger(props.formState[`levelDropDurationMs_${count - 1}`]) || 1450) - 130)),
          levelCount: String(count + 1),
          [`levelLevel_${count}`]: String(count + 1),
          [`levelOfflineDamageMultiplier_${count}`]: String(Math.round(((toNumber(props.formState[`levelOfflineDamageMultiplier_${count - 1}`]) || 1) + 0.05) * 100) / 100),
          [`levelPlatformSlots_${count}`]: String((toInteger(props.formState[`levelPlatformSlots_${count - 1}`]) || count + 1) + 1),
          [`levelStabilityPercent_${count}`]: String(Math.min(100, (toInteger(props.formState[`levelStabilityPercent_${count - 1}`]) || 20) + 15)),
          [`levelTitle_${count}`]: "",
          [`levelVisualStage_${count}`]: String(Math.min(5, count + 1))
        })
      }
      title="Уровни подъемника"
    >
      {Array.from({ length: count }, (_, index) => (
        <div className="content-list-row content-list-row-wide" key={`elevator-level-${index}`}>
          <ContentTextField label="Ур." name={`levelLevel_${index}`} onChange={props.updateField} type="number" value={props.formState[`levelLevel_${index}`]} />
          <ContentTextField label="Название RU" name={`levelTitle_${index}`} onChange={props.updateField} value={props.formState[`levelTitle_${index}`]} />
          <ContentTextField label="Мест" name={`levelPlatformSlots_${index}`} onChange={props.updateField} type="number" value={props.formState[`levelPlatformSlots_${index}`]} />
          <ContentTextField label="Вид" name={`levelVisualStage_${index}`} onChange={props.updateField} type="number" value={props.formState[`levelVisualStage_${index}`]} />
          <ContentTextField label="Золото" name={`levelCostGold_${index}`} onChange={props.updateField} type="number" value={props.formState[`levelCostGold_${index}`]} />
          <ContentTextField label="Камень" name={`levelCostStone_${index}`} onChange={props.updateField} type="number" value={props.formState[`levelCostStone_${index}`]} />
          <ContentTextField label="Медь" name={`levelCostCopper_${index}`} onChange={props.updateField} type="number" value={props.formState[`levelCostCopper_${index}`]} />
          <ContentTextField label="Железо" name={`levelCostIron_${index}`} onChange={props.updateField} type="number" value={props.formState[`levelCostIron_${index}`]} />
          <ContentTextField label="Эликсир" name={`levelCostElixir_${index}`} onChange={props.updateField} type="number" value={props.formState[`levelCostElixir_${index}`]} />
          <ContentTextField label="Спуск ms" name={`levelDropDurationMs_${index}`} onChange={props.updateField} type="number" value={props.formState[`levelDropDurationMs_${index}`]} />
          <ContentTextField label="Офф x" name={`levelOfflineDamageMultiplier_${index}`} onChange={props.updateField} type="number" value={props.formState[`levelOfflineDamageMultiplier_${index}`]} />
          <ContentTextField label="Надеж. %" name={`levelStabilityPercent_${index}`} onChange={props.updateField} type="number" value={props.formState[`levelStabilityPercent_${index}`]} />
          <button
            disabled={count <= 1}
            onClick={() =>
              props.updateFields(
                removeIndexedFormRow(
                  props.formState,
                  "level",
                  index,
                  [
                    "Level",
                    "Title",
                    "PlatformSlots",
                    "DropDurationMs",
                    "OfflineDamageMultiplier",
                    "StabilityPercent",
                    "VisualStage",
                    "CostGold",
                    "CostStone",
                    "CostCopper",
                    "CostIron",
                    "CostElixir"
                  ],
                  count
                )
              )
            }
            type="button"
          >
            Убрать
          </button>
        </div>
      ))}
    </ContentNestedSection>
  );
}

export function createGoblinHutFormState(entity: ContentRecord, content: ContentBundle): EntityFormState {
  const levels = arrayField(entity, "levels");
  const count = Math.max(1, levels.length);
  const state: EntityFormState = {
    id: stringField(entity, "id") || "default",
    title: localizationValue(content, stringField(entity, "nameKey")),
    levelCount: String(count)
  };

  for (let index = 0; index < count; index += 1) {
    const level = recordAt(levels, index);
    const upgradeCost = arrayField(level, "upgradeCost");
    const unlockRequirements = arrayField(level, "unlockRequirements");
    const requiredBuiltMines = unlockRequirements.find((requirement) => stringField(requirement, "type") === "built_mines_count");
    const requiredMine = unlockRequirements.find((requirement) => stringField(requirement, "type") === "mine_completed");

    state[`levelLevel_${index}`] = numberString(numberField(level, "level", index + 1));
    state[`levelTitle_${index}`] = localizationValue(content, stringField(level, "nameKey"));
    state[`levelMaxHired_${index}`] = numberString(numberField(level, "maxHiredGoblins", 1));
    state[`levelRoles_${index}`] = arrayStringField(level, "unlockedRoles").join(", ");
    state[`levelHireDiscountPercent_${index}`] = numberString(multiplierReductionToPercent(numberField(level, "hireCostMultiplier", 1)));
    state[`levelUpgradeDiscountPercent_${index}`] = numberString(multiplierReductionToPercent(numberField(level, "upgradeCostMultiplier", 1)));
    state[`levelCostGold_${index}`] = numberString(resourceAmountField(upgradeCost, "gold"));
    state[`levelCostStone_${index}`] = numberString(resourceAmountField(upgradeCost, "stone"));
    state[`levelCostCopper_${index}`] = numberString(resourceAmountField(upgradeCost, "copper_ore"));
    state[`levelCostIron_${index}`] = numberString(resourceAmountField(upgradeCost, "iron"));
    state[`levelRequiredBuiltMines_${index}`] = numberString(numberField(requiredBuiltMines ?? {}, "value", 0));
    state[`levelRequiredMineTemplateId_${index}`] = stringField(requiredMine ?? {}, "mineTemplateId");
  }

  return state;
}

export function createElevatorFormState(entity: ContentRecord, content: ContentBundle): EntityFormState {
  const levels = arrayField(entity, "levels");
  const count = Math.max(1, levels.length);
  const state: EntityFormState = {
    id: stringField(entity, "id") || "default",
    title: localizationValue(content, stringField(entity, "nameKey")),
    levelCount: String(count)
  };

  for (let index = 0; index < count; index += 1) {
    const level = recordAt(levels, index);
    const upgradeCost = arrayField(level, "upgradeCost");

    state[`levelLevel_${index}`] = numberString(numberField(level, "level", index + 1));
    state[`levelTitle_${index}`] = localizationValue(content, stringField(level, "nameKey"));
    state[`levelPlatformSlots_${index}`] = numberString(numberField(level, "platformSlots", Math.max(1, index + 2)));
    state[`levelDropDurationMs_${index}`] = numberString(numberField(level, "dropDurationMs", 1450));
    state[`levelOfflineDamageMultiplier_${index}`] = numberString(numberField(level, "offlineDamageMultiplier", 1));
    state[`levelStabilityPercent_${index}`] = numberString(numberField(level, "stabilityPercent", 20));
    state[`levelVisualStage_${index}`] = numberString(numberField(level, "visualStage", Math.min(5, index + 1)));
    state[`levelCostGold_${index}`] = numberString(resourceAmountField(upgradeCost, "gold"));
    state[`levelCostStone_${index}`] = numberString(resourceAmountField(upgradeCost, "stone"));
    state[`levelCostCopper_${index}`] = numberString(resourceAmountField(upgradeCost, "copper_ore"));
    state[`levelCostIron_${index}`] = numberString(resourceAmountField(upgradeCost, "iron"));
    state[`levelCostElixir_${index}`] = numberString(resourceAmountField(upgradeCost, "elixir"));
  }

  return state;
}

export function validateGoblinHutForm(state: EntityFormState, content: ContentBundle, errors: string[]) {
  const count = formCount(state, "levelCount", 1);
  const seenLevels = new Set<number>();
  const validRoles = new Set(goblinRoleOptions.map((option) => option.value));
  const validMineTemplateIds = new Set(content.mineTemplates.map((mineTemplate) => stringField(mineTemplate, "id")));

  for (let index = 0; index < count; index += 1) {
    const rowLabel = `Уровень Хижины ${index + 1}`;
    const level = toInteger(state[`levelLevel_${index}`]);
    const roles = formValue(state, `levelRoles_${index}`)
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    const requiredMineTemplateId = formValue(state, `levelRequiredMineTemplateId_${index}`);

    validateIntegerField(state, `levelLevel_${index}`, `${rowLabel}: номер`, errors, { min: 1 });
    validateIntegerField(state, `levelMaxHired_${index}`, `${rowLabel}: лимит`, errors, { min: 1 });
    validateNumberField(state, `levelHireDiscountPercent_${index}`, `${rowLabel}: скидка найма`, errors, { min: 0 });
    validateNumberField(state, `levelUpgradeDiscountPercent_${index}`, `${rowLabel}: скидка прокачки`, errors, { min: 0 });
    validateIntegerField(state, `levelCostGold_${index}`, `${rowLabel}: золото`, errors, { min: 0 });
    validateIntegerField(state, `levelCostStone_${index}`, `${rowLabel}: камень`, errors, { min: 0 });
    validateIntegerField(state, `levelCostCopper_${index}`, `${rowLabel}: медь`, errors, { min: 0 });
    validateIntegerField(state, `levelCostIron_${index}`, `${rowLabel}: железо`, errors, { min: 0 });
    validateIntegerField(state, `levelRequiredBuiltMines_${index}`, `${rowLabel}: нужно шахт`, errors, { min: 0 });

    if (!formValue(state, `levelTitle_${index}`).trim()) {
      errors.push(`${rowLabel}: название RU обязательно.`);
    }

    if (seenLevels.has(level)) {
      errors.push(`${rowLabel}: номер уровня должен быть уникальным.`);
    }
    seenLevels.add(level);

    if (roles.length === 0 || roles.some((item) => !validRoles.has(item as AdminGoblinRole))) {
      errors.push(`${rowLabel}: роли должны быть из списка miner, collector, foreman.`);
    }

    if (requiredMineTemplateId && !validMineTemplateIds.has(requiredMineTemplateId)) {
      errors.push(`${rowLabel}: рудник условия не найден.`);
    }
  }
}

export function validateElevatorForm(state: EntityFormState, errors: string[]) {
  const count = formCount(state, "levelCount", 1);
  const seenLevels = new Set<number>();

  for (let index = 0; index < count; index += 1) {
    const rowLabel = `Уровень подъемника ${index + 1}`;
    const level = toInteger(state[`levelLevel_${index}`]);

    validateIntegerField(state, `levelLevel_${index}`, `${rowLabel}: номер`, errors, { min: 1 });
    validateIntegerField(state, `levelPlatformSlots_${index}`, `${rowLabel}: места`, errors, { min: 1 });
    validateIntegerField(state, `levelDropDurationMs_${index}`, `${rowLabel}: спуск`, errors, { min: 500, max: 2500 });
    validateNumberField(state, `levelOfflineDamageMultiplier_${index}`, `${rowLabel}: оффлайн-урон`, errors, { min: 1 });
    validateIntegerField(state, `levelStabilityPercent_${index}`, `${rowLabel}: надежность`, errors, { min: 0, max: 100 });
    validateIntegerField(state, `levelVisualStage_${index}`, `${rowLabel}: вид`, errors, { min: 1, max: 5 });
    validateIntegerField(state, `levelCostGold_${index}`, `${rowLabel}: золото`, errors, { min: 0 });
    validateIntegerField(state, `levelCostStone_${index}`, `${rowLabel}: камень`, errors, { min: 0 });
    validateIntegerField(state, `levelCostCopper_${index}`, `${rowLabel}: медь`, errors, { min: 0 });
    validateIntegerField(state, `levelCostIron_${index}`, `${rowLabel}: железо`, errors, { min: 0 });
    validateIntegerField(state, `levelCostElixir_${index}`, `${rowLabel}: эликсир`, errors, { min: 0 });

    if (!formValue(state, `levelTitle_${index}`).trim()) {
      errors.push(`${rowLabel}: название RU обязательно.`);
    }

    if (seenLevels.has(level)) {
      errors.push(`${rowLabel}: номер уровня должен быть уникальным.`);
    }
    seenLevels.add(level);
  }
}

export function applyGoblinHutForm(
  content: ContentBundle,
  selectedId: string,
  state: EntityFormState
): {
  entity: ContentRecord;
  entityId: string;
  entityType: "goblinHut";
  localization: Record<string, string>;
  message: string;
} {
  const current = content.goblinHut;
  const id = formValue(state, "id") || "default";
  const nameKey = stringField(current, "nameKey") || "goblin_hut.name";
  const currentLevels = arrayField(current, "levels");
  const levels = createGoblinHutLevelsFromForm(state, currentLevels);
  const localization: Record<string, string> = {
    [nameKey]: formValue(state, "title").trim()
  };

  for (let index = 0; index < levels.length; index += 1) {
    const levelNameKey = stringField(levels[index] ?? {}, "nameKey") || `goblin_hut.level.${index + 1}.name`;
    localization[levelNameKey] = formValue(state, `levelTitle_${index}`).trim();
  }

  return {
    entity: {
      id,
      levels,
      nameKey
    },
    entityId: selectedId,
    entityType: "goblinHut",
    localization,
    message: `Хижина ${id} сохранена как draft.`
  };
}

export function applyElevatorForm(
  content: ContentBundle,
  selectedId: string,
  state: EntityFormState
): {
  entity: ContentRecord;
  entityId: string;
  entityType: "elevator";
  localization: Record<string, string>;
  message: string;
} {
  const current = content.elevator;
  const id = formValue(state, "id") || "default";
  const nameKey = stringField(current, "nameKey") || "elevator.name";
  const currentLevels = arrayField(current, "levels");
  const levels = createElevatorLevelsFromForm(state, currentLevels);
  const localization: Record<string, string> = {
    [nameKey]: formValue(state, "title").trim()
  };

  for (let index = 0; index < levels.length; index += 1) {
    const level = numberField(levels[index] ?? {}, "level", index + 1);
    const levelNameKey = stringField(levels[index] ?? {}, "nameKey") || `elevator.level.${level}.name`;
    localization[levelNameKey] = formValue(state, `levelTitle_${index}`).trim();
  }

  return {
    entity: {
      id,
      levels,
      nameKey
    },
    entityId: selectedId,
    entityType: "elevator",
    localization,
    message: `Подъемник ${id} сохранен как draft.`
  };
}

function createGoblinHutLevelsFromForm(state: EntityFormState, currentLevels: ContentRecord[]): ContentRecord[] {
  const count = formCount(state, "levelCount", 1);

  return Array.from({ length: count }, (_, index) => {
    const level = toInteger(state[`levelLevel_${index}`]) || index + 1;
    const current = currentLevels.find((item) => numberField(item, "level", 0) === level) ?? currentLevels[index] ?? {};
    const nameKey = stringField(current, "nameKey") || `goblin_hut.level.${level}.name`;
    const unlockedRoles = formValue(state, `levelRoles_${index}`)
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    const upgradeCost = createGoblinHutUpgradeCostFromForm(state, index);
    const unlockRequirements = createGoblinHutUnlockRequirementsFromForm(state, index);

    return {
      hireCostMultiplier: percentToReductionMultiplier(toNumber(state[`levelHireDiscountPercent_${index}`])),
      level,
      maxHiredGoblins: toInteger(state[`levelMaxHired_${index}`]),
      nameKey,
      unlockRequirements,
      unlockedRoles,
      upgradeCost,
      upgradeCostMultiplier: percentToReductionMultiplier(toNumber(state[`levelUpgradeDiscountPercent_${index}`]))
    };
  }).sort((left, right) => numberField(left, "level", 0) - numberField(right, "level", 0));
}

function createGoblinHutUpgradeCostFromForm(state: EntityFormState, index: number): Array<{ amount: number; resourceId: string }> {
  const resources: Array<[string, string]> = [
    ["gold", "Gold"],
    ["stone", "Stone"],
    ["copper_ore", "Copper"],
    ["iron", "Iron"]
  ];

  return resources
    .map(([resourceId, suffix]) => ({
      amount: toInteger(state[`levelCost${suffix}_${index}`]),
      resourceId
    }))
    .filter((cost) => cost.amount > 0);
}

function createGoblinHutUnlockRequirementsFromForm(state: EntityFormState, index: number): ContentRecord[] {
  const requirements: ContentRecord[] = [];
  const requiredBuiltMines = toInteger(state[`levelRequiredBuiltMines_${index}`]);
  const requiredMineTemplateId = formValue(state, `levelRequiredMineTemplateId_${index}`);

  if (requiredBuiltMines > 0) {
    requirements.push({ type: "built_mines_count", value: requiredBuiltMines });
  }

  if (requiredMineTemplateId) {
    requirements.push({ type: "mine_completed", mineTemplateId: requiredMineTemplateId });
  }

  return requirements;
}

function createElevatorLevelsFromForm(state: EntityFormState, currentLevels: ContentRecord[]): ContentRecord[] {
  const count = formCount(state, "levelCount", 1);

  return Array.from({ length: count }, (_, index) => {
    const level = toInteger(state[`levelLevel_${index}`]) || index + 1;
    const current = currentLevels.find((item) => numberField(item, "level", 0) === level) ?? currentLevels[index] ?? {};
    const nameKey = stringField(current, "nameKey") || `elevator.level.${level}.name`;

    return {
      level,
      nameKey,
      dropDurationMs: toInteger(state[`levelDropDurationMs_${index}`]),
      offlineDamageMultiplier: Math.max(1, toNumber(state[`levelOfflineDamageMultiplier_${index}`])),
      platformSlots: toInteger(state[`levelPlatformSlots_${index}`]),
      stabilityPercent: Math.max(0, Math.min(100, toInteger(state[`levelStabilityPercent_${index}`]))),
      upgradeCost: createElevatorUpgradeCostFromForm(state, index),
      visualStage: Math.max(1, Math.min(5, toInteger(state[`levelVisualStage_${index}`]) || 1))
    };
  }).sort((left, right) => numberField(left, "level", 0) - numberField(right, "level", 0));
}

function createElevatorUpgradeCostFromForm(state: EntityFormState, index: number): Array<{ amount: number; resourceId: string }> {
  const resources: Array<[string, string]> = [
    ["gold", "Gold"],
    ["stone", "Stone"],
    ["copper_ore", "Copper"],
    ["iron", "Iron"],
    ["elixir", "Elixir"]
  ];

  return resources
    .map(([resourceId, suffix]) => ({
      amount: toInteger(state[`levelCost${suffix}_${index}`]),
      resourceId
    }))
    .filter((cost) => cost.amount > 0);
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

function mineTemplateSelectOptions(content: ContentBundle): Array<{ label: string; value: string }> {
  return content.mineTemplates.map((mineTemplate) => ({
    label: contentEntityTitle(mineTemplate, content.localization?.ru ?? {}),
    value: stringField(mineTemplate, "id")
  }));
}
