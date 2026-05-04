import type { ContentBundle } from "@goblin-cartel/content-schemas";
import type { BuiltMineState, GoblinRosterState, MiningSession } from "@goblin-cartel/game-core";
import type { MineRunStats } from "./mineRunStats";
import type { PlayerDbScoreInput } from "./playerDbSaveClient";

export function createPlayerDbScoreRows(input: {
  builtMines: readonly BuiltMineState[];
  content: ContentBundle;
  mineRunStats: MineRunStats;
  platformRow: number;
  roster: GoblinRosterState;
  session: MiningSession;
}): PlayerDbScoreInput[] {
  const completedMineTemplateIds = new Set(input.session.foundVeins.map((vein) => vein.mineTemplateId));
  const currentDepthMeters = calculateDepthMeters(input.session, input.platformRow);
  const completedDepthMeters = maxCompletedMineDepth(input.content, completedMineTemplateIds);
  const walletTotal = sumResourceAmounts(input.session.resources);
  const activeBuiltMineCount = input.builtMines.filter((builtMine) => builtMine.status === "active").length;

  return [
    score("mine.current_depth_meters", currentDepthMeters),
    score("mine.max_depth_meters", Math.max(currentDepthMeters, completedDepthMeters)),
    score("mine.current_destroyed_blocks", Math.max(input.session.destroyedBlocks, input.mineRunStats.destroyedBlocks)),
    score("mine.completed_count", completedMineTemplateIds.size),
    score("built_mines.total_count", input.builtMines.length),
    score("built_mines.active_count", activeBuiltMineCount),
    score("goblins.hired_count", input.roster.hiredGoblinIds.length),
    score("resources.wallet_total", walletTotal)
  ];
}

function score(key: string, value: number): PlayerDbScoreInput {
  return {
    key,
    value: Math.max(0, Math.trunc(Number.isFinite(value) ? value : 0))
  };
}

function calculateDepthMeters(session: MiningSession, platformRow: number): number {
  const rowCount = Math.max(1, session.mine.height);
  const row = Math.max(0, Math.min(rowCount - 1, Math.trunc(platformRow)));
  const depthMeters = Math.max(1, session.mine.depthMeters ?? rowCount);
  return Math.max(1, Math.round(((row + 1) * depthMeters) / rowCount));
}

function maxCompletedMineDepth(content: ContentBundle, completedMineTemplateIds: ReadonlySet<string>): number {
  let maxDepthMeters = 0;

  for (const mineTemplate of content.mineTemplates) {
    if (completedMineTemplateIds.has(mineTemplate.id)) {
      maxDepthMeters = Math.max(maxDepthMeters, Math.max(1, Math.round(mineTemplate.depthMeters ?? mineTemplate.height)));
    }
  }

  return maxDepthMeters;
}

function sumResourceAmounts(resources: Record<string, number>): number {
  return Object.values(resources).reduce((sum, amount) => {
    if (!Number.isFinite(amount) || amount <= 0) {
      return sum;
    }

    return sum + Math.floor(amount);
  }, 0);
}
