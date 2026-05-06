import type { ContentBundle, GoblinConfig } from "@goblin-cartel/content-schemas";

export function createAvailableGoblins(content: ContentBundle): GoblinConfig[] {
  return [...content.goblins.roles].sort((left, right) => left.sortOrder - right.sortOrder);
}
