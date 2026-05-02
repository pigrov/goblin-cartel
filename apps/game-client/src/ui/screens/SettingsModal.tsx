import { RotateCcw, X } from "lucide-react";

export function SettingsModal(props: {
  contentLabel: string;
  mineTitle: string;
  onClose: () => void;
  onConfirmResetMine: () => void;
  onPixiDevOverlayChange: (enabled: boolean) => void;
  pixiDevOverlayEnabled: boolean;
}) {
  return (
    <div className="modal-backdrop" onClick={props.onClose} role="presentation">
      <section className="settings-modal" aria-label="Настройки" onClick={(event) => event.stopPropagation()}>
        <header>
          <div>
            <p>Меню</p>
            <strong>Настройки</strong>
          </div>
          <button className="icon-button" onClick={props.onClose} type="button" aria-label="Закрыть">
            <X size={18} />
          </button>
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
        <button className="settings-action" onClick={props.onConfirmResetMine} type="button">
          <RotateCcw size={18} />
          Сбросить шахту
        </button>
      </section>
    </div>
  );
}
