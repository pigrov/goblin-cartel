import type { GoblinConfig } from "@goblin-cartel/content-schemas";
import type { GoblinRosterInstance, GoblinRosterState } from "@goblin-cartel/game-core";

export type RuntimeGoblinConfig = GoblinConfig & {
  instanceEquipment?: GoblinRosterInstance["equipment"];
  instanceId?: string;
  instanceLevel?: number;
  instanceStars?: GoblinRosterInstance["stars"];
  sourceGoblinId?: string;
};

export function createRuntimeGoblinConfigs(goblins: GoblinConfig[], roster: GoblinRosterState): RuntimeGoblinConfig[] {
  const goblinById = new Map(goblins.map((goblin) => [goblin.id, goblin]));

  return (roster.instances ?? [])
    .flatMap((instance, index): RuntimeGoblinConfig[] => {
      const goblin = goblinById.get(instance.goblinId);

      if (!goblin) {
        return [];
      }

      return [
        {
          ...goblin,
          assetId: instance.assetId ?? goblin.assetId,
          id: instance.id,
          instanceEquipment: instance.equipment,
          instanceId: instance.id,
          instanceLevel: instance.level,
          instanceStars: instance.stars,
          sortOrder: goblin.sortOrder + index / 1000,
          sourceGoblinId: goblin.id
        }
      ];
    })
    .sort((left, right) => left.sortOrder - right.sortOrder || left.id.localeCompare(right.id));
}
