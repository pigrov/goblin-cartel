import {
  normalizeBossCardState,
  type BossCardDefinition,
  type BossCardState,
  type BossEnergyState,
  type BuiltMineState,
  type GoblinRosterState,
  type MiningSessionSave
} from "@goblin-cartel/game-core";

export const playerSaveStorageKey = "goblin-cartel.player.save.v1";
export const legacyMineSaveStorageKey = "goblin-cartel.player.mine-save.v2";
export const legacyGoblinRosterStorageKey = "goblin-cartel.player.goblin-roster.v1";

export interface StoredMineSave {
  contentVersion: string;
  save: MiningSessionSave;
  activeCell?: {
    row: number;
    col: number;
  };
  platformRow?: number;
  goblinPlacements?: Record<string, number>;
  bossEnergy?: BossEnergyState;
  builtMines?: BuiltMineState[];
  mineCompletionNoticeSeenIds?: string[];
  savedAt?: number;
}

export interface StoredGoblinRoster {
  contentVersion: string;
  roster: GoblinRosterState;
}

export interface StoredPlayerSaveV1 {
  bossCards?: BossCardState;
  schemaVersion: 1;
  contentVersion: string;
  mine?: StoredMineSave;
  roster?: StoredGoblinRoster;
  savedAt: number;
}

export interface PlayerSaveStorage {
  getItem(key: string): string | null;
  removeItem(key: string): void;
  setItem(key: string, value: string): void;
}

export function saveStoredMiningSession(
  payload: StoredMineSave,
  storage: PlayerSaveStorage = localStorage,
  bossCardDefinitions?: BossCardDefinition[]
): void {
  storage.setItem(legacyMineSaveStorageKey, JSON.stringify(payload));
  writePlayerSave(
    {
      ...readPlayerSave(storage, bossCardDefinitions),
      contentVersion: payload.contentVersion,
      mine: payload,
      savedAt: payload.savedAt ?? Date.now()
    },
    storage,
    bossCardDefinitions
  );
}

export function loadStoredMiningSession(storage: PlayerSaveStorage = localStorage): StoredMineSave | null {
  return readPlayerSave(storage)?.mine ?? readLegacyMiningSession(storage);
}

export function saveStoredGoblinRoster(
  payload: StoredGoblinRoster,
  storage: PlayerSaveStorage = localStorage,
  bossCardDefinitions?: BossCardDefinition[]
): void {
  storage.setItem(legacyGoblinRosterStorageKey, JSON.stringify(payload));
  writePlayerSave(
    {
      ...readPlayerSave(storage, bossCardDefinitions),
      contentVersion: payload.contentVersion,
      roster: payload,
      savedAt: Date.now()
    },
    storage,
    bossCardDefinitions
  );
}

export function loadStoredGoblinRoster(storage: PlayerSaveStorage = localStorage): StoredGoblinRoster | null {
  return readPlayerSave(storage)?.roster ?? readLegacyGoblinRoster(storage);
}

export function saveStoredBossCards(
  bossCards: BossCardState,
  storage: PlayerSaveStorage = localStorage,
  definitions?: BossCardDefinition[]
): void {
  writePlayerSave(
    {
      ...readPlayerSave(storage, definitions),
      bossCards: normalizeBossCardState(bossCards, definitions),
      savedAt: Date.now()
    },
    storage,
    definitions
  );
}

export function loadStoredBossCards(storage: PlayerSaveStorage = localStorage, definitions?: BossCardDefinition[]): BossCardState {
  return normalizeBossCardState(readPlayerSave(storage, definitions)?.bossCards, definitions);
}

