import {
  normalizeBossCardState,
  type BossCardDefinition,
  type BossCardState,
  type BossEnergyState,
  type BuiltMineState,
  type GoblinRosterState,
  type MiningSessionSave
} from "@goblin-cartel/game-core";
import type { MineRunStats } from "./mineRunStats";

export const playerSaveStorageKey = "goblin-cartel.player.save.v1";

export interface StoredMineSave {
  contentVersion: string;
  save: MiningSessionSave;
  activeCell?: {
    row: number;
    col: number;
  };
  platformRow?: number;
  goblinPlacements?: Record<string, number>;
  foremanAssignments?: Array<string | null>;
  bossEnergy?: BossEnergyState;
  builtMines?: BuiltMineState[];
  elevatorLevel?: number;
  mineRunStats?: MineRunStats;
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
  writePlayerSave(
    {
      ...readCurrentPlayerSave(storage, bossCardDefinitions, payload.contentVersion),
      contentVersion: payload.contentVersion,
      mine: payload,
      savedAt: payload.savedAt ?? Date.now()
    },
    storage,
    bossCardDefinitions
  );
}

export function loadStoredMiningSession(storage: PlayerSaveStorage = localStorage, contentVersion?: string): StoredMineSave | null {
  const save = readPlayerSave(storage);

  if (!save || !isCurrentContentVersion(save, contentVersion) || !isCurrentContentVersion(save.mine, contentVersion)) {
    return null;
  }

  return save.mine ?? null;
}

export function saveStoredGoblinRoster(
  payload: StoredGoblinRoster,
  storage: PlayerSaveStorage = localStorage,
  bossCardDefinitions?: BossCardDefinition[]
): void {
  writePlayerSave(
    {
      ...readCurrentPlayerSave(storage, bossCardDefinitions, payload.contentVersion),
      contentVersion: payload.contentVersion,
      roster: payload,
      savedAt: Date.now()
    },
    storage,
    bossCardDefinitions
  );
}

export function loadStoredGoblinRoster(storage: PlayerSaveStorage = localStorage, contentVersion?: string): StoredGoblinRoster | null {
  const save = readPlayerSave(storage);

  if (!save || !isCurrentContentVersion(save, contentVersion) || !isCurrentContentVersion(save.roster, contentVersion)) {
    return null;
  }

  return save.roster ?? null;
}

export function saveStoredBossCards(
  bossCards: BossCardState,
  storage: PlayerSaveStorage = localStorage,
  definitions?: BossCardDefinition[],
  contentVersion?: string
): void {
  writePlayerSave(
    {
      ...readCurrentPlayerSave(storage, definitions, contentVersion),
      bossCards: normalizeBossCardState(bossCards, definitions),
      ...(contentVersion ? { contentVersion } : {}),
      savedAt: Date.now()
    },
    storage,
    definitions
  );
}

export function loadStoredBossCards(
  storage: PlayerSaveStorage = localStorage,
  definitions?: BossCardDefinition[],
  contentVersion?: string
): BossCardState {
  const save = readPlayerSave(storage, definitions);

  if (!isCurrentContentVersion(save, contentVersion)) {
    return createEmptyBossCardState();
  }

  return normalizeBossCardState(save?.bossCards, definitions);
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

  return null;
}

function readCurrentPlayerSave(
  storage: PlayerSaveStorage,
  definitions: BossCardDefinition[] | undefined,
  contentVersion: string | undefined
): StoredPlayerSaveV1 | null {
  const save = readPlayerSave(storage, definitions);
  return isCurrentContentVersion(save, contentVersion) ? save : null;
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

function createEmptyBossCardState(): BossCardState {
  return { levels: {} };
}

function isCurrentContentVersion(save: { contentVersion: string } | null | undefined, contentVersion: string | undefined): boolean {
  return !contentVersion || save?.contentVersion === contentVersion;
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
