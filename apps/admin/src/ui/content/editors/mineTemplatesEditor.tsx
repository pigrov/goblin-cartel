import { type CSSProperties, useState } from "react";
import type { ContentBundle, ContentRecord } from "../../../api/adminApi";
import { ContentSelectField, ContentTextField } from "../formFields";
import {
  arrayField,
  contentEntityTitle,
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

interface MineVisualCell {
  blockTypeId: string;
  col: number;
  hp: string;
  rewardChestTypeId: string;
  row: number;
  special: string;
}

interface MineVisualRow {
  cells: MineVisualCell[];
  row: number;
}

export function ContentMineTemplateFields(props: {
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
        <ContentTextField label="Ширина" name="width" onChange={props.updateField} type="number" value={props.formState.width} />
        <ContentTextField label="Высота, рядов" name="height" onChange={props.updateField} type="number" value={props.formState.height} />
        <ContentTextField label="Глубина, м" name="depthMeters" onChange={props.updateField} type="number" value={props.formState.depthMeters} />
        <ContentTextField label="Сложность от" name="difficultyStart" onChange={props.updateField} type="number" value={props.formState.difficultyStart} />
        <ContentTextField label="Сложность до" name="difficultyEnd" onChange={props.updateField} type="number" value={props.formState.difficultyEnd} />
      </div>
      <div className="content-form-grid">
        <ContentSelectField
          label="Жила после расчистки"
          name="completionVeinTypeId"
          onChange={props.updateField}
          options={[{ value: "", label: "Не задана" }, ...veinSelectOptions(props.content)]}
          value={props.formState.completionVeinTypeId}
        />
        <ContentSelectField
          label="Сундук перехода"
          name="completionRewardChestTypeId"
          onChange={props.updateField}
          options={[{ value: "", label: "Не задан" }, ...rewardChestSelectOptions(props.content)]}
          value={props.formState.completionRewardChestTypeId}
        />
      </div>
      <div className="content-form-grid">
        <ContentSelectField
          label="Награда за метр"
          name="depthRewardResourceId"
          onChange={props.updateField}
          options={[{ value: "", label: "Не задана" }, ...resourceSelectOptions(props.content)]}
          value={props.formState.depthRewardResourceId}
        />
        <ContentTextField label="Сумма/м" name="depthRewardAmountPerMeter" onChange={props.updateField} type="number" value={props.formState.depthRewardAmountPerMeter} />
        <ContentTextField label="Множитель" name="depthRewardMultiplier" onChange={props.updateField} type="number" value={props.formState.depthRewardMultiplier} />
        <ContentTextField label="Лимит за спуск" name="depthRewardMaxAmount" onChange={props.updateField} type="number" value={props.formState.depthRewardMaxAmount} />
      </div>
      <ContentMineVisualEditor content={props.content} formState={props.formState} updateFields={props.updateFields} />
    </>
  );
}

function ContentMineVisualEditor(props: {
  content: ContentBundle;
  formState: EntityFormState;
  updateFields: (values: EntityFormState) => void;
}) {
  const firstBlockId = stringField(props.content.blockTypes[0] ?? {}, "id");
  const [brushBlockTypeId, setBrushBlockTypeId] = useState(firstBlockId);
  const [detailCell, setDetailCell] = useState<{ col: number; row: number } | null>(null);
  const [isPainting, setIsPainting] = useState(false);
  const visualRows = createMineVisualRows(props.content, props.formState);
  const mineWidth = Math.max(1, toInteger(props.formState.width));
  const mineHeight = visualRows.length;
  const mineCellSize = adminMineCellSize(mineWidth);
  const selectedCell = detailCell ? getMineVisualCell(props.formState, detailCell.row, detailCell.col, props.content) : null;
  const selectedCellComputedHp =
    detailCell && selectedCell
      ? mineCellComputedHp(props.content, props.formState, selectedCell.blockTypeId, detailCell.row)
      : null;
  const selectedCellEffectiveHp =
    selectedCell && selectedCellComputedHp !== null ? mineCellEffectiveHp(selectedCell, selectedCellComputedHp) : null;
  const ru = props.content.localization?.ru ?? {};

  function paintCell(row: number, col: number) {
    props.updateFields({
      [`cellBlock_${row}_${col}`]: brushBlockTypeId || firstBlockId
    });
  }

  function updateDetailCell(values: EntityFormState) {
    if (!detailCell) {
      return;
    }

    props.updateFields(
      Object.fromEntries(Object.entries(values).map(([key, value]) => [`cell${key}_${detailCell.row}_${detailCell.col}`, value]))
    );
  }

  function closeDetailCell() {
    setDetailCell(null);
  }

  return (
    <section className="content-mine-visual-editor" onPointerLeave={() => setIsPainting(false)} onPointerUp={() => setIsPainting(false)}>
      <header>
        <div>
          <strong>Визуальный редактор шахты</strong>
          <span>
            {mineWidth}x{mineHeight} · сложность {props.formState.difficultyStart || "1"} → {props.formState.difficultyEnd || "1"}
          </span>
        </div>
      </header>

      <div
        className="content-mine-visual-grid"
        style={{ "--mine-cell-size": `${mineCellSize}px`, "--mine-columns": mineWidth } as CSSProperties}
      >
        {visualRows.map((row) => {
          const rowDifficulty = mineRowDifficulty(props.formState, row.row);

          return (
            <div className="content-mine-visual-row" key={row.row} title={`Ряд ${row.row + 1} · сложность x${rowDifficulty}`}>
              <span className="content-mine-row-label">{mineRowDepthMeters(props.formState, row.row)} м</span>
              {row.cells.map((cell) => {
                const blockTitle = blockTitleById(props.content, cell.blockTypeId);
                const marker = cell.special === "reward_chest" ? "С" : "";
                const isSelected = detailCell?.row === cell.row && detailCell.col === cell.col;
                const cellStyle = { "--mine-cell-color": mineVisualBlockColor(cell.blockTypeId, cell.row + cell.col) } as CSSProperties;

                return (
                  <button
                    className={isSelected ? "content-mine-cell active" : marker ? "content-mine-cell special" : "content-mine-cell"}
                    key={`${cell.row}:${cell.col}`}
                    onDoubleClick={() => setDetailCell({ col: cell.col, row: cell.row })}
                    onPointerDown={(event) => {
                      if (event.button !== 0) {
                        return;
                      }
                      setIsPainting(true);
                      paintCell(cell.row, cell.col);
                    }}
                    onPointerEnter={() => {
                      if (isPainting) {
                        paintCell(cell.row, cell.col);
                      }
                    }}
                    style={cellStyle}
                    title={`${cell.row + 1}:${cell.col + 1} · ${blockTitle}`}
                    type="button"
                  >
                    {marker || blockTitle.slice(0, 1)}
                  </button>
                );
              })}
              <span className="content-mine-row-difficulty">x{rowDifficulty}</span>
            </div>
          );
        })}
      </div>

      <div className="content-mine-visual-legend">
        {props.content.blockTypes.map((blockType, index) => {
          const blockId = stringField(blockType, "id");
          const style = { "--mine-cell-color": mineVisualBlockColor(blockId, index) } as CSSProperties;
          const selected = brushBlockTypeId === blockId;

          return (
            <button
              className={selected ? "active" : ""}
              key={blockId}
              onClick={() => setBrushBlockTypeId(blockId)}
              style={style}
              type="button"
            >
              <i />
              {contentEntityTitle(blockType, ru)}
            </button>
          );
        })}
      </div>

      {detailCell && selectedCell ? (
        <div className="content-modal-backdrop" onClick={closeDetailCell} role="presentation">
          <section className="content-mine-cell-modal" aria-label="Параметры клетки" onClick={(event) => event.stopPropagation()}>
            <header>
              <div>
                <span>
                  Клетка {detailCell.row + 1}:{detailCell.col + 1} · {mineRowDepthMeters(props.formState, detailCell.row)} м
                </span>
                <strong>{blockTitleById(props.content, selectedCell.blockTypeId)}</strong>
              </div>
              <button onClick={closeDetailCell} type="button">
                Закрыть
              </button>
            </header>
            <div className="content-mine-cell-hp">
              <span>Текущее HP</span>
              <strong>{selectedCellEffectiveHp ?? 0}</strong>
              <small>
                Авто: {selectedCellComputedHp ?? 0} HP · сложность x{mineRowDifficulty(props.formState, detailCell.row)}
              </small>
            </div>
            <div className="content-form-grid">
              <ContentSelectField
                label="Тип камня"
                name="Block"
                onChange={(_name, value) => updateDetailCell({ Block: value, Hp: "" })}
                options={blockTypeSelectOptions(props.content)}
                value={selectedCell.blockTypeId}
              />
              <ContentTextField
                label="Задать HP"
                name="Hp"
                onChange={(_name, value) => updateDetailCell({ Hp: value })}
                placeholder={String(selectedCellComputedHp ?? "")}
                type="number"
                value={selectedCell.hp}
              />
              <ContentSelectField
                label="Особое"
                name="Special"
                onChange={(_name, value) =>
                  updateDetailCell({
                    RewardChestTypeId: value === "reward_chest" ? selectedCell.rewardChestTypeId || firstRewardChestTypeId(props.content) : "",
                    Special: value
                  })
                }
                options={[
                  { value: "", label: "Нет" },
                  { value: "reward_chest", label: "Дроп сундука" }
                ]}
                value={selectedCell.special}
              />
              {selectedCell.special === "reward_chest" ? (
                <ContentSelectField
                  label="Тип сундука"
                  name="RewardChestTypeId"
                  onChange={(_name, value) => updateDetailCell({ RewardChestTypeId: value })}
                  options={rewardChestSelectOptions(props.content)}
                  value={selectedCell.rewardChestTypeId || firstRewardChestTypeId(props.content)}
                />
              ) : null}
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}

export function createMineTemplateFormState(entity: ContentRecord, content: ContentBundle): EntityFormState {
  const width = Math.max(1, numberField(entity, "width", 8));
  const height = Math.max(1, numberField(entity, "height", 10));
  const difficulty = numberField(entity, "difficulty", 1);
  const depthProgressReward = recordField(entity, "depthProgressReward");

  return {
    completionRewardChestTypeId: stringField(entity, "completionRewardChestTypeId"),
    completionVeinTypeId: stringField(entity, "completionVeinTypeId"),
    depthMeters: numberString(numberField(entity, "depthMeters", 1)),
    depthRewardAmountPerMeter: numberString(numberField(depthProgressReward, "amountPerMeter", 0)),
    depthRewardMaxAmount: numberField(depthProgressReward, "maxAmount", 0) > 0 ? numberString(numberField(depthProgressReward, "maxAmount", 0)) : "",
    depthRewardMultiplier: numberString(numberField(depthProgressReward, "multiplier", 1)),
    depthRewardResourceId: stringField(depthProgressReward, "resourceId"),
    difficultyEnd: numberString(numberField(entity, "difficultyEnd", difficulty)),
    difficultyStart: numberString(numberField(entity, "difficultyStart", difficulty)),
    height: numberString(height),
    id: stringField(entity, "id"),
    sortOrder: numberString(numberField(entity, "sortOrder", 0)),
    title: localizationValue(content, stringField(entity, "displayNameKey")),
    width: numberString(width),
    ...createCellMapFormState(entity, content, width, height)
  };
}

function createCellMapFormState(entity: ContentRecord, content: ContentBundle, width: number, height: number): EntityFormState {
  const state: EntityFormState = {};
  const cellMap = arrayField(entity, "cellMap");
  const fallbackBlockId = firstBlockTypeId(content);
  const cellsByKey = new Map(cellMap.map((cell) => [`${numberField(cell, "row", 0)}:${numberField(cell, "col", 0)}`, cell]));

  for (let row = 0; row < height; row += 1) {
    for (let col = 0; col < width; col += 1) {
      const cell = cellsByKey.get(`${row}:${col}`) ?? {};
      const hp = numberField(cell, "hp", 0);

      state[mineCellField("Block", row, col)] = stringField(cell, "blockTypeId") || fallbackBlockId;
      state[mineCellField("Hp", row, col)] = hp > 0 ? numberString(hp) : "";
      state[mineCellField("RewardChestTypeId", row, col)] = stringField(cell, "rewardChestTypeId");
      state[mineCellField("Special", row, col)] = stringField(cell, "special");
    }
  }

  return state;
}

export function validateMineTemplateForm(state: EntityFormState, content: ContentBundle, errors: string[]) {
  validateIntegerField(state, "sortOrder", "Sort order", errors);
  validateIntegerField(state, "width", "Ширина", errors, { min: 1 });
  validateIntegerField(state, "height", "Высота", errors, { min: 1 });
  validateIntegerField(state, "depthMeters", "Глубина", errors, { min: 1 });
  validateNumberField(state, "difficultyStart", "Сложность от", errors, { min: 0.01 });
  validateNumberField(state, "difficultyEnd", "Сложность до", errors, { min: 0.01 });

  const completionVeinTypeId = formValue(state, "completionVeinTypeId");
  const completionRewardChestTypeId = formValue(state, "completionRewardChestTypeId");
  const depthRewardResourceId = formValue(state, "depthRewardResourceId");

  if (completionVeinTypeId && !veinIdSet(content).has(completionVeinTypeId)) {
    errors.push("Жила после расчистки не найдена.");
  }

  if (completionRewardChestTypeId && !rewardChestIdSet(content).has(completionRewardChestTypeId)) {
    errors.push("Сундук перехода не найден.");
  }

  if (depthRewardResourceId) {
    if (!resourceIdSet(content).has(depthRewardResourceId)) {
      errors.push("Ресурс награды за метр не найден.");
    }

    validateNumberField(state, "depthRewardAmountPerMeter", "Награда за метр", errors, { min: 0.01 });
    validateNumberField(state, "depthRewardMultiplier", "Множитель награды за метр", errors, { min: 0.01 });

    if (formValue(state, "depthRewardMaxAmount")) {
      validateIntegerField(state, "depthRewardMaxAmount", "Лимит награды за спуск", errors, { min: 1 });
    }
  }

  validateCellMapRows(state, content, errors);
}

function validateCellMapRows(state: EntityFormState, content: ContentBundle, errors: string[]) {
  const mineHeight = Math.max(0, toInteger(state.height));
  const mineWidth = Math.max(0, toInteger(state.width));
  const blockIds = blockTypeIdSet(content);
  const rewardChestIds = rewardChestIdSet(content);

  for (let row = 0; row < mineHeight; row += 1) {
    for (let col = 0; col < mineWidth; col += 1) {
      const label = `Клетка ${row + 1}:${col + 1}`;
      const cell = getMineVisualCell(state, row, col, content);
      const blockTypeId = cell.blockTypeId;
      const hp = cell.hp;
      const rewardChestTypeId = cell.rewardChestTypeId;
      const special = cell.special;

      if (!blockIds.has(blockTypeId)) {
        errors.push(`${label}: выбери тип камня.`);
      }

      if (hp.trim()) {
        validateNumberField(state, mineCellField("Hp", row, col), `${label} HP`, errors, { min: 0.01 });
      }

      if (special && special !== "reward_chest") {
        errors.push(`${label}: особый тип некорректен.`);
      }

      if (special === "reward_chest" && !rewardChestIds.has(rewardChestTypeId)) {
        errors.push(`${label}: выбери сундук.`);
      }
    }
  }
}

export function applyMineTemplateForm(
  content: ContentBundle,
  selectedId: string,
  state: EntityFormState
): {
  entity: ContentRecord;
  entityId: string;
  entityType: "mineTemplate";
  localization: Record<string, string>;
  message: string;
} {
  const current = content.mineTemplates.find((item) => stringField(item, "id") === selectedId);

  if (!current) {
    throw new Error("Рудник не найден.");
  }

  const id = formValue(state, "id");
  const displayNameKey = stringField(current, "displayNameKey") || `mine.${id}.name`;
  const nextMineTemplate: ContentRecord = {
    cellMap: createCellMapFromForm(state, content),
    depthMeters: toInteger(state.depthMeters),
    difficultyEnd: toNumber(state.difficultyEnd),
    difficultyStart: toNumber(state.difficultyStart),
    displayNameKey,
    height: toInteger(state.height),
    id,
    sortOrder: toInteger(state.sortOrder),
    width: toInteger(state.width)
  };

  setOptionalField(nextMineTemplate, "completionVeinTypeId", formValue(state, "completionVeinTypeId"));
  setOptionalField(nextMineTemplate, "completionRewardChestTypeId", formValue(state, "completionRewardChestTypeId"));

  const depthRewardResourceId = formValue(state, "depthRewardResourceId");
  if (depthRewardResourceId) {
    const maxAmount = toInteger(state.depthRewardMaxAmount);
    nextMineTemplate.depthProgressReward = {
      amountPerMeter: toNumber(state.depthRewardAmountPerMeter),
      multiplier: toNumber(state.depthRewardMultiplier) || 1,
      resourceId: depthRewardResourceId,
      ...(maxAmount > 0 ? { maxAmount } : {})
    };
  }

  return {
    entity: nextMineTemplate,
    entityId: selectedId,
    entityType: "mineTemplate",
    localization: {
      [displayNameKey]: formValue(state, "title").trim()
    },
    message: `Рудник ${id} сохранен как draft.`
  };
}

export function createMineVisualRows(content: ContentBundle, formState: EntityFormState): MineVisualRow[] {
  const height = Math.max(1, toInteger(formState.height));

  return Array.from({ length: height }, (_, row): MineVisualRow => ({
    cells: Array.from({ length: Math.max(1, toInteger(formState.width)) }, (_item, col) => getMineVisualCell(formState, row, col, content)),
    row
  }));
}

export function getMineVisualCell(formState: EntityFormState, row: number, col: number, content: ContentBundle): MineVisualCell {
  const fallbackBlockId = firstBlockTypeId(content);

  return {
    blockTypeId: formValue(formState, mineCellField("Block", row, col)) || fallbackBlockId,
    col,
    hp: formValue(formState, mineCellField("Hp", row, col)),
    rewardChestTypeId: formValue(formState, mineCellField("RewardChestTypeId", row, col)),
    row,
    special: formValue(formState, mineCellField("Special", row, col))
  };
}

export function createDefaultMineCellMap(content: ContentBundle, width: number, height: number): ContentRecord[] {
  const blockTypeId = firstBlockTypeId(content);

  return Array.from({ length: height }, (_rowItem, row) =>
    Array.from({ length: width }, (_colItem, col) => ({
      blockTypeId,
      col,
      row
    }))
  ).flat();
}

function createCellMapFromForm(state: EntityFormState, content: ContentBundle): ContentRecord[] {
  const height = Math.max(1, toInteger(state.height));
  const width = Math.max(1, toInteger(state.width));
  const cells: ContentRecord[] = [];

  for (let row = 0; row < height; row += 1) {
    for (let col = 0; col < width; col += 1) {
      const hp = toNumber(state[mineCellField("Hp", row, col)]);
      const rewardChestTypeId = formValue(state, mineCellField("RewardChestTypeId", row, col));
      const special = formValue(state, mineCellField("Special", row, col));
      const cell: ContentRecord = {
        blockTypeId: formValue(state, mineCellField("Block", row, col)) || firstBlockTypeId(content),
        col,
        row
      };

      if (hp > 0) {
        cell.hp = hp;
      }

      if (special) {
        cell.special = special;
      }

      if (special === "reward_chest" && rewardChestTypeId) {
        cell.rewardChestTypeId = rewardChestTypeId;
      }

      cells.push(cell);
    }
  }

  return cells;
}

function mineCellField(suffix: string, row: number, col: number): string {
  return `cell${suffix}_${row}_${col}`;
}

function firstBlockTypeId(content: ContentBundle): string {
  return stringField(content.blockTypes[0] ?? {}, "id");
}

function firstRewardChestTypeId(content: ContentBundle): string {
  return stringField((content.rewardChestTypes ?? [])[0] ?? {}, "id");
}

function mineRowDepthMeters(formState: EntityFormState, row: number): number {
  const height = Math.max(1, toInteger(formState.height));
  const depthMeters = Math.max(1, toInteger(formState.depthMeters));
  return Math.max(1, Math.round(((row + 1) * depthMeters) / height));
}

function mineRowDifficulty(formState: EntityFormState, row: number): number {
  const height = Math.max(1, toInteger(formState.height));
  const start = toNumber(formState.difficultyStart) || 1;
  const end = toNumber(formState.difficultyEnd) || start;

  if (height <= 1) {
    return Math.round(start * 1000) / 1000;
  }

  const progress = Math.min(1, Math.max(0, row / (height - 1)));
  return Math.round((start + (end - start) * progress) * 1000) / 1000;
}

function mineCellComputedHp(
  content: ContentBundle,
  formState: EntityFormState,
  blockTypeId: string,
  row: number
): number {
  const blockType = content.blockTypes.find((item) => stringField(item, "id") === blockTypeId);
  const baseHp = numberField(blockType ?? {}, "baseHp", 1);
  const multiplier = mineRowDifficulty(formState, row);
  return Math.ceil(baseHp * multiplier);
}

function mineCellEffectiveHp(cell: MineVisualCell, computedHp: number): number {
  const hp = toNumber(cell.hp);
  return hp > 0 ? Math.ceil(hp) : computedHp;
}

function adminMineCellSize(mineWidth: number): number {
  const phoneWidth = 430;
  const depthWidth = 34;
  const difficultyWidth = 46;
  const gap = 4;
  const gridX = 4 + depthWidth + gap;
  const usableGridWidth = phoneWidth - gridX - difficultyWidth - gap - 10;

  return Math.max(28, Math.floor((usableGridWidth - gap * (Math.max(1, mineWidth) - 1)) / Math.max(1, mineWidth)));
}

function blockTitleById(content: ContentBundle, blockId: string): string {
  const blockType = content.blockTypes.find((item) => stringField(item, "id") === blockId);
  return blockType ? contentEntityTitle(blockType, content.localization?.ru ?? {}) : blockId || "Блок";
}

function mineVisualBlockColor(blockId: string, fallbackIndex: number): string {
  const palette = ["#9a6b3b", "#6f7f8d", "#c19a48", "#7f9b62", "#b87254", "#668b9c", "#8d72a9", "#b4a15a"];

  if (!blockId) {
    return palette[Math.max(0, fallbackIndex) % palette.length] ?? "#9a6b3b";
  }

  let hash = 0;
  for (let index = 0; index < blockId.length; index += 1) {
    hash = (hash * 31 + blockId.charCodeAt(index)) >>> 0;
  }

  return palette[hash % palette.length] ?? "#9a6b3b";
}

function setOptionalField(record: ContentRecord, key: string, value: string) {
  if (value) {
    record[key] = value;
    return;
  }
  Reflect.deleteProperty(record, key);
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

function rewardChestSelectOptions(content: ContentBundle): Array<{ label: string; value: string }> {
  return (content.rewardChestTypes ?? []).map((chestType) => ({
    label: contentEntityTitle(chestType, content.localization?.ru ?? {}),
    value: stringField(chestType, "id")
  }));
}

function blockTypeSelectOptions(content: ContentBundle): Array<{ label: string; value: string }> {
  return content.blockTypes.map((blockType) => ({
    label: contentEntityTitle(blockType, content.localization?.ru ?? {}),
    value: stringField(blockType, "id")
  }));
}

function resourceIdSet(content: ContentBundle): Set<string> {
  return new Set(content.resources.map((resource) => stringField(resource, "id")));
}

function blockTypeIdSet(content: ContentBundle): Set<string> {
  return new Set(content.blockTypes.map((blockType) => stringField(blockType, "id")));
}

function veinIdSet(content: ContentBundle): Set<string> {
  return new Set((content.veinTypes ?? []).map((veinType) => stringField(veinType, "id")));
}

function rewardChestIdSet(content: ContentBundle): Set<string> {
  return new Set((content.rewardChestTypes ?? []).map((chestType) => stringField(chestType, "id")));
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
