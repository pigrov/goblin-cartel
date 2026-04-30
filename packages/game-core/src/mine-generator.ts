export interface MineTemplate {
  id: string;
  width: number;
  height: number;
  depthMeters?: number;
  completionVeinTypeId?: string;
  difficultyStart?: number;
  difficultyEnd?: number;
  cellMap: MineCellTemplate[];
}

export type MineCellSpecial = "reward_chest";

export interface MineCellTemplate {
  row: number;
  col: number;
  blockTypeId: string;
  hp?: number;
  rewardChestTypeId?: string;
  special?: MineCellSpecial;
}

export interface GeneratedBlock {
  row: number;
  col: number;
  blockTypeId: string;
  difficultyMultiplier: number;
  hp?: number;
  rewardChestTypeId?: string;
  special?: MineCellSpecial;
}

export interface GeneratedMine {
  templateId: string;
  seed: string;
  width: number;
  height: number;
  depthMeters: number;
  completionVeinTypeId?: string;
  blocks: GeneratedBlock[][];
}

export function generateMine(template: MineTemplate, seed: string): GeneratedMine {
  validateTemplate(template);

  return {
    templateId: template.id,
    seed,
    width: template.width,
    height: template.height,
    depthMeters: template.depthMeters ?? template.height,
    completionVeinTypeId: template.completionVeinTypeId,
    blocks: generateMineFromCellMap(template)
  };
}

function validateTemplate(template: MineTemplate): void {
  if (template.width <= 0 || template.height <= 0) {
    throw new Error("Mine dimensions must be positive");
  }

  if (!template.cellMap.length) {
    throw new Error("Mine template must define cellMap");
  }
}

function generateMineFromCellMap(template: MineTemplate): GeneratedBlock[][] {
  const cellsByKey = new Map(template.cellMap.map((cell) => [`${cell.row}:${cell.col}`, cell]));

  return Array.from({ length: template.height }, (_, row) =>
    Array.from({ length: template.width }, (_, col): GeneratedBlock => {
      const cell = cellsByKey.get(`${row}:${col}`);

      if (!cell) {
        throw new Error(`No cell configured for row ${row} col ${col}`);
      }

      return {
        row,
        col,
        blockTypeId: cell.blockTypeId,
        difficultyMultiplier: interpolateDifficulty(template, row),
        hp: cell.hp,
        rewardChestTypeId: cell.rewardChestTypeId,
        special: cell.special
      };
    })
  );
}

function interpolateDifficulty(template: MineTemplate, row: number): number {
  const start = template.difficultyStart ?? 1;
  const end = template.difficultyEnd ?? start;

  if (template.height <= 1) {
    return start;
  }

  const progress = Math.min(1, Math.max(0, row / (template.height - 1)));
  return Math.round((start + (end - start) * progress) * 1000) / 1000;
}
