import type { BossEnergyConfig } from "@goblin-cartel/game-core";
import { Bomb, Sparkles, Zap } from "lucide-react";
import { GameFullscreenModal } from "../components/GameFullscreenModal";

export function BossEnergyPanel(props: {
  config: BossEnergyConfig;
  copperAmount: number;
  displayedEnergy: number;
  energyPercent: number;
  elixirAmount: number;
  feedback: boolean;
  onOpenCards: () => void;
  onOpenDetails: () => void;
}) {
  return (
    <section className="boss-panel">
      <button
        className={props.feedback ? "boss-energy-card warn" : "boss-energy-card"}
        aria-label="Энергия босса"
        onClick={props.onOpenDetails}
        type="button"
      >
        <span className="boss-side-fill" aria-hidden="true">
          <i style={{ height: `${props.energyPercent}%` }} />
        </span>
        <Zap size={17} />
        <span className="boss-energy-main">
          <span>Энергия босса</span>
          <strong>
            {formatInteger(props.displayedEnergy)}
          </strong>
        </span>
        <span className="boss-energy-stats">
          <span>{props.config.damagePerTap} урон</span>
          <span>+{props.config.regenPerSecond}/сек</span>
        </span>
      </button>
      <button className="boss-cards-button" onClick={props.onOpenCards} type="button" aria-label="Карты босса">
        <Sparkles size={20} />
        <strong>{formatInteger(props.elixirAmount)}</strong>
      </button>
      <button className="boss-skill-button" type="button" disabled aria-label="Слот умения">
        <Bomb size={20} />
        <strong>{formatInteger(props.copperAmount)}</strong>
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
    <GameFullscreenModal ariaLabel="Параметры босса" contentClassName="boss-modal" onClose={props.onClose} title="Босс">
      <header className="mine-modal-heading">
        <span>Параметры удара</span>
        <strong>Карты усиливают удары по камням</strong>
      </header>
      <section className="boss-hero-card">
        <div className="boss-hero-orb" aria-hidden="true">
          <Zap size={34} />
        </div>
        <div>
          <span>Энергия</span>
          <strong>{formatInteger(props.displayedEnergy)}/{props.config.maxEnergy}</strong>
        </div>
        <i aria-hidden="true">
          <b style={{ width: `${Math.min(100, (props.displayedEnergy / props.config.maxEnergy) * 100)}%` }} />
        </i>
      </section>
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
    </GameFullscreenModal>
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
