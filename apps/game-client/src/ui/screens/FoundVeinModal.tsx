import { X } from "lucide-react";

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
    <div className="modal-backdrop" onClick={props.onClose} role="presentation">
      <section className="vein-modal" aria-label="Рудник расчищен" onClick={(event) => event.stopPropagation()}>
        <header>
          <div>
            <p>Рудник расчищен</p>
            <strong>{props.veinName}</strong>
          </div>
          <button className="icon-button" onClick={props.onClose} type="button" aria-label="Закрыть">
            <X size={18} />
          </button>
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
      </section>
    </div>
  );
}
