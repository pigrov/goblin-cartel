import type { MineTemplateConfig } from "@goblin-cartel/content-schemas";
import type { BuiltMineState, MiningSession } from "@goblin-cartel/game-core";

export type MineProgressionStatus = "digging" | "vein_found" | "mine_building" | "next_available" | "complete_no_next";

export function findMineTemplateIndex(mineTemplates: readonly MineTemplateConfig[], mineTemplateId: string): number {
  return mineTemplates.findIndex((mineTemplate) => mineTemplate.id === mineTemplateId);
}

export function findNextMineTemplate(
  mineTemplates: readonly MineTemplateConfig[],
  currentMineTemplateId: string
): MineTemplateConfig | undefined {
  const index = findMineTemplateIndex(mineTemplates, currentMineTemplateId);

  if (index < 0) {
    return undefined;
  }

  return mineTemplates[index + 1];
}

export function hasBuiltMineFromSession(session: MiningSession, builtMines: readonly BuiltMineState[]): boolean {
  return Boolean(findBuiltMineFromSession(session, builtMines));
}

export function hasActiveBuiltMineFromSession(session: MiningSession, builtMines: readonly BuiltMineState[]): boolean {
  return Boolean(findBuiltMineFromSession(session, builtMines)?.status === "active");
}

export function findBuiltMineFromSession(
  session: MiningSession,
  builtMines: readonly BuiltMineState[]
): BuiltMineState | undefined {
  const sourcePrefix = `${session.mine.templateId}:${session.mine.seed}:`;
  return builtMines.find((builtMine) => builtMine.sourceVeinId.startsWith(sourcePrefix));
}

export function canMoveToNextMine(input: {
  builtMines: readonly BuiltMineState[];
  mineTemplates: readonly MineTemplateConfig[];
  session: MiningSession;
}): boolean {
  return Boolean(findNextMineTemplate(input.mineTemplates, input.session.mine.templateId)) && hasFoundVeinFromSession(input.session);
}

export function carryFoundVeinsToNextMineSession(nextSession: MiningSession, previousSession: MiningSession): MiningSession {
  const foundVeinsById = new Map(nextSession.foundVeins.map((vein) => [vein.id, vein]));

  for (const vein of previousSession.foundVeins) {
    foundVeinsById.set(vein.id, vein);
  }

  return {
    ...nextSession,
    foundVeins: Array.from(foundVeinsById.values())
  };
}

export function getMineProgressionStatus(input: {
  builtMines: readonly BuiltMineState[];
  mineTemplates: readonly MineTemplateConfig[];
  session: MiningSession;
}): MineProgressionStatus {
  const hasNextMine = Boolean(findNextMineTemplate(input.mineTemplates, input.session.mine.templateId));

  if (!hasFoundVeinFromSession(input.session)) {
    return "digging";
  }

  if (hasNextMine) {
    return "next_available";
  }

  const builtMine = findBuiltMineFromSession(input.session, input.builtMines);

  return builtMine?.status === "building" ? "mine_building" : "complete_no_next";
}

export function shouldShowMineCompletionNotice(input: {
  canStartNextMine: boolean;
  mineTemplateId: string;
  seenMineCompletionNoticeIds: readonly string[];
}): boolean {
  return input.canStartNextMine && !input.seenMineCompletionNoticeIds.includes(input.mineTemplateId);
}

export function markMineCompletionNoticeSeen(
  seenMineCompletionNoticeIds: readonly string[],
  mineTemplateId: string
): string[] {
  if (seenMineCompletionNoticeIds.includes(mineTemplateId)) {
    return [...seenMineCompletionNoticeIds];
  }

  return [...seenMineCompletionNoticeIds, mineTemplateId];
}

function hasFoundVeinFromSession(session: MiningSession): boolean {
  const sourcePrefix = `${session.mine.templateId}:${session.mine.seed}:`;
  return (session.foundVeins ?? []).some((vein) => vein.id.startsWith(sourcePrefix));
}
