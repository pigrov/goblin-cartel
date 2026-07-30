import type { ContentBundle } from "../../api/adminApi";
import { isRecord } from "./formState";

export function parseContentPreview(contentJson: string): ContentBundle | null {
  if (!contentJson.trim()) {
    return null;
  }

  try {
    const parsed = JSON.parse(contentJson);

    if (!isContentBundleLike(parsed)) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function contentEntityCount(content: ContentBundle | null, key: keyof ContentBundle): number {
  if (!content) {
    return 0;
  }

  const value = content[key];
  return Array.isArray(value) ? value.length : 0;
}

export function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function isContentBundleLike(value: unknown): value is ContentBundle {
  return (
    isRecord(value) &&
    Array.isArray(value.resources) &&
    Array.isArray(value.blockTypes) &&
    Array.isArray(value.mineTemplates) &&
    isRecord(value.goblins) &&
    isRecord(value.goblinHut) &&
    isRecord(value.elevator)
  );
}
