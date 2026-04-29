export type GoblinRosterClass = "miner" | "builder" | "collector" | "foreman";

export interface GoblinRosterResourceAmount {
  resourceId: string;
  amount: number;
}

export interface GoblinRosterBaseStats {
  strength: number;
  speed: number;
  luck: number;
  loyalty: number;
}

export type GoblinRosterAbilityEffect =
  | {
      type: "damage_bonus_by_tag";
      tag: string;
      value: number;
    }
  | {
      type: "base_damage_bonus";
      value: number;
    }
  | {
      type: "build_cost_multiplier";
      value: number;
    }
  | {
      type: "auto_collect_slots";
      value: number;
    }
  | {
      type: "auto_select_next_block";
      enabled: boolean;
    };

export type GoblinRosterUnlockRequirement =
  | {
      type: "built_mines_count";
      value: number;
    }
  | {
      type: "mine_completed";
      mineTemplateId: string;
    }
  | {
      type: "goblins_by_class";
      class: GoblinRosterClass;
      count: number;
    }
  | {
      type: "resource_collected";
      resourceId: string;
      amount: number;
    };

export interface GoblinRosterAbility {
  id: string;
  effects: GoblinRosterAbilityEffect[];
}

export interface GoblinRosterGoblin {
  id: string;
  class: GoblinRosterClass;
  baseStats: GoblinRosterBaseStats;
  ability: GoblinRosterAbility;
  hireCost: GoblinRosterResourceAmount[];
  unlockRequirements: GoblinRosterUnlockRequirement[];
  sortOrder: number;
}

export interface GoblinRosterState {
  hiredGoblinIds: string[];
}

export interface GoblinRosterProgress {
  resources: Record<string, number>;
  builtMinesCount?: number;
  completedMineTemplateIds?: string[];
}

export type HireGoblinFailureReason = "missing_goblin" | "already_hired" | "locked" | "not_enough_resources";

export type HireGoblinResult =
  | {
      ok: true;
      roster: GoblinRosterState;
      resources: Record<string, number>;
    }
  | {
      ok: false;
      reason: HireGoblinFailureReason;
    };

export interface HireGoblinInput {
  goblinId: string;
  goblins: GoblinRosterGoblin[];
  roster: GoblinRosterState;
  resources: Record<string, number>;
  builtMinesCount?: number;
  completedMineTemplateIds?: string[];
}

export interface CrewHitDamageInput {
  baseDamage?: number;
  blockTags?: string[];
  goblins: GoblinRosterGoblin[];
  roster: GoblinRosterState;
}

export function createInitialGoblinRoster(goblins: GoblinRosterGoblin[]): GoblinRosterState {
  const firstFreeGoblin = [...goblins]
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .find((goblin) => goblin.hireCost.length === 0 && goblin.unlockRequirements.length === 0);

  return {
    hiredGoblinIds: firstFreeGoblin ? [firstFreeGoblin.id] : []
  };
}

export function normalizeGoblinRoster(roster: GoblinRosterState, goblins: GoblinRosterGoblin[]): GoblinRosterState {
  const knownGoblinIds = new Set(goblins.map((goblin) => goblin.id));
  const hiredGoblinIds = roster.hiredGoblinIds.filter((id, index, ids) => knownGoblinIds.has(id) && ids.indexOf(id) === index);

  return { hiredGoblinIds };
}

export function isGoblinHired(roster: GoblinRosterState, goblinId: string): boolean {
  return roster.hiredGoblinIds.includes(goblinId);
}

export function isGoblinUnlocked(input: {
  goblin: GoblinRosterGoblin;
  goblins: GoblinRosterGoblin[];
  progress: GoblinRosterProgress;
  roster: GoblinRosterState;
}): boolean {
  const hiredGoblins = resolveHiredGoblins(input.goblins, input.roster);
  const completedMineTemplateIds = new Set(input.progress.completedMineTemplateIds ?? []);

  return input.goblin.unlockRequirements.every((requirement) => {
    switch (requirement.type) {
      case "built_mines_count":
        return (input.progress.builtMinesCount ?? 0) >= requirement.value;
      case "mine_completed":
        return completedMineTemplateIds.has(requirement.mineTemplateId);
      case "goblins_by_class":
        return hiredGoblins.filter((goblin) => goblin.class === requirement.class).length >= requirement.count;
      case "resource_collected":
        return (input.progress.resources[requirement.resourceId] ?? 0) >= requirement.amount;
    }
  });
}

