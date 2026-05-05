import type { ContentBundle, GoblinConfig, GoblinGenerationArchetypeConfig } from "@goblin-cartel/content-schemas";

export function createAvailableGoblins(content: ContentBundle): GoblinConfig[] {
  return [...content.goblinGeneration.archetypes].sort((left, right) => left.sortOrder - right.sortOrder).map(createGoblinConfigFromArchetype);
}

export function createGoblinConfigFromArchetype(archetype: GoblinGenerationArchetypeConfig): GoblinConfig {
  const primaryRender = archetype.renderPool[0];

  if (!primaryRender) {
    throw new Error(`Goblin archetype ${archetype.id} has empty renderPool`);
  }

  return {
    ability: archetype.ability,
    assetId: primaryRender.assetId,
    baseStats: {
      loyalty: averageStat(archetype.statRanges.loyalty),
      luck: averageStat(archetype.statRanges.luck),
      speed: averageStat(archetype.statRanges.speed),
      strength: averageStat(archetype.statRanges.strength)
    },
    class: archetype.class,
    clan: "neutral",
    descriptionKey: archetype.ability.descriptionKey,
    hireCost: archetype.hireCost,
    id: archetype.id,
    leveling: archetype.leveling,
    nameKey: archetype.nameKey,
    rarity: "common",
    sortOrder: archetype.sortOrder,
    specialization: archetype.specialization,
    unlockRequirements: []
  };
}

function averageStat(range: { max: number; min: number }): number {
  return Math.max(0, Math.floor((range.min + range.max) / 2));
}
