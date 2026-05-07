import { GameFullscreenModal } from "../components/GameFullscreenModal";

export function FoundVeinModal(props: {
  canBuild: boolean;
  costLabel: string | null;
  onBuild: () => void;
  onBuildLater: () => void;
  onClose: () => void;
  productionLabel: string | null;
  productionPerHour: string | null;
  veinName: string;
}) {
  return (
    <GameFullscreenModal ariaLabel="Рудник расчищен" contentClassName="vein-modal" onClose={props.onClose} title="Жила">
      <header className="mine-modal-heading">
        <span>Рудник расчищен</span>
        <strong>{props.veinName}</strong>
      </header>
      <p className="vein-modal-copy">
        Ура, рудник полностью расчищен. Найдена жила: {props.veinName}. Построй шахту, чтобы она автоматически приносила ресурс.
      </p>
      {props.costLabel && props.productionPerHour && props.productionLabel ? (
        <div className="vein-modal-stats">
          <div>
            <span>Стоимость</span>
            <strong>{props.costLabel}</strong>
          </div>
          <div>
            <span>Добыча</span>
            <strong>
              {props.productionPerHour}/ч {props.productionLabel}
            </strong>
          </div>
        </div>
      ) : null}
      <div className="vein-modal-actions">
        <button disabled={!props.canBuild || !props.costLabel} onClick={props.onBuild} type="button">
          Построить
        </button>
        <button onClick={props.onBuildLater} type="button">
          Построить позже
        </button>
      </div>
    </GameFullscreenModal>
  );
}
