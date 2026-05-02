import type { BossEnergyConfig } from "@goblin-cartel/game-core";
import { Sparkles, X } from "lucide-react";

export function BossEnergyPanel(props: {
  config: BossEnergyConfig;
  displayedEnergy: number;
  energyPercent: number;
  feedback: boolean;
  onOpenCards: () => void;
  onOpenDetails: () => void;
}) {
  return (
    <section className="boss-panel">
      <button
        className={props.feedback ? "boss-energy-card warn" : "boss-energy-card"}
        onClick={props.onOpenDetails}
        type="button"
      >
        <span className="boss-energy-tank" aria-hidden="true">
          <i style={{ height: `${props.energyPercent}%` }} />
        </span>
        <span className="boss-energy-main">
          <span>Энергия босса</span>
          <strong>
            {formatInteger(props.displayedEnergy)}/{props.config.maxEnergy}
          </strong>
        </span>
        <span className="boss-energy-stats">
          <span>{props.config.damagePerTap} урон</span>
          <span>+{props.config.regenPerSecond}/сек</span>
        </span>
      </button>
      <button className="boss-cards-button" onClick={props.onOpenCards} type="button" aria-label="Карты босса">
        <Sparkles size={18} />
        <span>Карты</span>
      </button>
    </section>
  );
}

export function BossDetailsModal(props: {
  config: BossEnergyConfig;
  displayedEnergy: number;
  onClose: () => void;
  secondsUntilReady: number;
}) {
  return (
    <div className="modal-backdrop" onClick={props.onClose} role="presentation">
      <section className="boss-modal" aria-label="Параметры босса" onClick={(event) => event.stopPropagation()}>
        <header>
          <div>
            <p>Босс</p>
            <strong>Параметры удара</strong>
          </div>
          <button className="icon-button" onClick={props.onClose} type="button" aria-label="Закрыть">
            <X size={18} />
          </button>
        </header>
        <div className="boss-stat-grid">
          <BossStat label="Энергия" value={`${formatInteger(props.displayedEnergy)}/${props.config.maxEnergy}`} />
          <BossStat label="Расход" value={`${props.config.energyPerHit}/удар`} />
          <BossStat label="Урон" value={`${props.config.damagePerTap}/тап`} />
          <BossStat label="Реген" value={`+${props.config.regenPerSecond}/сек`} />
          <BossStat label="Крит" value={formatPercent(props.config.critChance)} />
          <BossStat label="Множитель" value={`x${formatNumber(props.config.critMultiplier)}`} />
        </div>
        <div className="boss-ready-line">
          {props.secondsUntilReady === 0 ? "Удар готов" : `Следующий удар через ${formatSeconds(props.secondsUntilReady)}`}
        </div>
      </section>
    </div>
  );
}

function BossStat(props: { label: string; value: string }) {
  return (
    <div className="boss-stat">
      <span>{props.label}</span>
      <strong>{props.value}</strong>
    </div>
  );
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function formatInteger(value: number): string {
  return Number.isFinite(value) ? String(Math.max(0, Math.floor(value))) : "0";
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function formatSeconds(value: number): string {
  return `${Math.max(0, Math.ceil(value))}с`;
}
