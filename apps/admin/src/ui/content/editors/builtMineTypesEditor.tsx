import type { ContentBundle, ContentRecord } from "../../../api/adminApi";
import { ContentNestedSection, ContentSelectField, ContentTextField } from "../formFields";
import {
  arrayField,
  contentEntityTitle,
  findResourceId,
  formCount,
  formValue,
  localizationValue,
  numberField,
  numberString,
  recordAt,
  recordField,
  removeIndexedFormRow,
  stringField,
  toInteger,
  toNumber,
  type EntityFormState
} from "../formState";

const upgradeCostProductionResourceValue = "__production_resource__";

export function ContentBuiltMineTypeFields(props: {
  content: ContentBundle;
  formState: EntityFormState;
  updateField: (field: string, value: string) => void;
  updateFields: (values: EntityFormState) => void;
}) {
  return (
    <>
      <ContentTextField disabled label="ID" name="id" onChange={props.updateField} value={props.formState.id} />
      <ContentTextField label="Название RU" name="title" onChange={props.updateField} value={props.formState.title} />
      <ContentTextField label="Asset ID" name="assetId" onChange={props.updateField} value={props.formState.assetId} />
      <div className="content-form-grid">
        <ContentSelectField
          label="Исходная жила"
          name="sourceVeinType"
          onChange={props.updateField}
          options={veinSelectOptions(props.content)}
          value={props.formState.sourceVeinType}
        />
        <ContentSelectField
          label="Ресурс добычи"
          name="productionResourceId"
          onChange={props.updateField}
          options={resourceSelectOptions(props.content)}
          value={props.formState.productionResourceId}
        />
        <ContentTextField
          label="Добыча в час"
          name="baseProductionPerHour"
          onChange={props.updateField}
          type="number"
          value={props.formState.baseProductionPerHour}
        />
        <ContentTextField label="Вместимость" name="baseCapacity" onChange={props.updateField} type="number" value={props.formState.baseCapacity} />
        <ContentTextField label="Стройка, сек" name="buildTimeSec" onChange={props.updateField} type="number" value={props.formState.buildTimeSec} />
      </div>
      <ContentResourceAmountRows
        amountLabel="Кол-во"
        content={props.content}
        formState={props.formState}
        prefix="buildCost"
        title="Стоимость строительства"
        updateField={props.updateField}
        updateFields={props.updateFields}
      />
      <section className="content-nested-section">
        <header>
          <strong>Улучшения шахты</strong>
        </header>
        <div className="content-form-grid">
          <ContentTextField
            label="Макс. уровень"
            name="upgradeMaxLevel"
            onChange={props.updateField}
            type="number"
            value={props.formState.upgradeMaxLevel}
          />
          <ContentTextField
            label="Множитель добычи"
            name="upgradeProductionMultiplier"
            onChange={props.updateField}
            type="number"
            value={props.formState.upgradeProductionMultiplier}
          />
          <ContentTextField
            label="Множитель вместимости"
            name="upgradeCapacityMultiplier"
            onChange={props.updateField}
            type="number"
            value={props.formState.upgradeCapacityMultiplier}
          />
        </div>
      </section>
      <ContentMineUpgradeCostRows
        content={props.content}
        formState={props.formState}
        prefix="upgradeCost"
        title="Стоимость улучшения"
        updateField={props.updateField}
        updateFields={props.updateFields}
      />
    </>
  );
}

function ContentResourceAmountRows(props: {
  amountLabel: string;
  content: ContentBundle;
  formState: EntityFormState;
  prefix: string;
  title: string;
  updateField: (name: string, value: string) => void;
  updateFields: (values: EntityFormState) => void;
}) {
  const count = formCount(props.formState, `${props.prefix}Count`, 1);
  const resourceOptions = resourceSelectOptions(props.content);

  return (
    <ContentNestedSection
      addLabel="Добавить строку"
      onAdd={() =>
        props.updateFields({
          [`${props.prefix}Amount_${count}`]: "",
          [`${props.prefix}Count`]: String(count + 1),
          [`${props.prefix}ResourceId_${count}`]: resourceOptions[0]?.value ?? ""
        })
      }
      title={props.title}
    >
      {Array.from({ length: count }, (_, index) => (
        <div className="content-list-row" key={`${props.prefix}-${index}`}>
          <ContentSelectField
            label="Ресурс"
            name={`${props.prefix}ResourceId_${index}`}
            onChange={props.updateField}
            options={resourceOptions}
            value={props.formState[`${props.prefix}ResourceId_${index}`]}
          />
          <ContentTextField
            label={props.amountLabel}
            name={`${props.prefix}Amount_${index}`}
            onChange={props.updateField}
            type="number"
            value={props.formState[`${props.prefix}Amount_${index}`]}
          />
          <button
            disabled={count <= 1}
            onClick={() => props.updateFields(removeIndexedFormRow(props.formState, props.prefix, index, ["ResourceId", "Amount"], count))}
            type="button"
          >
            Убрать
          </button>
        </div>
      ))}
    </ContentNestedSection>
  );
}

