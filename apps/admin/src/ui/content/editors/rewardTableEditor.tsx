import type { ContentBundle, ContentRecord } from "../../../api/adminApi";
import { ContentNestedSection, ContentSelectField, ContentTextField } from "../formFields";
import {
  contentEntityTitle,
  findResourceId,
  formCount,
  formValue,
  numberField,
  numberString,
  recordAt,
  removeIndexedFormRow,
  stringField,
  toInteger,
  toNumber,
  type EntityFormState
} from "../formState";

export function ContentRewardRows(props: {
  content: ContentBundle;
  formState: EntityFormState;
  prefix: string;
  updateField: (name: string, value: string) => void;
  updateFields: (values: EntityFormState) => void;
}) {
  const count = formCount(props.formState, `${props.prefix}Count`, 1);
  const resourceOptions = resourceSelectOptions(props.content);

  return (
    <ContentNestedSection
      addLabel="Добавить награду"
      onAdd={() =>
        props.updateFields({
          [`${props.prefix}ChancePercent_${count}`]: "100",
          [`${props.prefix}Count`]: String(count + 1),
          [`${props.prefix}Max_${count}`]: "1",
          [`${props.prefix}Min_${count}`]: "1",
          [`${props.prefix}ResourceId_${count}`]: resourceOptions[0]?.value ?? ""
        })
      }
      title="Таблица наград"
    >
      {Array.from({ length: count }, (_, index) => (
        <div className="content-list-row content-list-row-wide" key={`${props.prefix}-${index}`}>
          <ContentSelectField
            label="Ресурс"
            name={`${props.prefix}ResourceId_${index}`}
            onChange={props.updateField}
            options={resourceOptions}
            value={props.formState[`${props.prefix}ResourceId_${index}`]}
          />
          <ContentTextField label="Min" name={`${props.prefix}Min_${index}`} onChange={props.updateField} type="number" value={props.formState[`${props.prefix}Min_${index}`]} />
          <ContentTextField label="Max" name={`${props.prefix}Max_${index}`} onChange={props.updateField} type="number" value={props.formState[`${props.prefix}Max_${index}`]} />
          <ContentTextField
            label="Chance %"
            name={`${props.prefix}ChancePercent_${index}`}
            onChange={props.updateField}
            type="number"
            value={props.formState[`${props.prefix}ChancePercent_${index}`]}
          />
          <button
            disabled={count <= 1}
            onClick={() =>
              props.updateFields(
                removeIndexedFormRow(props.formState, props.prefix, index, ["ResourceId", "Min", "Max", "ChancePercent"], count)
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

export function createRewardTableFormState(prefix: string, rows: ContentRecord[], content: ContentBundle): EntityFormState {
  const count = Math.max(1, rows.length);
  const state: EntityFormState = {
    [`${prefix}Count`]: String(count)
  };

  for (let index = 0; index < count; index += 1) {
    const row = recordAt(rows, index);
    state[`${prefix}ChancePercent_${index}`] = numberString(Math.round(numberField(row, "chance", 1) * 100));
    state[`${prefix}Max_${index}`] = numberString(numberField(row, "max", 1));
    state[`${prefix}Min_${index}`] = numberString(numberField(row, "min", 1));
    state[`${prefix}ResourceId_${index}`] = stringField(row, "resourceId") || findResourceId(content, "gold");
  }

  return state;
}

export function validateRewardRows(state: EntityFormState, prefix: string, content: ContentBundle, errors: string[]) {
  const count = formCount(state, `${prefix}Count`, 1);

  for (let index = 0; index < count; index += 1) {
    const rowLabel = `Награда ${index + 1}`;
    const min = toNumber(state[`${prefix}Min_${index}`]);
    const max = toNumber(state[`${prefix}Max_${index}`]);
    const chance = toNumber(state[`${prefix}ChancePercent_${index}`]);
    const resourceId = formValue(state, `${prefix}ResourceId_${index}`);

    validateIntegerField(state, `${prefix}Min_${index}`, `${rowLabel} min`, errors, { min: 0 });
    validateIntegerField(state, `${prefix}Max_${index}`, `${rowLabel} max`, errors, { min: 0 });
    validateNumberField(state, `${prefix}ChancePercent_${index}`, `${rowLabel} chance`, errors, { min: 0 });

    if (min > max) {
      errors.push(`${rowLabel}: min не может быть больше max.`);
    }

    if (chance > 100) {
      errors.push(`${rowLabel}: шанс не может быть больше 100%.`);
    }

    if (!resourceIdSet(content).has(resourceId)) {
      errors.push(`${rowLabel}: ресурс не найден.`);
    }
  }
}

export function createRewardTableFromForm(state: EntityFormState, prefix: string): Array<{ chance: number; max: number; min: number; resourceId: string }> {
  const count = formCount(state, `${prefix}Count`, 1);
  const rows: Array<{ chance: number; max: number; min: number; resourceId: string }> = [];

  for (let index = 0; index < count; index += 1) {
    rows.push({
      chance: Math.round((toNumber(state[`${prefix}ChancePercent_${index}`]) / 100) * 1000) / 1000,
      max: toInteger(state[`${prefix}Max_${index}`]),
      min: toInteger(state[`${prefix}Min_${index}`]),
      resourceId: formValue(state, `${prefix}ResourceId_${index}`)
    });
  }

  return rows;
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
