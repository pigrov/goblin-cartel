import type { BossEnergyConfig } from "./boss-energy";

export type BossCardId = "crit_chance" | "crit_multiplier" | "hit_damage" | "max_energy";
export type BossCardRarity = "common" | "golden" | "rare";
export type BossCardEffectType = "critChance" | "critMultiplier" | "damagePerTap" | "maxEnergy";

export interface BossCardDefinition {
  cardResourceId: string;
  descriptionKey: string;
  effectType: BossCardEffectType;
  id: BossCardId;
  maxLevel: number;
  nameKey: string;
  rarity: BossCardRarity;
  valuePerLevel: number;
}

export interface BossCardState {
  levels: Partial<Record<BossCardId, number>>;
}

export interface BossCardUpgradeCost {
  cardAmount: number;
  cardResourceId: string;
  elixirAmount: number;
  elixirResourceId: string;
}

export type UpgradeBossCardFailureReason = "max_level" | "missing_card" | "not_enough_cards" | "not_enough_elixir";

export type UpgradeBossCardResult =
  | {
      ok: true;
      cost: BossCardUpgradeCost;
      resources: Record<string, number>;
      state: BossCardState;
    }
  | {
      ok: false;
      cost: BossCardUpgradeCost | null;
      reason: UpgradeBossCardFailureReason;
    };

export interface UpgradeBossCardInput {
  cardId: string;
  definitions?: BossCardDefinition[];
  elixirResourceId?: string;
  resources: Record<string, number>;
  state: BossCardState;
}

export const bossCardDefinitions: BossCardDefinition[] = [
  {
    cardResourceId: "boss_card_hit_damage",
    descriptionKey: "boss_card.hit_damage.description",
    effectType: "damagePerTap",
    id: "hit_damage",
    maxLevel: 8,
    nameKey: "boss_card.hit_damage.name",
    rarity: "common",
    valuePerLevel: 4
  },
  {
    cardResourceId: "boss_card_crit_chance",
    descriptionKey: "boss_card.crit_chance.description",
    effectType: "critChance",
    id: "crit_chance",
    maxLevel: 8,
    nameKey: "boss_card.crit_chance.name",
    rarity: "rare",
    valuePerLevel: 0.015
  },
  {
    cardResourceId: "boss_card_crit_multiplier",
    descriptionKey: "boss_card.crit_multiplier.description",
    effectType: "critMultiplier",
    id: "crit_multiplier",
    maxLevel: 8,
    nameKey: "boss_card.crit_multiplier.name",
    rarity: "golden",
    valuePerLevel: 0.12
  },
  {
    cardResourceId: "boss_card_max_energy",
    descriptionKey: "boss_card.max_energy.description",
    effectType: "maxEnergy",
    id: "max_energy",
    maxLevel: 8,
    nameKey: "boss_card.max_energy.name",
    rarity: "common",
    valuePerLevel: 45
  }
];

const bossCardUpgradeCardAmounts = [2, 5, 10, 20, 50, 100, 180, 300];
const bossCardElixirMultiplierByRarity: Record<BossCardRarity, number> = {
  common: 4,
  rare: 6,
  golden: 9
};

export function createInitialBossCardState(): BossCardState {
  return {
    levels: {}
  };
}

export function normalizeBossCardState(
  state: BossCardState | undefined,
  definitions: BossCardDefinition[] = bossCardDefinitions
): BossCardState {
  if (!state) {
    return createInitialBossCardState();
  }

  const definitionById = new Map(definitions.map((definition) => [definition.id, definition]));
  const levels: Partial<Record<BossCardId, number>> = {};

  for (const [cardId, level] of Object.entries(state.levels ?? {})) {
    const definition = definitionById.get(cardId as BossCardId);

    if (!definition || typeof level !== "number" || !Number.isFinite(level)) {
      continue;
    }

    const normalizedLevel = Math.max(0, Math.min(definition.maxLevel, Math.floor(level)));

    if (normalizedLevel > 0) {
      levels[definition.id] = normalizedLevel;
    }
  }

  return { levels };
}

export function getBossCardLevel(cardId: BossCardId, state: BossCardState): number {
  return Math.max(0, Math.floor(state.levels[cardId] ?? 0));
}

export function calculateBossCardUpgradeCost(
  definition: BossCardDefinition,
  state: BossCardState,
  elixirResourceId = "elixir"
): BossCardUpgradeCost | null {
  const level = getBossCardLevel(definition.id, state);

  if (level >= definition.maxLevel) {
    return null;
  }

  const cardAmount = bossCardUpgradeCardAmounts[Math.min(level, bossCardUpgradeCardAmounts.length - 1)] ?? 2;

  return {
    cardAmount,
    cardResourceId: definition.cardResourceId,
    elixirAmount: Math.ceil(cardAmount * bossCardElixirMultiplierByRarity[definition.rarity]),
    elixirResourceId
  };
}

export function upgradeBossCard(input: UpgradeBossCardInput): UpgradeBossCardResult {
  const definitions = input.definitions ?? bossCardDefinitions;
  const definition = definitions.find((item) => item.id === input.cardId);
  const state = normalizeBossCardState(input.state, definitions);

  if (!definition) {
    return {
      cost: null,
      ok: false,
      reason: "missing_card"
    };
  }

  const cost = calculateBossCardUpgradeCost(definition, state, input.elixirResourceId);

  if (!cost) {
    return {
      cost: null,
      ok: false,
      reason: "max_level"
    };
  }

  if ((input.resources[cost.cardResourceId] ?? 0) < cost.cardAmount) {
    return {
      cost,
      ok: false,
      reason: "not_enough_cards"
    };
  }

  if ((input.resources[cost.elixirResourceId] ?? 0) < cost.elixirAmount) {
    return {
      cost,
      ok: false,
      reason: "not_enough_elixir"
    };
  }

  return {
    cost,
    ok: true,
    resources: deductResources(input.resources, [
      { amount: cost.cardAmount, resourceId: cost.cardResourceId },
      { amount: cost.elixirAmount, resourceId: cost.elixirResourceId }
    ]),
    state: {
      levels: {
        ...state.levels,
        [definition.id]: getBossCardLevel(definition.id, state) + 1
      }
    }
  };
}

export function applyBossCardBonuses(
  baseConfig: BossEnergyConfig,
  state: BossCardState,
  definitions: BossCardDefinition[] = bossCardDefinitions
): BossEnergyConfig {
  const normalizedState = normalizeBossCardState(state, definitions);
  const nextConfig = { ...baseConfig };

  for (const definition of definitions) {
    const bonus = getBossCardLevel(definition.id, normalizedState) * definition.valuePerLevel;

    if (bonus <= 0) {
      continue;
    }

    switch (definition.effectType) {
      case "critChance":
        nextConfig.critChance = Math.min(1, nextConfig.critChance + bonus);
        break;
      case "critMultiplier":
        nextConfig.critMultiplier += bonus;
        break;
      case "damagePerTap":
        nextConfig.damagePerTap += bonus;
        break;
      case "maxEnergy":
        nextConfig.maxEnergy += bonus;
        break;
    }
  }

  return nextConfig;
}

function deductResources(
  resources: Record<string, number>,
  costs: Array<{ amount: number; resourceId: string }>
): Record<string, number> {
  const nextResources = { ...resources };

  for (const cost of costs) {
    nextResources[cost.resourceId] = Math.max(0, (nextResources[cost.resourceId] ?? 0) - cost.amount);
  }

  return nextResources;
}
