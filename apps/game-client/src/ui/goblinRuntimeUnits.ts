import type { GoblinConfig } from "@goblin-cartel/content-schemas";
import type { GoblinRosterInstance, GoblinRosterState } from "@goblin-cartel/game-core";

export type RuntimeGoblinConfig = GoblinConfig & {
  instanceEquipment?: GoblinRosterInstance["equipment"];
  instanceId?: string;
  instanceLevel?: number;
  instanceName?: string;
  instanceNickname?: string;
  instanceTraits?: GoblinRosterInstance["traits"];
  sourceArchetypeId?: string;
};

export function createRuntimeGoblinConfigs(goblins: GoblinConfig[], roster: GoblinRosterState): RuntimeGoblinConfig[] {
  const goblinById = new Map(goblins.map((goblin) => [goblin.id, goblin]));
  const instanceById = new Map((roster.instances ?? []).map((instance) => [instance.id, instance]));
  const contractInstanceByArchetypeId = new Map(
    (roster.instances ?? [])
      .filter((instance) => !instance.id.startsWith("rolled:"))
      .map((instance) => [instance.archetypeId, instance])
  );

  return roster.hiredGoblinIds
    .flatMap((hiredId, index): RuntimeGoblinConfig[] => {
      const directGoblin = goblinById.get(hiredId);

      if (directGoblin) {
        const instance = contractInstanceByArchetypeId.get(hiredId);
        return [
          createRuntimeGoblinConfig(directGoblin, instance, {
            id: directGoblin.id,
            sortOrderOffset: index / 1000
          })
        ];
      }

      const instance = instanceById.get(hiredId);
      const archetype = instance ? goblinById.get(instance.archetypeId) : undefined;

      if (!instance || !archetype) {
        return [];
      }

      return [
        createRuntimeGoblinConfig(archetype, instance, {
          id: instance.id,
          sortOrderOffset: index / 1000
        })
      ];
    })
    .sort((left, right) => left.sortOrder - right.sortOrder || left.id.localeCompare(right.id));
}

export function createInstanceBackedGoblinConfig(archetype: GoblinConfig, instance: GoblinRosterInstance | undefined): GoblinConfig {
  return {
    ...archetype,
    assetId: instance?.assetId ?? archetype.assetId,
    ability: normalizeInstanceAbility(instance, archetype),
    baseStats: instance?.rolledStats ?? archetype.baseStats,
    leveling: normalizeInstanceLeveling(instance, archetype),
    rarity: instance?.rarity ?? archetype.rarity,
    specialization: (instance?.specialization as GoblinConfig["specialization"] | undefined) ?? archetype.specialization
  };
}

function createRuntimeGoblinConfig(
  archetype: GoblinConfig,
  instance: GoblinRosterInstance | undefined,
  options: { id: string; sortOrderOffset: number }
): RuntimeGoblinConfig {
  const instanceBackedGoblin = createInstanceBackedGoblinConfig(archetype, instance);

  return {
    ...instanceBackedGoblin,
    id: options.id,
    instanceId: instance?.id,
    instanceEquipment: instance?.equipment,
    instanceLevel: instance?.level,
    instanceName: instance?.name,
    instanceNickname: instance?.nickname,
    instanceTraits: instance?.traits,
    sortOrder: archetype.sortOrder + options.sortOrderOffset,
    sourceArchetypeId: archetype.id
  };
}

function normalizeInstanceAbility(instance: GoblinRosterInstance | undefined, archetype: GoblinConfig): GoblinConfig["ability"] {
  const ability = instance?.ability;

  if (!ability?.nameKey || !ability.descriptionKey) {
    return archetype.ability;
  }

  return {
    descriptionKey: ability.descriptionKey,
    effects: ability.effects as GoblinConfig["ability"]["effects"],
    id: ability.id,
    nameKey: ability.nameKey
  };
}

function normalizeInstanceLeveling(instance: GoblinRosterInstance | undefined, archetype: GoblinConfig): GoblinConfig["leveling"] {
  const leveling = instance?.leveling;

  if (!leveling) {
    return archetype.leveling;
  }

  return {
    autoCollectSlotsPerLevel: leveling.autoCollectSlotsPerLevel ?? 0,
    buildCostMultiplierPerLevel: leveling.buildCostMultiplierPerLevel ?? 0,
    buildTimeMultiplierPerLevel: leveling.buildTimeMultiplierPerLevel ?? 0,
    cost: leveling.cost,
    maxLevel: leveling.maxLevel,
    mineCapacityMultiplierPerLevel: leveling.mineCapacityMultiplierPerLevel ?? 0,
    mineProductionMultiplierPerLevel: leveling.mineProductionMultiplierPerLevel ?? 0,
    offlineRelocationSlotsPerLevel: leveling.offlineRelocationSlotsPerLevel ?? 0,
    statGrowthPerLevel: {
      loyalty: leveling.statGrowthPerLevel?.loyalty ?? 0,
      luck: leveling.statGrowthPerLevel?.luck ?? 0,
      speed: leveling.statGrowthPerLevel?.speed ?? 0,
      strength: leveling.statGrowthPerLevel?.strength ?? 0
    }
  };
}
