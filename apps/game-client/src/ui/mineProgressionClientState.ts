import type { MineTemplateConfig } from "@goblin-cartel/content-schemas";
import type { BuiltMineState, MiningSession } from "@goblin-cartel/game-core";

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
  const sourcePrefix = `${session.mine.templateId}:${session.mine.seed}:`;
  return builtMines.some((builtMine) => builtMine.sourceVeinId.startsWith(sourcePrefix));
}

export function canMoveToNextMine(input: {
  builtMines: readonly BuiltMineState[];
  mineTemplates: readonly MineTemplateConfig[];
  session: MiningSession;
}): boolean {
  return Boolean(findNextMineTemplate(input.mineTemplates, input.session.mine.templateId)) && hasBuiltMineFromSession(input.session, input.builtMines);
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
