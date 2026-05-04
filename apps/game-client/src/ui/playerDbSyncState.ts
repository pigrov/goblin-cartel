export type PlayerDbSyncStatus =
  | "idle"
  | "connecting"
  | "queued"
  | "syncing"
  | "synced"
  | "restored"
  | "local_only"
  | "offline"
  | "conflict"
  | "error";

export interface PlayerDbSyncState {
  status: PlayerDbSyncStatus;
  revision: number | null;
  updatedAt: number | null;
  message: string;
}

export const initialPlayerDbSyncState: PlayerDbSyncState = {
  status: "idle",
  revision: null,
  updatedAt: null,
  message: "Локальное сохранение"
};

export function createPlayerDbSyncState(input: {
  status: PlayerDbSyncStatus;
  revision?: number | null;
  message: string;
  now?: number;
}): PlayerDbSyncState {
  return {
    status: input.status,
    revision: input.revision ?? null,
    updatedAt: input.now ?? Date.now(),
    message: input.message
  };
}
