import type { ContentBundle, ContentRecord } from "../../../api/adminApi";
import { ContentSelectField, ContentTextField } from "../formFields";
import {
  arrayField,
  formValue,
  localizationValue,
  numberField,
  numberString,
  recordField,
  stringField,
  toInteger,
  toNumber,
  type EntityFormState
} from "../formState";
import {
  ContentRewardRows,
  createRewardTableFormState,
  createRewardTableFromForm,
  validateRewardRows
} from "./rewardTableEditor";

const specialBehaviorOptions = [
  { value: "none", label: "None" },
  { value: "explosion", label: "Explosion" }
];

export function ContentBlockTypeFields(props: {
  content: ContentBundle;
  formState: EntityFormState;
  updateField: (field: string, value: string) => void;
  updateFields: (values: EntityFormState) => void;
}) {
  return (
    <>
      <ContentTextField disabled label="ID" name="id" onChange={props.updateField} value={props.formState.id} />
      <ContentTextField label="Название RU" name="title" onChange={props.updateField} value={props.formState.title} />
      <div className="content-form-grid">
        <ContentTextField label="HP" name="baseHp" onChange={props.updateField} type="number" value={props.formState.baseHp} />
        <ContentSelectField
          label="Особое поведение"
          name="specialBehavior"
          onChange={props.updateField}
          options={specialBehaviorOptions}
          value={props.formState.specialBehavior}
        />
      </div>
      <ContentTextField label="Теги через запятую" name="tags" onChange={props.updateField} value={props.formState.tags} />
      <div className="content-form-grid">
        <ContentTextField label="Asset intact" name="assetIntact" onChange={props.updateField} value={props.formState.assetIntact} />
        <ContentTextField label="Asset cracked" name="assetCracked" onChange={props.updateField} value={props.formState.assetCracked} />
        <ContentTextField label="Asset breaking" name="assetBreaking" onChange={props.updateField} value={props.formState.assetBreaking} />
      </div>
      <ContentRewardRows
        content={props.content}
        formState={props.formState}
        prefix="reward"
        updateField={props.updateField}
        updateFields={props.updateFields}
      />
    </>
  );
}

export function createBlockTypeFormState(entity: ContentRecord, content: ContentBundle): EntityFormState {
  const visualStateAssets = recordField(entity, "visualStateAssets");
  return {
    assetBreaking: stringField(visualStateAssets, "breaking"),
    assetCracked: stringField(visualStateAssets, "cracked"),
    assetIntact: stringField(visualStateAssets, "intact"),
    baseHp: numberString(numberField(entity, "baseHp", 1)),
    id: stringField(entity, "id"),
    specialBehavior: stringField(entity, "specialBehavior") || "none",
    tags: arrayField(entity, "tags")
      .map((tag) => String(tag))
      .join(", "),
    title: localizationValue(content, stringField(entity, "nameKey")),
    ...createRewardTableFormState("reward", arrayField(entity, "rewardTable"), content)
  };
}

export function validateBlockTypeForm(state: EntityFormState, content: ContentBundle, errors: string[]) {
  validateIntegerField(state, "baseHp", "HP", errors, { min: 1 });

  if (!specialBehaviorOptions.some((option) => option.value === formValue(state, "specialBehavior"))) {
    errors.push("Выбери корректное особое поведение.");
  }

  for (const field of ["assetIntact", "assetCracked", "assetBreaking"]) {
    if (!formValue(state, field).trim()) {
      errors.push(`${field}: asset обязателен.`);
    }
  }

  validateRewardRows(state, "reward", content, errors);
}

export function applyBlockTypeForm(
  content: ContentBundle,
  selectedId: string,
  state: EntityFormState
): {
  entity: ContentRecord;
  entityId: string;
  entityType: "blockType";
  localization: Record<string, string>;
  message: string;
} {
  const current = content.blockTypes.find((item) => stringField(item, "id") === selectedId);

  if (!current) {
    throw new Error("Блок не найден.");
  }

  const id = formValue(state, "id");
  const nameKey = stringField(current, "nameKey") || `block.${id}.name`;
  const nextBlockType: ContentRecord = {
    ...current,
    baseHp: toInteger(state.baseHp),
    id,
    nameKey,
    rewardTable: createRewardTableFromForm(state, "reward"),
    specialBehavior: formValue(state, "specialBehavior") || "none",
    tags: formValue(state, "tags")
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
    visualStateAssets: {
      breaking: formValue(state, "assetBreaking").trim(),
      cracked: formValue(state, "assetCracked").trim(),
      intact: formValue(state, "assetIntact").trim()
    }
  };

  return {
    entity: nextBlockType,
    entityId: selectedId,
    entityType: "blockType",
    localization: {
      [nameKey]: formValue(state, "title").trim()
    },
    message: `Блок ${id} сохранен как draft.`
  };
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
