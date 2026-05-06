import type { GoblinConfig } from "@goblin-cartel/content-schemas";
import { isGoblinHired, type GoblinRosterState } from "@goblin-cartel/game-core";

export const foremanTowerSlotCount = 3;

export type ForemanAssignments = Array<string | null>;

export function createEmptyForemanAssignments(): ForemanAssignments {
  return Array.from({ length: foremanTowerSlotCount }, () => null);
}

export function normalizeForemanAssignments(
  assignments: readonly (string | null)[] | null | undefined,
  goblins: readonly GoblinConfig[],
  roster: GoblinRosterState
): ForemanAssignments {
  const hiredForemanIds = new Set(
    goblins.filter((goblin) => goblin.role === "foreman" && isGoblinHired(roster, goblin.id)).map((goblin) => goblin.id)
  );
  const usedIds = new Set<string>();
  const normalized = createEmptyForemanAssignments();

  for (let index = 0; index < foremanTowerSlotCount; index += 1) {
    const goblinId = assignments?.[index] ?? null;

    if (!goblinId || !hiredForemanIds.has(goblinId) || usedIds.has(goblinId)) {
      continue;
    }

    normalized[index] = goblinId;
    usedIds.add(goblinId);
  }

  return normalized;
}

export function assignForemanToTowerSlot(
  assignments: readonly (string | null)[],
  slotIndex: number,
  goblinId: string | null
): ForemanAssignments {
  const next = createEmptyForemanAssignments();

  for (let index = 0; index < foremanTowerSlotCount; index += 1) {
    const assignedGoblinId = assignments[index] ?? null;
    next[index] = assignedGoblinId === goblinId ? null : assignedGoblinId;
  }

  if (slotIndex >= 0 && slotIndex < foremanTowerSlotCount) {
    next[slotIndex] = goblinId;
  }

  return next;
}

export function getAssignedForemen(
  goblins: readonly GoblinConfig[],
  roster: GoblinRosterState,
  assignments: readonly (string | null)[]
): GoblinConfig[] {
  const goblinById = new Map(goblins.map((goblin) => [goblin.id, goblin]));

  return normalizeForemanAssignments(assignments, goblins, roster)
    .map((goblinId) => (goblinId ? goblinById.get(goblinId) ?? null : null))
    .filter((goblin): goblin is GoblinConfig => Boolean(goblin));
}