export function readPlayerSave(storage: PlayerSaveStorage = localStorage, definitions?: BossCardDefinition[]): StoredPlayerSaveV1 | null {
  const saved = readJson(storage, playerSaveStorageKey);
  const normalized = normalizePlayerSave(saved, definitions);

  if (normalized) {
    return normalized;
  }

  if (saved !== null) {
    storage.removeItem(playerSaveStorageKey);
  }

  const legacyMine = readLegacyMiningSession(storage);
  const legacyRoster = readLegacyGoblinRoster(storage);

  if (!legacyMine && !legacyRoster) {
    return null;
  }

  const migrated: StoredPlayerSaveV1 = {
    schemaVersion: 1,
    contentVersion: legacyMine?.contentVersion ?? legacyRoster?.contentVersion ?? "",
    ...(legacyMine ? { mine: legacyMine } : {}),
    ...(legacyRoster ? { roster: legacyRoster } : {}),
    savedAt: Math.max(legacyMine?.savedAt ?? 0, Date.now())
  };
  writePlayerSave(migrated, storage);
  return migrated;
}

function writePlayerSave(payload: Partial<StoredPlayerSaveV1>, storage: PlayerSaveStorage, definitions?: BossCardDefinition[]): void {
  const normalized = normalizePlayerSave({ schemaVersion: 1, ...payload }, definitions);

  if (!normalized) {
    return;
  }

  storage.setItem(playerSaveStorageKey, JSON.stringify(normalized));
}

function normalizePlayerSave(value: unknown, definitions?: BossCardDefinition[]): StoredPlayerSaveV1 | null {
  if (!isRecord(value)) {
    return null;
  }

  const schemaVersion = value.schemaVersion === 1 ? 1 : null;

  if (!schemaVersion) {
    return null;
  }

  const mine = normalizeMineSave(value.mine);
  const roster = normalizeGoblinRosterSave(value.roster);

  const bossCards = normalizeBossCards(value.bossCards, definitions);

  if (!mine && !roster && !bossCards) {
    return null;
  }

  return {
    ...(bossCards ? { bossCards } : {}),
    schemaVersion,
    contentVersion:
      typeof value.contentVersion === "string" ? value.contentVersion : mine?.contentVersion ?? roster?.contentVersion ?? "",
    ...(mine ? { mine } : {}),
    ...(roster ? { roster } : {}),
    savedAt: typeof value.savedAt === "number" && Number.isFinite(value.savedAt) ? value.savedAt : Date.now()
  };
}

function readLegacyMiningSession(storage: PlayerSaveStorage): StoredMineSave | null {
  const value = readJson(storage, legacyMineSaveStorageKey);
  const normalized = normalizeMineSave(value);

  if (value !== null && !normalized) {
    storage.removeItem(legacyMineSaveStorageKey);
  }

  return normalized;
}

function readLegacyGoblinRoster(storage: PlayerSaveStorage): StoredGoblinRoster | null {
  const value = readJson(storage, legacyGoblinRosterStorageKey);
  const normalized = normalizeGoblinRosterSave(value);

  if (value !== null && !normalized) {
    storage.removeItem(legacyGoblinRosterStorageKey);
  }

  return normalized;
}

function normalizeMineSave(value: unknown): StoredMineSave | null {
  if (!isRecord(value) || typeof value.contentVersion !== "string" || !isRecord(value.save)) {
    return null;
  }

  const save = value.save;

  if (typeof save.mineTemplateId !== "string" || typeof save.seed !== "string" || !isRecord(save.resources) || !Array.isArray(save.blocks)) {
    return null;
  }

  return value as unknown as StoredMineSave;
}

function normalizeGoblinRosterSave(value: unknown): StoredGoblinRoster | null {
  if (!isRecord(value) || typeof value.contentVersion !== "string" || !isRecord(value.roster)) {
    return null;
  }

  if (!Array.isArray(value.roster.hiredGoblinIds)) {
    return null;
  }

  return value as unknown as StoredGoblinRoster;
}

function normalizeBossCards(value: unknown, definitions?: BossCardDefinition[]): BossCardState | null {
  if (!isRecord(value) || !isRecord(value.levels)) {
    return null;
  }

  return normalizeBossCardState(value as unknown as BossCardState, definitions);
}

function readJson(storage: PlayerSaveStorage, key: string): unknown {
  const raw = storage.getItem(key);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as unknown;
  } catch {
    storage.removeItem(key);
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
