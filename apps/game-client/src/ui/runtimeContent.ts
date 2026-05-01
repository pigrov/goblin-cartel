import type { ContentBundle } from "@goblin-cartel/content-schemas";

export function createRuntimeContentBundle(content: ContentBundle): ContentBundle {
  return content;
}

export function contentVersionWithRuntimeSuffix(version: string): string {
  return version;
}
