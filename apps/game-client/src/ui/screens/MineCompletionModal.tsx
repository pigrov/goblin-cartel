import { Pickaxe, X } from "lucide-react";

export function MineCompletionModal(props: {
  currentMineTitle: string;
  nextMineLabel: string;
  onDismiss: () => void;
  onStartNextMine: () => void;
}) {
  return (
    <div className="modal-backdrop" onClick={props.onDismiss} role="presentation">
      <section className="mine-complete-modal" aria-label="Рудник освоен" onClick={(event) => event.stopPropagation()}>
        <header>
          <div>
            <p>Рудник освоен</p>
            <strong>{props.currentMineTitle}</strong>
          </div>
          <button className="icon-button" onClick={props.onDismiss} type="button" aria-label="Закрыть">
            <X size={18} />
          </button>
        </header>
        <div className="mine-complete-medal" aria-hidden="true">
          <Pickaxe size={30} />
        </div>
        <div className="mine-complete-summary">
          <div>
            <span>Жила найдена</span>
            <strong>Рудник полностью расчищен</strong>
          </div>
          <div>
            <span>Открыт маршрут</span>
            <strong>{props.nextMineLabel}</strong>
          </div>
        </div>
        <div className="mine-complete-actions">
          <button onClick={props.onStartNextMine} type="button">
            Новый рудник
          </button>
          <button onClick={props.onDismiss} type="button">
            Остаться
          </button>
        </div>
      </section>
    </div>
  );
}
