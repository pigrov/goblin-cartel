import { RotateCcw, ShieldCheck } from "lucide-react";
import { GameFullscreenModal } from "../components/GameFullscreenModal";
import type { PlayerDbSyncState } from "../playerDbSyncState";

export type VkIdentityLinkStatus = "idle" | "linking" | "linked" | "unavailable" | "error";

export function SettingsModal(props: {
  contentLabel: string;
  mineTitle: string;
  onClose: () => void;
  onConfirmResetMine: () => void;
  onLinkVkIdentity: () => void;
  onPixiDevOverlayChange: (enabled: boolean) => void;
  playerDbSync: PlayerDbSyncState;
  pixiDevOverlayEnabled: boolean;
  vkIdentity: {
    displayName: string | null;
    message: string;
    status: VkIdentityLinkStatus;
  };
}) {
  return (
    <GameFullscreenModal ariaLabel="Настройки" contentClassName="settings-composite-content" onClose={props.onClose} title="Настройки">
      <header className="settings-composite-heading">
        <span>Меню</span>
        <strong>Параметры игры</strong>
      </header>
      <div className="settings-list">
        <div className="settings-row">
          <span>Рудник</span>
          <strong>{props.mineTitle}</strong>
        </div>
        <div className="settings-row">
          <span>Контент</span>
          <strong>{props.contentLabel}</strong>
        </div>
        <div className={`settings-row settings-sync-state ${props.playerDbSync.status}`}>
          <span>Синхронизация</span>
          <strong>{playerDbSyncLabel(props.playerDbSync)}</strong>
          <small>{props.playerDbSync.message}</small>
        </div>
        <div className={`settings-row settings-vk-state ${props.vkIdentity.status}`}>
          <span>VK ID</span>
          <strong>{vkIdentityLabel(props.vkIdentity)}</strong>
          <small>{props.vkIdentity.message}</small>
        </div>
        <label className="settings-toggle">
          <span>
            <strong>Pixi dev overlay</strong>
            <small>FPS, клетки, строки</small>
          </span>
          <input
            checked={props.pixiDevOverlayEnabled}
            onChange={(event) => props.onPixiDevOverlayChange(event.target.checked)}
            type="checkbox"
          />
        </label>
      </div>
      <div className="settings-composite-actions">
        <button
          className="settings-action settings-action-secondary"
          disabled={props.vkIdentity.status === "linking"}
          onClick={props.onLinkVkIdentity}
          type="button"
        >
          <ShieldCheck size={18} />
          {props.vkIdentity.status === "linking" ? "Подключение VK ID" : "Подключить VK ID"}
        </button>
        <button className="settings-action" onClick={props.onConfirmResetMine} type="button">
          <RotateCcw size={18} />
          Сбросить шахту
        </button>
      </div>
    </GameFullscreenModal>
  );
}

function playerDbSyncLabel(state: PlayerDbSyncState): string {
  const revision = state.revision === null ? "" : ` #${state.revision}`;

  switch (state.status) {
    case "connecting":
      return "Подключение";
    case "queued":
      return "В очереди";
    case "syncing":
      return "Сохраняется";
    case "synced":
      return `Сохранено${revision}`;
    case "restored":
      return `Загружено${revision}`;
    case "offline":
      return "Офлайн";
    case "conflict":
      return `Конфликт${revision}`;
    case "error":
      return "Ошибка";
    case "local_only":
    case "idle":
    default:
      return "Локально";
  }
}

function vkIdentityLabel(state: { displayName: string | null; status: VkIdentityLinkStatus }): string {
  if (state.status === "linked") {
    return state.displayName ? `Подключен: ${state.displayName}` : "Подключен";
  }

  if (state.status === "linking") {
    return "Подключение";
  }

  if (state.status === "unavailable") {
    return "Недоступен";
  }

  if (state.status === "error") {
    return "Ошибка";
  }

  return "Не подключен";
}
