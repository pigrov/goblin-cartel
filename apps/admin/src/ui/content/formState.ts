import type { ContentBundle, ContentRecord } from "../../api/adminApi";

export type EntityFormState = Record<string, string>;

export function isRecord(value: unknown): value is ContentRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function cloneRecord(record: ContentRecord): ContentRecord {
  return JSON.parse(JSON.stringify(record)) as ContentRecord;
}

export function stringField(record: ContentRecord, key: string): string {
  const value = record[key];
  return typeof value === "string" ? value : "";
}

export function stringFieldAtPath(record: ContentRecord, pathSegments: readonly string[]): string {
  let current: unknown = record;

  for (const segment of pathSegments) {
    if (!isRecord(current)) {
      return "";
    }

    current = current[segment];
  }

  return typeof current === "string" ? current : "";
}

export function contentEntityTitle(record: ContentRecord, localization: Record<string, string>): string {
  const titleKey = stringField(record, "nameKey") || stringField(record, "displayNameKey");
  return localization[titleKey] ?? (titleKey || stringField(record, "id") || "Без id");
}

export function uniqueContentId(prefix: string, items: ContentRecord[]): string {
  const existingIds = new Set(items.map((item) => stringField(item, "id")).filter(Boolean));
  let index = items.length + 1;
  let id = `${prefix}_${String(index).padStart(2, "0")}`;

  while (existingIds.has(id)) {
    index += 1;
    id = `${prefix}_${String(index).padStart(2, "0")}`;
  }

  return id;
}

export function nextSortOrder(items: ContentRecord[]): number {
  const maxSortOrder = items.reduce((max, item) => {
    const value = item.sortOrder;
    return typeof value === "number" && Number.isFinite(value) ? Math.max(max, value) : max;
  }, 0);

  return maxSortOrder + 10;
}

export function findResourceId(content: ContentBundle, preferredId: string): string {
  if (content.resources.some((resource) => stringField(resource, "id") === preferredId)) {
    return preferredId;
  }

  return content.resources[0] ? stringField(content.resources[0], "id") : preferredId;
}

export function addRuLocalization(
  localization: ContentBundle["localization"],
  entries: Record<string, string>
): ContentBundle["localization"] {
  return {
    ...(localization ?? {}),
    ru: {
      ...(localization?.ru ?? {}),
      ...entries
    }
  };
}

export function localizationValue(content: ContentBundle, key: string): string {
  return key ? content.localization?.ru?.[key] ?? "" : "";
}

export function recordField(record: ContentRecord, key: string): ContentRecord {
  const value = record[key];
  return isRecord(value) ? value : {};
}

export function arrayField(record: ContentRecord, key: string): ContentRecord[] {
  const value = record[key];
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

export function arrayStringField(record: ContentRecord, key: string): string[] {
  const value = record[key];
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export function recordAt(items: ContentRecord[], index: number): ContentRecord {
  return items[index] ?? {};
}

export function resourceAmountField(rows: ContentRecord[], resourceId: string): number {
  const row = rows.find((item) => stringField(item, "resourceId") === resourceId);
  return numberField(row ?? {}, "amount", 0);
}

export function numberField(record: ContentRecord, key: string, fallback: number): number {
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function numberString(value: number): string {
  return Number.isFinite(value) ? String(value) : "0";
}

export function formValue(state: EntityFormState, field: string): string {
  return state[field] ?? "";
}

export function formCount(state: EntityFormState, field: string, fallback: number): number {
  return Math.max(0, toInteger(state[field] ?? String(fallback)));
}

export function removeIndexedFormRow(
  state: EntityFormState,
  prefix: string,
  index: number,
  fieldSuffixes: string[],
  count: number
): EntityFormState {
  const next: EntityFormState = {
    [`${prefix}Count`]: String(Math.max(0, count - 1))
  };

  for (let rowIndex = index; rowIndex < count - 1; rowIndex += 1) {
    for (const suffix of fieldSuffixes) {
      next[`${prefix}${suffix}_${rowIndex}`] = formValue(state, `${prefix}${suffix}_${rowIndex + 1}`);
    }
  }

  for (const suffix of fieldSuffixes) {
    next[`${prefix}${suffix}_${count - 1}`] = "";
  }

  return next;
}

export function multiplierReductionToPercent(value: number): number {
  return Math.max(0, Math.round((1 - value) * 100));
}

export function percentToReductionMultiplier(percent: number): number {
  return Math.round(Math.max(0.01, 1 - Math.max(0, percent) / 100) * 1000) / 1000;
}

export function parsePositiveIntegerList(value: string): number[] {
  return value
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isInteger(item) && item > 0);
}

export function parseJsonRecordArray(value: string): { ok: true; value: ContentRecord[] } | { ok: false } {
  try {
    const parsed: unknown = JSON.parse(value);

    if (!Array.isArray(parsed) || parsed.some((item) => !isRecord(item))) {
      return { ok: false };
    }

    return { ok: true, value: parsed };
  } catch {
    return { ok: false };
  }
}

export function toNumber(value: string | undefined): number {
  return value === undefined || value.trim() === "" ? 0 : Number(value);
}

export function toInteger(value: string | undefined): number {
  return Math.trunc(toNumber(value));
}
