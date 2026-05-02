import { type BuiltMineTypeConfig, type ContentBundle, type MineTemplateConfig } from "@goblin-cartel/content-schemas";
import { type BuiltMineState, type MiningFoundVein, type MiningSession } from "@goblin-cartel/game-core";
import { useCallback, useMemo } from "react";
import { canBuildFoundVein, createBuildCostWithMultiplier } from "./builtMineClientState";
import { findExposedCellForPreferred, findExposedCells } from "./useMiningLoop";

const depthMarkerStepMeters = 5;

export interface FoundVeinView {
  canBuild: boolean;
  costLabel: string | null;
  productionLabel: string | null;
  productionPerHour: string | null;
  veinName: string;
}

export function useMineUiController(input: {
  activeCell: { row: number; col: number };
  buildCostMultiplier: number;
  builtMines: BuiltMineState[];
  content: ContentBundle;
  currentMineIndex: number;
  currentPlatformRow: number;
  foundVeinNotice: MiningFoundVein | null;
  labels: Record<string, string>;
  nextMineTemplate: MineTemplateConfig | undefined;
  resources: Record<string, number>;
  session: MiningSession;
}) {
  const blockTypeById = useMemo(
    () => new Map(input.content.blockTypes.map((blockType) => [blockType.id, blockType])),
    [input.content.blockTypes]
  );
  const mineTemplate =
    input.content.mineTemplates.find((template) => template.id === input.session.mine.templateId) ?? input.content.mineTemplates[0];
  const currentMineTitle = useMemo(() => mineTitle(mineTemplate, input.labels), [input.labels, mineTemplate]);
  const nextMineTitle = useMemo(
    () => (input.nextMineTemplate ? mineTitle(input.nextMineTemplate, input.labels) : null),
    [input.labels, input.nextMineTemplate]
  );
  const mineCompletionNextMineLabel = nextMineTitle ? `Рудник №${input.currentMineIndex + 2} · ${nextMineTitle}` : "";
  const foundVeinBuiltMineType = useMemo(
    () => (input.foundVeinNotice ? builtMineTypeForVein(input.foundVeinNotice, input.content.builtMineTypes) : undefined),
    [input.content.builtMineTypes, input.foundVeinNotice]
  );
  const canBuildFoundVeinNotice = input.foundVeinNotice
    ? canBuildFoundVein({
        buildCostMultiplier: input.buildCostMultiplier,
        builtMineTypes: input.content.builtMineTypes,
        builtMines: input.builtMines,
        resources: input.resources,
        vein: input.foundVeinNotice
      })
    : false;
  const foundVeinView = useMemo<FoundVeinView | null>(
    () =>
      input.foundVeinNotice
        ? {
            canBuild: canBuildFoundVeinNotice && Boolean(foundVeinBuiltMineType),
            costLabel: foundVeinBuiltMineType
              ? builtMineCostLabel(foundVeinBuiltMineType, input.labels, input.content, input.buildCostMultiplier)
              : null,
            productionLabel: foundVeinBuiltMineType
              ? resourceLabelById(foundVeinBuiltMineType.productionResourceId, input.labels, input.content)
              : null,
            productionPerHour: foundVeinBuiltMineType ? formatNumber(foundVeinBuiltMineType.baseProductionPerHour) : null,
            veinName: veinNameById(input.foundVeinNotice.veinTypeId, input.content, input.labels)
          }
        : null,
    [
      canBuildFoundVeinNotice,
      foundVeinBuiltMineType,
      input.buildCostMultiplier,
      input.content,
      input.foundVeinNotice,
      input.labels
    ]
  );
  const exposedCells = useMemo(() => findExposedCells(input.session), [input.session]);
  const exposedCellKeys = useMemo(() => new Set(exposedCells.map(cellKey)), [exposedCells]);
  const selectedCell = useMemo(() => findExposedCellForPreferred(input.session, input.activeCell), [input.activeCell, input.session]);
  const pixiDepthMarkerLabel = useCallback(
    (row: number) => depthMarkerLabel(input.session, row, input.currentPlatformRow),
    [input.currentPlatformRow, input.session]
  );

  return {
    blockTypeById,
    currentMineTitle,
    exposedCellKeys,
    foundVeinView,
    mineCompletionNextMineLabel,
    mineTemplate,
    nextMineTitle,
    pixiDepthMarkerLabel,
    selectedCell
  };
}

function mineTitle(mineTemplate: MineTemplateConfig | undefined, labels: Record<string, string>): string {
  if (!mineTemplate) {
    return "Рудник не найден";
  }

  return `${labelFromNameKey(mineTemplate.displayNameKey, mineTemplate.id, labels)} · ${mineTemplate.depthMeters} м`;
}

function veinNameById(veinTypeId: string, content: ContentBundle, labels: Record<string, string>): string {
  const veinType = content.veinTypes.find((item) => item.id === veinTypeId);
  return veinType ? labelFromNameKey(veinType.nameKey, veinType.id, labels) : veinTypeId;
}

function builtMineTypeForVein(vein: MiningFoundVein, builtMineTypes: BuiltMineTypeConfig[]): BuiltMineTypeConfig | undefined {
  return builtMineTypes.find((builtMineType) => builtMineType.sourceVeinType === vein.veinTypeId);
}

function builtMineCostLabel(
  builtMineType: BuiltMineTypeConfig,
  labels: Record<string, string>,
  content: ContentBundle,
  costMultiplier = 1
): string {
  const buildCost = createBuildCostWithMultiplier(builtMineType.buildCost, costMultiplier);

  if (buildCost.length === 0) {
    return "Без стоимости";
  }

  return buildCost
    .map((cost) => `${cost.amount} ${resourceLabelById(cost.resourceId, labels, content)}`)
    .join(" · ");
}

function labelFromNameKey(nameKey: string, fallback: string, labels: Record<string, string>): string {
  return labels[nameKey] ?? fallback;
}

export function createLabels(content: ContentBundle): Record<string, string> {
  return content.localization?.ru ?? {};
}

function resourceLabelById(resourceId: string, labels: Record<string, string>, content: ContentBundle): string {
  const resource = content.resources.find((item) => item.id === resourceId);
  return resource ? labelFromNameKey(resource.nameKey, resource.id, labels) : resourceId;
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function depthMetersForRow(session: MiningSession, row: number): number {
  const rowCount = Math.max(1, session.mine.height);
  return Math.max(1, Math.round(((row + 1) * session.mine.depthMeters) / rowCount));
}

function depthMarkerLabel(session: MiningSession, row: number, platformRow: number): string {
  const depth = depthMetersForRow(session, row);

  if (row === platformRow || depth % depthMarkerStepMeters === 0) {
    return `${depth}м`;
  }

  return "";
}

function cellKey(cell: { row: number; col: number }): string {
  return `${cell.row}:${cell.col}`;
}
