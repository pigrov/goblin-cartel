import type { ContentBundle, ContentRecord } from "../../../api/adminApi";
import { ContentSelectField, ContentTextField } from "../formFields";
import {
  arrayField,
  contentEntityTitle,
  findResourceId,
  formCount,
  formValue,
  localizationValue,
  numberField,
  numberString,
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

const rewardChestTierOptions = [
  { value: "wooden", label: "Wooden" },
  { value: "iron", label: "Iron" },
  { value: "steel", label: "Steel" },
  { value: "golden", label: "Golden" }
];

const bossCardDropRarityBalanceOptions = [
  { value: "common", label: "Обычные карты" },
  { value: "rare", label: "Редкие карты" },
  { value: "golden", label: "Золотые карты" }
] as const;

export function ContentRewardChestTypeFields(props: {
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
        <ContentSelectField label="Tier" name="tier" onChange={props.updateField} options={rewardChestTierOptions} value={props.formState.tier} />
        <ContentTextField label="Asset ID" name="assetId" onChange={props.updateField} value={props.formState.assetId} />
      </div>
      <ContentBossCardDropBalancer
        content={props.content}
        formState={props.formState}
        prefix="reward"
        updateField={props.updateField}
        updateFields={props.updateFields}
      />
      <ContentRewardRows
        content={props.content}
        formState={props.formState}
        prefix="reward"
        updateField={props.updateField}
        updateFields={props.updateFields}
      />
      <ContentBossCardDropSummary content={props.content} formState={props.formState} prefix="reward" />
    </>
  );
}

function ContentBossCardDropBalancer(props: {
  content: ContentBundle;
  formState: EntityFormState;
  prefix: string;
  updateField: (name: string, value: string) => void;
  updateFields: (values: EntityFormState) => void;
}) {
  const cardsByRarity = bossCardsByRarity(props.content);

  return (
    <section className="content-nested-section content-card-balance">
      <header>
        <div>
          <span>Баланс сундука</span>
          <strong>Карты босса и эликсир</strong>
        </div>
        <button onClick={() => props.updateFields(applyBossCardDropBalanceToFormState(props.content, props.formState, props.prefix))} type="button">
          Применить к таблице
        </button>
      </header>
      <div className="content-card-balance-grid">
        <div className="content-card-balance-row rare">
          <div className="content-card-balance-title">
            <strong>Эликсир</strong>
            <small>{resourceLabel(props.content, bossCardElixirResourceId(props.content))}</small>
          </div>
          <div className="content-form-grid">
            <ContentTextField
              label="Шанс %"
              name="cardDropElixirChancePercent"
              onChange={props.updateField}
              type="number"
              value={props.formState.cardDropElixirChancePercent}
            />
            <ContentTextField label="Min" name="cardDropElixirMin" onChange={props.updateField} type="number" value={props.formState.cardDropElixirMin} />
            <ContentTextField label="Max" name="cardDropElixirMax" onChange={props.updateField} type="number" value={props.formState.cardDropElixirMax} />
          </div>
        </div>

        {bossCardDropRarityBalanceOptions.map((option) => {
          const segment = bossCardDropRaritySegment(option.value);
          const cards = cardsByRarity.get(option.value) ?? [];

          return (
            <div className={`content-card-balance-row ${option.value}`} key={option.value}>
              <div className="content-card-balance-title">
                <strong>{option.label}</strong>
                <small>{cards.length > 0 ? cards.map((card) => contentEntityTitle(card, props.content.localization?.ru ?? {})).join(", ") : "карт нет"}</small>
              </div>
              <div className="content-form-grid">
                <ContentTextField
                  label="Шанс %"
                  name={bossCardDropField(segment, "ChancePercent")}
                  onChange={props.updateField}
                  type="number"
                  value={props.formState[bossCardDropField(segment, "ChancePercent")]}
                />
                <ContentTextField
                  label="Min"
                  name={bossCardDropField(segment, "Min")}
                  onChange={props.updateField}
                  type="number"
                  value={props.formState[bossCardDropField(segment, "Min")]}
                />
                <ContentTextField
                  label="Max"
                  name={bossCardDropField(segment, "Max")}
                  onChange={props.updateField}
                  type="number"
                  value={props.formState[bossCardDropField(segment, "Max")]}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ContentBossCardDropSummary(props: { content: ContentBundle; formState: EntityFormState; prefix: string }) {
  const count = formCount(props.formState, `${props.prefix}Count`, 1);
  const rowByResourceId = new Map<string, { chancePercent: number; max: number; min: number }>();
  const bossCards = props.content.bossCards ?? [];
  const elixirResourceId = stringField(bossCards[0] ?? {}, "elixirResourceId") || findResourceId(props.content, "elixir");
  const targets: Array<{ label: string; rarity: string; resourceId: string }> = [
    { label: resourceLabel(props.content, elixirResourceId), rarity: "rare", resourceId: elixirResourceId },
    ...bossCards.map((card) => ({
      label: contentEntityTitle(card, props.content.localization?.ru ?? {}),
      rarity: stringField(card, "rarity") || "common",
      resourceId: stringField(card, "cardResourceId")
    }))
  ].filter((target) => target.resourceId);

  for (let index = 0; index < count; index += 1) {
    const resourceId = formValue(props.formState, `${props.prefix}ResourceId_${index}`);

    if (!resourceId) {
      continue;
    }

    rowByResourceId.set(resourceId, {
      chancePercent: toNumber(formValue(props.formState, `${props.prefix}ChancePercent_${index}`)),
      max: toInteger(formValue(props.formState, `${props.prefix}Max_${index}`)),
      min: toInteger(formValue(props.formState, `${props.prefix}Min_${index}`))
    });
  }

  return (
    <section className="content-nested-section content-drop-summary">
      <header>
        <strong>Баланс карт и эликсира</strong>
      </header>
      <div className="content-drop-summary-grid">
        {targets.map((target) => {
          const row = rowByResourceId.get(target.resourceId);

          return (
            <span className={row ? `content-drop-summary-item ${target.rarity}` : `content-drop-summary-item ${target.rarity} missing`} key={target.resourceId}>
              <b>{target.label}</b>
              <small>
                {adminBossCardRarityLabel(target.rarity)} · {row ? `${row.min}-${row.max} / ${row.chancePercent}%` : "не добавлено"}
              </small>
            </span>
          );
        })}
      </div>
    </section>
  );
}

export function createRewardChestTypeFormState(entity: ContentRecord, content: ContentBundle): EntityFormState {
  return {
    assetId: stringField(entity, "assetId"),
    id: stringField(entity, "id"),
    tier: stringField(entity, "tier") || "wooden",
    title: localizationValue(content, stringField(entity, "nameKey")),
    ...createBossCardDropBalanceFormState(entity, content),
    ...createRewardTableFormState("reward", arrayField(entity, "rewardTable"), content)
  };
}

function createBossCardDropBalanceFormState(entity: ContentRecord, content: ContentBundle): EntityFormState {
  const rows = arrayField(entity, "rewardTable");
  const state: EntityFormState = {};
  const elixirRow = rewardRowByResourceId(rows, bossCardElixirResourceId(content));

  state.cardDropElixirChancePercent = rewardChancePercentString(elixirRow, 100);
  state.cardDropElixirMin = numberString(numberField(elixirRow ?? {}, "min", 1));
  state.cardDropElixirMax = numberString(numberField(elixirRow ?? {}, "max", 1));

  for (const option of bossCardDropRarityBalanceOptions) {
    const segment = bossCardDropRaritySegment(option.value);
    const firstCardRow = bossCardsByRarity(content)
      .get(option.value)
      ?.map((card) => rewardRowByResourceId(rows, stringField(card, "cardResourceId")))
      .find((row): row is ContentRecord => Boolean(row));

    state[bossCardDropField(segment, "ChancePercent")] = rewardChancePercentString(firstCardRow, 0);
    state[bossCardDropField(segment, "Min")] = numberString(numberField(firstCardRow ?? {}, "min", 1));
    state[bossCardDropField(segment, "Max")] = numberString(numberField(firstCardRow ?? {}, "max", 1));
  }

  return state;
}

export function validateRewardChestTypeForm(state: EntityFormState, content: ContentBundle, errors: string[]) {
  if (!rewardChestTierOptions.some((option) => option.value === formValue(state, "tier"))) {
    errors.push("Выбери корректный tier сундука.");
  }

  if (!formValue(state, "assetId").trim()) {
    errors.push("Asset ID обязателен.");
  }

  validateRewardRows(state, "reward", content, errors);
  validateBossCardDropBalanceFields(state, errors);
}

function validateBossCardDropBalanceFields(state: EntityFormState, errors: string[]) {
  validateBossCardDropBalanceRow(state, "cardDropElixir", "Эликсир", errors);

  for (const option of bossCardDropRarityBalanceOptions) {
    validateBossCardDropBalanceRow(state, bossCardDropFieldPrefix(bossCardDropRaritySegment(option.value)), option.label, errors);
  }
}

function validateBossCardDropBalanceRow(state: EntityFormState, prefix: string, label: string, errors: string[]) {
  const min = toNumber(state[`${prefix}Min`]);
  const max = toNumber(state[`${prefix}Max`]);
  const chance = toNumber(state[`${prefix}ChancePercent`]);

  validateNumberField(state, `${prefix}ChancePercent`, `${label}: шанс`, errors, { min: 0 });
  validateIntegerField(state, `${prefix}Min`, `${label}: min`, errors, { min: 0 });
  validateIntegerField(state, `${prefix}Max`, `${label}: max`, errors, { min: 0 });

  if (chance > 100) {
    errors.push(`${label}: шанс не может быть больше 100%.`);
  }

  if (min > max) {
    errors.push(`${label}: min не может быть больше max.`);
  }
}

export function applyRewardChestTypeForm(
  content: ContentBundle,
  selectedId: string,
  state: EntityFormState
): {
  entity: ContentRecord;
  entityId: string;
  entityType: "rewardChestType";
  localization: Record<string, string>;
  message: string;
} {
  const rewardChestTypes = content.rewardChestTypes ?? [];
  const current = rewardChestTypes.find((item) => stringField(item, "id") === selectedId);

  if (!current) {
    throw new Error("Сундук не найден.");
  }

  const id = formValue(state, "id");
  const nameKey = stringField(current, "nameKey") || `reward_chest.${id}.name`;
  const nextRewardChestType: ContentRecord = {
    ...current,
    assetId: formValue(state, "assetId").trim(),
    id,
    nameKey,
    rewardTable: createRewardTableFromForm(state, "reward"),
    tier: formValue(state, "tier")
  };

  return {
    entity: nextRewardChestType,
    entityId: selectedId,
    entityType: "rewardChestType",
    localization: {
      [nameKey]: formValue(state, "title").trim()
    },
    message: `Сундук ${id} сохранен как draft.`
  };
}

export function applyBossCardDropBalanceToFormState(
  content: ContentBundle,
  formState: EntityFormState,
  prefix = "reward"
): EntityFormState {
  const managedResourceIds = bossCardManagedRewardResourceIds(content);
  const preservedRows = createRewardTableFromForm(formState, prefix).filter(
    (row) => row.resourceId && !managedResourceIds.has(row.resourceId)
  );
  const nextRows = [...preservedRows, ...createBossCardDropBalanceRows(content, formState)];

  return createRewardTableFormState(prefix, nextRows, content);
}

function createBossCardDropBalanceRows(
  content: ContentBundle,
  state: EntityFormState
): Array<{ chance: number; max: number; min: number; resourceId: string }> {
  const rows: Array<{ chance: number; max: number; min: number; resourceId: string }> = [];
  const elixirResourceId = bossCardElixirResourceId(content);
  const elixirRow = createBossCardDropRewardRow(elixirResourceId, {
    chancePercent: toNumber(state.cardDropElixirChancePercent),
    max: toInteger(state.cardDropElixirMax),
    min: toInteger(state.cardDropElixirMin)
  });

  if (elixirRow) {
    rows.push(elixirRow);
  }

  const cardsByRarity = bossCardsByRarity(content);

  for (const option of bossCardDropRarityBalanceOptions) {
    const segment = bossCardDropRaritySegment(option.value);
    const chancePercent = toNumber(state[bossCardDropField(segment, "ChancePercent")]);
    const min = toInteger(state[bossCardDropField(segment, "Min")]);
    const max = toInteger(state[bossCardDropField(segment, "Max")]);

    for (const card of cardsByRarity.get(option.value) ?? []) {
      const row = createBossCardDropRewardRow(stringField(card, "cardResourceId"), {
        chancePercent,
        max,
        min
      });

      if (row) {
        rows.push(row);
      }
    }
  }

  return rows;
}

function createBossCardDropRewardRow(
  resourceId: string,
  balance: { chancePercent: number; max: number; min: number }
): { chance: number; max: number; min: number; resourceId: string } | null {
  if (!resourceId || balance.chancePercent <= 0 || balance.max <= 0) {
    return null;
  }

  return {
    chance: Math.round((balance.chancePercent / 100) * 1000) / 1000,
    max: balance.max,
    min: balance.min,
    resourceId
  };
}

function bossCardElixirResourceId(content: ContentBundle): string {
  return stringField((content.bossCards ?? [])[0] ?? {}, "elixirResourceId") || findResourceId(content, "elixir");
}

function bossCardsByRarity(content: ContentBundle): Map<string, ContentRecord[]> {
  const cardsByRarity = new Map<string, ContentRecord[]>();

  for (const card of content.bossCards ?? []) {
    const rarity = stringField(card, "rarity") || "common";
    cardsByRarity.set(rarity, [...(cardsByRarity.get(rarity) ?? []), card]);
  }

  return cardsByRarity;
}

function bossCardManagedRewardResourceIds(content: ContentBundle): Set<string> {
  return new Set([
    bossCardElixirResourceId(content),
    ...(content.bossCards ?? []).map((card) => stringField(card, "cardResourceId")).filter(Boolean)
  ]);
}

function rewardRowByResourceId(rows: ContentRecord[], resourceId: string): ContentRecord | undefined {
  return rows.find((row) => stringField(row, "resourceId") === resourceId);
}

function rewardChancePercentString(row: ContentRecord | undefined, fallback: number): string {
  return numberString(Math.round(numberField(row ?? {}, "chance", fallback / 100) * 1000) / 10);
}

function bossCardDropRaritySegment(rarity: string): string {
  return rarity.charAt(0).toUpperCase() + rarity.slice(1);
}

function bossCardDropField(segment: string, suffix: "ChancePercent" | "Max" | "Min"): string {
  return `${bossCardDropFieldPrefix(segment)}${suffix}`;
}

function bossCardDropFieldPrefix(segment: string): string {
  return `cardDrop${segment}`;
}

function resourceLabel(content: ContentBundle, resourceId: string): string {
  const resource = content.resources.find((item) => stringField(item, "id") === resourceId);
  return resource ? contentEntityTitle(resource, content.localization?.ru ?? {}) : resourceId;
}

function adminBossCardRarityLabel(rarity: string): string {
  switch (rarity) {
    case "golden":
      return "золотая";
    case "rare":
      return "редкая";
    default:
      return "обычная";
  }
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
