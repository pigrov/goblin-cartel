export interface BlockHpInput {
  baseHp: number;
  rowIndex: number;
  mineDifficultyMultiplier: number;
}

export interface GoblinDpsInput {
  strength: number;
  speed: number;
  classMultiplier?: number;
  toolMultiplier?: number;
  blockTagBonus?: number;
}

export interface MineProductionInput {
  productionPerMinute: number;
  elapsedMinutes: number;
  mineLevelMultiplier?: number;
  automationMultiplier?: number;
  currentStored: number;
  capacity: number;
}

export function calculateBlockHp(input: BlockHpInput): number {
  assertNonNegative(input.baseHp, "baseHp");
  assertNonNegative(input.rowIndex, "rowIndex");
  assertPositive(input.mineDifficultyMultiplier, "mineDifficultyMultiplier");

  return Math.ceil(input.baseHp * input.mineDifficultyMultiplier);
}

export function calculateGoblinDps(input: GoblinDpsInput): number {
  assertNonNegative(input.strength, "strength");
  assertNonNegative(input.speed, "speed");

  const classMultiplier = input.classMultiplier ?? 1;
  const toolMultiplier = input.toolMultiplier ?? 1;
  const blockTagBonus = input.blockTagBonus ?? 0;

  assertPositive(classMultiplier, "classMultiplier");
  assertPositive(toolMultiplier, "toolMultiplier");

  return roundTo(input.strength * input.speed * classMultiplier * toolMultiplier * (1 + blockTagBonus), 3);
}

export function calculateStoredProduction(input: MineProductionInput): number {
  assertNonNegative(input.productionPerMinute, "productionPerMinute");
  assertNonNegative(input.elapsedMinutes, "elapsedMinutes");
  assertNonNegative(input.currentStored, "currentStored");
  assertNonNegative(input.capacity, "capacity");

  const mineLevelMultiplier = input.mineLevelMultiplier ?? 1;
  const automationMultiplier = input.automationMultiplier ?? 1;

  assertPositive(mineLevelMultiplier, "mineLevelMultiplier");
  assertPositive(automationMultiplier, "automationMultiplier");

  const produced = input.productionPerMinute * input.elapsedMinutes * mineLevelMultiplier * automationMultiplier;
  return Math.min(input.capacity, roundTo(input.currentStored + produced, 3));
}

function assertPositive(value: number, name: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be a positive finite number`);
  }
}

function assertNonNegative(value: number, name: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${name} must be a non-negative finite number`);
  }
}

function roundTo(value: number, digits: number): number {
  const multiplier = 10 ** digits;
  return Math.round(value * multiplier) / multiplier;
}
