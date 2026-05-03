import type { GoblinConfig } from "@goblin-cartel/content-schemas";
import type { GoblinRosterInstance, GoblinRosterState } from "@goblin-cartel/game-core";

export type RuntimeGoblinConfig = GoblinConfig & {
  instanceEquipment?: GoblinRosterInstance["equipment"];
  instanceId?: string;
  instanceLevel?: number;
  instanceName?: string;
  instanceNickname?: string;
  instanceTraits?: GoblinRosterInstance["traits"];
  templateGoblinId?: string;
};

export function createRuntimeGoblinConfigs(goblins: GoblinConfig[], roster: GoblinRosterState): RuntimeGoblinConfig[] {
  const goblinById = new Map(goblins.map((goblin) => [goblin.id, goblin]));
  const instanceById = new Map((roster.instances ?? []).map((instance) => [instance.id, instance]));
  const templateInstanceByTemplateId = new Map(
    (roster.instances ?? [])
      .filter((instance) => !instance.id.startsWith("rolled:"))
      .map((instance) => [instance.templateId, instance])
  );

  return roster.hiredGoblinIds
    .flatMap((hiredId, index): RuntimeGoblinConfig[] => {
      const directGoblin = goblinById.get(hiredId);

      if (directGoblin) {
        const instance = templateInstanceByTemplateId.get(hiredId);
        return [
          createRuntimeGoblinConfig(directGoblin, instance, {
            id: directGoblin.id,
            sortOrderOffset: index / 1000
          })
        ];
      }

      const instance = instanceById.get(hiredId);
      const template = instance ? goblinById.get(instance.templateId) : undefined;

      if (!instance || !template) {
        return [];
      }

      return [
        createRuntimeGoblinConfig(template, instance, {
          id: instance.id,
          sortOrderOffset: index / 1000
        })
      ];
    })
    .sort((left, right) => left.sortOrder - right.sortOrder || left.id.localeCompare(right.id));
}

function createRuntimeGoblinConfig(
  template: GoblinConfig,
  instance: GoblinRosterInstance | undefined,
  options: { id: string; sortOrderOffset: number }
): RuntimeGoblinConfig {
  return {
    ...template,
    baseStats: instance?.rolledStats ?? template.baseStats,
    id: options.id,
    instanceId: instance?.id,
    instanceEquipment: instance?.equipment,
    instanceLevel: instance?.level,
    instanceName: instance?.name,
    instanceNickname: instance?.nickname,
    instanceTraits: instance?.traits,
    rarity: instance?.rarity ?? template.rarity,
    sortOrder: template.sortOrder + options.sortOrderOffset,
    templateGoblinId: template.id
  };
}