export function canHireGoblin(input: {
  goblin: GoblinRosterGoblin;
  goblins: GoblinRosterGoblin[];
  resources: Record<string, number>;
  roster: GoblinRosterState;
  builtMinesCount?: number;
  completedMineTemplateIds?: string[];
}): boolean {
  if (isGoblinHired(input.roster, input.goblin.id)) {
    return false;
  }

  if (
    !isGoblinUnlocked({
      goblin: input.goblin,
      goblins: input.goblins,
      roster: input.roster,
      progress: {
        resources: input.resources,
        builtMinesCount: input.builtMinesCount,
        completedMineTemplateIds: input.completedMineTemplateIds
      }
    })
  ) {
    return false;
  }

  return hasEnoughResources(input.resources, input.goblin.hireCost);
}

export function hireGoblin(input: HireGoblinInput): HireGoblinResult {
  const goblin = input.goblins.find((item) => item.id === input.goblinId);

  if (!goblin) {
    return { ok: false, reason: "missing_goblin" };
  }

  const roster = normalizeGoblinRoster(input.roster, input.goblins);

  if (isGoblinHired(roster, input.goblinId)) {
    return { ok: false, reason: "already_hired" };
  }

  const unlocked = isGoblinUnlocked({
    goblin,
    goblins: input.goblins,
    roster,
    progress: {
      resources: input.resources,
      builtMinesCount: input.builtMinesCount,
      completedMineTemplateIds: input.completedMineTemplateIds
    }
  });

  if (!unlocked) {
    return { ok: false, reason: "locked" };
  }

  if (!hasEnoughResources(input.resources, goblin.hireCost)) {
    return { ok: false, reason: "not_enough_resources" };
  }

  return {
    ok: true,
    roster: {
      hiredGoblinIds: [...roster.hiredGoblinIds, input.goblinId]
    },
    resources: deductResources(input.resources, goblin.hireCost)
  };
}

export function calculateGoblinHitDamage(goblin: GoblinRosterGoblin, blockTags: string[] = []): number {
  const baseDamage = goblin.baseStats.strength + goblin.baseStats.speed / 2;
  let flatBonus = 0;
  let multiplierBonus = 0;
  const blockTagSet = new Set(blockTags);

  for (const effect of goblin.ability.effects) {
    if (effect.type === "base_damage_bonus") {
      flatBonus += effect.value;
    }

    if (effect.type === "damage_bonus_by_tag" && blockTagSet.has(effect.tag)) {
      multiplierBonus += effect.value;
    }
  }

  return Math.max(1, Math.ceil((baseDamage + flatBonus) * (1 + multiplierBonus)));
}

export function calculateCrewHitDamage(input: CrewHitDamageInput): number {
  const baseDamage = input.baseDamage ?? 0;
  const crewDamage = resolveHiredGoblins(input.goblins, input.roster).reduce(
    (total, goblin) => total + calculateGoblinHitDamage(goblin, input.blockTags ?? []),
    0
  );

  return Math.max(1, Math.ceil(baseDamage + crewDamage));
}

function resolveHiredGoblins(goblins: GoblinRosterGoblin[], roster: GoblinRosterState): GoblinRosterGoblin[] {
  const goblinById = new Map(goblins.map((goblin) => [goblin.id, goblin]));
  return roster.hiredGoblinIds.map((id) => goblinById.get(id)).filter((goblin): goblin is GoblinRosterGoblin => Boolean(goblin));
}

function hasEnoughResources(resources: Record<string, number>, cost: GoblinRosterResourceAmount[]): boolean {
  return cost.every((item) => (resources[item.resourceId] ?? 0) >= item.amount);
}

function deductResources(resources: Record<string, number>, cost: GoblinRosterResourceAmount[]): Record<string, number> {
  const nextResources = { ...resources };

  for (const item of cost) {
    nextResources[item.resourceId] = (nextResources[item.resourceId] ?? 0) - item.amount;
  }

  return nextResources;
}