function ContentMineUpgradeCostRows(props: {
  content: ContentBundle;
  formState: EntityFormState;
  prefix: string;
  title: string;
  updateField: (name: string, value: string) => void;
  updateFields: (values: EntityFormState) => void;
}) {
  const count = formCount(props.formState, `${props.prefix}Count`, 1);
  const sourceOptions = mineUpgradeCostSourceOptions(props.content);

  return (
    <ContentNestedSection
      addLabel="Добавить строку"
      onAdd={() =>
        props.updateFields({
          [`${props.prefix}BaseAmount_${count}`]: "",
          [`${props.prefix}Count`]: String(count + 1),
          [`${props.prefix}LevelMultiplier_${count}`]: "1",
          [`${props.prefix}LevelPower_${count}`]: "1",
          [`${props.prefix}Source_${count}`]: upgradeCostProductionResourceValue
        })
      }
      title={props.title}
    >
      {Array.from({ length: count }, (_, index) => (
        <div className="content-list-row content-upgrade-cost-row" key={`${props.prefix}-${index}`}>
          <ContentSelectField
            label="Ресурс"
            name={`${props.prefix}Source_${index}`}
            onChange={props.updateField}
            options={sourceOptions}
            value={props.formState[`${props.prefix}Source_${index}`]}
          />
          <ContentTextField
            label="База"
            name={`${props.prefix}BaseAmount_${index}`}
            onChange={props.updateField}
            type="number"
            value={props.formState[`${props.prefix}BaseAmount_${index}`]}
          />
          <ContentTextField
            label="Множитель уровня"
            name={`${props.prefix}LevelMultiplier_${index}`}
            onChange={props.updateField}
            type="number"
            value={props.formState[`${props.prefix}LevelMultiplier_${index}`]}
          />
          <ContentTextField
            label="Степень"
            name={`${props.prefix}LevelPower_${index}`}
            onChange={props.updateField}
            type="number"
            value={props.formState[`${props.prefix}LevelPower_${index}`]}
          />
          <button
            disabled={count <= 1}
            onClick={() =>
              props.updateFields(
                removeIndexedFormRow(props.formState, props.prefix, index, ["Source", "BaseAmount", "LevelMultiplier", "LevelPower"], count)
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

export function createBuiltMineTypeFormState(entity: ContentRecord, content: ContentBundle): EntityFormState {
  const buildCost = arrayField(entity, "buildCost");
  const upgrade = recordField(entity, "upgrade");
  const upgradeCost = arrayField(upgrade, "cost");

  return {
    assetId: stringField(entity, "assetId"),
    baseCapacity: numberString(numberField(entity, "baseCapacity", 1)),
    baseProductionPerHour: numberString(numberField(entity, "baseProductionPerHour", 1)),
    buildTimeSec: numberString(numberField(entity, "buildTimeSec", 0)),
    id: stringField(entity, "id"),
    productionResourceId: stringField(entity, "productionResourceId") || findResourceId(content, "gold"),
    sourceVeinType: stringField(entity, "sourceVeinType") || stringField((content.veinTypes ?? [])[0] ?? {}, "id"),
    title: localizationValue(content, stringField(entity, "nameKey")),
    upgradeCapacityMultiplier: numberString(numberField(upgrade, "capacityMultiplier", 1.4)),
    upgradeMaxLevel: numberString(numberField(upgrade, "maxLevel", 5)),
    upgradeProductionMultiplier: numberString(numberField(upgrade, "productionMultiplier", 1.35)),
    ...createResourceAmountFormState("buildCost", buildCost, content, "stone"),
    ...createMineUpgradeCostFormState("upgradeCost", upgradeCost)
  };
}

function createResourceAmountFormState(
  prefix: string,
  rows: ContentRecord[],
  content: ContentBundle,
  fallbackResourceId: string
): EntityFormState {
  const count = Math.max(1, rows.length);
  const state: EntityFormState = {
    [`${prefix}Count`]: String(count)
  };

  for (let index = 0; index < count; index += 1) {
    const row = recordAt(rows, index);
    state[`${prefix}Amount_${index}`] = numberString(numberField(row, "amount", 0));
    state[`${prefix}ResourceId_${index}`] = stringField(row, "resourceId") || findResourceId(content, fallbackResourceId);
  }

  return state;
}

function createMineUpgradeCostFormState(prefix: string, rows: ContentRecord[]): EntityFormState {
  const fallbackRows =
    rows.length > 0
      ? rows
      : [
          {
            baseAmount: 60,
            levelMultiplier: 1,
            levelPower: 1,
            useProductionResource: true
          },
          {
            baseAmount: 100,
            levelMultiplier: 1,
            levelPower: 1.35,
            resourceId: "gold"
          }
        ];
  const count = Math.max(1, fallbackRows.length);
  const state: EntityFormState = {
    [`${prefix}Count`]: String(count)
  };

  for (let index = 0; index < count; index += 1) {
    const row = recordAt(fallbackRows, index);
    state[`${prefix}BaseAmount_${index}`] = numberString(numberField(row, "baseAmount", 1));
    state[`${prefix}LevelMultiplier_${index}`] = numberString(numberField(row, "levelMultiplier", 1));
    state[`${prefix}LevelPower_${index}`] = numberString(numberField(row, "levelPower", 1));
    state[`${prefix}Source_${index}`] =
      row.useProductionResource === true ? upgradeCostProductionResourceValue : stringField(row, "resourceId") || "gold";
  }

  return state;
}

export function validateBuiltMineTypeForm(state: EntityFormState, content: ContentBundle, errors: string[]) {
  if (!formValue(state, "assetId").trim()) {
    errors.push("Asset ID обязателен.");
  }

  if (!veinIdSet(content).has(formValue(state, "sourceVeinType"))) {
    errors.push("Исходная жила не найдена.");
  }

  if (!resourceIdSet(content).has(formValue(state, "productionResourceId"))) {
    errors.push("Ресурс добычи не найден.");
  }

  validateNumberField(state, "baseProductionPerHour", "Добыча в час", errors, { min: 0.01 });
  validateNumberField(state, "baseCapacity", "Вместимость", errors, { min: 0.01 });
  validateIntegerField(state, "buildTimeSec", "Стройка", errors, { min: 0 });
  validateIntegerField(state, "upgradeMaxLevel", "Макс. уровень улучшения", errors, { min: 1 });
  validateNumberField(state, "upgradeProductionMultiplier", "Множитель добычи", errors, { min: 1 });
  validateNumberField(state, "upgradeCapacityMultiplier", "Множитель вместимости", errors, { min: 1 });
  validateResourceAmountRows(state, "buildCost", "Стоимость строительства", content, errors);
  validateMineUpgradeCostRows(state, "upgradeCost", "Стоимость улучшения", content, errors);
}

function validateResourceAmountRows(
  state: EntityFormState,
  prefix: string,
  label: string,
  content: ContentBundle,
  errors: string[]
) {
  const count = formCount(state, `${prefix}Count`, 1);

  for (let index = 0; index < count; index += 1) {
    const amountField = `${prefix}Amount_${index}`;
    const resourceId = formValue(state, `${prefix}ResourceId_${index}`);
    const rawAmount = formValue(state, amountField);
    const amount = toNumber(rawAmount);

    if (!rawAmount.trim() || amount === 0) {
      continue;
    }

    validateIntegerField(state, amountField, `${label} ${index + 1}`, errors, { min: 1 });

    if (!resourceIdSet(content).has(resourceId)) {
      errors.push(`${label} ${index + 1}: ресурс не найден.`);
    }
  }
}

function validateMineUpgradeCostRows(
  state: EntityFormState,
  prefix: string,
  label: string,
  content: ContentBundle,
  errors: string[]
) {
  const count = formCount(state, `${prefix}Count`, 1);
  const resourceIds = resourceIdSet(content);

  for (let index = 0; index < count; index += 1) {
    const rowLabel = `${label} ${index + 1}`;
    const source = formValue(state, `${prefix}Source_${index}`);

    if (source !== upgradeCostProductionResourceValue && !resourceIds.has(source)) {
      errors.push(`${rowLabel}: ресурс не найден.`);
    }

    validateIntegerField(state, `${prefix}BaseAmount_${index}`, `${rowLabel}: база`, errors, { min: 1 });
    validateNumberField(state, `${prefix}LevelMultiplier_${index}`, `${rowLabel}: множитель уровня`, errors, { min: 0.01 });
    validateNumberField(state, `${prefix}LevelPower_${index}`, `${rowLabel}: степень`, errors, { min: 0 });
  }
}

export function applyBuiltMineTypeForm(
  content: ContentBundle,
  selectedId: string,
  state: EntityFormState
): {
  entity: ContentRecord;
  entityId: string;
  entityType: "builtMineType";
  localization: Record<string, string>;
  message: string;
} {
  const builtMineTypes = content.builtMineTypes ?? [];
  const current = builtMineTypes.find((item) => stringField(item, "id") === selectedId);

  if (!current) {
    throw new Error("Тип шахты не найден.");
  }

  const id = formValue(state, "id");
  const nameKey = stringField(current, "nameKey") || `built_mine.${id}.name`;
  const nextBuiltMineType: ContentRecord = {
    ...current,
    assetId: formValue(state, "assetId").trim(),
    baseCapacity: toNumber(state.baseCapacity),
    baseProductionPerHour: toNumber(state.baseProductionPerHour),
    buildCost: createResourceAmountsFromForm(state, "buildCost"),
    buildTimeSec: toInteger(state.buildTimeSec),
    id,
    nameKey,
    productionResourceId: formValue(state, "productionResourceId"),
    sourceVeinType: formValue(state, "sourceVeinType"),
    upgrade: {
      capacityMultiplier: toNumber(state.upgradeCapacityMultiplier),
      cost: createMineUpgradeCostFromForm(state, "upgradeCost"),
      maxLevel: toInteger(state.upgradeMaxLevel),
      productionMultiplier: toNumber(state.upgradeProductionMultiplier)
    }
  };

  return {
    entity: nextBuiltMineType,
    entityId: selectedId,
    entityType: "builtMineType",
    localization: {
      [nameKey]: formValue(state, "title").trim()
    },
    message: `Тип шахты ${id} сохранен как draft.`
  };
}

function createResourceAmountsFromForm(state: EntityFormState, prefix: string): Array<{ amount: number; resourceId: string }> {
  const count = formCount(state, `${prefix}Count`, 1);
  const rows: Array<{ amount: number; resourceId: string }> = [];

  for (let index = 0; index < count; index += 1) {
    const amount = toInteger(state[`${prefix}Amount_${index}`]);
    const resourceId = formValue(state, `${prefix}ResourceId_${index}`);

    if (amount > 0 && resourceId) {
      rows.push({ amount, resourceId });
    }
  }

  return rows;
}

function createMineUpgradeCostFromForm(
  state: EntityFormState,
  prefix: string
): Array<{ baseAmount: number; levelMultiplier: number; levelPower: number; resourceId?: string; useProductionResource?: boolean }> {
  const count = formCount(state, `${prefix}Count`, 1);
  const rows: Array<{ baseAmount: number; levelMultiplier: number; levelPower: number; resourceId?: string; useProductionResource?: boolean }> = [];

  for (let index = 0; index < count; index += 1) {
    const source = formValue(state, `${prefix}Source_${index}`);
    const row = {
      baseAmount: toInteger(state[`${prefix}BaseAmount_${index}`]),
      levelMultiplier: toNumber(state[`${prefix}LevelMultiplier_${index}`]),
      levelPower: toNumber(state[`${prefix}LevelPower_${index}`])
    };

    if (row.baseAmount <= 0 || !source) {
      continue;
    }

    rows.push(
      source === upgradeCostProductionResourceValue
        ? {
            ...row,
            useProductionResource: true
          }
        : {
            ...row,
            resourceId: source
          }
    );
  }

  return rows;
}

function mineUpgradeCostSourceOptions(content: ContentBundle): Array<{ label: string; value: string }> {
  return [
    {
      label: "Ресурс добычи шахты",
      value: upgradeCostProductionResourceValue
    },
    ...resourceSelectOptions(content)
  ];
}

function resourceSelectOptions(content: ContentBundle): Array<{ label: string; value: string }> {
  return content.resources.map((resource) => ({
    label: contentEntityTitle(resource, content.localization?.ru ?? {}),
    value: stringField(resource, "id")
  }));
}

function veinSelectOptions(content: ContentBundle): Array<{ label: string; value: string }> {
  return (content.veinTypes ?? []).map((veinType) => ({
    label: contentEntityTitle(veinType, content.localization?.ru ?? {}),
    value: stringField(veinType, "id")
  }));
}

function resourceIdSet(content: ContentBundle): Set<string> {
  return new Set(content.resources.map((resource) => stringField(resource, "id")));
}

function veinIdSet(content: ContentBundle): Set<string> {
  return new Set((content.veinTypes ?? []).map((veinType) => stringField(veinType, "id")));
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
